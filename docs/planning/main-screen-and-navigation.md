# Main screen and bottom navigation

Status: design and numerical reference, updated 2026-10-12. The approved lifetime/local-first features now have implementation and hosted verification; see [current implementation evidence](../../implementation.md). Historical baseline examples and explicitly labeled future ideas remain reference material, not claims that every optional idea ships.

## Main experience

The game revolves around Home: three primary metric areas and a large Work button. Most information and choices belong behind bottom navigation, rather than becoming extra cards on Home.

Suggested five bottom tabs:

| Tab | Purpose | Contents |
| --- | --- | --- |
| Home | Play the current life | Money, hunger, sanity, current job, Work, Eat/Rest |
| Career | Choose how to earn | Jobs, promotion requirements, college, study and opportunities |
| Life | Decide what to buy/save for | Wants, possessions, equipment, bank and wish list |
| Journey | Understand progress across lives | Ambitions, milestones, run history, legacy chapters, level/rebirths |
| Leaders | Compare and show achievements | Career boards, my rank and customizable public showcase |

Use Career instead of Work as the tab label so selecting a screen is clearly different from executing a paid Work day. Bottom navigation never advances age or consumes needs. Keep short visible labels beside/below the icons; do not make the tabs icon-only.

## Home hierarchy

1. Compact header: game identity, current age and a profile/settings entry.
2. Money area: large spendable wallet balance; one optional savings/purchase target supplies its progress bar.
3. Hunger bar: visible current value and a short label.
4. Sanity bar: visible current value and a short label.
5. Current job: short name and current adjusted payout per Work day.
6. Large Work button: dominant action, positioned comfortably for the thumb.
7. Compact Eat and Rest controls: available without navigating through the shop.
8. Persistent bottom tabs.

Illustrative content structure, not a final pixel layout:

```text
Rags to Riches                      Age 18

Money                              1,250
Bike                         1,250 / 2,500
[==============-------------------------]

Hunger                            82 / 100
[================================------]

Sanity                            70 / 100
[===========================-----------]

Courier                         +140/day

                 WORK
              Eat    Rest

Home    Career    Life    Journey    Leaders
```

Money has no universal maximum. Its bar is explicitly progress toward the selected target: `min(wallet / targetPrice, 1)`. It can fall after spending and does not imply cumulative earnings. If no eligible monetary goal is selected, show the money readout without inventing a percentage. Study/experience ambitions can be tracked inside Journey rather than turning money into a misleading progress meter.

Show only one goal; the money target replaces a separate duplicate goal card. Bank savings stay separate in Life. If the player selects a goal based on wallet plus bank, explicitly label the goal as total liquid savings and use that formula, while still labeling the Home wallet readout as spendable cash.

Health remains a secondary fictional condition in details. Show a compact Unwell/Frail indicator only when needed, linking to care information; do not introduce a fourth primary meter. Age is useful on Home, while level/rebirth statistics live in Journey.

## Interaction behavior

- Home Work uses the currently chosen job; Career job selection changes that job without executing a work day.
- Eat offers the chosen affordable food and its actual recovery preview. Food selection is available from its detail/control, with the existing insufficient-money behavior.
- Rest previews hunger consumption and restores sanity/health under the proposed catalog.
- Work/Eat/Rest show immediate local effects when the local-first feature is implemented. A completed daily action advances age; browsing and tab switches do not.
- Low hunger produces one actionable warning rather than persistent instructional paragraphs. Preserve the lethal one-day action confirmation and show adjusted payout when sanity/health affects it.
- Sync uses a small aggregate status/indicator. No “one work action pending” message for every tap. Explain uncertain/rejected state when there is an actual recovery issue.
- Optional Work-a-week lives in Work options after its feature gate; it does not add another permanent panel.

## Clean design constraints

Keep the cream/dark/green palette and existing theme as the source of truth. Prefer whitespace and clear hierarchy over a separate rounded card for every value. Avoid long instructions, duplicate wallet/earnings totals, decorative dashboards and purchase catalogs on Home.

Small screens, safe areas and large text can require vertical scrolling, but key survival controls must remain easy to access. Allow tab labels and content to adapt rather than disabling text scaling. Use accessible labels/values for meters, readable numbers, non-color warnings and reduced-motion feedback. Do not announce every changing tap value to screen readers.

The full public profile is reached from Leaders or the profile entry; settings/account remain behind the profile entry. Journey is the primary destination for personal history and legacy, so those features no longer need to be buried in Settings.

## Implementation review gate

Wireframe Home and the five destinations first, then test whether players can work, eat, rest, choose a job, find the bank and inspect their legacy without explanation. Review at compact/large phone sizes and with large text before changing routes. No new route, navigation package or icon set is selected by this plan.
