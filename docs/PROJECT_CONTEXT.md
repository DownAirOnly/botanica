# Botanica — project context / conversation handoff

**Read this before changing the project or continuing work in a new conversation.** Updated: 2026-11-05. Current repository source version: **v5 (daily workflow, stock verification and production tasks; real-device testing pending)**.

## Mission

Build an exceptionally streamlined, reliable, mobile-first inventory and small-batch production PWA for the owner's mother's herbal business. Replace handwritten low-stock lists and spreadsheets with a coherent data model and fast repeatable workflows. User wants a more disciplined, pre-planned development process than prior projects.

## Repository / deployment

- Canonical repo: `DownAirOnly/botanica` (currently public), default branch `main`.
- Framework: React + TypeScript + Vite; CSS design tokens; `lucide-react`; Firebase Google sign-in and private Firestore workspaces.
- GitHub Pages target: `https://downaironly.github.io/botanica/`, subject to Pages enablement and successful deployment.
- **GitHub write permission was restored on 2026-11-04.** Full v3 source is committed on `main`, including `.github/workflows/deploy.yml`. Website publishing must be verified in GitHub Actions.
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

v1 was the local-first prototype. v2 introduced authentication and private workspaces. v3 connected the dedicated Firebase project and GitHub Pages. GitHub Pages v3 deployed successfully, but authentication, data isolation, and real-device workflows still require live tests. v4 introduces separately dated or undated, form-specific supplier quote history, purchase-price provenance, and a review-first HERBS COST XLSX merge importer. Before real business deployment: install dependencies, run a clean typecheck/build, deploy and test Firestore security rules and account flow, validate all imports, and confirm real stock with the owner.

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

## v3 deployment handoff — newest facts (2026-11-04)

- Repo: https://github.com/DownAirOnly/botanica (source files committed, not just a ZIP). Branch: `main`.
- Intended app URL: https://downaironly.github.io/botanica/ (verify deployment success first).
- Firebase Project ID: `botanica-45e4b`; auth domain `botanica-45e4b.firebaseapp.com`. The public Firebase web config is in `src/lib/firebase.ts` with optional VITE overrides. No service account keys are in the repo.
- GitHub Actions workflow: `.github/workflows/deploy.yml`, runs `npm install`, `npm run build`, then uploads `dist` to Pages.
- GitHub connector can now write to the repository. The initial automated build exposed TypeScript errors, and fixes were committed (Vite typings and unused imports). Recheck latest run; do not claim full deployment without successful Pages job.
- Required user-side steps: Enable Google in Firebase Authentication → Sign-in method; add `downaironly.github.io` in Authentication → Settings → Authorized domains; publish repo `firestore.rules` in Firestore → Rules; select **GitHub Actions** as Pages source in GitHub Settings → Pages.
- Verify login and cloud saves on iPhone Safari, installed iOS PWA, and Android. Ensure different accounts cannot read each other's workspace before real imports.
- Source remains public, but no original workbook recipes or business data are committed.
- **Historical v2 sections above describe earlier state** and are not instructions to redo Firebase config or the GitHub import.

## Firebase authorization checkpoint (2026-11-04)

The user confirmed adding `downaironly.github.io` to Firebase Authentication's Authorized domains. Google sign-in still requires a successful live deployment and browser test; do not infer authentication is working solely from the domain setting.

## v4 cost and purchasing scope (2026-11-05)

- The original private `HERBS COST.xlsx` workbook contains `Master Herb` (dry-herb price per pound and supplier), `Powders` (powder prices and supplier), and `Tincture Mixes` (historical production data, not prices). The XLSX itself is **not in the public repository**.
- A `PriceQuote` belongs to an existing herb ID and form (`dry` or `powder`), records a vendor, per-pound amount, optional supplier quote date, system recording timestamp, and source (`manual`, `workbook`, `purchase`, or `legacy`). A quote is distinct from on-hand stock or receiving a purchase.
- Purchasing actual stock records the paid price in history and updates quantity via the existing movement ledger. Powder purchases never overwrite dry-herb quote fields.
- `src/lib/costImport.ts` reads the two cost sheets locally in the browser. Review shows each line and allows only exact named/alias matches to be selected. Zero/blank/invalid prices, missing suppliers, unmatched/ambiguous names and conflicting duplicates are not silently applied. Unchanged undated prices are idempotent. Existing herbs, stock, purchases, formulas, batches, and products are preserved.
- Legacy v1/v2 JSON restores migrate to schema v3, retaining unknown `sourceArchive` metadata and converting legacy dry-herb quoted price into explicitly **undated** quote history when its supplier is known.
- Shared UI components provide summary and detail quote history under each herb's Costs tab. Settings has a separate review-first cost importer. Existing security rules and Firestore size checks remain unchanged.
- Do not assume workbook cost prices were quoted today. The workbook has no price-date column. Do not import `Tincture Mixes` as purchase receipts.
- v3 deployment was confirmed by the user; no Firebase reconfiguration is needed. Continue testing Google auth, restore, preview, merge, sync, iOS/Android interactions on a real account before production.

## PWA update visibility correction (v4 deployment follow-up)

- Confirmed public GitHub Pages served a bundled JavaScript asset containing `Botanica v4` through a GitHub Actions remote fetch on 2026-11-05. A user still seeing v3 was therefore experiencing old client assets, likely controlled by an installed PWA service worker.
- The old `registerType:'prompt'` service-worker configuration had no UI wired to the virtual registration hook, so updates could sit waiting invisibly.
- Added `PWAUpdateNotice` at the application root using `useRegisterSW` and a visible Update now / Later prompt; focus and visibility changes request update checks. Keep user control because automatic mid-form reloads can lose input.
- The initial v3-to-v4 transition may still require fully closing all app windows/tabs so the old waiting worker can activate. Do not ask users to erase website data until confirming cloud sync/backups.

## v5 — daily workflow principles

- User asked to move forward without a business-interview questionnaire; optimize around work categories already evidenced by original spreadsheets, but do not claim a fixed customer-order schedule, cure time or process sequence.
- Herbal Home now shows action-oriented cards for unverified ingredient forms and finished product SKUs, confirmed replenishment, ongoing production tasks, and unpackaged bulk; navigation stays in five main mobile tabs, with Stock & Restocking as a Home/Herbs auxiliary page.
- The v5 schema is `4`. Add `Herb.stockCheckedAt` by form, `Product.countCheckedAt`, and `BotanicaDB.productionTasks`. Missing count metadata means **unverified**, not zero. Existing historical numbers are untouched and never silently upgraded to measured physical counts. Physical 'set' adjustments mark a count verified; receipt or production changes alone do not.
- `stockCountQueue` prioritizes forms used in active recipes, then imported nonzero forms, and only then other relevant forms; `restockQueue` includes only physically verified stocks under a threshold or verified zero in a used formula. Quotes are references, not actual purchase orders. No order quantity is guessed.
- Recipes and batch/extraction deductions require verification before consuming inventory; UI calls out 'not counted' separately from true shortages.
- Production tasks track planned, preparing, waiting, ready and done with optional target dates; stages are a user checklist and do **not** create/deduct stock. Recorded extraction, completed batches and packaging remain the only production-ledger adjustments.
- The original workbook may have unverified stock, historic tincture-in-progress and mixed units; do not import these as confirmed current inventory, active production, or due dates automatically. Owner testing remains important before extending workflow to order management.
