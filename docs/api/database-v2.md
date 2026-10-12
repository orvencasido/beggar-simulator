# Lifetime database API

Migration `202610110002_lifetime.sql` adds protocol v2 alongside existing MVP saves. `202610110003_catalog.sql` publishes the validated initial JSON artifact. No existing Auth users or legacy runs are deleted. All economic tables remain in the unexposed `game_private` schema, with RLS enabled and no player table grants.

## Trusted service boundary

The JWT-authenticated `game-sync` Edge Function validates intents and replays the shared engine. Only its service credential may execute these RPCs:

- `get_game_v2_context(owner_id, device_id, request_id, payload)` creates a null-state context if absent and returns the trusted seed, writer session, pinned catalog, latest catalog, state, revision, sequence, server clock, remaining daily allowance, and legacy MVP snapshot. It checks exact request receipts before stale session/revision handling.
- `initialize_game_v2(owner_id, device_id, state, catalog_version, seed)` persists an engine-created initial state only after an explicit fresh-life transition. It locks the existing MVP profile first, so in-flight MVP economic commands finish before the transition; subsequent MVP writes reject with `legacy_read_only`. Existing MVP records remain readable.
- `commit_game_v2(owner_id, device_id, request_id, payload, expected_revision, expected_seq, next_seq, days_used, state, response)` locks the v2 owner checkpoint, rechecks the owner-wide receipt, writer device/session, revision, sequence and daily allowance, and atomically records the engine result, job-score projections, immutable past-life records and receipt. The player never supplies this state directly.
- `publish_game_catalog(catalog, catalog_digest, activate)` is privileged. The content publishing Edge endpoint must validate the complete shared schema and digest before calling it; SQL also guards manifest versions, array shapes, duplicate IDs, monetary strings and the starter job. Published versions cannot change. Activation changes new-account defaults and the next catalog prepared for rebirth; current lives keep their version until verified rebirth.

The commit payload includes `sessionId`. A takeover rotates that server-issued session and increments revision, so a former writer cannot continue even after fetching a newer revision. The trusted state seed stays unchanged across session rotation.

All day actions share one allowance: four days per server-clock second, initially eight, capped at 1,200 accrued days. Day costs are replayed by the trusted engine; client timestamps are not used. The client pauses ranked simulation after its five-minute checkpoint window. Delayed journals remain recoverable and are checked against the bounded server allowance. Every accepted non-day action still consumes a sequence position and the envelope is bounded to 512 actions / 64 KiB. The client should sync roughly every 30 seconds, never every tap.

## Player RPCs

`get_game_v2_snapshot()` returns only the authenticated owner's trusted context, or null if no context exists. `takeover_game_v2(device_id, acknowledge)` requires an explicit true acknowledgement before invalidating an older writer. UI must explain that another device's unsynced actions cannot be merged.

`get_job_leaderboard(job_id, limit_count=50)` returns `{rows,myEntry,asOf}`. Rank uses verified cumulative earnings from that exact job, excluding bank interest and contracts. Equal scores share a rank; public UUID breaks ordering ties. Hidden players are omitted; their own private entry has no public rank. This first release computes global ranks at read time; broad load testing and cached rank materialization remain scaling work.

`get_public_game_profile(player_id)` returns a sanitized selected showcase only if publicly visible, or the viewer's own profile. It never exposes Auth UUIDs, seed, bank balances, hidden inventory or private need meters.

`update_game_showcase(settings)` accepts one explicit edit:

```json
{
  "name": "Alex",
  "avatar": "leaf",
  "visible": true,
  "showJob": true,
  "showTotal": true,
  "titleId": "senior_engineer",
  "qualificationId": "computing_degree",
  "itemIds": ["villa", "luxury_car", "luxury_watch"]
}
```

Names are trimmed, limited to 2–24 characters, and reject control characters. Preset avatars are `person`, `leaf`, `star`, `sun`, `moon`. A title requires positive verified earnings in that job. Graduation and up to three unique possessions must exist in the current state or a verified legacy chapter. Historical selections carry `source:"past_life"`; current selections carry `source:"current"`. Graduation resolves its completed school from the verified `qualificationColleges` map. Retired labels resolve from retained past-life catalogs. Public opt-in requires a linked non-anonymous account and confirmed email when using an email identity; guest gameplay remains private.

## Replay and retention

Request IDs are unique per owner across lives. Replaying an exact frozen envelope returns the exact original response even after death, catalog changes, takeover, or newer commits. Changing its payload rejects `request_id_reused`. Compaction may remove response bodies but must retain identities/payload fingerprints; retrying a tombstone rejects `receipt_expired` and never executes again. Account deletion deliberately cascades the associated checkpoint, private history and receipts.

`tests/database-v2.test.ts` verifies privileges, old-save transition, retry identity, optimistic concurrency, allowance rollback, lease takeover, catalog pinning, legacy ownership, visibility, tie ranking and exact large-money strings with disposable PGlite/Postgres. These local tests do not model simultaneous production connections or Supabase Auth configuration; hosted integration tests are separate.

Security follows [Supabase database functions](https://supabase.com/docs/guides/database/functions) and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): narrow execute grants, empty search paths, explicit owner checks and private table boundaries.

## Default legacy title

Additive migration `202610120004_legacy_identity.sql` distinguishes untouched showcases from explicitly customized ones. Untouched profiles automatically display the highest-paying verified earned career, resolving current and retained historical catalogs; equal base salaries use the qualified-experience threshold, then a stable ID. Having a higher current account balance does not earn a title, and rebirth into Begging does not replace an earned master identity. The editor receives this derived title as its initial selection.

An explicit save marks the showcase customized. A chosen title stays fixed; selecting null means Hide and remains hidden through later earnings and rebirth. The migration treats pre-existing nondefault settings as deliberate customization, preserving those selections. No economic state, rank calculation or public field shape changes; the new marker and automatic-title helper remain private.
