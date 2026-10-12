import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { GameButton, GameScreen, GameSection, GameText } from '@/components/game';
import { useGame } from '@/features/game/game-provider';
import { getAge } from '@/game-core';
import { GameFeedback, GameGate } from './game-gate';
import { FinanceSummary, money, StatRow } from './screen-parts';

export function GameOverScreen() { return <GameGate allowEnded><EndedContent /></GameGate>; }
function EndedContent() {
  const game = useGame(), state = game.state!, catalog = game.catalog!;
  const [confirm, setConfirm] = useState(false);
  const [starting, setStarting] = useState(false);
  if (state.status === 'active') return <Redirect href="/" />;
  const completed = state.status === 'age_limit';
  return <GameScreen>
    <GameText variant="eyebrow" tone="accent">LIFE {state.lifeNumber} · AGE {getAge(state, catalog)}</GameText>
    <GameText variant="title">{completed ? 'A lifetime well lived.' : 'A chapter closes.'}</GameText>
    <GameText tone="secondary">{completed ? `You reached age ${catalog.economy.endAge}. Your account is now level ${state.accountLevel}.` : 'Hunger reached zero. This life is remembered, and a fresh start awaits. No level is awarded for an early ending.'}</GameText>
    <GameSection variant="accent"><StatRow title="Work earned this life" value={money(state.lifeWorkEarned)} /><StatRow title="Days lived" value={String(state.elapsedDays)} /><StatRow title="Peak wealth" value={money(state.peakWealth)} /></GameSection>
    <FinanceSummary earned={state.lifeWorkEarned} interest={state.bank.interestEarned} opportunities={state.opportunityIncome} finance={state.finance} />
    <GameButton title="Visit your legacy" variant="secondary" onPress={() => router.push('/journey')} />
    <GameFeedback />
    {confirm && <GameSection variant="surface"><GameText variant="heading">Begin with a clean slate</GameText><GameText variant="caption">Age 18, begging, full needs, no money, savings, degrees, possessions or career experience. Your earnings, earned titles and past-life gallery remain. There is no inheritance or payout bonus.</GameText><GameButton title="Keep this chapter open" variant="quiet" onPress={() => setConfirm(false)} /></GameSection>}
    <GameButton title={confirm ? 'Confirm rebirth' : 'Begin a new life'} loading={starting} disabled={game.busy || game.syncStatus === 'paused'} testID="restart-run" onPress={async () => { if (!confirm) { setConfirm(true); return; } setStarting(true); try { if (await game.rebirth()) router.replace('/'); } finally { setStarting(false); } }} />
  </GameScreen>;
}
