# Small beginnings

An Expo SDK 57 life clicker: work from begging into a career, study, save, buy a better life and preserve a legacy. Each daily action advances one game day from age 18 to 100. Hunger zero ends the life early; sanity and health affect earnings but are recoverable. Closing the app never drains needs or advances age.

## Run

```bash
npm ci
npx expo start
```

Use an SDK-compatible Expo client or `npm run web -- --port 8081`. Configure native behavior through `app.json` and Expo plugins. Use `EXPO_PUBLIC_GAME_MODE=demo` for separate local practice; its progress never becomes ranked money.

Copy `.env.example` to ignored `.env.local` and set the Supabase public URL/key for cloud play. Target project: `tjegdubzwwgfkcdaufle`. Privileged keys never belong in the mobile bundle. Existing anonymous saves require explicit acknowledgement before starting the new lifetime economy; previous records remain archived, with no invented career attribution.

## Features

- Immediate local actions with an atomic saved checkpoint/journal and periodic verification, rather than per-tap cloud writes.
- 21 jobs across survival, delivery, freelance, technology, trades, business, healthcare, engineering and creative paths.
- Six qualifications, college choices, tuition, Study days and qualified-family promotions.
- Action-based hunger/sanity/health and aging; care, final-day precedence, fresh-life rebirth, legacy chapters and cosmetic account levels.
- 58 catalog items including food, job requirements, housing, vehicles, clothing, hobbies, travel and late luxuries; owned/equipped/showcase states remain distinct.
- Exact bank transfers, tiered interest with carried remainder, savings goals and optional automatic savings/withdrawals.
- Deterministic work contracts with deadlines and bounded separate bonuses; once-per-qualification tuition scholarships.
- Ambitions, one tracked goal, milestones, seven-day safe Work preview, lifetime finances and historical collections.
- Verified per-job boards, private-by-default showcase, earned legacy title and explicitly labeled historical possessions.

Guest sessions support private play. Link an account before public participation; losing an unlinked installation can lose access. No inherited money/degrees, passive earnings, financial trading, multiplayer economy or real-money purchases are implemented.

## Edit content

```bash
npm run content:validate
npm run content:compile
npm run content:simulate
npm run content:diff -- /path/to/previous/catalog.json
```

Edit `game-content/*.json`; use stable IDs and exact money strings. Published versions are immutable, and existing lives remain pinned. An activated update is adopted on the next verified rebirth. The [content authoring guide](docs/guides/editing-game-content.md) explains jobs, schools, prices, editor schemas, staging publication and rollback.

Publication uses the dedicated privileged `game-content-publish` function with shared server validation. It requires trusted developer credentials; the app cannot publish economic content.

## Backend and verification

Shared pure TypeScript in `src/game-core/` drives both local simulation and the `game-sync` Edge Function. Supabase authenticates users, stores immutable catalogs, provides a single-writer checkpoint, validates server-time day allowance and atomically commits receipts, scores and legacy. The original SQL MVP remains historical and becomes read-only after explicit lifetime initialization.

```bash
npm run lint
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform all
```

The final full test suite passes 71/71, including 16 engine tests, six Edge/controller/database/publication tests and three content tests, plus SQL, recovery and legacy MVP suites. App lint/typecheck pass, Expo Doctor passes 21/21, and iOS/Android Hermes/web production bundles export. Practice browser checks cover 393px/320px light and dark layouts; hosted browser checks cover lost-response reload recovery and legacy-title defaults/Hide. Eight complete catalog-backed simulations reach age 100 and check exact money conservation. The reviewed lifetime migrations and both Edge Functions are deployed on the configured project. The hosted gameplay smoke and privileged unchanged-catalog publication checks pass. Full evidence is recorded in [implementation.md](implementation.md); physical-device responsiveness and human pacing remain release checks.

Optional hosted verification: `npm run test:cloud-v2` creates one disposable anonymous test identity using public configuration and validates initialization, work/retry, forgery rejection, catalog protection and writer takeover. It never prints credentials.

See [architecture](architecture.md), [v2 protocol](docs/api/game-v2-contract.md), [database API](docs/api/database-v2.md), [planning index](docs/planning/README.md), and [specialist agents/skills](.agents/README.md).
