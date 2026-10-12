# Implementation status and verification

Updated 2026-10-12. The project has progressed from the original four-job MVP to the planned local-first lifetime game. This document describes concrete implemented modules and remaining validation; the feature plans remain design/numerical references.

## Delivered modules

| Area | Implementation |
| --- | --- |
| Shared lifetime rules | `src/game-core/` pure deterministic engine: days/age, needs/health, careers/education, bank, contracts, wants/equipment, goals/ambitions, legacy/rebirth, safe-week preview |
| Editable content | `game-content/*.json`, editor schemas, canonical compiler/digest, validator, diff, eight-path lifetime simulations and privileged publisher command |
| Local-first mobile | `src/features/game/local-controller.ts`, v2 provider/transport, durable checkpoint/journal/frozen request, immediate prediction and periodic dirty verification |
| Hosted verification | `supabase/functions/game-sync/`, `game-content-publish/`; shared engine replay, authenticated caller and privileged publication |
| Private database | Additive lifetime migrations: immutable catalogs/default, writer checkpoint/CAS/allowance, owner receipts, scores/history and validated public profiles |
| UI | Home/Career/Life/Journey/Leaders routes, profile/account, cream/green theme and catalogue-driven controls; final integration/visual validation is coordinated separately |
| Compatibility | Explicit fresh-life acknowledgement preserves v1 records; transitioned users cannot continue old economic writes; no invented historical career attribution |

Catalog `lifetime_v2_1`: 21 jobs across all specified paths, six qualifications and 58 items. The finite daily economy supersedes v1 tiny prices and repeatable uncapped skill upgrades. Financial perks on homes/vehicles remain absent under the numerical baseline; wants have ownership/showcase purpose.

## Concrete test evidence

- 16 shared engine tests pass: deterministic vectors, health/age boundaries, low-hunger food, final-day starvation precedence, graduation/promotion, exact bank cap/remainder, auto funding, contracts/cap, scholarships, week parity, malformed envelopes, ownership goals and reset/catalog handoff.
- Six focused Edge/controller→Postgres tests pass: explicit migration acknowledgement, next-action sequence numbering, durable device matching, exact receipts, forgery/writer rejection, new-life price activation and privileged publication validation including modern project-secret authentication.
- Three content tests pass: authored/bundled artifact identity, data-only job/school additions, retirement and economic diff reporting.
- Database and controller suites are maintained alongside these; `npm test` discovers every `tests/*.test.ts`. **Final full suite: 71/71 tests pass** after the publisher authentication fix. Final coordinated application/hosted evidence is recorded below.
- Eight reproducible complete-life simulations load the compiled catalog, reach exactly 29,930 days and check `work + interest + opportunities − spending = wallet + savings`. Output: `game-content/build/simulation.json`.
- App-wide lint and typecheck pass. Expo Doctor passes 21/21. iOS/Android Hermes/web production export passes. Practice browser checks pass at 393px and 320px in light/dark themes; hosted browser checks pass real dirty sync, lost response/reload, verified income, default legacy title and explicit Hide behavior.

## Hosted rollout evidence

The additive lifetime/catalog/default-title migrations and `game-sync`/`game-content-publish` are deployed to `tjegdubzwwgfkcdaufle`. Hosted public-key gameplay smoke passes explicit initialization, work batching, exact retry, forged payout rejection, private/public boundaries and writer takeover. Existing v1 records remain preserved.

Privileged publisher smoke uses only the unchanged published `lifetime_v2_1` artifact and digest `3a94a3644d44a66802c6b19e5fe2c308b6cf92822404d9e214968edcd923412b`: public key receives 401, trusted wrong digest receives 400, trusted idempotent publication receives 200. Activation was left unchanged. Credentials stayed only in process memory and were never logged or saved.

Publisher authentication supports current injected `SUPABASE_SECRET_KEYS` plus supported legacy credentials and compares the supplied `apikey` in constant time. Its platform JWT gate is disabled because opaque project secret keys are not user JWTs; its explicit privileged credential check remains mandatory. `game-sync` retains the project platform JWT gate and explicitly verifies user identity through Supabase Auth `getUser()` before any trusted operation.

## Commands

```bash
npm run content:validate
npm run content:compile
npm run content:simulate
npm run content:diff -- /path/to/previous/catalog.json
npm run lint
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform all
```

Optional live smoke: `npm run test:cloud-v2`, using ignored public environment configuration. It creates a disposable anonymous test identity, verifies daily actions/retries/takeover and rejects privileged publication. Tokens and privileged credentials are not printed.

Catalog publication is separate from gameplay deployment: `npm run content:publish -- --reviewed [--activate]` with trusted staging/production environment credentials. Follow the [authoring guide](docs/guides/editing-game-content.md); inspect simulations/diff before publication and keep published versions immutable.

## Release checks still requiring evidence

- Test simultaneous real database sessions/device takeover, lossy connections, app termination during storage, restored journals and catalogue-changing rebirth.
- Review physical iOS/Android screens at compact/large text, accessibility, reduced motion and responsiveness under sustained tapping.
- Human playtest school/career/wants pacing, care burden, contracts and repeated lives. Simulators demonstrate strategies, not retention or optimal balance.
- Production monitoring/moderation, account recovery UX, privacy and store/EAS release preparation remain release work; no store publication is implied.

Documentation: [architecture](architecture.md), [v2 API](docs/api/game-v2-contract.md), [database API](docs/api/database-v2.md), [mobile UI contract](docs/api/mobile-v2-ui-contract.md), [content guide](docs/guides/editing-game-content.md).
