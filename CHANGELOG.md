# Changelog

## v9 — 2026-11-06 (faster restocking and production drilldowns)

- Restock review plans now show verified on-hand herb quantities (or a clear unverified status) plus the most recent recorded purchase receipt date.
- Due review rows offer one-tap **No order**, with an auditable review decision and next-date advancement. **Review** remains available for a decision with notes or a follow-up.
- Schedule rows and outstanding follow-ups now have **Receive** actions that open the actual herb receipt editor for the appropriate herb and form. An optional plan supplier carries over, but the received quantity and actual price must be entered—old quotes and target quantities are informational only. Receipt does **not** automatically close a separate pending follow-up.
- Production History now filters by stable formula/herb/product ID, supports click/tap period bars for drill-down, permits selecting a top item as a filter, and exports the currently shown records as a local CSV. Charts still separate tincture volume, extraction output, tea weight, and finished units.
- Today consolidates repetitive unverified-container alerts into a single summary. Inventory → Check & Restock directly links to remaining container and finished-goods counts.
- No schema migration: schema v6 stays intact, all existing Firebase workspaces, inventory, historical records and backup formats are preserved. Private business data and exports are not committed to the public repo.



## v8 — 2026-11-05 (recurring restock reviews and production insights)

- Added an **opt-in Schedule** tab under Inventory → Check & Restock. Choose a dry/powder herb, first review date, and weekly / every-two-weeks / monthly / quarterly cadence. Record supplier and reference order quantity if useful.
- Reviews are **in-app, on-device when opening Botanica**, not push notifications or automatic purchases. They remain independent of real inventory, actual receipts, and verified low-stock alerts.
- Completing a review logs an explicit decision and advances the date to the next future occurrence. A “needs order / follow-up” decision stays visible on Today and Schedule until explicitly marked addressed; marking addressed has no stock effect.
- Added **Production → History**: separated tincture batches (fl oz), single-herb extractions (fl oz), tea batches (oz wt), and finished units, with 8-week / 6-month chart views, per-period averages, top quantities and recent events.
- The history includes recorded legacy packaging where available and excludes product movements already represented by a linked Make Product run, avoiding duplicate counts. It never claims that production quantity equals sales, demand, or unverified historical workbook output.
- Today now surfaces due restock reviews, unresolved order follow-ups, and current-month recorded tincture volume and finished units.
- Data schema advances from v5 to v6, preserving existing cloud workspaces, recipes, source notes, purchase receipts, containers, ledgers and backup data. Old v1–v5 backups migrate with empty optional review plans and review history.
- No private spreadsheet or supplier record was committed.



## v7 — 2026-11-05 (connected making and packaging supplies)

- Seeded 15 named packaging types (amber bottles, spray bottles, salve tins, tea bags, plastic bottles), with zero opening stock **unverified**; existing business data and stock quantities are not changed.
- Added Inventory → Containers for physical counting, dated receipts, preferred supplier notes, and reorder points.
- Finished products can be linked to a specific container type; existing recipes, names, counts and packaging sizes are preserved.
- Replaced the separate bottling-only UI with a guided **Make Product** flow in Production. Choose quantity and whether to use *already prepared bulk* or *individual formula ingredients*. A preview checks both contents and containers and confirms them as a **single linked run**. Prepared-bulk mode never deducts ingredients again.
- Recorded production runs and ledger movements tie together container usage, ingredient/bulk deduction and finished goods additions. Existing historical packaging records remain intact.
- Herb detail now shows last documented receipt/restock date by dry/powder form, allows dated historical notes without stock changes, and supports user-confirmed current-source labels distinct from preferred supplier or latest purchase.
- Versioned backup schema moves from v4 to v5 (app v7) with non-destructive migration of v1–v4 cloud data and JSON backups. Original private workbooks remain private.
- **Not yet included:** recurring reorder schedules, automatic purchases, quantitative lot-level supplier depletion, new salve-formula production logic, or production trend charts. These remain follow-up work.



## v6 — 2026-11-05 (workspace layout rebuild)

- Rebuilt the app shell around three main work areas: **Today**, **Inventory**, and **Production**, while keeping Settings available from the header/sidebar.
- **Inventory** brings stock verification/restocking, herb catalog and pricing, and finished-goods catalog/counts into one work area with contextual section selectors.
- **Production** groups active work/checklists, recipes, measured batches and packaging/bottling together, with separate focuses instead of five unrelated primary tabs.
- **Today** is a task-focused workbench with prioritized attention, four actionable status indicators, ongoing work and ready bulk, and direct task shortcuts.
- Separated finished-goods editing/counting from bottling; bottling shows only products linked to formulas and prioritizes SKUs with recorded bulk available.
- Preserved existing formulas, stock movements, purchase history, supplier costs, backup import/export, cloud sync, theme settings, and all underlying inventory behaviors.
- This is a presentation/navigation release only. Database schema remains v4; no destructive workspace migration or reimport is required.
- Updated responsive design for smaller mobile screens and wide desktop layouts, including three-item mobile navigation and horizontally scrollable subsection selectors.



## v5 — 2026-11-05 (daily business workflows)

- Replaced vanity catalog counts on Herbal Home with action priorities: ingredient and finished-product counts to verify, confirmed replenishment, production tasks, and recorded bulk ready for packaging.
- Added Stock & Restocking with prioritized physical counts and grouped supplier restock needs. Confirms physical quantities via a logged adjustment; receiving purchases records receipts but **does not** silently verify historical stock.
- Added lightweight persistent production tasks with optional recipe links, notes, stage and target date; no assumed tincture-processing duration. Task stages are informational and **do not** automatically change inventory quantities.
- Recipe and batch checks now distinguish **not counted** from **actually short**. Ingredient stock must be physically verified before measured extraction or batch deduction.
- Added finished SKU verification status and a To count filter. Imported zeroes are not mislabeled as verified out-of-stock quantities.
- Updated schema to v4; v1–v3 backups migrate, preserving old amounts, recipes, purchases, supplier prices, and archival source data without inventing verification dates.
- Original private spreadsheets and formulas are never added to GitHub. Test the actual workflow with the business owner before adding automated orders or an assumed production calendar.



## v4 — 2026-11-05 (purchasing and supplier costs)

- Deployment follow-up: added a visible, user-controlled PWA update notice, including checks when the app is brought back into focus. This fixes the previous silent waiting-update behavior without force-reloading unsaved forms.

- Added supplier quote history for each dried herb and powder, with separate pricing by form.
- Added optional quote dates and provenance for manual quotes, cost imports, purchases, and legacy pricing.
- Added a Costs tab and shared pricing cards on herb profiles. A powder purchase no longer overwrites dried-herb pricing.
- Added review-first `HERBS COST.xlsx` importing of Master Herb and Powders sheets, with exact name/alias matching, row selection, idempotence, and explicit unmatched/ambiguous/conflicting rows.
- Cost imports merge quotes into the existing workspace without changing stock quantities, creating purchases, or replacing formulas.
- Updated data schema from v2 to v3, keeping v1/v2 JSON restore support. Original private workbook contents are not committed to the public repository.
- Preserved owner-only Firestore rules, revision-checked writes, and document-size protection. Live account and device import tests remain open.



Botanica uses consecutive **whole-number release versions**. Product changes are documented here rather than accumulating in README.

## v3 — 2026-11-04 (repository deployment and Firebase wiring)

- Connected public Firebase Web App configuration for project `botanica-45e4b`; service-account credentials and business records remain excluded.
- Uploaded complete source to `DownAirOnly/botanica` and enabled a GitHub Pages deployment workflow on `main`.
- Corrected TypeScript build setup with Vite environment types and removed unused imports.
- Updated the conversation-handoff context and phone-first deployment guidance.
- **Deployment status:** Source committed. A successful GitHub Pages deploy, published Firestore rules, enabled Google provider, authorized domain, and real-device sign-in/data tests must still be verified before business use.

## v2 — 2026-11-04 (local implementation; not yet deployed)

- Added a Firebase Authentication and Google sign-in foundation.
- Added private, owner-only Firestore workspaces. Each signed-in account can create independent **Herbal production** or **General inventory** workspaces.
- Added a workspace picker, switching, account sign-out, and cloud save status.
- Added general inventory item creation and editing, SKU/category/vendor/cost fields, item-specific units and reorder points, and a reasoned stock movement history.
- Added transactional revision checks to reject silent overwrite from a stale second device.
- Added Firestore security rules, Firebase deployment/setup instructions, and GitHub Actions build configuration via public Firebase web configuration variables.
- Migrated the app schema to v2 with a reader for exported v1 backups; left all original spreadsheets and business source data out of public code.

### v2 limitations and outstanding verification

- Not deployed or committed to GitHub: the connector had a 403 integration write error on the new repository.
- Dependencies could not be installed in the working environment; TypeScript build, Google sign-in, Firestore rules and mobile PWA behavior are **not yet verified**.
- No shared editing or invitations, automatic offline conflict resolution, live data listener, batch/lot expiry, or automated remote backups.
- Firestore data is currently one JSON snapshot per workspace with a size guard; move to per-record Firestore collections for sustained production use.

## v1 — 2026-11-04 (initial local scaffold)

- Created responsive React/TypeScript PWA architecture, navigation, and shared reusable design components.
- Added herbs, powders and liquid extracts, thresholds, vendors, received purchases, recipes, batches, bulk mixtures and finished-products packaging.
- Added local inventory movement history, versioned JSON backup, review-first XLSX import with ambiguity warnings, and non-sensitive sample data.
- Created durable context, development rules, data model and import documentation.
