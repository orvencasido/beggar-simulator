# Editing game content

The content system is implemented. Jobs, careers, colleges, qualifications, possessions, goals, ambitions, contracts and supported economy parameters live in `game-content/*.json`. The shared validator/compiler produces the same catalog used by mobile prediction and Edge verification. New ordinary records populate the app from data.

## Local workflow

1. Edit JSON. Keep stable IDs; change names without changing IDs. Monetary values are strings such as `"45000"`, without commas or decimals.
2. For a new release, change `manifest.version`, for example `lifetime_v2_2`, and explain changes in `releaseNotes`. Published versions are immutable.
3. Run `npm run content:validate`, then `npm run content:compile`.
4. Run `npm run content:simulate` and inspect `game-content/build/simulation.json`. It checks eight complete career strategies, game-day survival and exact money conservation; it does not prove every spending strategy survives or careers have equal ceilings.
5. Run `npm run content:diff -- /path/to/previous/catalog.json`. Review prices, payouts, retirement and removed IDs. Use `available:false` to retire a record; preserve historical identities.
6. Preview a fresh practice life. Existing ranked lives remain pinned to their old catalog; next verified rebirth adopts the activated new catalog.

The generated artifact is `game-content/build/catalog.json`; its SHA-256 is in `digest.txt`. `src/game-core/catalog.generated.ts` is a generated bundled fallback. Do not edit generated files; compile authoring files instead. The tool also runs directly as `npx --no-install tsx scripts/content/cli.ts <command>`.

## Adding a job and college

Copy a similar record in `jobs.json`, give it a unique lowercase underscore ID and set its career, payout range, needs and requirements. Requirements reference existing item/qualification IDs. A career with promotion experience requirements needs an accessible entry role in that family. Qualified family experience counts actual Work days; care and study do not advance it.

Add a college in `colleges.json` offering existing qualifications, then add that college ID to each qualification's `collegeIds`. Both directions must agree. A new degree also needs `tuition`, `studyDays` and compatible colleges in `qualifications.json`. Schools do not silently alter salaries. The validator reports file/record/field paths and missing references.

For a possession, add an item with known category/icon/effect, price and prerequisites. Supported effects are `food`, `unlock`, `cosmetic`, and `travel`. Food has `hungerRestore`; durable wants can be wish-listed with an ownership goal. Travel is purchased once and completed through one ordinary day action. Financial or care bonuses on homes/beds are not supported behavior.

Editor hints live in `game-content/schemas/`; the runtime validator remains authoritative. Arbitrary formula strings, executable scripts, unsupported effects/icons, circular unlocks, unknown fields and prototype-reserved IDs reject.

## Publish and activate

Publication is an explicit privileged developer action. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your trusted environment (this variable may contain a modern `sb_secret_` project secret or a supported legacy service key), never in an `EXPO_PUBLIC_` variable, JSON file, repository or chat. Prefer separate staging credentials first. The app only has a public key and cannot publish content.

```bash
npm run content:publish -- --reviewed
npm run content:publish -- --reviewed --activate
```

The first publishes the exact validated artifact without activation. The second publishes and makes it the default for new lives. The dedicated `game-content-publish` Edge Function independently validates the full shared catalog, recomputes its digest, authenticates the project secret from the `apikey` header against injected `SUPABASE_SECRET_KEYS`/legacy credentials and calls the service-only immutable publication RPC. `--reviewed` records the deliberate tooling choice; it is not an automated balance approval.

To roll back, publish the previously reviewed unchanged artifact with activation. Do not rewrite its version. Existing lives finish with their pinned catalog; original catalog versions remain stored for journals, legacy chapters and public ownership/education labels. Account takeover/reconciliation does not recalculate past payouts under new prices.

Content changes require no SQL migration when they use existing behavior. New actions/resources, new effect algorithms, new bundled assets or changed reset semantics require code and compatibility work. Server publication rejects unsupported engine/schema versions rather than quietly accepting mechanics the app cannot understand.

## Current rules and limits

Catalog `lifetime_v2_1` uses ages 18–100 and one game day per Work/Eat/Rest/Study/Checkup/travel. No background aging or earnings. Health is a fictional integer condition; only hunger zero kills early. Career scores include actual work payouts only, excluding bank interest and contract bonuses. Account level and legacy give no inherited earnings multiplier.

Bank interest uses exact whole money and a carried remainder; deposits/withdrawals do not advance days. Contracts pay a bounded once-only bonus outside career earnings. A one-time optional scholarship per qualification discounts tuition by 10% after day 180; it is not random or repeatable. The supported seven-day convenience uses individual Work actions and stops before starvation; it consumes seven day-rate units.

The shared server/client day budget is four per second with eight-day burst. Catalog tooling rejects edits to the fixed calendar/rate rules because those affect the database protocol. Tune data only within supported validator ranges; a valid artifact still needs review, simulations and playtesting.

## Developer publication smoke

`node scripts/content/verify-published.mjs` uses the authenticated Supabase CLI to retrieve the configured project secret into memory, verifies public-key/digest rejection, and republishes only the unchanged compiled artifact without activation. It is a privileged developer check, not an app command. It suppresses credential-fetch error output and never prints or persists tokens. The current project check passed on 2026-10-12.
