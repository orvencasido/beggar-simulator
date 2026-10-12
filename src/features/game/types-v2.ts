export type { GameState, Catalog, GameAction } from '@/game-core';

export interface ShowcaseSettings {
  name: string;
  avatar: string;
  visible: boolean;
  showJob: boolean;
  showTotal: boolean;
  titleId: string | null;
  qualificationId: string | null;
  itemIds: string[];
}
export interface PublicProfile {
  playerId: string;
  name: string;
  avatar: string;
  title: string | null;
  jobId: string | null;
  totalEarnings?: string | null;
  qualification?: {id:string;name:string;source:'current'|'past_life';collegeId?:string;collegeName?:string} | null;
  items?: { id: string; name:string;icon:string;source:'current'|'past_life' }[];
  accountLevel?:number; rebirthCount?:number; completedLifetimes?:number;
  showcase?: Record<string, unknown>;
}
export interface LeaderboardEntry {
  playerId: string; name: string; avatar: string; title: string | null;
  jobId?: string | null; jobEarnings: string; rank: number | null; boardJobId?:string; totalEarnings?:string; items?:PublicProfile['items']; qualification?:PublicProfile['qualification']; accountLevel?:number; rebirthCount?:number; completedLifetimes?:number; titleId?:string|null;
  showcase?: Record<string, unknown>;
}
export interface Leaderboard { rows: LeaderboardEntry[]; myEntry: LeaderboardEntry | null; asOf: string }
