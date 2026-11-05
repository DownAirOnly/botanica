# Changelog

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
