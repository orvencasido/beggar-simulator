import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameBadge, GameButton, GameChoice, GameDivider, GameField, GameScreen, GameSection, GameText, GameToggle } from '@/components/game';
import { gameSpacing, useGameTheme } from '@/constants/game-theme';
import { useGame } from '@/features/game/game-provider';
import type { Leaderboard, LeaderboardEntry, PublicProfile, ShowcaseSettings } from '@/features/game/types-v2';
import { GameFeedback, GameGate } from './game-gate';
import { itemName, jobName, label, money, qualificationName, SectionHeading, StatRow } from './screen-parts';

export function LeadersScreen() { return <GameGate allowEnded><LeadersContent /></GameGate>; }
function LeadersContent() {
  const game = useGame(), state = game.state!, catalog = game.catalog!;
  const theme = useGameTheme(), insets = useSafeAreaInsets();
  const [jobId, setJobId] = useState(catalog.economy.starterJobId);
  const [filterOpen, setFilterOpen] = useState(false);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editor, setEditor] = useState(false);
  const generation = useRef(0);
  const api = useRef(game);
  useEffect(() => { api.current = game; }, [game]);
  const load = useCallback(async (force = false) => {
    const request = ++generation.current;
    setLoading(true); setError(null);
    try { const result = await api.current.getLeaderboard(jobId, force); if (request === generation.current) setBoard(result); }
    catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load this career board.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [jobId]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const openProfile = async (id: string) => { setProfileLoading(true); setError(null); try { setProfile(await game.getPublicProfile(id)); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Profile unavailable.'); } finally { setProfileLoading(false); } };
  if (editor) return <ShowcaseEditor onClose={() => { setEditor(false); void load(true); }} />;
  if (profile) return <PublicShowcase profile={profile} onClose={() => setProfile(null)} />;
  const renderRow = (entry: LeaderboardEntry) => {
    const possessions = entry.items?.slice(0, 2) ?? [];
    const achievement = [entry.qualification ? `${entry.qualification.name}${entry.qualification.source === 'past_life' ? ' (past graduation)' : ''}` : null, ...possessions.map(item => `${item.name}${item.source === 'past_life' ? ' (past life)' : ''}`)].filter(Boolean).join(' · ');
    const other = [entry.jobId && entry.jobId !== jobId ? `Current: ${jobName(entry.jobId, catalog)}` : null, entry.totalEarnings != null ? `Overall work: ${money(entry.totalEarnings)}` : null].filter(Boolean).join(' · ');
    const detail = `${entry.title ?? 'Small beginnings'} · ${money(entry.jobEarnings)} in this career`;
    return <GameChoice title={`${entry.rank ?? '—'} · ${entry.name}`} detail={detail} onPress={() => void openProfile(entry.playerId)} testID={`leader-${entry.rank}`} accessibilityLabel={[`Rank ${entry.rank ?? 'unranked'}`, entry.name, detail, achievement, other, 'Open public showcase'].filter(Boolean).join('. ')}>
      {!!achievement && <GameText variant="caption" tone="accent">{achievement}</GameText>}
      {!!other && <GameText variant="caption" tone="secondary">{other}</GameText>}
    </GameChoice>;
  };
  return <FlatList
    data={board?.rows ?? []} keyExtractor={entry => entry.playerId} renderItem={({ item }) => renderRow(item)}
    contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
    style={{ flex: 1, backgroundColor: theme.background }}
    contentContainerStyle={{ width: '100%', maxWidth: 600, alignSelf: 'center', padding: gameSpacing.edge, paddingBottom: gameSpacing.xxl + insets.bottom, gap: gameSpacing.md, flexGrow: 1 }}
    ListHeaderComponent={<GameSection>
      <SectionHeading title="Every career has its own story" detail="Ranked by verified lifetime work earnings in the selected job. Savings interest and contract rewards never count." />
      <GameButton title={`${jobName(jobId, catalog)} · choose career`} variant="secondary" onPress={() => setFilterOpen(!filterOpen)} testID="leaderboard-filter" />
      {filterOpen && catalog.jobs.map(job => <GameChoice key={job.id} title={job.name} selected={jobId === job.id} onPress={() => { if (jobId !== job.id) { setBoard(null); setJobId(job.id); } setFilterOpen(false); }} testID={`board-${job.id}`} />)}
      <GameButton title="Customize my showcase" onPress={() => setEditor(true)} testID="edit-showcase" />
      {!game.account.linked && game.mode === 'cloud' && <><GameText variant="caption" tone="secondary">Your guest identity is private. Confirm a linked account, then explicitly join public rankings.</GameText><GameButton title="Link account" variant="quiet" onPress={() => router.push('/settings')} /></>}
      {game.mode === 'demo' && <GameText variant="caption" tone="secondary">Practice progress stays private and is never ranked.</GameText>}
      <GameFeedback />
      <GameButton title="Refresh rankings" variant="quiet" disabled={loading} onPress={() => void load(true)} />
      {loading && <ActivityIndicator accessibilityLabel="Loading career rankings" color={theme.accent} />}
      {error && <GameSection accessibilityLiveRegion="polite"><GameText tone="danger" variant="caption">{error}</GameText><GameButton title="Try again" variant="secondary" onPress={() => void load(true)} /></GameSection>}
      {profileLoading && <GameText variant="caption" tone="secondary">Opening showcase…</GameText>}
      <GameDivider />
      <SectionHeading title="Your position" />
      {board?.myEntry ? <GameSection variant="accent"><StatRow title={board.myEntry.rank ? `Rank ${board.myEntry.rank}` : 'Private · not publicly ranked'} value={`${money(board.myEntry.jobEarnings)} earned`} /></GameSection> : <GameText variant="caption" tone="secondary">{state.jobEarnings[jobId] && BigInt(state.jobEarnings[jobId]) > 0n ? 'Sync your career progress to see a verified position.' : 'No verified earnings in this career yet.'}</GameText>}
      <SectionHeading title="Top 50" />
    </GameSection>}
    ListEmptyComponent={!loading && !error ? <GameText tone="secondary">No public earners in this career yet.</GameText> : null}
    ListFooterComponent={board ? <GameText variant="caption" tone="secondary">Verified as of {new Date(board.asOf).toLocaleString()} · ties share a rank</GameText> : null}
  />;
}

function PublicShowcase({ profile, onClose }: { profile: PublicProfile; onClose: () => void }) {
  const catalog = useGame().catalog!;
  return <GameScreen>
    <GameButton title="Back to rankings" variant="quiet" onPress={onClose} />
    <GameText variant="eyebrow" tone="secondary">PUBLIC SHOWCASE · {label(profile.avatar)}</GameText><GameText variant="title">{profile.name}</GameText>
    {profile.title && <><GameBadge tone="accent">{profile.title}</GameBadge><GameText variant="caption" tone="secondary">Earned legacy career identity</GameText></>}
    {profile.jobId && <StatRow title="Current-life job" value={jobName(profile.jobId, catalog)} />}
    {profile.totalEarnings != null && <StatRow title="Verified lifetime work earnings" value={money(profile.totalEarnings)} />}
    {profile.accountLevel != null && <StatRow title="Account level" value={String(profile.accountLevel)} />}
    {profile.completedLifetimes != null && <StatRow title="Complete lifetimes" value={String(profile.completedLifetimes)} />}
    {profile.qualification && <GameSection><SectionHeading title="Graduation" /><GameText>{profile.qualification.name}</GameText>{profile.qualification.collegeName && <GameText variant="caption" tone="secondary">{profile.qualification.collegeName}</GameText>}<GameText variant="caption" tone="secondary">{profile.qualification.source === 'past_life' ? 'Past-life graduation · no current-life qualification' : 'Graduated this life'}</GameText></GameSection>}
    {!!profile.items?.length && <GameSection><SectionHeading title="Selected possessions" />{profile.items.map(item => <View key={item.id} style={{ gap: gameSpacing.xs }}><GameText>{item.name}</GameText><GameText variant="caption" tone="secondary">{item.source === 'past_life' ? 'Past-life possession · no current benefit' : 'Owned this life'}</GameText></View>)}</GameSection>}
  </GameScreen>;
}

function ShowcaseEditor({ onClose }: { onClose: () => void }) {
  const game = useGame(), state = game.state!, catalog = game.catalog!;
  const [draft, setDraft] = useState<ShowcaseSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [visibilityConfirmed, setVisibilityConfirmed] = useState(false);
  const [itemQuery, setItemQuery] = useState('');
  const [limit, setLimit] = useState(12);
  const api = useRef(game);
  useEffect(() => { api.current = game; }, [game]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void api.current.getShowcaseDraft().then(async saved => saved ?? await api.current.getMyShowcase()).then(current => { if (active) setDraft(current); }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load your saved showcase.'); });
    return () => { active = false; };
  }, []));
  const update = (next: ShowcaseSettings) => { setDraft(next); setMessage(''); void game.setShowcaseDraft(next).catch(failure => setError(failure instanceof Error ? failure.message : 'Could not preserve this draft.')); };
  const itemIds = [...new Set([...state.ownedItemIds, ...state.legacy.flatMap(l => l.ownedItemIds)])].filter(id => catalog.items.find(i => i.id === id)?.effect !== 'food');
  const qualifications = [...new Set([...state.qualifications, ...state.legacy.flatMap(l => l.qualifications)])];
  const titles = Object.entries(state.jobEarnings).filter(([, earned]) => BigInt(earned) > 0n).map(([id]) => id).sort((a, b) => BigInt(catalog.jobs.find(j => j.id === a)?.baseEarnings ?? '0') > BigInt(catalog.jobs.find(j => j.id === b)?.baseEarnings ?? '0') ? -1 : 1);
  const candidates = itemIds.filter(id => itemName(id, catalog).toLowerCase().includes(itemQuery.toLowerCase()));
  const source = (id: string) => state.ownedItemIds.includes(id) ? 'Owned this life' : 'Past-life possession';
  const shift = (index: number, direction: number) => { if (!draft) return; const next = [...draft.itemIds]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; update({ ...draft, itemIds: next }); };
  const save = async () => {
    if (!draft) return;
    setSaving(true); setError(null);
    try { await game.saveShowcase({ ...draft, name: draft.name.trim() }); await game.clearShowcaseDraft(); setMessage('Showcase saved. Public fields use verified progress.'); setVisibilityConfirmed(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save. Your draft is preserved.'); }
    finally { setSaving(false); }
  };
  if (!draft) return <GameScreen><GameButton title="Back to rankings" variant="quiet" onPress={onClose} /><GameText>{error ?? 'Loading your saved showcase…'}</GameText></GameScreen>;
  return <GameScreen>
    <GameButton title="Back to rankings" variant="quiet" disabled={saving} onPress={onClose} />
    <SectionHeading title="A small window into your story" detail="Your private draft is saved on this device. One explicit Save verifies and publishes your choices." />
    <GameField label="Display name · 2–24 characters" initialValue={draft.name} onChangeText={name => update({ ...draft, name })} testID="showcase-name" />
    <SectionHeading title="Avatar" />
    {['person', 'leaf', 'star', 'sun', 'moon'].map(avatar => <GameChoice key={avatar} title={label(avatar)} selected={draft.avatar === avatar} onPress={() => update({ ...draft, avatar })} testID={`avatar-${avatar}`} />)}
    <SectionHeading title="Earned legacy career title" detail="A title remembers earned work across lives. It stays distinct from your current-life job." />
    <GameChoice title="Hide title" selected={!draft.titleId} onPress={() => update({ ...draft, titleId: null })} />
    {titles.map(id => <GameChoice key={id} title={jobName(id, catalog)} selected={draft.titleId === id} onPress={() => update({ ...draft, titleId: id })} testID={`title-${id}`} />)}
    <GameToggle label="Show current-life job" value={draft.showJob} onValueChange={showJob => update({ ...draft, showJob })} />
    <GameToggle label="Show overall work earnings" value={draft.showTotal} onValueChange={showTotal => update({ ...draft, showTotal })} />
    <SectionHeading title="Graduation" />
    <GameChoice title="Hide graduation" selected={!draft.qualificationId} onPress={() => update({ ...draft, qualificationId: null })} />
    {qualifications.map(id => <GameChoice key={id} title={qualificationName(id, catalog)} detail={state.qualifications.includes(id) ? 'Graduated this life' : 'Past-life graduation'} selected={draft.qualificationId === id} onPress={() => update({ ...draft, qualificationId: id })} testID={`showcase-degree-${id}`} />)}
    <SectionHeading title="Three possession slots" detail="Show only what you choose. Display does not equip an item or grant a current-life benefit." />
    {draft.itemIds.map((id, index) => <GameSection key={id}><GameText>{index + 1}. {itemName(id, catalog)}</GameText><GameText variant="caption" tone="secondary">{source(id)}</GameText><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gameSpacing.sm }}><GameButton title="Move up" variant="quiet" disabled={index === 0} onPress={() => shift(index, -1)} /><GameButton title="Move down" variant="quiet" disabled={index === draft.itemIds.length - 1} onPress={() => shift(index, 1)} /><GameButton title="Remove" variant="quiet" onPress={() => update({ ...draft, itemIds: draft.itemIds.filter(item => item !== id) })} /></View></GameSection>)}
    <GameField label="Find a possession to show" onChangeText={text => { setItemQuery(text); setLimit(12); }} />
    {candidates.slice(0, limit).map(id => <GameChoice key={id} title={itemName(id, catalog)} detail={source(id)} selected={draft.itemIds.includes(id)} disabled={!draft.itemIds.includes(id) && draft.itemIds.length >= 3} onPress={() => update({ ...draft, itemIds: draft.itemIds.includes(id) ? draft.itemIds.filter(item => item !== id) : [...draft.itemIds, id] })} testID={`showcase-item-${id}`} />)}
    {candidates.length > limit && <GameButton title="Show more possessions" variant="quiet" onPress={() => setLimit(limit + 12)} />}
    {!itemIds.length && <GameText variant="caption" tone="secondary">Your collection will appear here as you build your life.</GameText>}
    <GameDivider /><GameToggle label="Participate in public rankings" value={draft.visible} disabled={!game.account.linked && !draft.visible} onValueChange={visible => { update({ ...draft, visible }); setVisibilityConfirmed(false); }} />
    {!game.account.linked && <><GameText variant="caption" tone="secondary">Link and confirm your account before becoming public. A guest profile stays private.</GameText><GameButton title="Open account settings" variant="quiet" onPress={() => router.push('/settings')} /></>}
    {draft.visible && <GameSection variant="surface"><GameText variant="caption">Joining publicly shows your name, rank and this career’s verified earnings. Optional fields follow your selections.</GameText><GameToggle label="I confirm public participation" value={visibilityConfirmed} onValueChange={setVisibilityConfirmed} /></GameSection>}
    <GameSection variant="accent"><GameText variant="eyebrow" tone="accent">PRIVATE DRAFT PREVIEW</GameText><GameText variant="heading">{draft.name || 'Your name'}</GameText>{draft.titleId && <GameText variant="caption">{jobName(draft.titleId, catalog)} · earned legacy title</GameText>}{draft.showJob && <GameText variant="caption">Current life · {jobName(state.jobId, catalog)}</GameText>}{draft.showTotal && <GameText variant="caption">Lifetime work earned · {money(state.workEarned)}</GameText>}{draft.qualificationId && <GameText variant="caption">{qualificationName(draft.qualificationId, catalog)} · {state.qualifications.includes(draft.qualificationId) ? 'this life' : 'past graduation'}</GameText>}{draft.itemIds.map(id => <GameText key={id} variant="caption">{itemName(id, catalog)} · {source(id)}</GameText>)}</GameSection>
    {error && <GameText variant="caption" tone="danger" accessibilityLiveRegion="polite">{error} Your draft is preserved.</GameText>}
    {!!message && <GameText variant="caption" tone="accent" accessibilityLiveRegion="polite">{message}</GameText>}
    <GameButton title="Save showcase" loading={saving} disabled={game.mode === 'demo' || draft.name.trim().length < 2 || draft.name.trim().length > 24 || (draft.visible && (!game.account.linked || !visibilityConfirmed))} onPress={() => void save()} testID="save-showcase" />
  </GameScreen>;
}
