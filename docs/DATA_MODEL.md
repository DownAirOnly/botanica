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
