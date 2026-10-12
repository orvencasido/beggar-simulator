import { useState } from 'react';
import { View } from 'react-native';
import { GameBadge, GameButton, GameChoice, GameDivider, GameScreen, GameSection, GameText } from '@/components/game';
import { gameSpacing } from '@/constants/game-theme';
import { getAge, getGoalProgress } from '@/game-core';
import { useGame } from '@/features/game/game-provider';
import { GameFeedback, GameGate } from './game-gate';
import { FinanceSummary, itemName, jobName, money, qualificationName, SectionHeading, StatRow, titleName } from './screen-parts';

export function JourneyScreen() { return <GameGate allowEnded><JourneyContent /></GameGate>; }
function JourneyContent() {
  const game = useGame(), state = game.state!, catalog = game.catalog!;
  const [section, setSection] = useState<'goals' | 'milestones' | 'history' | 'finances'>('goals');
  const [chapterId, setChapterId] = useState<string | null>(null);
  const goal = getGoalProgress(state, catalog);
  const goalKind = state.selectedGoalId?.startsWith('item:') ? 'own_item' : Object.hasOwn(state.savingsGoals, state.selectedGoalId ?? '') ? 'savings' : catalog.goals.find(g => g.id === state.selectedGoalId)?.kind;
  const disabled = game.busy || game.weekRunning || state.status !== 'active' || game.syncStatus === 'paused';
  const history = [...state.legacy].reverse();
  const careerBadges = catalog.jobs.filter(j => state.badges.includes(`career_${j.id}`)).sort((a, b) => BigInt(a.baseEarnings) > BigInt(b.baseEarnings) ? -1 : 1);
  return <GameScreen>
    <GameText variant="eyebrow" tone="accent">YOUR STORY, STILL GROWING</GameText>
    <GameText variant="title">{careerBadges[0]?.name ?? 'Small beginnings'}</GameText>
    <GameText variant="caption" tone="secondary">Earned legacy identity · current life: {jobName(state.jobId, catalog)}</GameText>
    <GameSection><StatRow title="Account level" value={String(state.accountLevel)} /><StatRow title="Completed lifetimes" value={String(state.completedLifetimes)} /><StatRow title="Rebirths" value={String(state.rebirthCount)} /><StatRow title="Lifetime work earnings" value={money(state.workEarned)} /></GameSection>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gameSpacing.sm }}>{(['goals', 'milestones', 'history', 'finances'] as const).map(id => <GameButton key={id} title={id[0].toUpperCase() + id.slice(1)} variant={section === id ? 'primary' : 'secondary'} onPress={() => setSection(id)} testID={`journey-${id}`} />)}</View>
    <GameFeedback />
    {section === 'goals' && <>
      <SectionHeading title="One thing to aim for" detail="Purchase goals finish when you own the item. Study goals track learning; earnings goals track work. Wallet targets can fall after spending." />
      {goal && <GameSection variant="accent"><GameText variant="heading">{goal.name}</GameText><GameText variant="caption">{goal.complete ? 'Achieved' : `${money(goal.current)} / ${money(goal.target)}`}{goalKind === 'qualification' ? ' study days' : goal.usesBank ? ' · total liquid savings' : goalKind === 'earnings' ? ' · lifetime work earned' : ' · wallet money'}</GameText><GameButton title="Clear tracked goal" variant="quiet" disabled={disabled} onPress={() => void game.selectGoal(null)} /></GameSection>}
      {catalog.goals.filter(g => g.available).map(g => <GameChoice key={g.id} title={g.name} selected={state.selectedGoalId === g.id} onPress={() => void game.selectGoal(g.id)} disabled={disabled} testID={`goal-${g.id}`} />)}
      <GameDivider /><SectionHeading title="What will this life mean?" detail="Ambitions give direction and an earned title, without bonus payouts or inherited advantages." />
      {catalog.ambitions.filter(a => a.available).map(a => <GameChoice key={a.id} title={a.name} selected={state.selectedAmbitionId === a.id} detail={a.kind === 'career' ? `Work as ${jobName(a.targetId, catalog)}` : a.kind === 'homeowner' ? `Own ${itemName(a.targetId, catalog)} or a higher priced home` : a.kind === 'garage' ? 'Collect three cars beyond bike and scooter' : `Live to age ${catalog.economy.endAge}`} onPress={() => void game.selectAmbition(a.id)} disabled={disabled} testID={`ambition-${a.id}`} />)}
      {state.selectedAmbitionId && <GameButton title="Clear ambition" variant="quiet" disabled={disabled} onPress={() => void game.selectAmbition(null)} />}
    </>}
    {section === 'milestones' && <>
      <SectionHeading title="Every step stays with you" detail="Titles and milestones persist through rebirth. They give recognition, not extra money or career eligibility." />
      {!state.badges.length && <GameText tone="secondary">Your first work day begins the story.</GameText>}
      {state.badges.map(id => <GameChoice key={id} title={titleName(id, catalog)} detail="Earned lifetime achievement" onPress={() => setChapterId(chapterId === id ? null : id)} selected={chapterId === id} />)}
      {chapterId && state.badges.includes(chapterId) && <GameText variant="caption" tone="secondary">Earned in your recorded progress. You may select eligible titles for your showcase in Leaders after syncing.</GameText>}
      <SectionHeading title="Personal records" /><StatRow title="Best life work earnings" value={money(history.reduce((best, life) => BigInt(life.workEarned) > best ? BigInt(life.workEarned) : best, BigInt(state.lifeWorkEarned)))} /><StatRow title="Peak recorded wealth" value={money(history.reduce((best, life) => BigInt(life.peakWealth) > best ? BigInt(life.peakWealth) : best, BigInt(state.peakWealth)))} /><StatRow title="Longest completed life" value={`${history.reduce((best, life) => Math.max(best, life.elapsedDays), 0)} days`} />
    </>}
    {section === 'finances' && <>
      <SectionHeading title={`Life ${state.lifeNumber} finances`} detail={`Age ${getAge(state, catalog)} · ${state.elapsedDays} days lived`} /><StatRow title="Wallet money" value={money(state.money)} /><StatRow title="Savings" value={money(state.bank.balance)} /><StatRow title="Peak wealth this life" value={money(state.peakWealth)} /><FinanceSummary earned={state.lifeWorkEarned} interest={state.bank.interestEarned} opportunities={state.opportunityIncome} finance={state.finance} />
      <GameText variant="caption" tone="secondary">Transfers are not spending. Interest and contract bonuses do not count toward career boards.</GameText>
    </>}
    {section === 'history' && <>
      <SectionHeading title="Chapters you have lived" detail="A past-life gallery records possessions and graduation. History grants no present ownership, money or qualifications." />
      {!history.length && <GameText tone="secondary">Your first life is still unfolding. A chapter is recorded when hunger reaches zero or you reach age {catalog.economy.endAge}.</GameText>}
      {history.map(chapter => <GameSection key={chapter.lifeId}>
        <GameChoice title={`Life ${chapter.lifeNumber} · age ${chapter.age}`} detail={`${chapter.status === 'age_limit' ? 'A complete lifetime' : 'Hunger ended this life'} · ${money(chapter.workEarned)} work earned`} selected={chapterId === chapter.lifeId} onPress={() => setChapterId(chapterId === chapter.lifeId ? null : chapter.lifeId)} testID={`chapter-${chapter.lifeNumber}`} />
        {chapterId === chapter.lifeId && <>
          <GameBadge tone={chapter.status === 'age_limit' ? 'accent' : 'neutral'}>{chapter.status === 'age_limit' ? 'Reached 100 · level earned' : 'Ended early · no level earned'}</GameBadge>
          <StatRow title="Days lived" value={String(chapter.elapsedDays)} /><StatRow title="Peak wealth" value={money(chapter.peakWealth)} /><GameText variant="caption" tone="secondary">Catalog {chapter.catalogVersion}</GameText>
          <SectionHeading title="Past-life gallery" />
          {!!chapter.qualifications.length && chapter.qualifications.map(id => <GameText key={id} variant="caption">{qualificationName(id, catalog)} · {catalog.colleges.find(c => c.id === chapter.qualificationColleges[id])?.name ?? 'Recorded college'} · past graduation</GameText>)}
          {!!chapter.ownedItemIds.length && chapter.ownedItemIds.map(id => <GameText key={id} variant="caption" tone="secondary">{itemName(id, catalog)} · past possession</GameText>)}
          {!chapter.ownedItemIds.length && !chapter.qualifications.length && <GameText variant="caption" tone="secondary">A life of small beginnings.</GameText>}
          <SectionHeading title="Career work earnings" />{Object.entries(chapter.jobEarnings).map(([id, amount]) => <StatRow key={id} title={jobName(id, catalog)} value={money(amount)} />)}
          <FinanceSummary earned={chapter.workEarned} interest={chapter.interestEarned} opportunities={chapter.opportunityIncome} finance={chapter.finance} />
        </>}
      </GameSection>)}
    </>}
    <GameText variant="caption" tone="secondary">Level increases only after an age-{catalog.economy.endAge} lifetime. A hunger death can begin another life, but never earns a level. Rebirth resets wallet, savings, degrees, possessions and experience.</GameText>
  </GameScreen>;
}
