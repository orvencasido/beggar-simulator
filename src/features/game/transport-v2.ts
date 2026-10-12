import { supabase } from '@/lib/supabase/client';
import { gameStorage } from '@/storage/game-storage';
import { createGame, defaultCatalog, validateCatalog, validateGameState, type Catalog, type GameAction, type GameState } from '@/game-core';
import type { Checkpoint, FrozenBatch, SyncReply } from './local-controller';
import type { Leaderboard, PublicProfile, ShowcaseSettings } from './types-v2';

export const gameMode = process.env.EXPO_PUBLIC_GAME_MODE === 'demo' || !supabase ? 'demo' : 'cloud';
type BootWire = Checkpoint<GameState, Catalog> & { seq?: number; state: GameState | null; legacyV1?: unknown };

export class LegacyMigrationRequired extends Error {
  constructor(public legacy: unknown) { super('Your previous life is preserved. Confirm starting a new age-based life to continue.'); }
}
export async function initializeAuth() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    const result = await supabase.auth.signInAnonymously();
    if (result.error) throw new Error(`Cloud sign-in failed: ${result.error.message}`);
    return result.data.user!.id;
  }
  return data.session.user.id;
}
function assertState(value: unknown): asserts value is GameState {
  if (!validateGameState(value)) throw new Error('Unsupported or invalid lifetime save. Existing data has been retained.');
}
async function edge(body: Record<string, unknown>) {
  await initializeAuth();
  const { data, error } = await supabase!.functions.invoke('game-sync', { body });
  if (error) {
    let detail = error.message;
    if ('context' in error && error.context instanceof Response) {
      try { const failure = await error.context.json(); detail = failure.error ?? detail; } catch { /* generic network error */ }
    }
    throw new Error(`Cloud sync: ${detail}`);
  }
  if (!data || typeof data !== 'object') throw new Error('Invalid game service response.');
  if (data.error) throw new Error(String(data.error));
  return data;
}
export async function bootstrap(deviceId: string, requestId: string, acknowledged = false, takeover = false): Promise<Checkpoint<GameState, Catalog>> {
  if (gameMode === 'demo') {
    const previous = await gameStorage.get('rags:demo:v1');
    if (previous && !acknowledged) throw new LegacyMigrationRequired(JSON.parse(previous));
    return { state: createGame(Math.floor(Math.random() * 0xffff_ffff), defaultCatalog), catalog: defaultCatalog, revision: 0, sequence: 0, legacyV1: previous ? JSON.parse(previous) : null };
  }
  if (takeover) {
    const { error } = await supabase!.rpc('takeover_game_v2', { device_id: deviceId, acknowledge: true });
    if (error) throw new Error(error.message);
  }
  if (acknowledged) {
    // Resolve the exact old uncertain command before the v1 writer becomes read-only.
    const pending = await gameStorage.get('rags:cloud:uncertain:v1');
    if (pending) {
      const old = JSON.parse(pending) as import('./types').CommandRequest;
      if (!['start','actions'].includes(old.operation) || typeof old.requestId !== 'string') throw new Error('The previous command needs recovery before migration.');
      const {data,error} = await supabase!.rpc(old.operation === 'start' ? 'start_run' : 'submit_actions',
        old.operation === 'start' ? {request_id:old.requestId} : {request_id:old.requestId,run_id:old.runId!,expected_revision:old.expectedRevision!,actions:old.actions!});
      if (error) throw new Error(`Resolve the previous save before migration: ${error.message}`);
      await gameStorage.set('rags:cloud:archive:v1:receipt', JSON.stringify(data));
      await gameStorage.set('rags:cloud:archive:v1:uncertain', pending);
      await gameStorage.remove('rags:cloud:uncertain:v1');
    }
  }
  const result = await edge({ operation: acknowledged ? 'initialize' : 'bootstrap', deviceId, requestId }) as BootWire;
  if (!result.state) throw new LegacyMigrationRequired(result.legacyV1);
  assertState(result.state);
  validateCatalog(result.catalog);
  if (result.nextCatalog) validateCatalog(result.nextCatalog);
  return { ...result, state: result.state, sequence: result.sequence ?? result.seq ?? 0 };
}
export async function submit(batch: FrozenBatch<GameAction>): Promise<SyncReply<GameState,Catalog>> {
  const result = await edge(batch as unknown as Record<string, unknown>);
  assertState(result.state);
  if (result.catalog) validateCatalog(result.catalog);
  if (result.nextCatalog) validateCatalog(result.nextCatalog);
  return { ...result, sequence: result.sequence ?? result.seq } as SyncReply<GameState,Catalog>;
}
export const defaultShowcase: ShowcaseSettings = { name:'Player',avatar:'person',visible:false,showJob:true,showTotal:true,titleId:null,qualificationId:null,itemIds:[] };
export async function getMyShowcase():Promise<ShowcaseSettings> {
  if (gameMode === 'demo') return defaultShowcase;
  const {data,error} = await supabase!.rpc('get_my_game_showcase');
  if (error) throw new Error(error.message);
  return (data ?? defaultShowcase) as unknown as ShowcaseSettings;
}
export function validSavedRecord(value: unknown): boolean {
  try {
    const saved = value as {version:number;deviceId:string;checkpoint:Checkpoint<GameState,Catalog>;journal:GameAction[];frozen:FrozenBatch<GameAction>|null;lastSyncAt:number};
    if (saved.version !== 2 || typeof saved.deviceId !== 'string' || !Array.isArray(saved.journal) || saved.journal.length > 512
      || !Number.isFinite(saved.lastSyncAt) || !Number.isInteger(saved.checkpoint.revision) || !Number.isInteger(saved.checkpoint.sequence)) return false;
    assertState(saved.checkpoint.state); validateCatalog(saved.checkpoint.catalog);
    if (saved.checkpoint.nextCatalog) validateCatalog(saved.checkpoint.nextCatalog);
    if (saved.frozen && (typeof saved.frozen.requestId !== 'string' || !Array.isArray(saved.frozen.actions)
      || saved.frozen.actions.length > saved.journal.length
      || saved.frozen.deviceId !== saved.deviceId || saved.frozen.baseRevision !== saved.checkpoint.revision
      || saved.frozen.startSequence !== saved.checkpoint.sequence + 1
      || saved.frozen.catalogVersion !== saved.checkpoint.catalog.manifest.version
      || JSON.stringify(saved.frozen.actions) !== JSON.stringify(saved.journal.slice(0, saved.frozen.actions.length)))) return false;
    return true;
  } catch { return false; }
}
const boardCache = new Map<string, {at:number; board:Leaderboard}>();
export async function getLeaderboard(jobId: string, force = false): Promise<Leaderboard> {
  const cached = boardCache.get(jobId);
  if (!force && cached && Date.now() - cached.at < 60_000) return cached.board;
  if (gameMode === 'demo') return { rows: [], myEntry: null, asOf: new Date().toISOString() };
  await initializeAuth();
  const { data, error } = await supabase!.rpc('get_job_leaderboard', { job_id: jobId, limit_count: 50 });
  if (error) { if (cached) return cached.board; throw new Error(error.message); }
  const board = data as unknown as Leaderboard;
  if (!board || !Array.isArray(board.rows)) throw new Error('Invalid leaderboard response.');
  boardCache.set(jobId, { at: Date.now(), board }); return board;
}
export async function getPublicProfile(playerId: string): Promise<PublicProfile> {
  if (!supabase) throw new Error('Public profiles are available in ranked mode.');
  const {data,error} = await supabase.rpc('get_public_game_profile', { player_id: playerId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('This profile is private or unavailable.');
  return data as unknown as PublicProfile;
}
export async function saveShowcase(settings: ShowcaseSettings) {
  if (gameMode === 'demo') throw new Error('Practice achievements cannot be published.');
  const {error} = await supabase!.rpc('update_game_showcase', { settings: settings as unknown as import('@/lib/supabase/database.types').Json });
  if (error) throw new Error(error.message);
  boardCache.clear();
}
