import { supabase } from '@/lib/supabase/client';
import { gameStorage } from '@/storage/game-storage';
import { DemoEngine } from './demo-engine';
import type { CommandRequest, CommandResult, GameSnapshot, GameTransport } from './types';

export const gameMode = process.env.EXPO_PUBLIC_GAME_MODE === 'demo' ? 'demo' : supabase ? 'cloud' : 'demo';
const demoKey = 'rags:demo:v1';
function assertSnapshot(value: unknown): asserts value is GameSnapshot {
  const snapshot = value as GameSnapshot;
  if (!snapshot || snapshot.version !== 1 || !snapshot.summary || !('run' in snapshot)) {
    throw new Error('The game service returned an unsupported save format.');
  }
  const money = (amount: unknown) => typeof amount === 'string' && /^\d{1,60}$/.test(amount);
  const integer = (number: unknown, max = Number.MAX_SAFE_INTEGER) => Number.isInteger(number) && (number as number) >= 0 && (number as number) <= max;
  if (!money(snapshot.summary.lifetimeEarned) || !money(snapshot.summary.bestRunEarned) || !integer(snapshot.summary.completedRuns)) throw new Error('The save contains invalid lifetime totals.');
  const run = snapshot.run;
  if (run && (!money(run.money) || !money(run.earned) || !integer(run.hunger, 100) || !integer(run.sanity, 100)
    || !integer(run.revision) || !integer(run.actions) || !integer(run.skillLevel, 1_000_000)
    || !['active', 'dead'].includes(run.status) || typeof run.id !== 'string'
    || !['begging', 'newspaper', 'courier', 'freelancer'].includes(run.jobId)
    || !Array.isArray(run.equipment) || run.equipment.some(id => !['bike', 'delivery_kit', 'laptop'].includes(id))
    || (run.status === 'dead' ? run.hunger !== 0 : run.hunger === 0))) throw new Error('The save contains an invalid run.');
}
class DemoTransport implements GameTransport {
  private engine = new DemoEngine();
  async initialize() {
    const saved = await gameStorage.get(demoKey);
    if (saved) {
      try { const snapshot: unknown = JSON.parse(saved); assertSnapshot(snapshot); this.engine = new DemoEngine(snapshot); }
      catch { await gameStorage.remove(demoKey); }
    }
  }
  async snapshot() { return this.engine.snapshot(); }
  async execute(request: CommandRequest) {
    const result = this.engine.execute(request);
    await gameStorage.set(demoKey, JSON.stringify(this.engine.snapshot()));
    return result;
  }
}
class CloudTransport implements GameTransport {
  async initialize() {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      const result = await supabase.auth.signInAnonymously();
      if (result.error) throw new Error(`Cloud sign-in failed: ${result.error.message}`);
    }
  }
  async snapshot(): Promise<GameSnapshot> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.rpc('get_game_snapshot');
    if (error) throw new Error(`Could not load cloud save: ${error.message}`);
    assertSnapshot(data);
    return data;
  }
  async execute(request: CommandRequest): Promise<CommandResult> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.rpc(request.operation === 'start' ? 'start_run' : 'submit_actions',
      request.operation === 'start' ? { request_id: request.requestId } : {
        run_id: request.runId, request_id: request.requestId,
        expected_revision: request.expectedRevision, actions: request.actions,
      });
    if (error) throw new Error(`The action could not be confirmed: ${error.message}`);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The service returned an invalid action receipt.');
    const result = data as Record<string, unknown>;
    assertSnapshot(result.snapshot);
    if (result.requestId !== request.requestId || !Number.isInteger(result.processed) || (result.processed as number) < 0) throw new Error('The service returned an invalid action receipt.');
    return { snapshot: result.snapshot, requestId: request.requestId, processed: result.processed as number,
      stopReason: typeof result.stopReason === 'string' ? result.stopReason : null };
  }
}
export function createTransport(): GameTransport { return gameMode === 'cloud' ? new CloudTransport() : new DemoTransport(); }
