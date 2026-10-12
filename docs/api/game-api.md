# Game RPC contract

Authenticated Supabase RPCs implemented by `supabase/migrations/202610110001_game.sql`:

| RPC | Parameters | Return |
| --- | --- | --- |
| `get_game_snapshot` | none | snapshot |
| `start_run` | `request_id: UUID` | command result |
| `submit_actions` | `run_id: UUID`, `request_id: UUID`, `expected_revision: integer`, `actions: JSON[]` | command result |

Snapshot matches `src/features/game/types.ts`: `{version, run, summary}`; run is null or `{id,status,money,earned,hunger,sanity,jobId,skillLevel,equipment,revision,actions}`; summary is `{lifetimeEarned,bestRunEarned,completedRuns}`. All monetary values are exact decimal **strings**. Needs/revision/action counts/skill level are integers. This client supports catalog version 1.

Command result: `{snapshot, requestId, processed, stopReason, outcomes?}`. `processed` is the accepted ordered prefix; every submitted work intention is one action. Outcomes give action type and actual money/hunger/sanity deltas. Start has processed 1 when created and 0 when an active run already exists.

Actions have exactly these shapes; extra keys (including reward/balance) reject the entire request before mutation:

```ts
{ type: 'work' }
{ type: 'eat', item_id: 'bread' | 'meal' }
{ type: 'rest' }
{ type: 'buy_equipment', item_id: 'bike' | 'delivery_kit' | 'laptop' }
{ type: 'choose_job', job_id: 'begging' | 'newspaper' | 'courier' | 'freelancer' }
{ type: 'buy_skill_level' }
```

Batches contain 1–20 actions. Owner profile is locked before any run/rate row. Receipt identity is owner-wide and bound to exact operation/run/revision/actions. Replay occurs before revision/death checks; original random rewards and response return unchanged. Different payload under the same request ID raises `request_id_reused`. A compacted receipt raises `receipt_expired`, preserving the tombstone. The client must resolve uncertain requests using their original IDs/payloads and must never auto-reissue the unaccepted suffix with a new ID.

Gameplay stop reasons: `already_active`, `revision_conflict`, `run_ended`, `job_locked`, `equipment_locked`, `insufficient_money`, `need_full`, `already_owned`, `already_selected`, `unknown_item`, `unknown_job`, `rate_limited`, `numeric_limit`. Valid zero-prefix results are receipted, so later retries cannot unexpectedly succeed. Revision increments once when at least one action was accepted. A fatal work/rest action commits its final reward/needs and stops the suffix.

Authentication, invalid envelopes, unknown action types/extra fields, inaccessible run IDs and request-ID misuse raise SQL errors without economic mutation. Unauthenticated role cannot execute the RPCs. Other owners' run IDs return `run_not_found`.

Work rate uses an owner-wide token bucket: initial/max 8, refill 4 tokens/second using server time. New runs do not reset it; replay consumes nothing. This bounds throughput across devices, not all automation. Money/earnings use numeric(60,0); maximum skill level 1,000,000; revisions and action counts use bounded PostgreSQL integers. Limits return `numeric_limit` rather than silently rounding client money.

Catalog version 1 follows architecture economy proposals: begging 90% one/10% two; newspaper 20; courier 50; freelancer 100 + 10×skill; sanity multipliers 100/80/60%; bread 5/+25; meal 15/+80; rest +25 sanity/−2 hunger. Equipment costs 100/500/2500 in order. Skill next price 200×(level+1)². Gameplay versioning is immutable and no elapsed-time hunger is implemented.
