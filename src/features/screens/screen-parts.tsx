import { useState } from 'react';
import { View } from 'react-native';
import { GameButton, GameDivider, GameSection, GameText } from '@/components/game';
import { gameSpacing, useGameTheme } from '@/constants/game-theme';
import { applyAction, type GameAction, type GameState, type Catalog } from '@/game-core';
import { useGame } from '@/features/game/game-provider';

export function money(value: string | number | bigint) { return BigInt(value).toLocaleString('en-US'); }
export function label(id: string) { return id.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
export function itemName(id: string, catalog: Catalog) { return catalog.items.find(i => i.id === id)?.name ?? label(id); }
export function qualificationName(id: string, catalog: Catalog) { return catalog.qualifications.find(i => i.id === id)?.name ?? label(id); }
export function jobName(id: string, catalog: Catalog) { return catalog.jobs.find(i => i.id === id)?.name ?? label(id); }
export function titleName(id: string, catalog: Catalog) {
  if (id.startsWith('career_')) return jobName(id.slice(7), catalog);
  if (id.startsWith('graduate_')) return `${qualificationName(id.slice(9), catalog)} graduate`;
  if (id.startsWith('ambition_')) return catalog.ambitions.find(a => a.id === id.slice(9))?.name ?? label(id);
  return label(id);
}
export function spendable(state: GameState) { return BigInt(state.money) + (state.bank.autoWithdraw ? BigInt(state.bank.balance) : 0n); }
export function canAfford(state: GameState, amount: string) { return spendable(state) >= BigInt(amount); }
export function percent(current: string, target: string) { return Number(BigInt(current) * 10000n / (BigInt(target) || 1n)) / 100; }
export function MoneyProgress({ name, current, target, complete = false, usesBank = false, completedLabel = 'achieved' }: { name: string; current: string; target: string; complete?: boolean; usesBank?: boolean; completedLabel?: string }) {
  const colors = useGameTheme();
  const progress = complete ? 100 : Math.min(100, Math.max(0, percent(current, target)));
  return <View style={{ gap: gameSpacing.sm }} accessible accessibilityLabel={`${name}. ${money(current)} of ${money(target)}. ${complete ? 'Complete.' : `${Math.floor(progress)} percent.`}${usesBank ? ' Wallet plus bank savings.' : ' Wallet money.'}`}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: gameSpacing.xs }}><GameText variant="caption">{name}{complete ? ` · ${completedLabel}` : ''}</GameText>{!complete && <GameText variant="caption" tone="secondary">{money(current)} / {money(target)}</GameText>}</View>
    <View style={{ height: 4, backgroundColor: colors.meterTrack, borderRadius: 4, overflow: 'hidden' }}><View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.accent }} /></View>
    {usesBank && <GameText variant="caption" tone="secondary">Total liquid savings · wallet + bank</GameText>}
  </View>;
}
export function StatRow({ title, value }: { title: string; value: string }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: gameSpacing.sm }}><GameText tone="secondary" variant="caption">{title}</GameText><GameText variant="caption" style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>{value}</GameText></View>;
}
export function SectionHeading({ title, detail }: { title: string; detail?: string }) { return <View style={{ gap: gameSpacing.xs }}><GameText variant="heading">{title}</GameText>{detail && <GameText variant="caption" tone="secondary">{detail}</GameText>}</View>; }
export function useSafeAction() {
  const game = useGame();
  const [pending, setPending] = useState<GameAction | null>(null);
  const run = (action: GameAction) => {
    if (!game.state || !game.catalog) return;
    const preview = applyAction(game.state, action, game.catalog);
    if (preview.accepted && preview.state.status === 'hunger') setPending(action);
    else { setPending(null); void game.act(action); }
  };
  const confirmation = pending && <GameSection variant="surface" accessibilityLiveRegion="assertive">
    <GameText variant="heading" tone="danger">This day will end your life</GameText><GameText variant="caption">Hunger will reach zero. Eat before continuing, or accept this life’s end.</GameText>
    <GameButton title="Continue anyway" variant="danger" disabled={game.busy || game.weekRunning} onPress={() => { const action = pending; setPending(null); void game.act(action); }} testID="confirm-lethal" />
    <GameButton title="Keep going safely" variant="secondary" onPress={() => setPending(null)} />
  </GameSection>;
  return { run, confirmation, pending: !!pending };
}
export function FinanceSummary({ finance, earned, interest, opportunities }: { finance: GameState['finance']; earned: string; interest: string; opportunities: string }) {
  return <GameSection><StatRow title="Work earnings" value={money(earned)} /><StatRow title="Bank interest" value={money(interest)} /><StatRow title="Contract income" value={money(opportunities)} /><GameDivider />{Object.entries(finance).map(([id, value]) => <StatRow key={id} title={`${label(id)} spending`} value={money(value)} />)}</GameSection>;
}
