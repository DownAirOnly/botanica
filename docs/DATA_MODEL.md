# Data model and inventory semantics

## Entities

- `Herb`: stable ID, name, aliases, category, per-form on-hand quantities and reorder thresholds, preferred vendor and current quote. Stock forms: `dry`, `powder`, `extract`.
- `Vendor`: stable ID, contact/name metadata; purchases reference vendor IDs.
- `Purchase`: received date, vendor, herb ID, form, ounces received, unit price per pound, optional shipping and cost. Creates a ledger entry.
- `StockMovement`: append-only in normal use; entity type, before/after, delta, unit, explanation, source ID, timestamp.
- `Recipe`: stable ID, name, `tincture` or `tea`, ingredients `{ herbId, form, parts }`, notes. Ratios are **parts**, not a count on hand.
- `Batch`: completed formula production, recipe/amount/ingredient consumption snapshot, output bulk amount, timestamp; stock deduction transaction.
- `Product`: linked recipe, package size, number of finished units; packaging converts bulk stock to finished package units.
- `BulkStock`: identified by recipe and quantity in recipe-unit ounces, maintained through completed batches and packaging events.

## Units

- Dried/powder herb: **oz by weight**; price-per-pound uses 16 oz by weight per pound.
- Prepared tincture extract: **fl oz**; it is not equivalent to dry herb weight.
- Tea batches and packages: **oz by weight**.
- Tincture batches and bottles: **fl oz**.
- Recipes cannot mix weight-based and fluid-volume ingredients in a single scaled proportional blend. Mixed/media recipes require a more explicit formulation engine in a later release.
- Tincturing dry herbs into extracts requires a separately recorded input and measured output; v1 deliberately does not assume the yield.

## Stock workflow

1. Receiving a purchase adds to the relevant ingredient stock and records price and vendor.
2. Manual adjustment adds, consumes or sets a verified physical count, recording before and after.
3. A calculated batch requires sufficient ingredient stock; completion deducts ingredients and adds its measured unbottled mixture amount.
4. Packaging converts bulk mixture ounces to finished product units, recording the conversion and preventing overpackaging.
5. Never alter quantities merely by changing a display label or recipe name.

## Persistence

Historical v1 stored a localStorage snapshot. v2 stores owner-scoped revisioned Firestore documents, with transactional revision checks. These checks reject stale overwrites but are not yet a full real-time multi-editor or per-record transaction system; shared membership and stronger event controls remain future work.

## v2 workspace and general inventory extension

The account-based shell stores independent workspaces. The Firestore path `workspaces/{workspaceId}` holds only basic metadata (owner UID, name, workspace kind); its `data/current` child holds the versioned snapshot and incrementing revision. No user receives access simply by signing in: owner UID matching is required by Firestore rules.

`BotanicaDB.schemaVersion` is now 2 and includes an `items` array for general inventory. Generic items have a stable ID, category, SKU, stock unit, quantity, reorder threshold, optional unit cost, optional vendor and notes. Generic adjustments create movement records with reason, before/after and the item's unit.

The app supports importing exported schema v1 JSON backups; migration adds the new general inventory array without changing herb units or stock levels. Older localStorage data is **not automatically copied into a Google account** to prevent accidental cross-account disclosure: users must select their desired workspace and explicitly restore a private backup.

**Scaling roadmap:** the current single-document Firestore snapshot is intentionally an early foundation, with a 750 KB guard against the 1 MiB Firestore document limit. Future production storage should use separate item, movement, batch, recipe and product documents; server-side atomic updates, stronger audit protection, and optional scoped workspace memberships should follow together.

## v4 supplier price history and schema migration

- `BotanicaDB.schemaVersion` is 3 and adds a `priceQuotes` array; older v1/v2 JSON backup restores migrate automatically without changing counted quantities or deleting unknown archival metadata.
- `PriceQuote` uses stable `herbId` and `vendorId`, and independent `dry` or `powder` price per pound. Every entry has `recordedAt` and source; `quotedOn` is optional and is omitted for undated source workbooks.
- The latest quote per form is derived from quote history. Existing legacy dry-price/vendor fields are kept for compatibility, but must not be treated as a powder quote.
- A price quote is not a purchase and does not add stock. Purchase receipt remains a separate inventory transaction; its actual paid price is clearly marked in the price history.
- Cost-book imports merge selectable exact matches and do not create new herbs, guess supplier names, or silently replace other workspace data.
- Source workbook recipes and ingredient quantities remain private; no source spreadsheet is published.

## v5 workflow and physical-count status (schema v4)

- A missing `Herb.stockCheckedAt[form]` or `Product.countCheckedAt` signifies **not physically verified**. Numeric stock values still exist, and migration never changes them. Physical `set` adjustments log before/after quantities and mark that specific form or SKU as verified. A receipt alone does not certify previous baseline quantities.
- Only physically verified ingredient amounts generate reorder alerts or satisfy batch/extraction availability. Unverified ingredient amounts are surfaced as 'needs count' instead of out-of-stock.
- `ProductionTask` is a lightweight durable checklist with stages `planned`, `preparing`, `waiting`, `ready`, and `done`, and optional `dueOn`, `recipeId`, and `notes`. It does not perform stock movements. Future production scheduling must rely on actual owner-specified stages and durations.
- Herbal Home derives lists from live data; new v5 restocking pages show only verified shortages, group by supplier quote when available and never make or place supplier orders automatically.
- JSON backups from v1, v2, or v3 migrate to schema v4, keeping previous `priceQuotes`, purchases, movements and archival metadata. New schema records must have a `productionTasks` array.

## v7 schema v5: packaging and connected making

- `packagingSupplies` initializes 15 stable category+variant rows per workspace. `count=0` without `countCheckedAt` means **not counted**, not known empty. Physical `set` makes that count verified. Dated `packagingReceipts` add units but do not certify a previous opening balance.
- `Product.containerSupplyId` is an optional link from a finished SKU to the single container used for each unit. Existing products remain unassigned until edited.
- `ProductionRun` stores selected product, count, source (`bulk` or `ingredients`), container type, bulk amount, ingredient quantities and recorded time. All associated `StockMovement` records share the run ID; container movements use `kind='container'`.
- `makeFinishedProduct` repeats all ingredient, available-bulk, unit and verified-container checks and applies a single immutable DB update. It **never** deducts both ingredients and bulk for the same run. Actual cloud writes remain protected by revision and document-size checks.
- `herbRestockNotes` records historical date and optional supplier without modifying stock or inventing purchase prices. Displayed latest restock compares real purchases and historical notes.
- `Herb.currentStockSource` records a user's explicit supplier-source annotation per dry/powder form. It is **not** lot-level inventory proof, cannot determine exact current quantities by supplier, and is cleared when a different vendor is received.
- Pre-v5 backups migrate without inferring container assignments, stock counts, unknown herb sources, or any product run. Underlying Firestore workspace document remains single revisioned JSON with a 750KB guard.

## v8 (schema v6) — optional calendar reviews and recorded production metrics

- `restockPlans` and `restockReviews` are private workspace arrays initialized empty on migration. No schedules are inferred from past purchases or supplier-price quotes.
- Each `HerbRestockPlan` references one stable herb ID and a dry/powder form with weekly, biweekly, monthly, or quarterly cadence, `nextReviewOn` and optional supplier, reference order quantity and notes. The month-day anchor is retained for dates such as the 31st, with short months clamped to the last valid day.
- `reviewRestockPlan` records a dated decision, advances the due date past today, and **does not** create a purchase, receipt, purchase obligation, invoice, or stock movement. An order-needed decision remains outstanding until `resolveRestockFollowup` explicitly marks it addressed. Acknowledgment is not evidence of an actual purchase.
- `productionEvents` is a read-only reporting projection built from completed `batches`, positive extract-output `movements`, `productionRuns`, and pre-run positive product packaging movements. Packaging movements linked to existing productionRun IDs are excluded, preventing duplicate count of finished units.
- Tincture batch volume (fl oz), single-herb extract output (fl oz), tea batch weight (oz wt), and finished product units are **different metrics**, not combinable. Graphs include zero-activity periods and never infer sales or profitability from production.
- Versioned JSON restores from v1–v5 migrate to schema v6 without changing physical quantities or adding inferred dated activity. This does not increase Firestore's per-document budget.

