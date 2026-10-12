import { router } from 'expo-router';
import { useState } from 'react';
import { GameButton, GameDivider, GameField, GameScreen, GameSection, GameText } from '@/components/game';
import { useGame } from '@/features/game/game-provider';
import { GameFeedback } from './game-gate';
import { money, SectionHeading, StatRow } from './screen-parts';

export function SettingsScreen() {
  const game = useGame();
  const [email, setEmail] = useState(game.account.email ?? '');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [confirmation, setConfirmation] = useState<'switch' | 'takeover' | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const operation = async (action: () => Promise<void>, success: string) => { setLoading(true); setError(''); setMessage(''); try { await action(); setMessage(success); setConfirmation(null); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not complete this request.'); } finally { setLoading(false); } };
  const credentialsReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 8;
  const historical = game.legacyRecord && typeof game.legacyRecord === 'object' ? game.legacyRecord as { summary?: { lifetimeEarned?: string; bestRunEarned?: string }; player?: { lifetime_earned?: string } } : null;
  const historicalEarned = historical?.summary?.lifetimeEarned ?? historical?.player?.lifetime_earned;
  return <GameScreen>
    <GameText variant="eyebrow" tone="accent">YOUR PLACE IN THE STORY</GameText>
    <SectionHeading title={game.account.linked ? 'Your linked account' : game.mode === 'demo' ? 'Practice on your own terms' : 'Your private guest save'} detail={game.account.linked ? game.account.email ?? 'Confirmed account' : 'Public participation always needs a separate confirmed choice.'} />
    <GameSection variant="surface"><GameText variant="caption" tone="secondary">{game.mode === 'demo' ? 'Practice progress is stored on this device and cannot join ranked boards.' : 'Actions save locally first and sync periodically. Confirm a linked account to recover your game on another installation. Keep this device while guest progress is unlinked.'}</GameText><StatRow title="Save status" value={game.syncStatus} />{game.lastSyncedAt && <StatRow title="Last verified" value={new Date(game.lastSyncedAt).toLocaleString()} />}<GameButton title="Save and sync now" onPress={() => void operation(game.sync, 'Sync finished. Check the save status above.')} loading={loading} disabled={game.loading} testID="sync-now" /><GameButton title="Refresh verified progress" variant="secondary" onPress={() => void operation(game.refresh, 'Progress refreshed.')} disabled={loading || game.loading} /></GameSection>
    <GameFeedback />
    {game.mode === 'cloud' && <GameSection>
      <GameButton title={accountOpen ? 'Close account options' : 'Link account or sign in'} variant="secondary" onPress={() => setAccountOpen(!accountOpen)} />
      {accountOpen && <>
        <GameText variant="caption" tone="secondary">Linking keeps this guest’s progress. Signing into an existing account opens that account’s separate save; first sync any unsent progress.</GameText>
        <GameField label="Email address" email initialValue={email} onChangeText={setEmail} testID="account-email" />
        <GameField label="Password · at least 8 characters" secure onChangeText={setPassword} testID="account-password" />
        <GameButton title="Link this save to my email" onPress={() => void operation(() => game.linkAccount(email, password), 'Check your email for the confirmation code. Your profile remains private.')} disabled={loading || !credentialsReady || game.account.linked} testID="link-account" />
        <GameField label="Email confirmation code" numeric onChangeText={setToken} testID="account-token" />
        <GameButton title="Verify email" variant="secondary" disabled={loading || !email.trim() || !token.trim()} onPress={() => void operation(() => game.verifyAccount(email, token), 'Email confirmed. You can now choose public participation in your showcase.')} testID="verify-account" />
        <GameButton title="Sign into existing account" variant="quiet" disabled={loading || !credentialsReady} onPress={() => setConfirmation('switch')} />
      </>}
      <GameDivider /><SectionHeading title="Playing on another device?" detail="Only one installation writes ranked progress at a time. Sync the other device before moving here." />
      <GameButton title="Take over this save" variant="secondary" disabled={loading || game.loading} onPress={() => setConfirmation('takeover')} testID="takeover" />
    </GameSection>}
    {confirmation && <GameSection variant="surface" accessibilityLiveRegion="polite">
      <GameText variant="heading">{confirmation === 'switch' ? 'Open a different account?' : 'Move ranked play to this device?'}</GameText>
      <GameText variant="caption">{confirmation === 'switch' ? 'This opens the signed-in account’s save. Your guest save is archived. Pending progress must sync first; a failed sync prevents switching.' : 'This discards pending local actions and replaces them with the verified checkpoint. Unsent actions on the other device cannot be merged after takeover. Keep them by syncing that device first.'}</GameText>
      <GameButton title={confirmation === 'switch' ? 'Confirm account switch' : 'Discard pending and take over'} variant="danger" loading={loading} onPress={() => void operation(confirmation === 'switch' ? () => game.signIn(email, password) : game.takeOver, confirmation === 'switch' ? 'Signed in. Your account’s progress is loaded.' : 'This device now owns ranked play.')} testID="confirm-account-operation" />
      <GameButton title="Keep my current save" variant="secondary" disabled={loading} onPress={() => setConfirmation(null)} />
    </GameSection>}
    {!!error && <GameText variant="caption" tone="danger" accessibilityLiveRegion="polite">{error}</GameText>}
    {!!message && <GameText variant="caption" tone="accent" accessibilityLiveRegion="polite">{message}</GameText>}
    <GameButton title="Visit my showcase and rankings" variant="secondary" onPress={() => router.push('/leaders')} />
    {historicalEarned && /^\d+$/.test(historicalEarned) && <GameSection><SectionHeading title="Archived original game" detail="Historical work earnings before lifetime careers launched. These totals are separate and are not assigned to career rankings." /><StatRow title="Original lifetime earned" value={money(historicalEarned)} /></GameSection>}
    <GameSection><SectionHeading title="Take your time" /><GameText variant="caption" tone="secondary">Your age and needs advance only through days you choose to live. Work, Eat, Rest, Study, Checkup and Travel each use a day. Browsing and bank transfers use no days. Sanity and health affect earnings; only hunger at zero ends a life early.</GameText></GameSection>
    {game.catalog && <GameText variant="caption" tone="secondary">Pinned content {game.catalog.manifest.version} · {game.catalog.manifest.releaseNotes}</GameText>}
  </GameScreen>;
}
