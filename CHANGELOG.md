# Changelog

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
