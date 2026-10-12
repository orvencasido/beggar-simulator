export type JobId = 'begging' | 'newspaper' | 'courier' | 'freelancer';
export type EquipmentId = 'bike' | 'delivery_kit' | 'laptop';
export type FoodId = 'bread' | 'meal';
export interface GameRun {
  id: string;
  status: 'active' | 'dead';
  money: string;
  earned: string;
  hunger: number;
  sanity: number;
  jobId: JobId;
  skillLevel: number;
  equipment: EquipmentId[];
  revision: number;
  actions: number;
}
export interface GameSnapshot {
  run: GameRun | null;
  summary: { lifetimeEarned: string; bestRunEarned: string; completedRuns: number };
  version: number;
}
export type GameAction =
  | { type: 'work' }
  | { type: 'eat'; item_id: FoodId }
  | { type: 'rest' }
  | { type: 'buy_equipment'; item_id: EquipmentId }
  | { type: 'choose_job'; job_id: JobId }
  | { type: 'buy_skill_level' };
export interface CommandRequest {
  requestId: string;
  runId?: string;
  expectedRevision?: number;
  actions?: GameAction[];
  operation: 'start' | 'actions';
}
export interface CommandResult {
  snapshot: GameSnapshot;
  processed: number;
  stopReason?: string | null;
  requestId: string;
}
export interface GameTransport {
  initialize(): Promise<void>;
  snapshot(): Promise<GameSnapshot>;
  execute(request: CommandRequest): Promise<CommandResult>;
}
