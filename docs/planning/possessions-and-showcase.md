# More wants and a customizable public showcase

Status: design and numerical reference, updated 2026-10-12. The approved lifetime/local-first features now have implementation and hosted verification; see [current implementation evidence](../../implementation.md). Historical baseline examples and explicitly labeled future ideas remain reference material, not claims that every optional idea ships.

Pricing and reset rules are now proposed in [lifetime economy](lifetime-economy.md). The user chose to reset possessions/degrees each life while retaining a clearly labeled past-life gallery. Showcase references must distinguish current ownership/graduation from historical achievements. Earlier possible item benefits are deferred by the baseline simulation.

Leaderboard identity clarification: default to an earned legacy career title, which persists through rebirth, rather than showing Begging as the player's primary identity after every reset. Current-life job is optional and secondary. The [bank plan](bank-and-savings.md) adds optional verified savings badges and historical peak-wealth display without changing career ranking.

## Confirmed direction

Expand optional things to buy and let players show selected achievements and possessions to other players. A customizable public profile can show a name, job, total earnings, graduation and selected owned items. The leaderboard is an entry point to that profile, while its main rows stay compact.

Players choose which optional details are visible and which possessions represent them. Displayed jobs, earnings, qualifications and ownership come from verified game records, not editable text claims. The exact catalogs, slot counts and release phases below are proposals.

## Purchase ideas

| Collection | Suggested purchase ladder or examples | Purpose |
| --- | --- | --- |
| Homes | Studio, apartment, townhouse, villa, penthouse, mansion, estate | Long-term aspirations; bounded residence benefits |
| Vehicles | Scooter, used car, sedan, SUV, sports car, luxury car, supercar | Career requirements for selected vehicles; garage collection |
| Motorcycles | Starter motorcycle, touring bike, premium motorcycle | Alternative transport and collection choices |
| Technology | Smartphone, tablet, laptop, workstation, gaming PC, home cinema | Selected work eligibility; mostly lifestyle collectibles |
| Watches and jewelry | Everyday watch, mechanical watch, luxury watch, necklace, ring | Optional showcase collectibles |
| Fashion | Casual outfit, tailored suit, designer outfit, formal collection | Avatar appearance and personal style |
| Home furnishings | Comfortable bed, desk, sofa, art, music room | Some modest care benefits; mostly collection/decor |
| Hobbies | Camera, guitar, piano, sports equipment, gaming setup | Optional sanity activities with clear action costs |
| Travel experiences | Weekend trip, mountain retreat, island holiday, world tour | Owned experience badges; optional one-time care effect |
| Collectibles | Artwork, rare books, vintage car, trophy display | Expensive optional targets and themed collections |
| Late-game luxuries | Private pool, holiday home, yacht, private jet | Aspirational money sinks; initially prestige items |

Use fictional catalog names and schools initially. Items do not need real brands to feel desirable. Reuse clean category icons and add a few distinctive premium thumbnails rather than requiring custom art for every item at launch.

Wants are optional. A luxury watch or yacht must not be a prerequisite for graduating, recovering sanity or reaching an unrelated career. Clearly mark each item as cosmetic, unlock, consumable or benefit-bearing. Avoid making every purchase another permanent income multiplier.

Experiences and consumables differ from owned durable items: a completed trip can earn a permanent travel badge, but a consumed meal cannot be displayed as a currently owned possession. Qualifications are earned through study, not purchased flex items. Rental access is labeled as rented rather than owned.

## Shopping and collecting

- Put expanded browsing in Life, grouped by collection. Play still centers on money, hunger, sanity and Work.
- Show price, requirements, ownership and any effect in a short item detail view.
- Let the player wish-list an item and select it as their one tracked goal.
- Offer collection progress inside Life, such as “Garage · 3 owned,” without adding more meters to Play.
- Keep ownership separate from the equipped residence, transport and avatar outfit. Showing an item publicly does not equip it or grant its benefit.
- No resale or trading initially. If added later, sale proceeds remain excluded from career earnings and sold items must leave the ownership showcase.
- Avoid unlimited inventory copies for cosmetic items in the first version; one unlock per catalog item is easier to understand and verify.

More expensive wants provide reasons to keep earning, but need deliberate pacing. Balance the full wish list against net income after care and tuition. Offer attainable early collectibles alongside villas and supercars so newer players have something meaningful to show.

## Public identity and customization

| Field | Player control | Verified source |
| --- | --- | --- |
| Display name | Choose a moderated nickname | Validated profile setting |
| Avatar | Choose a preset or unlocked appearance | Presets and owned cosmetics |
| Title | Select one earned title or hide it | Verified milestones |
| Current job | Show or hide | Latest verified current job |
| Total lifetime earnings | Show or hide | Verified overall work earnings, including legacy totals when applicable |
| Graduation | Choose one completed school/qualification or hide | Verified qualification record |
| Possessions | Choose and reorder owned showcase items | Verified durable ownership |
| Achievement/experience badges | Select from earned badges | Verified milestone and experience records |

Suggested first version: **three possession slots**, one graduation line and one title. Unlocking additional display slots later can be considered, but avoid squeezing a garage into every leaderboard row. A player does not have to fill every slot.

Use fictional schools with a clear degree name, for example “Riverside College · Computing.” School identity can add flavor or cosmetics; do not silently give one school a superior salary multiplier. Make the first education release work with a small school catalog before offering dozens of institutions.

Customization controls field visibility, selection and order; it cannot invent a degree, edit an earnings number, or display an unowned item. Name, rank and the board's career score remain visible while a player participates publicly because they identify and explain the ranking. Players who want those hidden can leave public participation.

Overall lifetime earnings and the current board's career earnings are different fields. Always label both. Showing a large overall total does not change ranking in the selected job. Qualification/possession visibility is independent of the board score.

## Keep leaderboard rows clean

Recommended compact row:

```text
12   Alex · Software Engineer       125,000
     Graduate · Villa · Sports car
```

The right-hand number is the selected board's career earnings. The second line is optional; in the UI use up to two small showcase icons and one short title/qualification label rather than spelling out every item. Provide accessible text for icons and truncate carefully at large text sizes.

Tap a row to open the public showcase: name/avatar, chosen title, visible current job, labeled earnings, graduation and the three selected possessions. Hide unused fields instead of filling the profile with “None” placeholders. Include the career label when the current job differs from the board being viewed.

Keep long possession descriptions and purchase effects in item details. Do not expose the player's whole inventory just because they selected one car for display. Avoid popups or animated celebration effects while scrolling rankings.

## Editing and cloud behavior

Provide “Edit showcase” from the player's own profile, with visibility controls, an ordered item selector and a preview. Save one explicit edit submission after local drafting, rather than writing to Supabase each time a switch is toggled or an item is reordered. A pending edit can survive a temporary connection failure.

Purchases remain immediate local actions and use the planned periodic gameplay batch. A newly purchased but unverified possession may appear privately in Life with a pending marker; it cannot appear publicly until the server confirms ownership. Preserve the selected preference and apply it after confirmation rather than showing an unowned item to others.

Public profile reads return only selected visible fields. Leaderboard reads include a bounded compact showcase, without fetching each row's profile separately. Read full details only when a profile opens, cache them, and retain the existing periodic leaderboard refresh policy. No per-item or per-tap realtime subscription is needed.

Profile edits need validated item/qualification references, slot limits and owner-only permissions. Backend publication rechecks ownership and earned credentials; hiding a profile must also remove it from board results. A cached preview may temporarily be stale, so include an as-of time and invalidate cached public data on a successful visibility edit.

The confirmed fresh-life reset removes current ownership/qualifications after verified rebirth. Players can continue displaying those achievements in a clearly labeled legacy/past-life collection. Historical items provide no active benefit or job eligibility.

## Suggested release scope

1. **First showcase:** display name, preset avatar, earned title, optional job/overall earnings, one qualification and three owned-item slots.
2. **First expanded wants:** homes, cars, technology, watches and outfits with a small catalog per collection.
3. **Next collections:** hobbies, furnishings, motorcycles and experience badges.
4. **Late-game aspiration:** penthouses, yachts, jets and rare collections after income and pricing are tested.

UI owns compact rows and profile preview; mobile owns wish lists, local drafts and pending purchase selection; backend/database own verified visibility, reference validation and efficient bounded reads. These are planned tasks for the designated roles, not implementation already executed.

## Acceptance examples

- A player selects their degree, villa and sports car; another player sees those selected verified details and no hidden inventory.
- A player hides their current job and overall earnings while their board-specific score remains visible.
- A player editing local storage cannot publish a villa, degree or title they have not earned.
- A purchased item stays private until verification, then can be published without duplicate purchase or credit.
- Public participation can be disabled and is excluded from leaderboard query results.
- A player with no possessions has a clean row and profile without empty-slot clutter.
- Customization is readable at large text sizes and available through accessible controls.
- Changing showcase selection does not change earnings, career rank, item effects or equipped loadout.

Open decisions: exact purchase catalogs/prices, whether to launch with two or three possession slots, school names, and whether a fourth display slot belongs in a later expansion.
