import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GameButton, GameChoice, GameScreen, GameSection, GameText, ResourceMeter } from '@/components/game';
import { gameSpacing } from '@/constants/game-theme';
import { applyAction, getAge, getGoalProgress, getJobReward, previewWorkWeek, workHungerCost } from '@/game-core';
import { useGame } from '@/features/game/game-provider';
import { GameFeedback, GameGate } from './game-gate';
import { canAfford, money, MoneyProgress, useSafeAction } from './screen-parts';

export function PlayScreen() { return <GameGate><HomeContent /></GameGate>; }
function HomeContent() {
  const game = useGame();
  const state = game.state!, catalog = game.catalog!;
  const safe = useSafeAction();
  const [options, setOptions] = useState(false);
  const [foodId, setFoodId] = useState('');
  const [foodsOpen, setFoodsOpen] = useState(false);
  const job = catalog.jobs.find(j => j.id === state.jobId)!;
  const foods = catalog.items.filter(i => i.available && i.effect === 'food');
  const food = foods.find(i => i.id === foodId) ?? foods[0];
  const goal = getGoalProgress(state, catalog);
  const goalKind = state.selectedGoalId?.startsWith('item:') ? 'own_item' : Object.hasOwn(state.savingsGoals, state.selectedGoalId ?? '') ? 'savings' : catalog.goals.find(g => g.id === state.selectedGoalId)?.kind;
  const moneyGoal = goal && (goalKind === 'own_item' || goalKind === 'savings');
  const blocked = game.busy || game.weekRunning || game.syncStatus === 'paused';
  const rest = applyAction(state, { type: 'rest' }, catalog);
  const eat = food && applyAction(state, { type: 'eat', item_id: food.id }, catalog);
  const week = options ? previewWorkWeek(state, catalog) : null;
  return <GameScreen contentContainerStyle={{ gap: gameSpacing.edge }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: gameSpacing.sm }}><GameText variant="eyebrow" tone="secondary">LIFE {state.lifeNumber}</GameText><GameText variant="caption" tone="secondary">Age {getAge(state, catalog)} · day {state.elapsedDays % catalog.economy.daysPerYear + 1}</GameText></View>
    <GameSection><GameText variant="eyebrow" tone="secondary">WALLET MONEY</GameText><GameText variant="money" testID="money" accessibilityLabel={`${state.money} spendable wallet money`}>{money(state.money)}</GameText>
      {moneyGoal && <MoneyProgress {...goal} completedLabel={goalKind === 'own_item' ? 'owned' : 'achieved'} />}
    </GameSection>
    <GameSection><ResourceMeter label="Hunger" value={state.hunger} kind="hunger" /><ResourceMeter label="Sanity" value={state.sanity} kind="sanity" status={state.sanity >= 50 ? 'Good' : state.sanity >= 20 ? '80% earnings' : '60% earnings'} /></GameSection>
    {state.hunger <= Math.max(20, workHungerCost(state, catalog)) && <GameText variant="caption" tone="warning">Eat before your next work day. Hunger at zero ends this life.</GameText>}
    {state.health < 4000 && <GameButton title={state.health < 2000 ? 'Frail · visit care' : 'Unwell · visit care'} variant="quiet" onPress={() => router.push('/career')} accessibilityHint="Find checkup and health information in Career" />}
    <GameSection style={{ gap: gameSpacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: gameSpacing.sm }}><GameText variant="heading">{job.name}</GameText><GameText variant="caption" tone="accent">+{money(getJobReward(state, catalog))}{job.maxEarnings !== job.baseEarnings ? `–${money(getJobReward(state, catalog, BigInt(job.maxEarnings)))}` : ''} / day</GameText></View>
      <GameButton title="Work" size="large" onPress={() => safe.run({ type: 'work' })} disabled={blocked || safe.pending} testID="work" subtitle={`−${workHungerCost(state, catalog)} hunger · −${job.sanityCost} sanity · 1 day`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gameSpacing.md }}>
        <GameButton title="Eat" subtitle={food ? `${food.name} · ${money(food.price)}` : 'No food available'} style={{ flexGrow: 1 }} variant="secondary" onPress={() => food && safe.run({ type: 'eat', item_id: food.id })} disabled={blocked || !food || !canAfford(state, food.price) || state.hunger === 100} testID="eat-quick" />
        <GameButton title="Rest" subtitle={rest.accepted ? `+${rest.state.sanity - state.sanity} sanity · −${state.hunger - rest.state.hunger} hunger` : 'Already rested'} style={{ flexGrow: 1 }} variant="secondary" onPress={() => safe.run({ type: 'rest' })} disabled={blocked || !rest.accepted || safe.pending} testID="rest" />
      </View>
      {food && state.hunger < 100 && !canAfford(state, food.price) && <GameText variant="caption" tone="warning">Need {money(BigInt(food.price) - BigInt(state.money) - (state.bank.autoWithdraw ? BigInt(state.bank.balance) : 0n))} more for {food.name.toLowerCase()}.</GameText>}
      {eat?.accepted && foodsOpen && <GameText variant="caption" tone="secondary">{food.name} restores {eat.state.hunger - state.hunger} hunger after today’s needs.</GameText>}
      {safe.confirmation}
      <GameButton title={foodsOpen ? 'Close food choices' : 'Choose food'} variant="quiet" onPress={() => setFoodsOpen(!foodsOpen)} />
      {foodsOpen && foods.map(f => <GameChoice key={f.id} title={`${f.name} · ${money(f.price)}`} detail={`Up to ${f.hungerRestore} hunger, less today’s needs. Uses one day.`} selected={food.id === f.id} onPress={() => setFoodId(f.id)} />)}
      {game.weekRunning ? <GameButton title="Stop after this day" variant="secondary" onPress={game.cancelWeek} testID="cancel-week" /> : <GameButton title={options ? 'Close work options' : 'Work options'} variant="quiet" onPress={() => setOptions(!options)} />}
      {options && <GameSection variant="surface">
        {state.workDays < catalog.economy.workWeekUnlockDays ? <GameText variant="caption" tone="secondary">Work a week unlocks after {catalog.economy.workWeekUnlockDays} work days · {state.workDays} completed.</GameText> : <>
          <GameText variant="heading">Work a week</GameText><GameText variant="caption">{week!.days} safe days · +{money(BigInt(week!.state.lifeWorkEarned) - BigInt(state.lifeWorkEarned))} projected earnings</GameText>
          <GameText variant="caption" tone="secondary">Age {getAge(week!.state, catalog)} · hunger {week!.state.hunger} · sanity {week!.state.sanity} · health {(week!.state.health / 100).toFixed(0)}%. Stops before starvation. Cancel at any time.</GameText>
          <GameButton title={week!.days ? `Work ${week!.days} days` : 'Eat before working'} onPress={() => void game.workWeek()} disabled={blocked || !week!.days || safe.pending} testID="work-week" />
        </>}
      </GameSection>}
    </GameSection>
    <GameFeedback compact />
  </GameScreen>;
}
