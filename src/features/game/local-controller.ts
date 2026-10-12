/** Pure controller: one atomic save record contains the checkpoint and journal. */
export interface LocalStore { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void> }
export interface FrozenBatch<A> {
  operation: 'sync'; deviceId: string; sessionId?: string; requestId: string; baseRevision: number;
  startSequence: number; catalogVersion: string; actions: A[];
}
export interface Checkpoint<S, C> { state: S; catalog: C; revision: number; sequence: number; serverTime?: string; leaseUntil?: string; sessionId?: string; nextCatalog?: C; legacyV1?:unknown; conflict?: string | boolean }
export interface SyncReply<S, C = unknown> {
  state: S; revision: number; sequence: number; processed: number; requestId: string;
  stopReason?: string | null; serverTime?: string; leaseUntil?: string; sessionId?:string; catalog?: C; nextCatalog?: C; conflict?: string | boolean;
}
export interface SaveRecord<S, C, A> {
  version: 2; deviceId: string; checkpoint: Checkpoint<S, C>; journal: A[];
  frozen: FrozenBatch<A> | null; lastSyncAt: number; leaseExpiresAt?:number; ownerId?:string;
}
export interface ControllerOptions<S, C, A> {
  mode: 'demo' | 'cloud'; key: string; store: LocalStore; now(): number; uuid(): string;
  bootstrap(deviceId: string, takeover?: boolean): Promise<Checkpoint<S, C>>;
  submit(batch: FrozenBatch<A>): Promise<SyncReply<S, C>>;
  reduce(state: S, action: A, catalog: C, nextCatalog?: C): { state: S; accepted: boolean; reason?: string | null; dayCost: number };
  catalogVersion(catalog: C): string;
  validate(record: unknown): record is SaveRecord<S, C, A>;
  onChange(): void;
  ownerId?(): Promise<string>;
  currentOwnerId?(): string | null;
}

export class LocalController<S, C, A> {
  record: SaveRecord<S, C, A> | null = null;
  state: S | null = null;
  loading = true;
  syncing = false;
  saving = false;
  error: string | null = null;
  blocked = false;
  networkError = false;
  private key: string;
  private persistence: Promise<void> = Promise.resolve();
  private request: Promise<void> | null = null;
  private initialization: Promise<void> | null = null;
  private refreshing: Promise<void> | null = null;
  private budget = { amount: 8, time: 0 };
  constructor(private options: ControllerOptions<S, C, A>) { this.key = options.key; }
  get storageKey() { return this.key; }
  setError(message:string) { this.error = message; this.changed(); }
  setBlocked(value:boolean) { this.blocked = value; this.changed(); }
  hideChangedAccount() {
    this.blocked = true; this.state = null;
    this.error = 'Account changed. Refresh to load your separate save.'; this.changed();
  }
  private foreignOwner() { return Boolean(this.record?.ownerId && this.options.currentOwnerId && this.options.currentOwnerId() !== this.record.ownerId); }
  get catalog() {
    if (!this.record) return null;
    const next = this.record.checkpoint.nextCatalog;
    return next && (this.state as {catalogVersion?:string} | null)?.catalogVersion === this.options.catalogVersion(next)
      ? next : this.record.checkpoint.catalog;
  }
  get dirty() { return Boolean(this.record?.journal.length); }
  get pendingCount() { return this.record?.journal.length ?? 0; }
  get paused() {
    return this.blocked || (this.options.mode === 'cloud' && Boolean(this.record)
      && this.options.now() >= (this.record!.leaseExpiresAt ?? this.record!.lastSyncAt + 300_000));
  }
  private changed() { this.options.onChange(); }
  private async persist() {
    if (!this.record) return;
    // One string replacement is atomic. Never split checkpoint and receipt across keys.
    const value = JSON.stringify(this.record);
    this.saving = true;
    this.changed();
    const write = this.persistence.catch(() => undefined).then(() => this.options.store.set(this.key, value));
    this.persistence = write;
    try { await write; }
    catch (error) {
      this.blocked = true;
      this.error = `Could not save on this device: ${error instanceof Error ? error.message : 'storage unavailable'}. Keep the app open and retry.`;
      throw error;
    } finally {
      if (this.persistence === write) this.saving = false;
      this.changed();
    }
  }
  private derive() {
    if (!this.record) return;
    let state = this.record.checkpoint.state;
    for (const action of this.record.journal) {
      const result = this.options.reduce(state, action, this.record.checkpoint.catalog, this.record.checkpoint.nextCatalog);
      if (!result.accepted) throw new Error(`Saved journal cannot be replayed: ${result.reason ?? 'invalid action'}. Your save has been retained.`);
      state = result.state;
    }
    this.state = state;
  }
  async initialize() {
    if (this.initialization) return this.initialization;
    const task = this.load(); this.initialization = task;
    try { await task; } finally { if (this.initialization === task) this.initialization = null; }
  }
  private async load() {
    try {
      const ownerId = this.options.ownerId ? await this.options.ownerId() : undefined;
      this.key = ownerId ? `${this.options.key}:owner:${ownerId}` : this.options.key;
      const saved = await this.options.store.get(this.key);
      if (saved) {
        const candidate: unknown = JSON.parse(saved);
        if (!this.options.validate(candidate)) throw new Error('This local save needs recovery. It has been kept intact.');
        if (ownerId && candidate.ownerId !== ownerId) throw new Error('This save belongs to another account. Its data is retained separately.');
        this.record = candidate;
        this.derive();
        this.loading = false;
        this.changed();
      }
      if (!this.record) {
        let deviceId = await this.options.store.get(`${this.key}:device`);
        if (!deviceId) { deviceId = this.options.uuid(); await this.options.store.set(`${this.key}:device`, deviceId); }
        const checkpoint = await this.options.bootstrap(deviceId);
        if (ownerId && this.options.currentOwnerId?.() !== ownerId) throw new Error('Account changed while loading. Refresh to load the new account.');
        this.record = { version: 2, ownerId, deviceId, checkpoint, journal: [], frozen: null, lastSyncAt: this.options.now(), leaseExpiresAt:this.leaseExpiry(checkpoint) };
        this.state = checkpoint.state; this.blocked = Boolean(checkpoint.conflict); this.networkError = false;
        if (checkpoint.conflict) this.error = 'Another device is playing this account. Explicitly take over in Settings.';
        await this.persist();
      } else if (this.options.mode === 'cloud') {
        if (this.record.journal.length || this.record.frozen) await this.sync();
        else await this.refresh();
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load your save.';
    } finally { this.loading = false; this.changed(); }
  }
  async act(action: A): Promise<boolean> {
    if (this.foreignOwner()) { this.blocked = true; this.state = null; this.error = 'Account changed. Refresh to load this account’s separate save.'; this.changed(); return false; }
    if (!this.record || !this.state || this.loading || this.paused) {
      this.error = this.paused ? 'Ranked play paused. Sync to continue; your pending progress is retained.' : 'Your life is still loading.';
      this.changed();
      return false;
    }
    if (this.options.mode === 'cloud' && this.record.journal.length >= 512) {
      this.error = 'Your local queue is full. Sync before continuing.'; this.changed(); return false;
    }
    const result = this.options.reduce(this.state, action, this.record.checkpoint.catalog, this.record.checkpoint.nextCatalog);
    if (!result.accepted) { this.error = result.reason ?? 'That action is unavailable.'; this.changed(); return false; }
    const now = this.options.now();
    this.budget.amount = Math.min(8, this.budget.amount + Math.max(0, now - this.budget.time) * 4 / 1000);
    this.budget.time = now;
    if (result.dayCost > this.budget.amount) {
      this.error = 'Your next day will be ready shortly.'; this.changed(); return false;
    }
    const nextJournal = [...this.record.journal, action];
    if (this.options.mode === 'cloud' && utf8Length(JSON.stringify(nextJournal)) > 62_000) {
      this.error = 'Your local queue is full. Sync before continuing.'; this.changed(); return false;
    }
    this.budget.amount -= result.dayCost;
    this.state = result.state;
    this.error = null;
    if (this.options.mode === 'cloud') this.record.journal = nextJournal;
    else this.record.checkpoint.state = result.state;
    this.changed(); // Immediate local effect; no network on this path.
    try { await this.persist(); return true; } catch { return false; }
  }
  async sync(): Promise<void> {
    if (this.request) return this.request;
    if (!this.record || this.options.mode !== 'cloud') return;
    const task = this.doSync();
    this.request = task;
    try { await task; } finally { if (this.request === task) this.request = null; }
  }
  private async doSync() {
    if (!this.record) return;
    if (this.foreignOwner()) { this.blocked = true; this.state = null; this.error = 'Account changed. Pending progress remains in the original account’s local save.'; this.changed(); return; }
    this.syncing = true; this.changed();
    try {
      await this.persistence;
      if (!this.record.frozen && !this.record.journal.length) {
        await this.refresh(); return;
      }
      if (!this.record.frozen) {
        this.record.frozen = {
          operation: 'sync', deviceId: this.record.deviceId, ...(this.record.checkpoint.sessionId ? {sessionId:this.record.checkpoint.sessionId} : {}), requestId: this.options.uuid(),
          baseRevision: this.record.checkpoint.revision, startSequence: this.record.checkpoint.sequence + 1,
          catalogVersion: this.options.catalogVersion(this.record.checkpoint.catalog), actions: [...this.record.journal],
        };
        await this.persist(); // Stable exact envelope survives lost responses and termination.
      }
      const frozen = this.record.frozen;
      const reply = await this.options.submit(frozen);
      if (this.foreignOwner()) { this.blocked = true; this.state = null; throw new Error('Account changed while syncing. Original progress is retained separately.'); }
      if (reply.conflict) {
        this.blocked = true;
        throw new Error('This account changed on another device. Your pending save is retained. Review recovery in Settings.');
      }
      if (reply.requestId !== frozen.requestId || !Number.isInteger(reply.processed) || reply.processed < 0
        || reply.processed > frozen.actions.length || (reply.sessionId && frozen.sessionId && reply.sessionId !== frozen.sessionId)
        || reply.revision < frozen.baseRevision || reply.sequence !== frozen.startSequence - 1 + reply.processed) {
        throw new Error('The server returned an invalid acknowledgement. The original batch is retained for retry.');
      }
      if (reply.stopReason === 'rate_limit' || reply.stopReason === 'rate_limited') {
        throw new Error('Server day allowance is still replenishing. Your actions are retained for retry.');
      }
      const tail = this.record.journal.slice(frozen.actions.length);
      let state = reply.state;
      const replayed: A[] = [];
      if (reply.processed === frozen.actions.length) {
        for (const action of tail) {
          const result = this.options.reduce(state, action, this.record.checkpoint.catalog, this.record.checkpoint.nextCatalog);
          if (!result.accepted) break;
          replayed.push(action); state = result.state;
        }
      }
      if (reply.processed !== frozen.actions.length || replayed.length !== tail.length) {
        await this.options.store.set(`${this.key}:recovery:${frozen.requestId}`, JSON.stringify(this.record));
        this.error = `Some actions could not be verified (${reply.stopReason ?? 'state changed'}). Their original journal is archived for review.`;
      } else this.error = null;
      const nextCatalog = reply.nextCatalog ?? this.record.checkpoint.nextCatalog;
      const adoptedCatalog = nextCatalog && (reply.state as {catalogVersion?:string}).catalogVersion === this.options.catalogVersion(nextCatalog) ? nextCatalog : this.record.checkpoint.catalog;
      this.record.checkpoint = { ...this.record.checkpoint, catalog: reply.catalog ?? adoptedCatalog, nextCatalog, state: reply.state, revision: reply.revision, sequence: reply.sequence, serverTime: reply.serverTime, leaseUntil:reply.leaseUntil, sessionId:reply.sessionId ?? this.record.checkpoint.sessionId };
      this.record.journal = replayed;
      this.record.frozen = null;
      this.record.lastSyncAt = this.options.now();
      this.record.leaseExpiresAt = this.leaseExpiry(reply);
      this.state = state;
      this.blocked = false;
      this.networkError = false;
      await this.persist();
    } catch (error) {
      this.networkError = true;
      this.error = error instanceof Error ? error.message : 'Waiting for connection. Progress remains on this device.';
    } finally { this.syncing = false; this.changed(); }
  }
  async refresh() {
    if (this.refreshing) return this.refreshing;
    const task = this.doRefresh(); this.refreshing = task;
    try { await task; } finally { if (this.refreshing === task) this.refreshing = null; }
  }
  private async doRefresh() {
    if (!this.record) return;
    if (this.foreignOwner()) { await this.changeAccount(); return; }
    if (this.record.journal.length || this.record.frozen) return this.sync();
    const before = this.record.checkpoint;
    const checkpoint = await this.options.bootstrap(this.record.deviceId);
    if (this.foreignOwner()) { this.blocked = true; this.state = null; throw new Error('Account changed during refresh.'); }
    if (this.record.journal.length) {
      if (checkpoint.revision !== before.revision) { this.blocked = true; throw new Error('Cloud progress changed during refresh. Pending actions are retained.'); }
      return;
    }
    if (checkpoint.conflict) { this.blocked = true; throw new Error('Another device is playing. Take over explicitly in Settings.'); }
    this.record.checkpoint = checkpoint;
    this.record.lastSyncAt = this.options.now(); this.record.leaseExpiresAt = this.leaseExpiry(checkpoint); this.state = checkpoint.state;
    this.blocked = false; this.error = null; this.networkError = false;
    await this.persist(); this.changed();
  }
  private leaseExpiry(checkpoint: {serverTime?:string;leaseUntil?:string}) {
    const remaining = checkpoint.serverTime && checkpoint.leaseUntil
      ? Date.parse(checkpoint.leaseUntil) - Date.parse(checkpoint.serverTime) : 300_000;
    return this.options.now() + Math.max(0, Math.min(300_000, Number.isFinite(remaining) ? remaining : 0));
  }
  async retryStorage() {
    try { await this.persist(); this.blocked = false; this.error = null; this.changed(); } catch { /* retained */ }
  }
  async takeOver() {
    if (this.refreshing) await this.refreshing;
    if (this.request) await this.request;
    if (!this.record) return;
    this.blocked = true;
    // Explicit UI confirmation is required before invoking this operation.
    await this.options.store.set(`${this.key}:takeover:${this.options.uuid()}`, JSON.stringify(this.record));
    const checkpoint = await this.options.bootstrap(this.record.deviceId, true);
    if (checkpoint.conflict) throw new Error('Could not take over the account. Existing local progress is retained.');
    this.record = { ...this.record, checkpoint, journal: [], frozen: null, lastSyncAt: this.options.now(), leaseExpiresAt:this.leaseExpiry(checkpoint) };
    this.state = checkpoint.state; this.blocked = false; this.error = null;
    await this.persist(); this.changed();
  }
  async changeAccount() {
    if (this.initialization) await this.initialization;
    this.blocked = true; this.state = null; this.changed();
    if (this.request) await this.request;
    await this.persistence.catch(() => undefined);
    this.record = null; this.loading = true; this.networkError = false;
    await this.initialize();
  }
}

function utf8Length(text: string) {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}
