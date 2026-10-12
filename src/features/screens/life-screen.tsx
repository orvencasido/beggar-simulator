import { useState } from 'react';
import { View } from 'react-native';
import { GameBadge, GameButton, GameChoice, GameDivider, GameField, GameScreen, GameSection, GameText, GameToggle } from '@/components/game';
import { gameSpacing, useGameTheme } from '@/constants/game-theme';
import { applyAction, isMoney, type Item } from '@/game-core';
import { useGame } from '@/features/game/game-provider';
import { GameFeedback, GameGate } from './game-gate';
import { canAfford, itemName, label, money, MoneyProgress, SectionHeading, StatRow, useSafeAction } from './screen-parts';

export function LifeScreen() { return <GameGate><LifeContent /></GameGate>; }
function LifeContent() {
  const game = useGame(), state = game.state!, catalog = game.catalog!;
  const [section, setSection] = useState<'wants' | 'collection' | 'bank'>('wants');
  const [category, setCategory] = useState('vehicles');
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const safe = useSafeAction();
  const blocked = game.busy || game.weekRunning || game.syncStatus === 'paused';
  const categories = [...new Set(catalog.items.map(i => i.category))];
  const visible = catalog.items.filter(i => i.category === category && i.name.toLowerCase().includes(query.toLowerCase()) && (section === 'collection' ? state.ownedItemIds.includes(i.id) : i.available || state.ownedItemIds.includes(i.id)));
  const itemDetails = (item: Item) => {
    const owned = state.ownedItemIds.includes(item.id), active = Object.values(state.equipped).includes(item.id);
    const missing = item.requirements.itemIds.filter(id => !state.ownedItemIds.includes(id));
    const foodResult = item.effect === 'food' ? applyAction(state, { type: 'eat', item_id: item.id }, catalog) : null;
    const unlockedJobs = catalog.jobs.filter(j => j.requirements.itemIds.includes(item.id));
    const equippable = ['housing', 'vehicles', 'motorcycles', 'fashion'].includes(item.category);
    return <GameSection style={{ paddingBottom: gameSpacing.lg }}>
      <GameBadge tone={owned ? 'accent' : 'neutral'}>{owned ? active ? 'Equipped this life' : 'Owned this life' : item.effect === 'unlock' ? 'Career equipment' : item.effect === 'food' ? 'Food' : item.effect === 'travel' ? 'Travel experience' : 'Collectible'}</GameBadge>
      {item.effect === 'food' ? <GameText variant="caption">Up to {item.hungerRestore} hunger · 1 day. {foodResult?.accepted ? `Restores ${foodResult.state.hunger - state.hunger} after today’s needs.` : state.hunger === 100 ? 'You are already full.' : 'Eat when you can afford it.'}</GameText> : <GameText variant="caption" tone="secondary">{unlockedJobs.length ? `Required for ${unlockedJobs.map(j => j.name).join(', ')}.` : item.effect === 'travel' ? 'Buy once, then take the trip in one game day to earn its experience badge.' : 'An optional possession for your life and public showcase. No earnings or survival bonus.'}</GameText>}
      {!!missing.length && <GameText variant="caption" tone="warning">First own {missing.map(id => itemName(id, catalog)).join(', ')}.</GameText>}
      {!owned && <GameButton title={`${item.effect === 'food' ? 'Eat' : 'Buy'} ${item.name} · ${money(item.price)}`} disabled={blocked || !item.available || !!missing.length || !canAfford(state, item.price) || (item.effect === 'food' && !foodResult?.accepted)} onPress={() => item.effect === 'food' ? safe.run({ type: 'eat', item_id: item.id }) : void game.buyItem(item.id)} testID={`buy-${item.id}`} />}
      {!owned && !canAfford(state, item.price) && <GameText variant="caption" tone="secondary">Need {money(BigInt(item.price) - BigInt(state.money) - (state.bank.autoWithdraw ? BigInt(state.bank.balance) : 0n))} more.</GameText>}
      {owned && equippable && <GameButton title={active ? 'Equipped' : 'Use in my life'} variant="secondary" disabled={blocked || active} onPress={() => void game.equip(item.id)} testID={`equip-${item.id}`} />}
      {owned && item.effect === 'travel' && <GameButton title={state.travelCompletedIds.includes(item.id) ? 'Experience completed' : 'Take the trip · 1 day'} variant="secondary" disabled={blocked || state.travelCompletedIds.includes(item.id) || safe.pending} onPress={() => safe.run({ type: 'travel', item_id: item.id })} testID={`travel-${item.id}`} />}
      {item.effect !== 'food' && !owned && <GameButton title={state.selectedGoalId === `item:${item.id}` ? 'Your tracked wish' : 'Make this my next wish'} variant="quiet" disabled={blocked} onPress={() => void game.selectGoal(`item:${item.id}`)} testID={`wish-${item.id}`} />}
    </GameSection>;
  };
  return <GameScreen>
    <LifeScene />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gameSpacing.sm }}>{(['wants', 'collection', 'bank'] as const).map(id => <GameButton key={id} title={label(id)} variant={section === id ? 'primary' : 'secondary'} onPress={() => setSection(id)} testID={`life-${id}`} />)}</View>
    <GameFeedback />
    {section === 'bank' ? <BankPanel /> : <>
      <SectionHeading title={section === 'collection' ? 'Your collection' : 'Something to look forward to'} detail={section === 'collection' ? `${state.ownedItemIds.length} possessions this life · past lives are in Journey` : 'Wants are optional. Equipment opens work; collections tell your story.'} />
      <GameButton title={`${label(category)} · choose collection`} variant="secondary" onPress={() => setCategoriesOpen(!categoriesOpen)} />
      {categoriesOpen && categories.map(id => <GameChoice key={id} title={label(id)} selected={category === id} detail={`${catalog.items.filter(i => i.category === id && state.ownedItemIds.includes(i.id)).length} / ${catalog.items.filter(i => i.category === id && i.effect !== 'food').length} owned`} onPress={() => { setCategory(id); setSelected(null); setCategoriesOpen(false); }} testID={`category-${id}`} />)}
      <GameField label="Find a want" onChangeText={setQuery} testID="find-item" />
      {!visible.length && <GameText tone="secondary">{section === 'collection' ? 'Nothing in this collection yet. Browse wants to choose your next step.' : 'No matching wants. Try another name or collection.'}</GameText>}
      {visible.map(item => <View key={item.id} style={{ gap: gameSpacing.md }}><GameChoice title={item.name} detail={`${money(item.price)} · ${state.ownedItemIds.includes(item.id) ? 'Owned' : item.effect === 'food' ? 'Food' : item.effect === 'unlock' ? 'Opens work' : 'Optional'}`} selected={selected === item.id} onPress={() => setSelected(selected === item.id ? null : item.id)} testID={`item-${item.id}`} />{selected === item.id && itemDetails(item)}</View>)}
      {safe.confirmation}
    </>}
  </GameScreen>;
}

function LifeScene() {
  const state = useGame().state!, catalog = useGame().catalog!, colors = useGameTheme();
  const residence = state.equipped.residence && catalog.items.find(i => i.id === state.equipped.residence);
  const vehicle = state.equipped.vehicle && catalog.items.find(i => i.id === state.equipped.vehicle);
  const outfit = state.equipped.outfit && catalog.items.find(i => i.id === state.equipped.outfit);
  const floors = !residence ? 1 : BigInt(residence.price) >= 600000n ? 3 : 2;
  return <GameSection variant="accent">
    <GameText variant="eyebrow" tone="accent">YOUR LIFE, TODAY</GameText>
    <View accessible={false} style={{ minHeight: 100, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: gameSpacing.xl }}>
      <View style={{ padding: gameSpacing.md, borderWidth: 2, borderColor: colors.accent, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: gameSpacing.sm }}>{Array.from({ length: floors }, (_, floor) => <View key={floor} style={{ flexDirection: 'row', gap: gameSpacing.md }}>{[0, 1, 2].map(n => <View key={n} style={{ width: 14, height: 14, borderWidth: 1, borderColor: colors.accent }} />)}</View>)}</View>
      {vehicle && <View style={{ width: 74, height: 30, borderWidth: 2, borderColor: colors.accent, borderRadius: 12, justifyContent: 'flex-end', flexDirection: 'row', gap: 25, paddingHorizontal: 5 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }} /><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }} /></View>}
    </View>
    <GameText variant="heading">{residence ? residence.name : 'Small beginnings'}</GameText>
    <GameText variant="caption" tone="secondary">{residence ? 'Your equipped residence' : 'No residence equipped'}{vehicle ? ` · ${vehicle.name}` : ''}{outfit ? ` · ${outfit.name}` : ''}</GameText>
  </GameSection>;
}

function BankPanel() {
  const game = useGame(), state = game.state!, catalog = game.catalog!;
  const [amount, setAmount] = useState('');
  const [transfer, setTransfer] = useState<'deposit' | 'withdraw' | null>(null);
  const [autoSave, setAutoSave] = useState(state.bank.autoSave);
  const [autoWithdraw, setAutoWithdraw] = useState(state.bank.autoWithdraw);
  const [reserve, setReserve] = useState(state.bank.reserve);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [message, setMessage] = useState('');
  const bankUnlocked = BigInt(state.lifeWorkEarned) >= BigInt(catalog.economy.bankUnlockEarned);
  const blocked = game.busy || game.weekRunning || game.syncStatus === 'paused';
  const validAmount = isMoney(amount) && BigInt(amount) > 0n;
  const goalId = goalName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const validGoal = /^[a-z][a-z0-9_]{0,63}$/.test(goalId) && isMoney(goalAmount) && BigInt(goalAmount) > 0n;
  const annualBase = (catalog.economy.bankNumeratorBase * catalog.economy.daysPerYear * 100 / catalog.economy.bankDenominator).toLocaleString('en-US', { maximumFractionDigits: 4 });
  const annualExcess = (catalog.economy.bankNumeratorExcess * catalog.economy.daysPerYear * 100 / catalog.economy.bankDenominator).toLocaleString('en-US', { maximumFractionDigits: 4 });
  const annualCap = (BigInt(catalog.economy.bankAnnualNumeratorCap) * BigInt(catalog.economy.daysPerYear) / BigInt(catalog.economy.bankDenominator)).toString();
  const transferPreview = transfer && validAmount ? applyAction(state, { type: transfer, amount }, catalog) : null;
  const createGoal = async () => { if (await game.act({ type: 'set_savings_goal', goal_id: goalId, amount: goalAmount })) { await game.selectGoal(goalId); setMessage('Savings goal selected.'); } };
  return <GameSection>
    <SectionHeading title="A little set aside" detail="Savings belong to this life. Interest arrives only as you live a game day." />
    <StatRow title="Wallet" value={money(state.money)} /><StatRow title="Savings" value={money(state.bank.balance)} /><StatRow title="Interest earned this life" value={money(state.bank.interestEarned)} />
    {!bankUnlocked && <GameText variant="caption" tone="secondary">Earn {money(catalog.economy.bankUnlockEarned)} through work this life to open savings · {money(state.lifeWorkEarned)} earned.</GameText>}
    {bankUnlocked && <>
      <GameField label="Transfer amount" numeric onChangeText={text => { setAmount(text); setTransfer(null); }} testID="bank-amount" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gameSpacing.sm }}><GameButton title="Deposit" variant="secondary" disabled={blocked || !validAmount || BigInt(amount || '0') < BigInt(catalog.economy.bankMinimumDeposit) || (validAmount && BigInt(amount) > BigInt(state.money))} onPress={() => setTransfer('deposit')} testID="deposit" /><GameButton title="Withdraw" variant="secondary" disabled={blocked || !state.bank.opened || !validAmount || (validAmount && BigInt(amount) > BigInt(state.bank.balance))} onPress={() => setTransfer('withdraw')} testID="withdraw" /></View>
      <GameText variant="caption" tone="secondary">Deposits start at {money(catalog.economy.bankMinimumDeposit)}. Transfers use no day and generate no interest.</GameText>
      {transfer && validAmount && <GameSection variant="accent"><GameText variant="caption">{transfer === 'deposit' ? 'Move to savings' : 'Move to wallet'}: {money(amount)} · no fee</GameText>{transferPreview?.accepted && <><StatRow title="Wallet after transfer and bank rules" value={money(transferPreview.state.money)} /><StatRow title="Savings after transfer and bank rules" value={money(transferPreview.state.bank.balance)} /></>}<GameButton title={`Confirm ${transfer}`} onPress={async () => { const accepted = transfer === 'deposit' ? await game.deposit(amount) : await game.withdraw(amount); if (accepted) { setTransfer(null); setMessage('Transfer saved.'); } }} disabled={blocked || !transferPreview?.accepted} testID="confirm-transfer" /><GameButton title="Cancel transfer" variant="quiet" onPress={() => setTransfer(null)} /></GameSection>}
      <GameDivider /><SectionHeading title="Your saving rules" detail="Both rules start off. Changes apply only after you save them." />
      <GameToggle label="Save wallet money above my reserve" value={autoSave} onValueChange={setAutoSave} />
      <GameField label="Wallet reserve" numeric initialValue={reserve} onChangeText={setReserve} testID="wallet-reserve" />
      <GameToggle label="Cover purchase shortfalls from savings" value={autoWithdraw} onValueChange={setAutoWithdraw} />
      <GameButton title="Save bank rules" disabled={blocked || !isMoney(reserve)} onPress={async () => { if (await game.bankSettings(autoSave, autoWithdraw, reserve)) setMessage('Bank rules saved.'); }} testID="save-bank-rules" />
    </>}
    <GameDivider /><GameText variant="caption" tone="secondary">Nominal interest per {catalog.economy.daysPerYear} game days: {annualBase}% on the first {money(catalog.economy.bankTier)}, {annualExcess}% above. Nominal annual cap: {money(annualCap)}. Fractional units carry forward. Real waiting earns nothing.</GameText>
    <SectionHeading title="Give your savings a purpose" detail="Targets share your one wallet-plus-bank balance. They do not move money into separate pots or earn extra interest." />
    <GameField label="Savings goal name" onChangeText={setGoalName} testID="savings-goal-name" /><GameField label="Savings target" numeric onChangeText={setGoalAmount} testID="savings-goal-target" />
    <GameButton title="Create and track goal" variant="secondary" disabled={blocked || !validGoal} onPress={() => void createGoal()} testID="create-savings-goal" />
    {Object.entries(state.savingsGoals).map(([id, target]) => <GameSection key={id}><MoneyProgress name={label(id)} current={(BigInt(state.money) + BigInt(state.bank.balance)).toString()} target={target} usesBank /><GameButton title={state.selectedGoalId === id ? 'Tracked on Home' : 'Track this goal'} variant="quiet" onPress={() => void game.selectGoal(id)} disabled={blocked} /></GameSection>)}
    {!!message && <GameText variant="caption" tone="accent" accessibilityLiveRegion="polite">{message}</GameText>}
  </GameSection>;
}
