# Lifetime game architecture

Updated 2026-10-12 for the implemented v2 direction. Numerical content comes from the lifetime, bank and engagement plans. Warm cream/dark text/muted green, action-based needs, local-first solo play and verified per-job boards remain the user preferences. The original four-job cloud SQL MVP is preserved as historical v1, with its API described in `docs/api/game-api.md`.

## Loop and daily ordering

Work → earn → eat/rest/care → invest in equipment or education → choose a career → save/buy wants → preserve a legacy → start fresh. Lives begin at 18; 365 game days per year, 29,930 days to age 100. Work, Eat, Rest, Study, Checkup and completing booked Travel each cost one day. Purchases, transfers, enrollment, job/equipment selection and preferences cost no day. Invalid actions, retries, browsing and real-world waiting cost none.

Use the age/needs state before a daily action. Validate requirements/costs first, calculate interest from opening savings after any automatic funding withdrawal, apply work/care/study effects, deduct age-band health loss, increment day and evaluate ending. Food clamps after basal hunger deduction plus restoration, so eating can rescue hunger 1. Hunger zero takes precedence over age-100 completion; a fatal work reward still counts. Sanity/health zero never cause death.

Money is exact integer arithmetic with decimal-string transport and a 60-digit bound. Health uses hundredths (0–10000); hunger/sanity are 0–100. No elapsed-time needs drain, cron simulation or passive income exists. The old uncapped freelance skill multiplier is excluded from v2.

## Data and shared rules

`game-content/*.json` is editable authoring data. `src/game-core/` is the sole pure rules implementation used by mobile and Edge. The strict validator checks schema/engine compatibility, fields, money, IDs, assets, references, courses, unlock cycles, promotion reachability and starter access. Compiler emits canonical JSON and SHA-256 plus a bundled TypeScript catalog. Editor JSON schemas provide hints, not a second rules engine.

The initial artifact `lifetime_v2_1` contains 21 jobs, six qualifications and 58 items. Baseline prices/earnings and age needs follow `docs/planning/lifetime-economy.md`; exact bank math follows `bank-and-savings.md`. Provisional healthcare/engineering/creative ladders are included with the planned ceilings and supported qualification rules. Simulations compare strategies; they do not establish equal career balance or an optimal strategy.

Each life pins an immutable catalog version. Context also supplies the activated next-life catalog. Rebirth clears wallet/bank/remainder, needs, education, qualified experience, inventory/equipment and daily progress, then binds the activated catalog. It preserves verified cumulative work scores, legacy, cosmetic badges and account level. A bounded deterministic seed/counter stream survives rebirth without rerolling. No inherited economic benefit is granted.

Bank transfers never count as income or advance days. Daily tiered interest carries an exact remainder and is excluded from job scores. Contract bonuses cap at 100,000 per life, record separate opportunity income and do not enter work boards. Scholarships are one-time per qualification, discount tuition by 10% after day 180 and do not grant cash. Wants have no baseline economic/care bonuses; current ownership, equipment and public historical display are separate.

## Local-first flow

Mobile owns an atomic local record: verified checkpoint/catalog, bounded ordered journal, stable device identity and frozen uncertain request. UI applies the shared engine immediately, persists actions serially and syncs dirty progress roughly every 30 seconds while foregrounded. One mutation request is in flight. New actions remain in an unsent tail. Exact request IDs/payloads survive network loss and relaunch.

Sync sends intentions, never client money or snapshots. On reply the client atomically acknowledges a prefix, adopts verified state and the matching catalog, and replays valid unsent actions. Rejected/changed journals are retained for recovery instead of silently discarded. Catalog-changing rebirth uses a priority life-boundary sync, without returning to per-tap networking.

A durable writer device/session and CAS revision protect order across devices. Explicit takeover rotates the writer session; old-device pending progress needs review and cannot overwrite new state. Client ranked play pauses after five minutes without checkpoint renewal, retaining the queue. Server allowance accrues four daily actions/second with burst eight and maximum 1,200 days; late bounded journals can be verified after reconnect. All daily action kinds share this allowance. A seven-day shortcut journals seven ordinary Work actions and pauses before starvation; it never bypasses rate accounting.

## Supabase boundaries

Target project is `tjegdubzwwgfkcdaufle`. The additive private v2 records contain published catalogs/default, player checkpoint/writer/allowance, owner-wide receipts, per-job scores and life chapters. Private tables have RLS and no client economic grants. Service-only preparation/initialization/commit/publication functions separate trusted Edge replay from public clients.

`game-sync` verifies the caller token through Supabase Auth, validates the complete bounded envelope, reads trusted state/seed/catalog, replays the shared engine, and asks Postgres to commit using revision/sequence CAS. The database locks the account, resolves exact receipts before conflict checks, enforces writer/session and server-clock allowance, then persists state, scores, legacy and receipt together. Different payloads under a used ID fail; receipt tombstones never allow payouts to rerun.

Public authenticated reads return bounded leaderboard/projection data, not seeds, Auth IDs, needs or hidden inventory. Separate public IDs identify players. Participation defaults private and requires a linked account for public opt-in. Selected titles, qualifications and maximum three possessions are validated against current or clearly labeled historical achievements. Hidden profiles leave board results; ties share rank with stable public-ID ordering.

`game-content-publish` requires trusted developer credentials, independently validates the shared catalog and digest, and calls the privileged immutable publication RPC. Activation changes the new-life default. Historical catalogs stay available for queued journals and legacy labels. No client credentials can publish or assign earnings.

## Navigation and implementation ownership

Expo Router routes remain thin in `src/app/`; shared feature/controller/storage/UI code lives outside routes. Five tabs: Home, Career, Life, Journey, Leaders. Profile/account/settings are secondary entries. Home focuses on wallet/one monetary goal, hunger, sanity, age, current job and Work/Eat/Rest; health appears only as a compact condition when relevant.

Mobile owns persistence/lifecycle/transport, UI owns theme and screens, backend owns pure rules/content tooling/Edge, and database owns migrations/privileges/projections. Project agent TOMLs and installed Expo/Supabase skills are indexed in `.agents/README.md`. Versioned SDK 57 docs must be checked before native API edits.

## Compatibility and evidence

V1 progress is not converted into arbitrary age, degrees or job scores. Bootstrap reads the old snapshot; explicit initialization starts a fresh lifetime while preserving previous records. V1 economic writes become read-only for transitioned accounts. Rankings use verified v2 work attribution; historical overall earnings remain distinct.

Local SQL tests use disposable PGlite with Supabase Auth/role stubs. Actual controller→Edge→SQL tests verify the real sequence contract and catalog-changing rebirth. Complete catalog simulations validate survival and monetary conservation under documented strategies. Hosted Auth/signing keys, real simultaneous sessions, native storage performance and physical-device usability require their own checks; see implementation evidence for what was actually run.
