# v10 usability audit — 2026-11-06

## Evidence and measurement rules

This document separates (A) the supplied **observed v8 desktop session** from (B) inspection of v9 source, and (C) changes proposed or implemented for v10. A source-code path is not a measured tap count. No authenticated v9/v10 mobile interaction session was available to this development pass; no measured phone scrolling, touch-target use, pointer distances, or before/after click counts are claimed.

The v8 session took place in the separate **Botanica Usability Audit — Test Data** workspace, at approximately 1363 × 936 CSS pixels. Tests completed there: herb receipt, herb/container count, extraction, recipe, bulk batch, finished-product setup, six units made directly, six units from bulk, blocked stock shortage, and an interrupted production draft. No real business data were required.

### Observed v8 desktop benchmark

| Task and starting point | Buttons/tabs | Field entries or selections | Screen changes |
|---|---:|---:|---:|
| Create recipe, from recipe list | 3 | 1 | 1 |
| Resolve unverified extract, from blocked recipe back to recipe | 5 | 1 | 3 |
| Make bulk batch, from ready recipe | 2 | 0 | 1 |
| Create product, starting in Production | 4 | 3 | 2 |
| Make six bottles, starting on finished-goods list | 2 | 1 | 1 |
| Make six from bulk, already on Make Product | 2 | 1 | 0 |
| Visit packaging supplies and return | 2 | 0 | 2 |

Counts omit individual keystrokes, count a field completion as one interaction, and treat a dropdown selection as one selection operation. They are **not literal pointer-event counts**. Opening a modal does not count as a screen change.

Captured screenshot-based desktop pointer travel, approximate centers only: quantity → Make button 350 CSS px; prepared bulk → quantity 100 px; Make button → bulk selector 360 px. The full pointer log was not recovered. No global travel average or median is known.

The v8 test recorded six direct and six bulk units successfully. Stock deltas reconciled: dried herb 16→12 oz wt, extract 32→4 fl oz after extraction and direct making, bulk 16→4 fl oz, and 24→12 containers. The second run did not consume individual ingredients twice. A blocked bulk overrun correctly disabled submission. An interruption to Packaging reset draft quantity from 3 to 1 and changed source from bulk to ingredients.

## Seven-scenario workflow audit

| Scenario | Evidence available | Primary friction / v9 source findings | v10 response |
|---|---|---|---|
| Six 2 oz formula-linked Sinus units | Observed *illustrative* v8 runs; inspected v9 Make Product | Once ready, only 3 counted interactions. Navigating away unmounted the local product/count/source state. Completion immediately re-enabled another run. | Lifted draft choices above work areas; explicit post-run completion screen and Make another; in-place ingredient/container physical counts. No proprietary Sinus formula used. |
| Receive dried herbs | Observed v8 sample receipt, v9 source | Receipt fields live in separate purchasing contexts. Form dates defaulted to UTC dates; in a western timezone that can default to tomorrow in the evening. | Local-calendar date defaults in ingredient, Check & Restock, and container receipt forms. Actual supplier, received quantity and paid price remain required. |
| Physically count 15 container types | Inspected v9 Packaging screen; **no measured sequence timings** | Separate dialog open/save cycle per container; a 15-type recount structurally requires visiting 15 individual forms. | One Count all containers action with consecutive prompts. Each physical count is an explicit ledger adjustment; cancel retains previously saved counts. |
| Find formula and produce measured batch | Observed v8 recipe/batch path; inspected v9 Recipes/Batch pages | Missing verification exits the recipe/batch page, causing re-navigation and lost context. | Count a missing ingredient in-place, then return to the same recipe or batch form; full count list remains available. |
| Review due supplier schedules and receive | Inspected v9 review/schedule/receipt source only | Review, pending follow-up, and actual receipt are correctly separate; future navigation burden remains to be measured. | Preserve correct semantics. Further screen-level test needed before simplifying. |
| Find last month's tincture output | Inspected v9 Production History source only | Month/metric and product drilldowns exist; no real click count collected. | Leave history unchanged pending authenticated month-filter test. Production is not sales. |
| Find finished goods that need making | Inspected v9 Finished Goods source only | Verified counts and unverified labels exist; there is no reliable finished-goods reorder threshold or customer demand signal. | Avoid claiming a true make-next ranking. Counts can identify zero stock; ordering/fulfillment needs owner input (v11). |

## First-priority v10 changes

1. Preserve unsaved Make Product selection, count, source and search while visiting another work area; never change bulk to direct ingredients silently.
2. Require a deliberate new action after completing a run, instead of resetting to an immediately executable Make 1.
3. Verify physical ingredient and container counts without leaving the work underway.
4. Count container types consecutively with one continuous dialog, retaining the audit ledger.
5. Use device-local calendar dates as date-input defaults; keep stored receipt date strings unchanged.
6. Make stock shortage messages readable, using fl oz / oz wt / units and current-versus-required quantities.

These changes do **not** alter database schema v6 or the production math.

## Pending validation (not completed)

- Authenticated browser runs on desktop with realistic dummy data for all seven scenarios on v10; record literal tap/click events, field changes, modals, section switches, scroll offsets and task completion times with clear start/end states.
- Phone-size and real-device checks: bottom navigation, focus and keyboard behavior, modal reachable footer, touch targets, container-count progression, source switching, and scroll restoration. Desktop CSS travel does not predict mobile thumb reach.
- Multi-ingredient formula, verified/unverified opening balances, direct-vs-bulk source selection, shortages, receiving with manually selected dates and purchase-history display.
- Confirm the date mismatch's actual trigger: the UTC-form-default cause is established in code, but a previously *explicitly edited* date changing after save has not been reproduced.
- Check product creation from an empty Make Product selector, correction workflows, and full ordering follow-up paths. These remain candidates for a later v10 refinement or v11, not measured as solved.

## Non-negotiable correctness checks

- Never record actual business recipes or purchases in the public repository.
- Preserve real Firebase data, schema v6 and backup compatibility.
- A container or ingredient receipt is not a verified opening count.
- Direct ingredient making and prepared bulk making are mutually exclusive; no double deduction.
- Each new stock count has an auditable before/after movement.
- Restock review is not purchase or receipt; production run is not sale.
- Fluid ounces, herb dry weight, and finished unit counts stay distinct.
