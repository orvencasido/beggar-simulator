import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useState, type ReactNode } from 'react';
import { GameButton, GameScreen, GameSection, GameText } from '@/components/game';
import { useGame } from '@/features/game/game-provider';

export function GameGate({ children, allowEnded = false }: { children: ReactNode; allowEnded?: boolean }) {
  const game = useGame();
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);
  const hasPreviousLife = !!(game.legacyRecord && typeof game.legacyRecord === 'object' && 'run' in game.legacyRecord && game.legacyRecord.run);
  if (game.legacyMigrationRequired) return <GameScreen>
    <GameText variant="eyebrow" tone="accent">A NEW CHAPTER</GameText><GameText variant="title">A whole lifetime awaits.</GameText>
    <GameText>{hasPreviousLife ? 'Your previous save will be archived before starting the new lifetime game at age 18. Your recorded work earnings stay a separately labeled historical record; past age and career scores are never guessed.' : 'Start at age 18 with nothing. Work, stay fed and build a life of your own. Each day you choose advances your age; time away is safe.'}</GameText>
    <GameButton title={!hasPreviousLife ? 'Start your life' : migrationConfirmed ? 'Archive my old save and continue' : 'Review migration'} onPress={() => { if (!hasPreviousLife || migrationConfirmed) void game.acknowledgeLegacyMigration(); else setMigrationConfirmed(true); }} loading={game.busy} testID={hasPreviousLife ? 'acknowledge-migration' : 'start-run'} />
    {hasPreviousLife && migrationConfirmed && <GameText variant="caption" tone="secondary">This begins a fresh life with no possessions or degrees. Your previous save remains in the archive.</GameText>}
  </GameScreen>;
  if (game.loading && !game.state) return <GameScreen><ActivityIndicator accessibilityLabel="Loading your life" /><GameText tone="secondary">Finding your place…</GameText></GameScreen>;
  if (!game.state || !game.catalog) return <GameScreen><GameText variant="heading">Your life is safely paused</GameText><GameText tone="danger">{game.error ?? 'Reconnect to load your save.'}</GameText><GameButton title="Try again" onPress={() => void game.refresh()} loading={game.busy} /></GameScreen>;
  if (!allowEnded && game.state.status !== 'active') return <Redirect href="/game-over" />;
  return <>{children}</>;
}
export function GameFeedback({ compact = false }: { compact?: boolean }) {
  const game = useGame();
  if (game.syncStatus === 'offline' || game.syncStatus === 'paused') return <GameSection variant="surface" accessibilityLiveRegion="polite">
    <GameText variant="caption" tone="warning">{game.error ?? 'Ranked play is paused. Reconnect to keep playing.'}</GameText>
    <GameButton title="Save / reconnect" variant="secondary" onPress={() => void game.sync()} disabled={game.busy} />
  </GameSection>;
  if (game.error) {
    const messages: Record<string, string> = { insufficient_money: 'A little more money is needed.', need_full: 'You are already fully recovered.', minimum_deposit: 'Choose an amount above the minimum deposit.', insufficient_savings: 'There isn’t enough in savings.', job_locked: 'Complete this job’s requirements first.', already_owned: 'This is already yours.', already_selected: 'This is your current job.' };
    return <GameText variant="caption" tone="warning">{messages[game.error] ?? game.error.replaceAll('_', ' ')}</GameText>;
  }
  const text = game.mode === 'demo' ? 'Practice · saved on this device' : game.syncStatus === 'syncing' ? 'Verifying progress…' : game.pendingCount ? 'Saved on device · sync queued' : 'Progress saved';
  return <GameText variant="caption" tone="secondary" style={{ textAlign: compact ? 'center' : 'left' }}>{text}</GameText>;
}
