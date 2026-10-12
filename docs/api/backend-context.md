# Observed Supabase backend

Target: `tjegdubzwwgfkcdaufle` (`https://tjegdubzwwgfkcdaufle.supabase.co`). Read-only discovery performed 2026-10-11 using existing CLI authentication, Supabase CLI 2.120.0.

- `supabase gen types typescript --project-id … --schema public` succeeded: no public tables, views, functions, enums or composites. Reported PostgREST version 14.18.
- `supabase functions list --project-ref …` succeeded: no deployed Edge Functions.
- Before deployment, `supabase migration list --project-ref …` confirmed empty remote migration history using existing CLI authentication and a generated login. Migration `202610110001_game.sql` is now applied.
- Before deployment, type generation for `--schema game_private` returned no matching schema, confirming the isolated schema name was available. The migration has now created that private schema.
- A public client API key was retrieved programmatically into ignored `.env.local`. Privileged keys were neither printed nor saved. The project ref itself is not authentication.
- Broader non-public schemas and operational settings were not inventoried. Auth settings were later inspected: sign-ups enabled, guest sign-in initially disabled, CAPTCHA disabled. Guest sign-in is now enabled. Empty generated public types alone did not prove the whole project empty.
- Initial discovery made no remote changes. The reviewed migration was subsequently applied with --skip-vault and guest sign-in was enabled through a targeted Auth setting update. Live smoke tests created isolated guest saves; existing users were not modified.

The additive migration creates isolated `game_private` tables and three public RPCs. It passed local SQL tests and a hosted dry run before deployment. Private tables replace the planning draft's public owner-readable tables: all client state reads go through authenticated `get_game_snapshot()`. No table grants or permissive RLS policies are required. This reduces the exposed surface while retaining owner validation inside security-definer entry points.

Versioned catalogs are immutable JSON documents rather than separate job/item tables in this MVP. Each run pins its version; client displays support version 1 explicitly. Additional versions require coordinated client support. Account deletion cascades profiles/runs/receipts/rate state; run death never deletes replay protection. Keep permanent receipt identities; compaction may null the response and return `receipt_expired`, never execute again.

Local migration verification uses PGlite with minimal Supabase Auth/role stubs. This verifies SQL and transaction behavior, not hosted Auth or real simultaneous database sessions. Hosted guest Auth/PostgREST and two simultaneous owner commands now pass live tests. Physical-device and broader contention/load testing remain release checks.

References: [Supabase CLI](https://supabase.com/docs/reference/cli/supabase-gen-types), [database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Lifetime rollout

Additive migrations `202610110002_lifetime.sql` and `202610110003_catalog.sql` were applied to the same project after a hosted dry run selected exactly those two versions. Hosted metadata confirms history `202610110001`, `202610110002`, `202610110003`; the active lifetime catalog is `lifetime_v2_1`, with 21 jobs and 58 items, SHA-256 `3a94a3644d44a66802c6b19e5fe2c308b6cf92822404d9e214968edcd923412b`.

Hosted grant checks confirm authenticated users cannot read the private v2 checkpoint table, execute trusted commits, or publish catalogs; the service role can commit and authenticated players can read leaderboards. All inspected v2 economic tables have RLS enabled. These checks retrieve metadata only, without player records. Generated public types now include the hosted v2 RPCs, including owner-only showcase preferences.

The two Edge Functions, `game-sync` and `game-content-publish`, were deployed using server-side bundling and the shared TypeScript engine. Handler-level authentication verifies real player sessions through Supabase Auth for gameplay and requires the server service credential for catalog publication. Platform JWT-gate compatibility is verified with hosted smoke tests; any gate configuration adjustment is recorded below. Existing legacy saves and Auth configuration were preserved; no reset or migration-history repair was performed.

Hosted v2 smoke passed against isolated guest accounts: explicit initialization, daily replay, exact retries, rejection of forged reward fields, denial of player catalog publication, bounded leaderboard reads and writer takeover. Both deployed functions remain `ACTIVE`, version 1, with platform `verify_jwt:true`; real hosted player sessions passed that gate. Handler-level authentication remains enabled. These checks do not replace physical-device tests or production load testing.

The default legacy-title correction is additive migration `202610120004_legacy_identity.sql`. Local verification passed 14 database tests and 5 actual controller/Edge/SQL integration tests. It preserves existing nondefault customization, defaults untouched profiles to their verified earned legacy career, and retains explicit title hiding across rebirth. Public RPC signatures are unchanged.

Migration `202610120004` was subsequently applied after a dry run selected only that additive correction. Hosted metadata confirms all four migration versions, the private `showcase_customized` marker, denial of player access to the automatic-title helper, unchanged RLS/grants, and the same active catalog digest/counts. Lint and typecheck passed after this correction. No Edge redeployment or JWT setting change was needed.

## Lifetime rollout, 2026-10-12

The earlier empty-schema observation is historical. The project now has the original v1 private game plus additive lifetime checkpoint/catalog/score/history records and reviewed default-title migration. Both `game-sync` and `game-content-publish` are deployed. Real anonymous Auth, exact batch retry, takeover, forged-reward rejection, cloud browser recovery and unchanged privileged catalog publication were verified. Original discovery gaps do not imply these resources are absent today; see implementation.md for final evidence and remaining physical-device/store release checks.
