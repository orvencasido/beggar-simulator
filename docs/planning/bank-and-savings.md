# Bank, savings and supporting feature ideas

Status: design and numerical reference, updated 2026-10-12. The approved lifetime/local-first features now have implementation and hosted verification; see [current implementation evidence](../../implementation.md). Historical baseline examples and explicitly labeled future ideas remain reference material, not claims that every optional idea ships.

## Banking experience

Add a Bank section inside Life. Players can deposit wallet money, withdraw it, and earn interest while advancing game days. The Play screen retains its three primary indicators and Work button; bank details do not add another main meter.

Suggested opening requirement: earn 10,000 in verified work income during the current life. No account-opening fee. Allow one savings account per life. Start deposits at 100 units; allow any positive whole-unit withdrawal, including withdrawing all funds. No transfer fees, overdrafts, loans, market losses or withdrawal lock periods in the first release.

Wallet money pays for food and purchases by default. Offer optional automatic withdrawal of a spending shortfall and an optional automatic savings rule. Show wallet and savings separately inside Bank; a personal savings goal can use their combined liquid total if it says so clearly.

Deposits/withdrawals are transfers, not income or spending:

```text
Deposit x:  wallet' = wallet - x; bank' = bank + x
Withdraw x: wallet' = wallet + x; bank' = bank - x
wallet' + bank' = wallet + bank
```

They take no game day, create no hunger/health/sanity change, and generate no interest by themselves. Browsing, repeated transfers, profile edits, network retries and real-world waiting cannot advance the interest clock. This keeps the previously specified daily actions consistent.

## Interest rate proposal

| Portion of savings | Nominal rate per 365 game days |
| --- | ---: |
| First 500,000 | 1.00% |
| Amount above 500,000 | 0.25% |
| Maximum accrual, across the entire account | 50,000 per 365 days |

Rates apply to portions, not to the whole balance after crossing a threshold. A balance of 500,001 does not suddenly lose its first-tier interest. Interest stays in the bank, so future days compound it. These are nominal annualized game rates; effective growth depends on daily compounding, tiers, the cap and rounding.

For bank balance `B` at the opening of a valid day:

```text
annualEquivalent = min(
  0.01 × min(B, 500000) + 0.0025 × max(B - 500000, 0),
  50000
)
dailyInterest = annualEquivalent / 365
```

Use exact integer arithmetic and a persisted fractional remainder, matching the existing whole-unit money representation:

```text
dailyNumerator = min(
  4 × min(B, 500000) + max(B - 500000, 0),
  20000000
)
combined = previousRemainder + dailyNumerator
creditedInterest = combined // 146000
newRemainder = combined % 146000
bank += creditedInterest
```

`146000 = 400 × 365`. Do not floor away fractional interest separately every day: a small balance would otherwise earn nothing. Persist the remainder and include it in replay/recovery. It can remain when savings are empty, but a zero balance adds zero new accrual. Discard balance and remainder at rebirth.

The maximum rate applies once `B >= 18,500,000`, because the uncapped numerator becomes `B + 1,500,000`. At the cap, daily credits alternate between 136 and 137 units through remainder accumulation; 365 days credit no more than 50,000. A complete life can earn at most `82 × 50,000 = 4,100,000` interest, even under an impossible best case of being at the cap from age 18.

### Examples

With no deposits/withdrawals during the year, daily compounding and whole-unit credits produce:

| Starting savings | Savings after 365 game days | Interest earned |
| --- | ---: | ---: |
| 100,000 | 101,004 | 1,004 |
| 500,000 | 505,006 | 5,006 |
| 1,000,000 | 1,006,257 | 6,257 |
| 15,000,000 | 15,041,301 | 41,301 |
| 20,000,000 | 20,050,000 | 50,000 |

For one million, the first-day nominal calculation is `(500000 × 1% + 500000 × 0.25%) / 365 = 17.123287…`. The engine credits 17 and carries the fraction; next days calculate against the updated balance.

## Daily ordering and exploit prevention

Validate the next day action first. Capture its day-opening bank balance after any preceding valid transfers, calculate interest from that balance, apply the action's payout/cost/care, and finalize its day/ending atomically. A work payout earned today is eligible for savings interest beginning on a subsequent day, never twice on the same day.

Interest accrues on Work, Eat, Rest, Study and Checkup days alike: these are all elapsed game time. Advancing through valid care actions instead of work still spends lifespan and has needs/costs; it is a legitimate tradeoff. No artificial zero-cost “wait forever” action is introduced. After hunger death or age-100 completion, the ended account stops accruing immediately. The final valid day may earn its one ordinary credit.

One account per life prevents splitting balances across many first-rate tiers. Transfers require positive whole amounts within available balances. No negative deposit, arbitrary edited bank total, future-day claim or overflow is accepted. Server replay calculates credits; the client never supplies authoritative interest amounts.

Depositing and immediately withdrawing produces zero extra interest. An exact retry returns the original outcome without a second transfer/credit. Event compression must preserve transfers and spending order; a batch containing a withdrawal cannot accrue as though that withdrawn money remained deposited for all its days.

## Lifetime balance evidence

Run [simulate_bank.py](tools/simulate_bank.py) with `python3 -B docs/planning/tools/simulate_bank.py`. Results: [bank-simulation-results.json](bank-simulation-results.json).

Policy: use the same work/care/study strategy as the baseline, keep 200 in the wallet, deposit excess after qualifying, and automatically withdraw for prerequisite/tuition/wish-list purchases. The script maintains `workIncome + interest - spending = wallet + bank`, checks exactly 29,930 days and verifies the life-wide interest cap. It models automatic savings numerically as transfers, not an unbounded stream of network calls.

| Route | Liquid money without bank, before wants | Liquid money with bank, before wants | Bank interest during life |
| --- | ---: | ---: | ---: |
| Begging | 188,700 | 314,374 | 125,674 |
| Courier | 3,176,410 | 3,837,356 | 660,946 |
| Technology | 25,706,260 | 27,921,436 | 2,203,036 |
| Business | 24,177,330 | 26,339,852 | 2,154,562 |
| Trades | 22,804,640 | 25,253,066 | 2,446,606 |

Technology ends about 8.6% above the no-bank budget; trades about 10.7%. Interest can also shift enrollment/promotion slightly earlier, so the final difference is not always exactly the interest column. Begging's relative gain is large, about 66.6%, but its final money remains under the 600,000 house price. This is a meaningful saver advantage without moving it into the multi-million career tier.

The technology wish-list run still buys house, sedan, villa, luxury car and jet for 20,980,000. With banking, it gets the jet at 86.10 instead of 88.36 and ends with 5,803,255 liquid money. It earns only 1,064,855 interest because purchases withdraw invested funds along the way. Buying every housing tier still consumes about 90.9% of the technology no-wants bank budget, so the luxury collection remains difficult.

These are modeled strategies, not proof of optimal play or an implemented bank. More tests are needed for different spending policies, minimum random earnings, all-rest late-life strategies and treatment use. Do not introduce a higher rate or inheritable savings without rerunning the economy.

## Rebirth, earnings and public flex

Bank money resets to zero at rebirth, alongside the wallet. Lifetime interest statistics and peak verified wealth can remain historical achievements, without granting new-life spending power. No inheritance or level-based rate bonus in v1.

Career boards count work payouts only. Bank interest, deposits and withdrawals never count toward job earnings. Overall **work earnings**, **interest earned** and **current liquid money** need distinct labels if exposed. No bank funds are silently treated as a job payout.

Player-selected bank badges could include “First Saver,” “100K Saved” and “Million in Savings.” Verify milestone balance after a day action or explicit transfer; award once. A public profile can optionally show peak historical wealth or a savings badge without exposing current private bank details. Label peak wealth as historical, not currently available money.

Maintain the agreed legacy identity: leaderboard primary title is a verified earned career title, even after rebirth. Current job is an optional secondary field. Current possessions/degrees and past-life achievements must be visually distinct.

## Clean UI and sync

Bank shows wallet, savings, rate explanation, credited interest and Deposit/Withdraw. Use one amount picker with a confirmation summary. Offer optional “keep 200 in wallet” automatic saving and an optional auto-withdrawal safety setting. Leave both defaults off until onboarding/UX review; the simulator intentionally turns them on as a strategy.

Implement automatic saving/withdrawal as deterministic engine rules configured once, not separate per-day transfer requests. Changing a rule is a versioned setting action; the server applies the same rule in order. Manual transfers join the existing durable journal and periodic sync. Keep a single bank balance/checkpoint and accumulated interest total, not a database row for every credited day.

Offline/local bank balances are predictions under the pinned catalog. Public milestones and totals become publishable after verification. Include bank balance, remainder and savings-rule settings in checkpoint/reconciliation. No per-tap cloud request, server cron or real-time background interest calculation is required.

## Additional features worth considering

| Feature | Why it fits | Initial boundary |
| --- | --- | --- |
| Savings goals | Connect bank planning with college, a house or a villa | Earmarked targets share one balance/rate; no bonus interest per pot |
| Lifetime finance summary | Explain what a life earned and spent | Separate work, interest, food, tuition and wants |
| Personal records | Reward repeated lives without raising payouts | Best wealth, highest career, earliest graduation |
| Estate archive | Preserve the feeling of success after rebirth | Historical gallery only; no inherited benefits |
| Collection sets | Give less expensive purchases meaning | Cosmetic title rewards; no automatic income bonus |
| Optional contracts | Give an older career a useful goal | Needs a separate reward/action-rate simulation before release |

Prioritize savings goals and a finance summary alongside the bank. Mortgages, loans, stocks, rent income and term deposits introduce leverage or extra multipliers; keep them separate until savings and the lifetime loop are tested.
