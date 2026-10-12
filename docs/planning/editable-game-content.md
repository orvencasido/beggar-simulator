# Editable game content and catalog publishing

Status: design and numerical reference, updated 2026-10-12. The approved lifetime/local-first features now have implementation and hosted verification; see [current implementation evidence](../../implementation.md). Historical baseline examples and explicitly labeled future ideas remain reference material, not claims that every optional idea ships.

## Goal

Let the developer populate ordinary game content by editing structured files: jobs, career paths, schools, qualifications, items, prices, goals and opportunity templates. Reuse supported engine rules so a new ordinary job or car does not require a screen, type-union edit or database migration.

JSON is the first authoring format. Add YAML only later if needed, by compiling it into the same validated JSON catalog; never maintain two independent sources. A future admin editor can produce the same files/payloads.

## Proposed folder layout

```text
game-content/
  manifest.json
  jobs.json
  careers.json
  colleges.json
  qualifications.json
  items.json
  goals.json
  opportunities.json
  economy.json
  schemas/
```

Manifest declares a content version, schema version, required engine/rules version and release notes. The build produces a deterministic complete catalog artifact and digest. Keep authored money amounts as validated nonnegative whole-unit decimal strings, preserving the current exact-integer transport approach; counts and percentage numerators/denominators use bounded integers.

Jobs reference career, qualification and item IDs. Qualifications hold tuition/study days and eligible school IDs. Career data groups jobs and promotion prerequisites. Items have a known category, price and only supported effect types. Schools describe fictional names and offered qualifications; they do not duplicate tuition or change salaries implicitly. Goals/opportunities use supported condition/reward templates rather than arbitrary executable formulas.

## Data versus engine behavior

| Editable as data | Requires engine work |
| --- | --- |
| Job name, payout, work strain, sanity cost | A new action or resource |
| Existing qualification/item/experience requirements | Mortgages, trading or new debt rules |
| Tuition, study days, school offerings | A new interest algorithm or pricing formula |
| Career grouping and promotion thresholds | New reset, inheritance or death semantics |
| Item names, prices, categories and supported effects | New item effect behavior |
| Supported goal/opportunity templates | New condition/reward logic or minigames |
| Age-band costs and supported rate parameters | Changes to daily ordering or random payout algorithm |

Use bounded declarative requirements, such as all required qualifications/items and a family-experience threshold. Do not execute JavaScript, SQL or unvalidated expression strings from a content file. Availability and publication/retirement flags must be explicit.

## Publishing workflow

**Edit → validate → compile → simulate → preview/stage → publish → activate for new lives.**

Planned tooling capabilities, with final command names chosen during implementation:

- Validate schemas and cross-file references with readable errors identifying the file, record and field.
- Compile one catalog artifact, digest and diff report; rebuild identically from unchanged inputs.
- Run economy simulations against that artifact, including new prerequisites and rates.
- Preview locally without remote access or ranked publication.
- Publish that exact artifact to a chosen staging project through a trusted developer/admin workflow.
- Promote the reviewed artifact to production and change the new-life default version explicitly.

Do not publish economic content using the mobile app's public credentials. Player clients get read-only catalogs and server-validated commands; publishing remains privileged. Credentials stay out of JSON and source control. Schema changes are reviewed migrations, distinct from ordinary catalog publication.

## Validation requirements

- Unique stable IDs, required fields, valid categories and supported effects; reject unknown fields rather than silently ignoring misspellings.
- Exact valid monetary strings, bounded counts/rates, finite needs costs, reachable numerical ranges and supported schema/engine versions.
- Resolve job/career/item/qualification/school references. Report typos instead of hiding content or defaulting it to Begging.
- Detect self-dependencies and impossible circular unlock chains. Retain an accessible starter job and food; combine structural checks with actual progression simulations.
- Validate promotion family, career experience counters, retirement rules and qualification offerings.
- Keep published historical IDs resolvable for saves, boards, legacy titles and galleries. Renaming a display label does not rename its ID.
- Reject unsupported assets. Use known asset keys or a reviewed remote-asset strategy; adding a new bundled image can still require an app release.
- Produce a change report showing payout/price differences and simulator results for review. Valid JSON alone does not prove good balance.

Validation must also run on the server at ingestion, not only in a developer script. Invalid artifacts are never activated.

## Versioned lives and leaderboard compatibility

Both local simulation and server replay use the same immutable catalog version. Pin a life, payout stream and queued actions to that version. Cache the complete catalog locally and retain it during disconnections. Never recompute a queued journal using whichever prices happen to be newest.

Default policy: newly started lives use the newly activated catalog; existing lives finish under their pinned version. Retain old versions for active-life recovery, replay protection and historical records. Rolling back changes the new-life default, not already earned balances. Critical rule/security changes need an explicit reviewed migration/reconciliation path.

Separate content changes from engine compatibility: the app must reject or explain a catalog needing newer behavior rather than silently displaying unsupported effects. New ordinary records using supported rules should populate the UI without a binary release; new native assets or mechanics may still require one.

Career lifetime boards keep verified earnings from prior versions, which means major salary changes can affect fairness between eras. Publish such changes with clear release notes, and evaluate separate catalog-era/season boards if competitive comparability becomes important. Do not silently rewrite historical earnings. Retire jobs from new eligibility without deleting their history.

## Implementation work by designated role

| Role | Required changes |
| --- | --- |
| Lead | Finalize schema, authoring conventions, publishing checklist and tutorial; coordinate balance approval |
| Mobile developer | Replace fixed job/item/food ID assumptions with validated catalog identifiers; populate screens from data; cache/pin catalogs; recover missing/incompatible versions explicitly |
| Backend developer | Replay the supported declarative requirements/effects, bind catalog/rules versions to commands, and reject client-supplied prices/rewards |
| Database developer | Review immutable catalog storage, privileged publication, activation and historical retention; preserve access boundaries and existing save compatibility |
| UI designer | Ensure list/detail/requirement components work for additional jobs and schools, long names, locked/retired entries and empty collections |

The existing SQL evaluator and TypeScript ID unions require refactoring; copying JSON into the repository alone cannot achieve this feature. The current balance scripts also contain inline tables: migrate them to load the compiled catalog so simulations, previews and production verification use the same content.

Build this foundation before the large careers/college/wants expansion. Implement only engine mechanisms needed by the approved first slice; do not create a general scripting language or full admin dashboard first.

## Deliverables and acceptance

1. Authoring JSON/schema files seeded from the agreed catalog, with canonical compilation and diff output.
2. Validator and catalog-backed simulators; parity vectors for client/server behavior.
3. Read-only loading, cache/version pinning and data-driven jobs/items/school screens.
4. Trusted staging/production publication and explicit new-life activation, with safe rollback.
5. Reviewed migration from current catalog/IDs and documented historical retention.
6. A hands-on [content editing guide](../guides/editing-game-content.md) with commands updated to match the actual implementation.

Acceptance: add a new ordinary job and a school offering an existing qualification entirely through data; change an item price for new lives; verify existing lives keep their previous price; retire a job without losing its leaderboard/history; reject broken references and unsupported effects; ensure exact retries/offline recovery retain catalog binding. Run lint/typecheck and meaningful catalog, engine and database checks before calling the feature implemented.
