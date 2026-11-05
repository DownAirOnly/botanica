# Botanica — project context / conversation handoff

**Read this before changing the project or continuing work in a new conversation.** Updated: 2026-11-04. Current local source version: **v2 (unreleased, unverified)**.

## Mission

Build an exceptionally streamlined, reliable, mobile-first inventory and small-batch production PWA for the owner's mother's herbal business. Replace handwritten low-stock lists and spreadsheets with a coherent data model and fast repeatable workflows. User wants a more disciplined, pre-planned development process than prior projects.

## Repository / deployment

- Canonical repo: `DownAirOnly/botanica` (currently public), default branch `main`.
- Framework: React + TypeScript + Vite; CSS design tokens; `lucide-react`; Firebase Google sign-in and private Firestore workspaces.
- GitHub Pages target: `https://downaironly.github.io/botanica/`, subject to Pages enablement and successful deployment.
- **At initial creation, GitHub connector returned 403 on writing to this newly created repo**. Local project archive prepared for transfer; do not claim commits/deployment occurred until confirmed.
- **Never publish original inventory spreadsheets, proprietary formulas, or actual purchase histories to this public repo without explicit permission.** Source data stays local/private by default.

## Product information provided

Four Excel workbooks: `MY HERBS.xlsx`, `TINCTURE RECIPES.xlsx`, `Tea Recipes.xlsx`, and `INVENTORY.xlsx`, plus a photograph of a handwritten low-stock list. MY HERBS contains `Master Herb`, `Powders`, `InProgress`, and `Tincture Mixes` sheets. The tincture recipe sheet uses two side-by-side tables (numeric part + ingredient). Tea recipes use ingredient names ending in ratios. Finished-products sheet has separate containers/sizes. Names and units sometimes vary; examples include `BP Aid` / `Blood Pressure Aid`, `1# bag`, `64 oz / 16 oz`, `24 oz VG`, and stock not actually represented by a single number.

## Prior agreed architecture

- Five primary views: **Home, Herbs, Recipes, Batches, Products**; Settings available globally.
- A herb detail page contains separate stock forms, quick adjustments, thresholds, vendor, cost per pound, connected recipes, purchase history, and movement log.
- Recipes link to stable herb IDs. Ratios scale to target batch size; recipe creation/deduction must distinguish dry weight from fluid volume.
- Purchases record vendor, date, actual price, quantity, and add stock on receipt. Keep price history.
- Making a mix deducts ingredients and creates **unbottled bulk stock**. Bottling deducts bulk and increases finished SKU counts.
- Ingredient extraction from dry material is an explicit measured production event, **not an assumed 1:1 conversion**.
- All stock edits are traceable, and corrections preserve before/after quantities.
- Demo/test data should be unmistakably labeled; legacy source data should be imported with a review step.

## Outstanding decisions — do not silently invent answers

1. What `Amount Tinctured` and the handwritten tincture ounces denote (fluid ounces of ready extract versus dried material steeped or another measure). Pending confirmation.
2. Whether production/stock needs multiple business users and reliable cross-device collaboration from day one.
3. Whether batch/lot, expiration, tincture alcohol/glycerite concentration, minimum stock and container data must be in first production release.
4. Original spreadsheet quantity semantics and duplicate herb rows; review with owner before treating as counted truth.

## Design & development mandate

- One integer version per release, no patch-number sequence.
- Shared foundational assets from the start: design tokens, components, stable data types, and layout primitives.
- Adaptive phone/tablet/desktop views; easy one-handed tasks on phones.
- Use explicit source of truth; no derived stock counters persisted independently of ledger without integrity checks.
- Make practical improvements proactively, but ask before irreversible changes or inventing business rules.
- README is a **project description**. CHANGELOG is the update history. This context file records cross-conversation priorities/decisions; update it when architecture, scope, or assumptions change.
- Provide honest implementation status and data integrity limitations.

## Version boundaries

v1 was the local-first prototype. Local v2 source adds authentication and private workspace persistence, but has not been built, deployed, or independently verified. Before real business deployment: install dependencies, run a clean typecheck/build, deploy and test Firestore security rules and account flow, validate all imports, and confirm real stock with the owner.

## v2 follow-up decision (2026-11-04)

The owner clarified that Botanica should be a **multipurpose inventory system with Firebase Google login**, not a permanently single-purpose, browser-only herbal app. Implemented the following locally (not deployed):

- Firebase Auth Google sign-in; separate Botanica Firebase project intended (do not re-use Everyday's live database).
- Multiple private workspaces per Google account, each explicitly `herbal` or `general`, chosen after login.
- `herbal` workspaces contain the original five functional modules; `general` workspaces have a generic Items editor, quantities, categories, SKUs, vendors, costs, unit labels and movement history.
- Firestore access is **owner-only**; no one gets access just for signing in, and shared roles/invites are deferred until rules are designed.
- Firestore `workspaces/{workspaceId}/data/current` is a revisioned JSON snapshot, with transaction-based conflict rejection, online-only saves, and 750 KB guard. Do not describe this as safe concurrent multi-editor or offline-first sync.
- Old schema v1 JSON backups migrate on explicit restore. Do **not** read legacy localStorage data into an arbitrary logged-in user's workspace.
- GitHub integration previously returned 403 on `DownAirOnly/botanica` writes. Source is in local archive until access is restored; no GitHub commit/deployment claimed.
- Dependency installation stalled in the current environment; build, authentication and rules testing remain outstanding. Avoid declaring v2 production-ready.

**Priority after moving source into GitHub:** configure dedicated Firebase project, deploy owner-only rules, register authorized GitHub Pages domain, set GitHub Actions variables, run minimal typecheck and phone/desktop smoke checks, verify Google login on mom's Android and on iOS, and review actual workbook imports before making the inventory official.
