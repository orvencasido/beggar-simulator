# Mobile v2 screen integration

`useGame()` from `@/features/game/game-provider` exposes the following. Core types come from `@/game-core`; use catalog IDs as strings rather than hardcoded unions. The UI developer owns screens, components and theme; mobile owns provider/controller and route composition.

```ts
state: GameState | null
catalog: Catalog | null
loading: boolean
busy: boolean // only bootstrap/recovery; normal local taps never wait for cloud
error: string | null
mode: 'demo' | 'cloud'
syncStatus: 'loading' | 'saving' | 'saved' | 'syncing' | 'offline' | 'paused'
pendingCount: number // use aggregate quiet status, never announce each action
lastSyncedAt: number | null
account: { linked: boolean; email: string | null }
act(action: GameAction): Promise<boolean>
work(): Promise<boolean>
eat(itemId: string): Promise<boolean>
rest(): Promise<boolean>
study(): Promise<boolean>
checkup(): Promise<boolean>
buyItem(itemId: string): Promise<boolean>
chooseJob(jobId: string): Promise<boolean>
enroll(qualificationId: string, collegeId: string): Promise<boolean>
equip(itemId: string): Promise<boolean>
travel(itemId: string): Promise<boolean>
deposit(amount: string): Promise<boolean>
withdraw(amount: string): Promise<boolean>
bankSettings(autoSave: boolean, autoWithdraw: boolean, reserve: string): Promise<boolean>
selectGoal(goalId: string | null): Promise<boolean>
selectAmbition(ambitionId: string | null): Promise<boolean>
acceptContract(offerId: string): Promise<boolean>
declineContract(offerId: string): Promise<boolean>
abandonContract(): Promise<boolean>
rebirth(): Promise<boolean>
workWeek(): Promise<boolean> // first show previewWorkWeek; shared 4 days/sec cap
refresh(): Promise<void>
sync(): Promise<void>
takeOver(): Promise<void> // ONLY after explicit discard-pending confirmation
linkAccount(email: string, password: string): Promise<void>
verifyAccount(email: string, token: string): Promise<void>
signIn(email: string, password: string): Promise<void> // account switch needs confirmation
getLeaderboard(jobId: string, force?: boolean): Promise<Leaderboard>
getPublicProfile(playerId: string): Promise<PublicProfile>
saveShowcase(settings: ShowcaseSettings): Promise<void>
```

Five thin routes delegate to UI exports: `PlayScreen` (index), `CareerScreen`, `LifeScreen`, `JourneyScreen`, `LeadersScreen`; settings uses `SettingsScreen`, terminal modal uses `GameOverScreen`. Please retain/rewrite `GameGate` and `GameFeedback` against `state`, not legacy `snapshot`.

`getLeaderboard` is cached 60 seconds; call on focus/filter/explicit refresh only. No per-tap reads. Leader row/public showcase exact wire fields are exported by mobile `types-v2.ts` once database confirms. Nickname/visibility/avatar/title/qualification/item slots are a local draft followed by one explicit `saveShowcase` call. Default nickname and identity must not silently opt into public participation.

Starting v2 after a v1 save requires `acknowledgeLegacyMigration()` in onboarding. It archives the previous save; old ages and per-job qualification/earnings are never invented. Old cloud totals are retained as a separately labeled historical record.

Always confirm a single action that preview shows would be lethal. Weekly work executes ordinary days at the input allowance, stops before starvation/completion, and can be cancelled with `cancelWeek()`; no bulk-rate shortcut.
