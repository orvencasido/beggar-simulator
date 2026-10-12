# Careers, education and lifestyle progression

Status: design and numerical reference, updated 2026-10-12. The approved lifetime/local-first features now have implementation and hosted verification; see [current implementation evidence](../../implementation.md). Historical baseline examples and explicitly labeled future ideas remain reference material, not claims that every optional idea ships.

Additional requested expansion: [more possessions and a customizable leaderboard showcase](possessions-and-showcase.md), covering optional purchase collections, graduation display and selected verified owned items.

New balance proposal: [lifetime economy, aging and rebirth](lifetime-economy.md). It supplies prices/payouts and supersedes this document's proposed permanent-degree/asset retention: the user chose fresh lives with historical records/gallery preserved. Earlier generic costs/benefits remain ideas until reconciled with that numerical model.

Engagement breakdown: [life stories and delivery plan](engagement-and-life-stories.md) expands ambitions, optional opportunities, distinct career assignments, visible lifestyle and legacy chapters, with a gated multi-day Work proposal.

## Confirmed direction

- A cleaner Play screen: less text, three primary meters/readouts for money, hunger and sanity, and a prominent Work button.
- Personal goals, career milestones and run history.
- College degrees and multiple job paths to choose from.
- Aspirational purchases: homes through villas, and cars through luxury cars.
- Solo progression with global job-specific lifetime earnings boards; instant local actions and periodic cloud verification.

Specific career names, benefits, balance, persistence and release ordering below are suggestions, not finalized rules. Treat monetary values and action counts as fictional game balancing rather than real-world prices or qualification requirements.

## A satisfying climb

Start with survival, unlock practical work, choose an ambition, fund training or college, grow a career, and buy a better life. A player should have several worthwhile choices: study for a specialist career, advance in a trade, or save for a business later.

Education opens opportunities rather than automatically granting the highest payout. Promotion combines qualification, career experience and an affordable equipment requirement. Give each path a different strength while keeping older careers worth revisiting.

Example journey: Begging → newspaper delivery → courier → college computing degree → junior developer → software engineer → first home → senior developer → villa and luxury car. An alternative journey skips college: delivery → trained mechanic → master mechanic → workshop owner in a later expansion.

## Minimal Play screen

Suggested hierarchy, from top to bottom:

1. Money: one large wallet balance. Money is a readout, not a percentage bar with an arbitrary maximum.
2. Hunger and sanity: two compact labeled meters with visible values. Together with money, these form the three primary indicators.
3. Current job: one short line, such as “Courier · +50/work.” Show adjusted earnings when sanity changes them; put the full breakdown in job details.
4. One selected goal: a short label and progress, such as “Bike · 75 / 100.” Tap for details or to choose another goal.
5. Work: the largest control, comfortably reachable with one hand. Its detail view explains costs; a lethal action still needs the existing confirmation.
6. Eat and Rest: two compact secondary controls that remain easy to reach. Survival should not require browsing a large shop every time.

Use warm cream, dark text and muted green with the existing theme. Keep supporting text short; remove repeated instructions, every-tap status messages and stacks of decorative cards. Show an unobtrusive sync indicator; expand it only for an error or a requested explanation.

“Less text” does not mean unlabeled icons: retain short labels and accessible names, adequate targets, non-color warnings, large-text support and screen-reader meter values. Suppress repeated per-tap announcements. Reduced motion should preserve all feedback.

Updated navigation proposal: **Home · Career · Life · Journey · Leaders**. Home is the focused Play screen; Career contains Jobs/Education/Opportunities; Life contains shopping/possessions/Bank; Journey contains ambitions, milestones and run history. Profile opens from the header for identity/account/settings. See [main screen and navigation](main-screen-and-navigation.md) for the hierarchy and money-progress-bar rules.

## Goals, milestones and history

| Feature | Suggested behavior | Examples |
| --- | --- | --- |
| Personal goals | Choose one tracked target; automatically update its progress | Buy a bike, graduate, earn 10,000 as a courier, buy a first home |
| Career milestones | Permanent recognition for verified achievements | First shift, qualified specialist, 100,000 career earnings |
| Run history | Compact summary after each death and in Journey | Run earnings, survival actions, jobs worked, qualification earned, final hunger-changing action |
| Personal bests | Compare a run with the player's own past runs | Best run earnings, longest survival, most earnings in a career |
| Profile showcase | Customize visible job, overall earnings, qualification, title, avatar and selected possessions | “Graduate,” villa, sports car; see the expanded showcase plan |

Different goals need different progress semantics: “save for a bike” tracks current spendable money and can decrease after buying food; “earn 10,000” tracks cumulative earnings and never decreases. A purchase goal completes only when the item is owned, not when its price has briefly been reached.

Start with titles/badges as milestone rewards. If financial rewards are added later, grant each once under server validation and exclude them from work-earned leaderboard scores. Validate unlock conditions even when the UI marks a goal complete locally.

Run history uses action counts for survival because leaving the app does not consume hunger. Include an optional date, but never imply that real elapsed hours mean active survival. End reasons can identify work or rest as the final action. Keep full private history for the owner; store compact summaries, not a permanent row for every tap.

## Education

Offer a short practical certificate before a college degree. College is an investment the player can fund while continuing to work, not a paywall that ends all other routes.

Proposed education loop:

- Choose one active course, inspect its price, eligible jobs and study requirement, then enroll.
- Study is a deliberate action with a clear hunger/sanity cost and visible progress. No progress or resource decay happens simply because time passes.
- A Study control appears inside Career/Education, keeping Play centered on Work. Job and course progress continue independently.
- Finish the required study actions to receive the qualification. Already completed qualifications cannot be purchased or rewarded again.
- Show enrollment cost and total expected study effort up front. Avoid hidden exam failure, random graduation delays or surprise fees in the first version.
- One-time enrollment is a simple first model. Tuition installments, scholarships and advanced degrees can follow once the economy is balanced.

Qualifications are fictional game unlocks. A degree provides eligibility; it does not replace a path's experience requirements. Scholarship goals should offer an optional alternate funding route, not an unpredictable requirement.

## Career paths to explore

| Path | Early work | Training/degree | Advanced job ladder | Distinct gameplay direction |
| --- | --- | --- | --- | --- |
| Delivery and logistics | Newspaper delivery → courier | Logistics certificate; business/logistics degree for management | Dispatcher → logistics manager | Strong early income; vehicle/equipment choices |
| Technology | Basic digital tasks → freelancer | Computing degree | Junior developer → software engineer → senior engineer | High eventual earnings with greater sanity demands |
| Business and finance | Retail assistant → sales representative | Business or finance degree | Analyst → manager → executive | Steady progression and experience-based promotions |
| Healthcare | Clinic assistant | Nursing degree; medicine degree as a later branch | Nurse → senior nurse; later physician branch | Strong qualifications and a longer investment path |
| Engineering | Workshop assistant → technician | Engineering degree | Junior engineer → project engineer → lead engineer | Equipment investment and technical progression |
| Skilled trades | Apprentice → qualified mechanic or electrician | Trade certificate | Specialist → master tradesperson | Competitive route without college |
| Creative | Small commissions → designer | Portfolio certificate; optional design degree | Designer → art director | Flexible qualification options and portfolio goals |

These are paths to explore, not seven ladders to launch at once. Keep the original four jobs as the early loop. Recommended first expansion: **Technology, Business, and Skilled Trades**, plus their prerequisites. Introduce Healthcare, Engineering and Creative after playtesting establishes pacing and balance.

Use immutable job IDs for scoring, distinct from displayed names and career families. A family groups navigation; each playable job still has its own earnings board under the confirmed rule. Advanced-role earnings do not retroactively become beginner-role earnings. Consider family-wide boards only as a separately labeled future feature.

Avoid a single universally superior late-game job. Compare net earnings after food/study/equipment, action costs and progression effort. Higher sanity cost alone may not differentiate a path if free rest eliminates its tradeoff; simulate actual work/rest loops before approving rewards.

Promotions should require work completed or experience accumulated in that career, not just money earned elsewhere. Show the next promotion's two or three requirements in job details. Avoid adding a fourth universal meter to Play; career experience belongs on Career.

## Things worth buying

| Category | Suggested purchase ladder | Purpose |
| --- | --- | --- |
| Housing | Rented room → studio → apartment → small house → townhouse → villa → estate | Aspirational collection; modest rest-quality benefit |
| Transport | Bike → scooter → used car → sedan → premium car → luxury car → supercar | Unlock certain delivery roles; optional cosmetic/status upgrades |
| Work equipment | Delivery bag → professional kit; basic laptop → workstation; starter tools → specialist tools | Career-specific eligibility and bounded efficiency |
| Education | Practical certificate → college degree → advanced specialization | New careers and promotion eligibility |
| Comfort | Comfortable bed, hobby supplies, home office | Small clearly explained care benefits |
| Experiences | Restaurant meal, day trip, holiday | Optional one-time sanity recovery and collection milestones |

Homes and transport should not all be raw payout multipliers. A delivery bike can unlock a job, while a luxury car can be a visible collectible with a small comfort benefit. Buying every luxury tier should remain optional; a designer should not need a supercar to keep advancing.

For housing, represent the first rented room as a simplified one-time game unlock initially. If rent/maintenance is introduced later, charge only at a clearly explained action-based checkpoint. Never silently deduct money or kill the player while the app is closed.

Equip one residence and one vehicle at a time. Higher tiers replace the active benefit; ownership can remain in a collection. Do not stack seven homes' rest bonuses. Food should remain necessary: homes improve Rest and never cancel hunger costs entirely. No passive property income or automatic work in the initial expansion.

Keep a “My Life” collection showing owned residence, transport and qualifications, with the next wish-list item. Start with clean thumbnails or icons; elaborate home decoration and a large animated garage are optional later projects.

Exact prices are deliberately undecided. Tune purchases against net disposable income: early survival purchases remain reachable, college is a meaningful medium-term goal, and villas/luxury cars provide long-term targets. Price each tier using full economy simulations rather than simply adding zeros to the last job's payout.

## Death, rebirth and permanent records

The existing MVP resets wallet, equipment and skill upgrades on death while preserving lifetime earnings. Expensive education and possessions make that rule much more consequential. Do not change persistence silently.

Confirmed reset preference: start a fresh life; retain records and a labeled past-life gallery. Detailed counters and age-100 completion are proposed in the lifetime economy plan.

| Record | Proposed behavior on death |
| --- | --- |
| Hunger, sanity, run wallet and temporary consumables | Reset for the next run |
| Active job and run-specific work equipment/skill boosts | Reset under clearly listed run rules |
| Lifetime career earnings, milestones and run history | Persist |
| Completed degrees and certificates | Reset; keep historical graduation achievements only |
| Owned residence and collectible vehicles | Reset; keep historical collection entries without active benefits |
| Incomplete study progress | Reset; enrollment is charged once per course in each life |

Every new life starts with begging selected and no qualifying possessions/degrees. Historical assets and education do not unlock work or grant benefits in the new life. The numerical proposal tests whether college and major wants can still be reached within one lifetime; it supersedes the earlier suggestion to preserve active degrees/possessions.

## Fit with local-first sync

Study, enroll, promote, equip and purchase become versioned ordered game actions, alongside existing work and care. Apply them locally immediately and verify them in the same periodic batch. New feature screens do not need a write request every time a player taps.

Use a versioned catalog for qualifications, requirements, costs, item effects and milestone conditions. Make every effect deterministic and replayable. Recheck journal bounds and server earning allowances for study and other non-work actions: unlimited zero-cost actions must not bypass payload or reward limits.

Separate permanent records/gallery from each life's wallet, qualifications and possessions. Server verification updates both atomically at death/restart boundaries. Only verified work payouts enter leaderboards; ownership, tuition refunds, milestone gifts and sale proceeds do not.

Do not write database migrations from this brainstorm. The database/backend roles must first review the chosen persistence model, expanded contract, migration from existing saves and game-rule parity.

## Suggested delivery order

1. **Foundation:** implement instant local simulation, durable saves, periodic verification and initial four-job boards using the companion plan.
2. **Clarity and motivation:** simplify Play; add one personal goal, career milestones and compact run history. Build early wireframes alongside the foundation work.
3. **Career choice:** implement the agreed fresh-life boundaries; add certificates, college, study and Technology/Business/Trades paths.
4. **Lifestyle:** add housing, vehicles, ownership/equip rules and wish-list goals, balanced against the new careers.
5. **Expansion:** add remaining paths, seasonal boards and possibly businesses/prestige based on playtesting.

Mobile owns immediate simulation and recovery; UI owns Play hierarchy and compact secondary screens; backend owns versioned action verification; database owns account/run boundaries, migration and ranking performance. The lead coordinates economy simulations and final product decisions. Use the configured agent roles when implementation is requested.

## Review checklist before implementation

- Play clearly communicates wallet, hunger, sanity, Work and accessible survival actions without explanatory paragraphs.
- Goals expose whether progress uses wallet, lifetime earnings, study or ownership.
- Degree/trade paths are viable without requiring every other path to be completed.
- Promotions and purchases state all prerequisites before spending.
- The player knows exactly what death resets and preserves.
- Studies, care and purchases respect action-only needs and journal limits.
- Milestones and deterministic payouts survive retries without duplicate credit.
- Career IDs and leaderboards have explicit rules as new roles are introduced.
- Balance simulations compare first degree, first home and late luxury targets across each proposed path.

Open choices: exact launch careers; approval of numerical study/pricing proposals; future residence/vehicle effects; future resale rules. Fresh-life reset preference is confirmed. No real-time upkeep, random qualification failures or passive income is proposed for the first expansion.
