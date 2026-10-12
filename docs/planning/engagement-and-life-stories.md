# Making each life interesting — feature breakdown and plan

Status: design and numerical reference, updated 2026-10-12. The approved lifetime/local-first features now have implementation and hosted verification; see [current implementation evidence](../../implementation.md). Historical baseline examples and explicitly labeled future ideas remain reference material, not claims that every optional idea ships.

## Product direction

Give every life something to choose, something to improve visibly, and something to remember. Keep the main loop understandable: work, survive, invest in a path, buy a better life, preserve a legacy, and choose another ambition after rebirth.

Keep existing commitments: minimal Play UI, action-based days/needs, instant local simulation with periodic server verification, independent lifetime career boards, and fresh-life resets with permanent historical achievements. Use the [lifetime economy](lifetime-economy.md) and [bank](bank-and-savings.md) as numerical baselines.

## Breakdown at a glance

| Feature | What the player does | What it adds | First version |
| --- | --- | --- | --- |
| Career choices | Compare time, tuition, income ceiling and needs | Different worthwhile routes through a life | Technology and Trades; add Business next |
| Opportunities | Accept an optional career task or ignore it | Short-term choices between larger goals | Bounded work contracts |
| Career personality | Complete a project, route or repair assignment | Different themes and objectives for work | Reuse existing daily work, without extra meters |
| Visible lifestyle | See the residence, vehicle and chosen appearance change | Purchases feel tangible | Small scene in Life/Profile |
| Lifetime ambitions | Pick a broad objective and track one next step | A reason to try another path | Four ambition templates |
| Legacy chapters | Review a finished life's achievements | Rebirth builds a persistent story | Compact end-of-life summary and archive |
| Work a week | Execute up to seven ordered work days with a preview | Reduce repetitive tapping later | Optional convenience after the basic loop is learned |

Recommended first priorities: ambitions, visible lifestyle, and legacy chapters. Develop opportunities next. Keep multi-day actions behind a separate parity/balance gate.

## 1. Career choice that matters

In Career, compare routes with four compact facts: qualification cost, study days, starting payout, and highest payout. A detail view explains work strain and sanity costs. Do not label one path as the objectively best choice.

The current simulations supply an initial contrast:

- **Trades:** 25,000 tuition and 120 study days; qualifies around 21, reaches master around 31, with about 22.8M disposable lifetime income before wants in the no-bank strategy.
- **Technology:** 180,000 tuition and 1,460 study days; qualifies around 32, reaches senior around 47, with about 25.7M disposable income before wants.
- **Business:** 160,000 tuition and 1,460 study days; qualifies around 32, reaches executive around 47, with about 24.2M disposable income before wants.

These ages are policy-specific simulator outputs, not player guarantees. A player can prioritize earlier purchases through Trades or a higher eventual ceiling through Technology. Switching career is allowed, but education and career experience consume finite lifetime resources.

First slice includes Technology and Trades to establish a real college/trade choice. Business and other paths follow after human testing and their simulations. Promotion conditions remain explicit and deterministic. Do not add random demotion, hiring failure or qualification expiration.

## 2. Optional opportunities

First opportunity type: a work contract. It gives a short goal within a longer career ambition. Accept/decline is free and consumes no day; completing it requires the ordinary Work days, with their existing costs.

Proposed contract rules:

- First eligibility: elapsed day 180 or later, with Newspaper or a higher unlocked job.
- Generate at most one offer per 365 elapsed game days; no refresh caused by reopening, switching jobs, declining or editing device time.
- One accepted contract at a time. It asks for ten Work days in its specified job within 60 elapsed game days after acceptance.
- Other actions advance the deadline because they also consume days. Closing the app does not advance it. Explain this in the acceptance preview.
- A job switch pauses progress for that job, but does not pause the game-day deadline. Career promotions can be deferred until finishing, or the player can choose to abandon.
- Completion bonus: `floor(sum of actual payouts on the ten qualifying Work days / 10)`. This is a 10% bonus on that small assignment, reflecting sanity/health reductions.
- Credit once on the final qualifying day, then archive. No upfront fee, failure fine or loss of ordinary earned money. Expiration/abandonment just loses the bonus.
- Cap total contract bonuses at 100,000 per life; clamp the last bonus to remaining allowance and stop generating paid contracts at the cap.

At 29,930 days, a first offer on day 180 and 365-day intervals permits at most 82 offers. With the current maximum base payout of 1,450, a ten-day contract pays at most 1,450 extra. The theoretical pre-cap maximum is `82 × 1450 = 118,900`; the life cap reduces this to 100,000. Relative to simulated technology gross income, the cap is about 0.38%. This is a bounded reward proposal, not a simulation of optimal contract/bank strategy.

Base payouts continue to count toward the selected job's leaderboard. The completion bonus is separately recorded as **opportunity income** and does not count as career work earnings. It may be deposited into the bank; its effect on interest and earlier purchases needs simulation before release.

Use stable offer IDs and a catalog-pinned deterministic offer schedule shared by local/server replay. No per-offer network request is needed for generation. The server validates eligibility, qualifying action range, expiry and once-only reward.

Later opportunity ideas, requiring separate balance work:

| Idea | Proposed boundary |
| --- | --- |
| Scholarship | At most 10% off the chosen tuition, once per qualification per life; no cash payout or discount reroll |
| Promotion challenge | Achieve a title using actual qualified work; no free experience days initially |
| Restoration project | A trade-themed ten-day assignment with the same bounded bonus rules |
| Portfolio commission | A creative-themed assignment using actual paid work days |

Do not combine scholarship discounts or introduce arbitrary rewards into the existing prices without rerunning the economy.

## 3. Career-specific personality

Different careers can share the same reliable day engine while presenting different objectives:

| Career | Assignment theme | Progress shown in Career |
| --- | --- | --- |
| Delivery | Finish a route | Deliveries completed toward the assignment |
| Technology | Ship a small project | Project Work days completed |
| Trades | Restore a vehicle | Repair Work days completed |
| Business | Complete a client brief | Brief Work days completed |

These counts reflect completed daily Work actions, not extra actions that create a second income stream. Eating/resting should not erase project progress. Avoid streak multipliers that encourage neglecting needs. Contextual button labels can change in assignment details while Play retains the familiar Work control.

Deeper minigames and gesture tasks are later experiments, not prerequisites to earn ordinary income. Evaluate whether they add useful variety before introducing multiple controls and a separate reward balance.

## 4. Visible lifestyle progression

Add a modest visual scene in Life and Profile: selected residence, selected vehicle, and chosen owned outfit. A rented room and bike look different from a villa and sports car. Start with a small reusable illustration/icon set using the existing cream/green theme; do not build a large 3D world for this feature.

Only equip items owned in this life. Purchasing does not automatically change every showcase selection; allow a clear “Equip” or “Showcase” choice. Visual changes grant no new economic perks in the baseline. The [possessions plan](possessions-and-showcase.md) controls public display limits and verified publication.

Keep the scene off the main tapping area. A small purchase acknowledgement can link to Life. Respect reduced motion, large text and accessibility labels. No repeating celebration animation for every tap or purchase review.

After rebirth, the active scene returns to the starter life. Past scenes can appear inside legacy chapters, labeled as historical. This preserves the feeling of accomplishment without allowing old possessions to grant current benefits.

## 5. Lifetime ambitions

An ambition is a broad player-selected objective for this life; the existing personal goal is the next concrete step toward it. Show only that one step on Play. Allow changing an ambition without a fee, lost progress or extra game day.

| Ambition | Example checkpoints | Completion condition |
| --- | --- | --- |
| Build a career | Certificate/degree → first qualified job → promotion | Reach the chosen master/senior career role in this life |
| Become a homeowner | Stable income → savings goal → house | Own a small house or higher residence in this life |
| Build a garage | First car → sports/luxury target | Own three distinct car catalog items in this life; bike/scooter do not count |
| Complete a lifetime | Establish income → education or savings → care at older ages | Finish alive at age 100 |

Player can inspect other ambitions and still earn their achievements; the selected ambition is guidance, not a restriction. A broader “Collector” or “Graduate in three paths” ambition can be added after feasibility is checked against the lifespan.

Ambition rewards are cosmetic badges/titles only in the first release. Verify completion once and preserve the badge across rebirth. One life may achieve multiple ambitions; changing the selected ambition does not farm rewards. An ambition requiring current ownership cannot be completed using past-life items.

Show wallet-based progress as potentially decreasing after spending; show lifetime earnings as cumulative. Ownership goals finish only after purchasing. Suggest a next step, but allow the player to choose or hide it.

## 6. Legacy chapters and reasons to rebirth

At death or age-100 completion, create a chapter containing ending age/reason, chosen ambition, reached titles, education, work earnings by career, interest/opportunity income, largest purchases and personal records. Use a short summary first and optional details.

Examples: “Life 1 — Master mechanic, homeowner, reached 100” or “Life 2 — Graduate and villa owner, ended at 87.” Describe achievements even when the player dies early. Do not mislabel an early ending as a completed lifetime.

Offer a next-life suggestion based on something different from the last life, such as Technology after Trades or a garage ambition after homeownership. Suggestions cost nothing and can be ignored. The next life retains the confirmed reset rules, with no inherited money, degrees or economic multipliers.

Public identity uses an earned legacy career title and selected historical achievements, with current job secondary. Keep **Rebirths**, **completed lifetimes**, and **account level** distinct, as specified in the [lifetime plan](lifetime-economy.md). A historical villa is labeled “Past-life collection,” not owned this life.

## 7. Optional Work a week

This is a convenience proposal, not a change to earnings/day or the age-100 limit. Start with at most seven Work days; unlock after 200 completed Work days in the current life so the player first learns care costs. Keep one-day Work available at all times. No unattended looping or automatic offline work.

Preview from the exact local checkpoint and ordered unsent tail: requested days, projected age, earnings, hunger/sanity/health and any upcoming warning. Use the pinned deterministic payout stream; describe values as a local projection until verified.

Simulate the seven days **one at a time**. Each day changes age, needs, health, career experience, bank interest and contract progress exactly as an ordinary action does. Re-evaluate birthdays, modifiers and thresholds after every day; never multiply the initial day's reward by seven.

Default behavior: execute the safe prefix and pause before a day that would make hunger zero. Also stop at age 100 or at a condition requiring a new choice. Preview how many days can safely execute; if zero, direct the player to care. Ordinary one-day Work retains the existing explicit lethal-action confirmation. No hidden food purchases, automatic job switches or extra care days inside the shortcut.

This proposal supersedes the earlier suggestion that the week shortcut could cause an unexpected death: preserve risk through clear previews and ordinary one-day choices, rather than an opaque seven-day jump.

The shared four-day-actions/second allowance still applies to **virtual days**, not button presses. Seven days cost seven units of allowance; permit only a bounded burst and pace/wait for any remaining allowance. One shortcut cannot earn seven times the allowed work rate. Consider a compact cancellable progress control when pacing; stop after the current day rather than undoing earned days.

Compressed journal records have bounded counts and decode into the same ordered daily actions under the server contract. They do not require seven RPCs. Retry/reconciliation preserves the completed prefix and pending tail, with no duplicate income/interest/rewards. Backgrounding pauses new local execution after the current persisted day; reopening does not fabricate the remainder.

No week-based economy results have been generated yet. If it is exactly equivalent to seven ordinary days, the same economic outcomes should hold for the same strategy, but interaction time and player decisions may change considerably. Gate release on parity and human testing. Study a week is a later convenience using the same principles.

## Clean UI placement

| Screen | Content |
| --- | --- |
| Home | Money, hunger/sanity, current job, one goal, Work and Eat/Rest; optional week control in Work options |
| Career | Path comparison, education, promotions and contract details |
| Life | Residence/vehicle scene, wants, bank and wish list |
| Leaders | Career ranks and compact verified legacy showcase |
| Journey | Ambition selection, milestones, chapters, run history and personal records |
| Profile entry | Public preview, title/showcase edits, account and settings |

The five bottom tabs are Home, Career, Life, Journey and Leaders. See [main screen and navigation](main-screen-and-navigation.md) for the updated Home hierarchy. Personal history/ambitions use Journey; the profile is a secondary entry rather than a sixth bottom tab.

Show a small “Opportunity available” indicator in Career; no modal interruption on every offer. Keep the ordinary Play screen usable without reading several paragraphs or dismissing repeated celebrations. Reuse existing theme tokens/components. Offline absence never advances deadlines, ages the character or breaks a streak.

## Delivery plan and designated roles

| Stage | Owners | Deliverable | Exit condition |
| --- | --- | --- | --- |
| 1. Core foundation | Mobile + backend + database | Editable validated JSON catalogs, local prediction, durable journal, verified periodic sync; lifetime/catalog contract | Content publication/version pinning, recovery, age boundaries and account isolation verified |
| 2. Motivation slice | UI + mobile | Minimal Play, two ambition templates, one next-step goal, basic lifestyle scene | First-session users understand survival and their next purchase |
| 3. Two-path lifetime | Mobile + backend + database; lead balances | Technology/Trades, qualifications, milestones, finalization and legacy chapters | Two viable strategies; one replayable complete-life path |
| 4. Social and saving | UI + mobile + backend/database | Career boards, legacy showcase and bank | Verified public data, no per-tap requests and reconciled bank math |
| 5. Opportunities | Backend + mobile + database; UI reviews | One bounded contract type with career themes | Once-only rewards, expiry/cap math and updated economy simulations |
| 6. Tap convenience | Mobile + backend; UI reviews | Safe-prefix seven-day Work and preview | Client/server per-day equivalence, rate limits and cancellation pass |
| 7. Content expansion | Lead + all roles | Business, more wants/opportunities and ambitions | Pacing evidence and each path's balance/recovery checks |

Wireframe the motivation slice while contracts for foundation are being designed. Use the configured role agents when implementation is authorized; this planning update does not start implementation or a dev server. No estimated calendar duration is assigned before examining each change's dependency scope.

The [editable-content foundation](editable-game-content.md) must precede large-scale content population. Its [authoring guide](../guides/editing-game-content.md) will be finalized with actual commands when tooling is implemented.

## First-session playtest

Test a small build with the early jobs, Technology/Trades previews, one goal, a few wants and the legacy screen. First ten-minute targets are hypotheses, not time guarantees: understand the meters, buy the bike, experience the first new job, and choose something to save for. The existing baseline reaches the bike in roughly 300 days; at one interaction/second that is about five minutes before reading/navigation time.

Run a separate accelerated test fixture to review graduation, aging and rebirth without requiring every tester to spend eight hours on the full lifetime. Fixture progress is never eligible for public ranking. Also run representative full-length play sessions to detect repetitive-care and tapping fatigue.

Ask players what they want to do next, whether a purchase feels worthwhile, whether schooling is understandable, and what would make a second life different. Observe rather than assuming more systems mean more fun.

Measure first-bike progression, chosen goal/path, care frustration, session exits, rebirth choice and playtime per meaningful milestone. Returned players can inform retention, but no retention benefit is proven by these plans. Begin with consented playtest observations and aggregated gameplay counts; an analytics SDK or production tracking system is not selected here.

## Acceptance and balance checks

- Play remains clean and readable with large text, dark mode and accessible controls.
- Contracts cannot reroll through app reload, clock edits, job changes or repeated declines; late sync uses ordered game days to validate deadlines.
- Qualifying work pays once; a completion reward retry cannot pay twice or increase job leaderboard totals.
- Offers/ambitions need no independent per-tap or per-view Supabase mutation.
- Ambitions and legacy entries distinguish current assets, past achievements and age-100 completion.
- The week shortcut matches one-day execution across birthdays, sickness, low sanity, care thresholds, interest, contract completion and the final lifetime day.
- Shortcut pacing preserves server-time daily allowance; cancellation/reload cannot replay already completed days.
- Updated simulations include bank plus opportunities, alternate study strategies and both main career paths before new reward values ship.

Decisions to tune after wireframes/playtests: exact ambition names, opportunity cadence, whether a ten-day contract feels useful, scene detail, and the safest week-control presentation. Preserve the existing numerical baseline until those changes are tested.
