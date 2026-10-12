# Lifetime economy, aging and rebirth — balance proposal v1

Status: design and numerical reference, updated 2026-10-12. The approved lifetime/local-first features now have implementation and hosted verification; see [current implementation evidence](../../implementation.md). Historical baseline examples and explicitly labeled future ideas remain reference material, not claims that every optional idea ships.

Related plans: [careers](careers-and-lifestyle.md), [possessions/showcase](possessions-and-showcase.md), [local-first sync](local-first-leaderboards.md).

Optional next layer: [bank and savings](bank-and-savings.md) supplies deposit/withdrawal rules, exact game-day interest math and comparative simulations. Results in this document remain the no-bank baseline; interest is excluded from work earnings.

## Confirmed direction and balance target

- Start each life at age 18. Each completed Work, Eat, Rest or Study action consumes one game day. No aging while the app is closed.
- Aging brings greater food/care needs. Surviving to age 100 completes the life and grants a level.
- Track rebirth/reset count. Start the next life from scratch.
- Confirmed reset preference: lose the life wallet, education, equipment and possessions; keep records, lifetime boards, badges and a gallery labeled “Owned in a past life.” This supersedes the earlier suggestion to retain degrees/major possessions.

Design target: basic survival remains possible even with poor early earnings; choices about schooling, care and purchases determine how much can be achieved in a life. One well-managed life can fund several major wants, but not every luxury collection. There is no final completion of the entire game: age 100 ends a life, then another begins.

## Calendar and action accounting

Use exactly 365 days per game year, with no leap-year/calendar complexity:

```text
elapsedDays starts at 0
ageYears = 18 + floor(elapsedDays / 365)
dayWithinYear = elapsedDays % 365
lifetimeDayLimit = (100 - 18) × 365 = 29,930
```

| Interaction | Advances age? | Notes |
| --- | --- | --- |
| Work, Eat, Rest, Study | Exactly one day | Work cannot share a day with study or eating |
| Treatment/checkup | Exactly one day | Optional care action |
| Buy equipment/house/car, enroll, equip, switch job | No | Costs/prerequisites still validated |
| Browse, read rankings, change showcase, sync | No | No aging or needs change |
| Invalid, unaffordable or repeated network request | No | No economic or age mutation |
| Restart/rebirth | No day in the new life | New life starts at 18 and day 0 |

Process each day using the age band **before** the action. Apply that action's payout/cost, hunger/sanity effects and care effects; then deduct health aging, increment the day, and evaluate ending. Hunger at zero ends the life early. If hunger remains above zero and days reach 29,930, complete the life at 100. Simultaneous starvation on the final day does not count as survival to 100. No day 29,931 work is accepted.

For hunger after eating, clamp only after the full expression: `min(100, oldHunger - basalCost + foodRestore)`. This permits food to rescue low hunger without a premature death check. Negative hunger after other actions clamps to zero and ends the life; a final work payout still counts.

Keep all four day-advancing actions within one shared proposed cap of four actions/second, with bounded burst and server-clock allowance. Otherwise study/rest could accelerate age or qualifications beyond the work limit. Sync batching must honor this combined cap rather than one independent cap per action type. Non-day profile/purchase actions also need separate abuse/payload bounds.

At four actions/second, 29,930 days take at least 124.7 minutes, ignoring interruptions; at one action/second, 8.31 hours of interactions. These are lower-bound interaction times, not promises about a human play session. If 29,930 taps proves tiring, revisit lifespan length or explicitly designed multi-day actions later rather than adding automatic offline aging.

## Needs and aging

Start with hunger 100, sanity 100, health 100, wallet 0. Hunger/sanity keep their current 0–100 UI ranges. Health is an additional condition shown in details and as a compact status when unwell; preserve the three-primary-indicator Play design.

Health is a fictional game resource, not a medical model. Store it as an integer from 0 to 10,000 (hundredths of a displayed point) to avoid float drift.

| Age at action start | Basal hunger per day | Health loss per day | Health loss over 365 days without care |
| --- | ---: | ---: | ---: |
| 18–39 | 4 | 0 | 0 |
| 40–59 | 5 | 0.05 | 18.25 |
| 60–74 | 6 | 0.15 | 54.75 |
| 75–89 | 7 | 0.30 | 109.50 |
| 90–99 | 8 | 0.50 | 182.50 |

Health losses are 0, 5, 15, 30 and 50 integer units respectively. Care offsets them. Values can exceed 100 over a year because health is clamped at zero rather than allowed to become negative. Old age creates recurring care needs, not guaranteed failure.

| Health before action | Condition label | Work payout multiplier | Additional hunger |
| --- | --- | ---: | ---: |
| 40–100 | Stable | 100% | 0 |
| 20–39.99 | Unwell | 85% | +1 to Work/Study/Rest |
| 0–19.99 | Frail | 70% | +1 to Work/Study/Rest |

Health zero is nonfatal and recoverable through free Rest. Hunger remains the only resource that kills early. Random diseases, sudden death and irreversible deterioration are excluded from v1; sickness is deterministic so local/server replay agrees and players can understand how to recover.

Rest may be used when sanity **or health** is below full, replacing today's sanity-only validation. Reject Rest when both are full. A player can manage health proactively; age does not force everyone to become sick if they pay the action-time cost of care.

### Day action formulas

Let `B` be age-band basal hunger and `U` be 1 when health <40, otherwise 0:

- Work: hunger `−(B + jobStrain + U)`; sanity `−jobSanityCost`; earn the modified payout.
- Study: hunger `−(B + 1 + U)`; sanity `−2`; add one study day.
- Rest: hunger `−(ceil(B/2) + U)`; sanity `+25`; health `+4`, both capped before daily aging.
- Eat: hunger `−B + foodRestore`, capped at 100; no sanity effect.
- Checkup: hunger `−B`; health `+30`, capped before daily aging; costs 250.

Sanity payout multiplier: >=50 →100%; 20–49 →80%; 0–19 →60%. Work reward is `max(1, floor(baseReward × sanityPercent × healthPercent / 10,000))`, with one final floor. Equipment/career upgrades do not add uncapped multipliers.

## Food and care pricing

| Purchase/action | Money | Effect | Day cost |
| --- | ---: | --- | ---: |
| Bread | 25 | +25 hunger before basal deduction | 1 |
| Full meal | 100 | +80 hunger before basal deduction | 1 |
| Premium meal | 180 | +100 hunger before basal deduction | 1 |
| Rest | 0 | +25 sanity, +4 health; hunger formula above | 1 |
| Checkup | 250 | +30 health; basal hunger deducted | 1 |

A meal at age 18 provides a net 76 hunger; at 90 it provides 72. Premium food buys a longer interval between meals at a higher price. No food automatically cures sickness. Reject food when hunger is already full and treatment when health is full, without cost/day mutation. Show effective restoration before purchase.

Reserve recommendation: keep 200 spendable money before optional equipment/tuition purchases. This is a helper/warning, not a forced spending lock. The simulator enforces that reserve to compare sensible strategies. Do not charge surprise rent, fuel, interest or annual taxes in v1; action-time care and tuition are the modeled expenses.

At age 18, the minimum begging payout is 12. Food is roughly `4 × 100/76 = 5.26` per work day before care scheduling; that leaves a positive survival margin. At 90, `8 × 100/72 ≈11.11` before rest days, so basic survival is tighter. The exact simulator includes those rest days and verifies survival even if every begging payout is the minimum, under its care policy.

## Earnings and job unlocks

All payouts below are fictional **per completed Work day**, at full payout multipliers. Begging randomly returns 12–18, uniformly, expected value 15; server-issued deterministic randomness must reproduce it locally. Base tables are a proposed new catalog, not existing app values.

| Job | Base payout | Work strain | Sanity cost | Requirement |
| --- | ---: | ---: | ---: | --- |
| Begging | 12–18 | 0 | 1 | None |
| Newspaper delivery | 60 | 1 | 1 | Bike: 2,500 |
| Courier | 140 | 2 | 2 | Bike + delivery kit: 10,000 |
| Freelancer | 260 | 1 | 3 | Laptop: 45,000; no degree |
| Mechanic | 350 | 2 | 2 | Trade tools: 15,000 + certificate |
| Trade specialist | 650 | 2 | 3 | 1,000 qualified trade Work days |
| Master tradesperson | 1,050 | 2 | 3 | 3,000 qualified trade Work days total |
| Junior developer | 550 | 1 | 3 | Laptop + computing degree |
| Software engineer | 900 | 1 | 4 | 1,500 qualified technology Work days |
| Senior engineer | 1,450 | 1 | 4 | 4,500 qualified technology Work days total |
| Business analyst | 520 | 1 | 3 | Laptop + business degree |
| Manager | 850 | 1 | 4 | 1,500 qualified business Work days |
| Executive | 1,400 | 1 | 5 | 4,500 qualified business Work days total |

Qualified experience starts in the degree/certificate role, is cumulative within that career family in the current life, and counts work rather than care/study or rewards. Switching away pauses family progress; switching back resumes it. Promotion requirements are totals, not 1,500 plus another 4,500. No promotion cash fee is modeled.

The old infinite freelancer skill formula is **disabled in this proposal**. Leaving it active would bypass the finite job ceilings and invalidate luxury pricing. First-life jobs have bounded payouts; future new roles need a catalog rebalance.

For later paths, provisional values requiring their own simulations: Nurse 500 → senior nurse 900 (1,500 qualified work days); junior engineer 550 → project engineer 950 → lead engineer 1,400 (1,500/4,500); designer 400 → senior designer 750 → art director 1,150 (1,500/4,500). Do not release these solely on the basis of the three-path simulation.

## School expenses and time

Tuition is one upfront payment, charged once per enrollment in a life. Food/care while studying is additional. Study does not produce a work payout that day. A degree can therefore consume money and a large fraction of the lifetime even after the player can pay tuition.

| Qualification | Tuition | Study days | Eligible path | Planning status |
| --- | ---: | ---: | --- | --- |
| Trade certificate | 25,000 | 120 | Mechanic/trades | Simulated |
| Computing degree | 180,000 | 1,460 | Technology | Simulated |
| Business degree | 160,000 | 1,460 | Business | Simulated |
| Nursing degree | 200,000 | 1,460 | Healthcare | Provisional |
| Engineering degree | 220,000 | 1,460 | Engineering | Provisional |
| Design certificate | 40,000 | 365 | Creative | Provisional |

1,460 Study days is four years of study actions, not four calendar years while also working and eating. Alternating work/study plus care takes about 9.35 game years. The simulated technology player enrolls near 22.8 and graduates near 32.1. Funding a continuous full-time study period beforehand can shorten graduation age, but needs its own budget; do not imply tuition covers living expenses.

All fictional schools charge the same tuition for the same qualification initially. Different school names are showcase flavor, not a hidden better salary. No enrollment debt, scholarships or random failed exams in this model.

## Wants price catalog

Prices are one-time unlocks within a life. Buying a higher tier does not refund the prior tier. These are optional aspirations; players need not buy each intermediate luxury. Values use the same money units as job earnings.

| Collection | Item → price |
| --- | --- |
| Housing | Room 12,000; studio 60,000; apartment 200,000; small house 600,000; townhouse 1,500,000; villa 4,000,000; penthouse 7,000,000; mansion/estate 12,000,000 |
| Vehicles | Bike 2,500; scooter 18,000; used car 60,000; sedan 180,000; SUV 350,000; sports car 700,000; luxury car 1,200,000; supercar 2,500,000 |
| Motorcycles | Starter 25,000; touring 100,000; premium 300,000 |
| Work equipment | Delivery kit 10,000; trade tools 15,000; laptop 45,000 |
| Technology | Smartphone 8,000; tablet 15,000; gaming PC 80,000; premium workstation 150,000; home cinema 250,000 |
| Watches/jewelry | Everyday watch 5,000; mechanical watch 40,000; necklace 60,000; ring 100,000; luxury watch 400,000 |
| Fashion | Casual outfit 2,000; tailored suit 20,000; designer outfit 100,000 |
| Furnishings | Bed 15,000; desk 20,000; sofa 35,000; artwork 120,000; music room 300,000 |
| Hobbies | Sports kit 5,000; guitar 12,000; camera 30,000; piano 100,000 |
| Travel | Weekend trip 10,000; retreat 40,000; island holiday 150,000; world tour 500,000 |
| Rare collections | Rare books 50,000; vintage car 900,000; rare artwork 1,000,000 |
| Late luxury | Pool 500,000; holiday home 3,000,000; yacht 8,000,000; private jet 15,000,000 |

Baseline simulations give wants **no economic or care bonuses**, including beds/housing: ownership/showcase only. Only the explicitly priced job prerequisites unlock work. This deliberately defers previously suggested rest/comfort boosts; those require another simulation. Purchased durable wants take no game day. A travel purchase books an experience; completing it takes one extra day with basal hunger deduction, grants a badge, and has no care reward in v1.

Homes alone cost 25,372,000 if all eight are bought. A full technology life has about 25.7M available before wants, so buying all homes would consume almost its entire budget, leaving little for cars. Buying a house, sedan, villa, luxury car and jet totals 20,980,000 and fits a well-managed technology life. Getting every collection is a multi-life gallery goal, not a single-life expectation.

## Reproducible simulation evidence

Run [simulate_lifetime.py](tools/simulate_lifetime.py) with `python3 docs/planning/tools/simulate_lifetime.py`. Saved output: [lifetime-simulation-results.json](lifetime-simulation-results.json).

Policy: save 200 before progression purchases; eat when hunger is within eight points of the next risky action cost; use a full meal when affordable; Rest below sanity 55 or health 55; alternate Work/Study while enrolled; promote as soon as qualified. Starts at zero money; buys prerequisites and tuition. No housing perks, checkups, premium meals, debt or passive income. Mean begging uses a fixed 15, not a random trial; additional runs use the worst-case 12 every time.

| Route | Work days | Eat days | Rest days | Study days | Gross work earnings | Food + prerequisites + tuition | Money available before wants |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Begging only, mean 15 | 26,260 | 2,052 | 1,618 | 0 | 393,900 | 205,200 | 188,700 |
| Courier | 25,023 | 2,651 | 2,256 | 0 | 3,454,010 | 277,600 | 3,176,410 |
| Technology | 22,660 | 2,298 | 3,512 | 1,460 | 26,173,560 | 467,300 | 25,706,260 |
| Business | 22,170 | 2,273 | 4,027 | 1,460 | 24,622,130 | 444,800 | 24,177,330 |
| Trades | 24,260 | 2,613 | 2,937 | 120 | 23,118,440 | 313,800 | 22,804,640 |
| Technology, minimum begging 12 | 22,674 | 2,297 | 3,499 | 1,460 | 26,020,574 | 467,200 | 25,553,374 |
| Begging only, minimum 12 | 26,260 | 2,052 | 1,618 | 0 | 315,120 | 205,200 | 109,920 |

Every row completes exactly 29,930 days alive; the script checks the day sum and `gross − spending = wallet`. This demonstrates viability under a specific competent policy, not that every purchasing choice survives or that a path is globally optimal. Spending the last food money or neglecting care remains risky. Future studies should compare other strategies and many seeded begging sequences.

Mean-path landmarks: bike 18.82, courier kit 19.38, laptop 20.47. Trade graduation 21.11 and master 30.88; technology graduation 32.13 and senior 47.22; business graduation 31.88 and executive 46.96.

A separate simulated technology wish-list run purchases house at 33.57, sedan 34.65, villa 49.43, luxury car 52.27 and jet 88.36, finishing with 4,726,260. It has the same earnings/action counts because those purchases have no day cost or benefit.

For begging, food/rest take 8.54% of days at ages 18–39 and 21.86% at ages 90–99. For senior technology, high sanity costs already require regular rest, so late-life care share rises less: care occupies 19.77% at 40–59 and 22.74% at 90–99. Aging costs are meaningful but partly overlap existing sanity care; do not claim all routes deteriorate by the same percentage.

Trade lifetime disposable income is about 11.3% below technology but qualifications arrive about eleven years earlier. Business is about 5.9% below technology and has slightly cheaper tuition. These are the initial tradeoffs; human playtesting must determine whether the tech ceiling or trade convenience dominates preferences.

## Level, rebirth and permanent records

- `rebirthCount` starts at 0 and increments once when a player deliberately starts another life after an ended life, including hunger death. Display “Rebirths: N.” Merely reopening or retrying does not increment it.
- `completedLifetimes` increments once when a life ends alive at 100.
- `accountLevel = 1 + completedLifetimes`. Early hunger death does not grant a level, so repeatedly dying cannot farm levels.
- Account level unlocks cosmetic titles/showcase themes only in v1, with **no earnings multiplier or starter cash**. Rebirth preserves the same balanced difficulty and comparable board earnings.
- Reset age to 18, wallet 0, needs/health 100, job begging, no active equipment, possessions or qualifications. Reset course progress and qualified experience. Owned benefits cannot leak from the previous life.
- Preserve lifetime per-job earnings, overall earnings, earned cosmetic milestones, run summaries, level/rebirth counters and historical collection records.
- Public profile separates “This life” ownership/graduation from optional “Past-life collection” achievements. A previous villa or degree must never be labeled currently owned/completed in the new life. Public career ranking continues to include verified earnings from all lives.

Record ending reason (`hunger` or `age_limit`), age/day, earnings, care/study/work counts, job totals and collection/education highlights in run history. Finalization and rebirth need atomic server validation and idempotent receipts. Keep new-life actions ordered after rebirth in a periodic sync; do not add a mandatory network call for each new daily action.

## Implementation and validation gates

Before implementing, review these proposed prices/formulas, then pin them in one new catalog version. Expand the client/server parity vectors to age boundaries, study, sickness, final-day starvation, completion and rebirth. Reject attempts to edit age, multiply compressed day counts, gain duplicate graduations, or claim past-life benefits as current ownership.

Existing saves need an explicit migration: do not infer age from old taps that did not have these rules. Recommend introducing the lifetime economy through a deliberate fresh-life transition while preserving verified historical earnings. Specify what old possessions appear in the historical gallery; do not convert old low-priced assets into new money or arbitrary new degree ownership.

Required further checks: full-time-study budget, study begun late in life, low-sanity/low-health recovery, treatment tradeoffs, delayed batches spanning birthdays/death/rebirth, randomized payout trials, remaining career paths and human tapping fatigue. Lint/typecheck and actual engine/database tests are release requirements; this standalone experiment does not claim to validate the unimplemented runtime.
