# Feature planning index

These documents retain the design decisions and numerical proposals behind the implemented lifetime game. Core rules, editable catalogs/tooling, local-first integration, bank, education, wants, contracts, ambitions and legacy have implementation in the repository. Root [architecture](../../architecture.md) and [implementation](../../implementation.md) record current modules and actual verification; historical planning status lines are not deployment evidence.

| Plan | Contents |
| --- | --- |
| [Local-first leaderboards](local-first-leaderboards.md) | Instant local play, batched validation, independent career boards, recovery |
| [Careers and lifestyle](careers-and-lifestyle.md) | Clean Play, education, branching jobs, goals, milestones and run history |
| [Possessions and showcase](possessions-and-showcase.md) | Wants collections, customizable public identity and verified flex items |
| [Lifetime economy](lifetime-economy.md) | One-day actions, ages 18–100, job/tuition/prices, health and fresh-life rebirth |
| [Bank and savings](bank-and-savings.md) | Deposits/withdrawals, exact tiered interest and comparative lifetime math |
| [Engagement and life stories](engagement-and-life-stories.md) | Opportunities, career personality, visible lifestyle, ambitions, legacy chapters and optional multi-day Work |
| [Main screen and navigation](main-screen-and-navigation.md) | Three main metric areas, Work/Eat/Rest, and Home/Career/Life/Journey/Leaders bottom tabs |
| [Editable game content](editable-game-content.md) | JSON authoring, validation, versioned publishing, data-driven screens and safe historical compatibility |

For delivery priorities and the first playable slice, start with **Engagement and life stories**. For numerical values, use **Lifetime economy** plus **Bank and savings**. Contracts and safe-prefix multi-day Work are implemented with shared parity tests; their human pacing remains a playtest question.

The editable-content foundation is implemented with a validated 21-job/six-qualification/58-item catalog. The [editing guide](../guides/editing-game-content.md) now gives actual validation, compilation, simulation, diff and privileged publication commands. Published versions are immutable and next-life activation is implemented.

Reproducible numerical artifacts:

- Historical baseline: [Lifetime Python simulator](tools/simulate_lifetime.py) and [results](lifetime-simulation-results.json).
- Historical baseline: [Bank Python simulator](tools/simulate_bank.py) and [results](bank-simulation-results.json).
- Current runtime-authoritative catalog simulation: `npm run content:simulate` and `game-content/build/simulation.json`; includes bank and contracts across eight complete-life strategies.

Confirmed choices: action-based needs, cream/green UI, per-job lifetime boards, cleaner Play, goals/milestones/history, education and wants, a configurable public showcase, and fresh-life resets preserving legacy records. Published catalog values are implemented balance choices. Further price/rate tuning requires a new immutable content version, simulations and playtesting.
