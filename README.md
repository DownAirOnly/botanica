# Botanica

**Botanica is a private, mobile-first inventory system with reusable workspaces for different kinds of stock.** It began as a practical way to organize a small herbal business, but its architecture allows the same Google account to manage independent inventories for business, supplies, or personal projects.

The app is designed to replace loose spreadsheets, handwritten stock lists and repeated calculations with connected records and predictable everyday tasks. It works across phone, tablet and desktop layouts, and is built as an installable Progressive Web App (PWA).

## What it does

### Herbal production workspaces

The app uses three primary work areas instead of separate navigation tabs for each data type:

- **Today:** prioritized actions, stock-count reviews, recorded bulk, production-in-progress, and one-tap shortcuts.
- **Inventory:** contextual sections for check/restock, ingredients and supplier costs, and finished goods stock with SKU editing.
- **Production:** contextual sections for ongoing tasks, editable recipes, measured batch creation, and packaging/bottling.


- Keep separate quantities for dried herbs, powders and ready-made liquid extracts. Weight and volume are never silently treated as interchangeable.
- Set reorder thresholds and quickly record stock additions, usage and corrected counts with an audit trail.
- Save preferred vendors, supplier pricing by pound, and dated purchase records. Receiving a purchase adds to stock.
- Link tincture/tea formulas to stable ingredient records. Scale recipes by parts and preview required ingredient amounts.
- Record tincture extraction as measured input and liquid output, rather than guessing yield.
- Record production batches; deduct ingredients and add bulk mixture. Package bulk mixture into finished product counts.
- Import the owner's existing workbook formats through a warning-and-review workflow. Unverified historical counts need confirmation.

### General inventory workspaces

- Track miscellaneous items with independent names, categories, SKUs, vendors, costs and reorder points.
- Choose appropriate units (pieces, weights and volumes).
- Add, use or correct stock with reasons and dated change history.

### For all workspaces

- Sign in using Firebase Authentication with Google.
- Create multiple independent, named **private workspaces** under one Google account.
- Save inventories in Cloud Firestore, using owner-only security rules and revision-checked writes.
- Keep separate dried-herb and powder supplier quotes with supplier names, optional quote dates, and historical pricing distinct from actual purchase receipts.
- Merge updated cost spreadsheets through a review-first importer without changing stock or replacing a workspace.
- Export JSON backups and restore a versioned backup into a chosen workspace.
- Use shared components, design tokens, responsive navigation, light/dark themes, and an installable PWA interface.

## Getting started

Requirements: a recent Node.js LTS release, a separate Firebase project, Google Authentication and Cloud Firestore.

```sh
npm install
npm run dev
```

Follow **[Firebase setup](docs/FIREBASE_SETUP.md)** before entering business data. Deploy `firestore.rules` to the selected Firebase project. The Firebase web-app configuration for `botanica-45e4b` is already included as public client settings; optional `VITE_FIREBASE_...` variables can override it for alternate environments. Enable Pages with GitHub Actions and authorize `downaironly.github.io` for Google sign-in. The included workflow builds the site at `/botanica/` on pushes to `main`.

## Architecture and release discipline

- **React + TypeScript + Vite**, with shared UI components and CSS tokens.
- Firebase Google Authentication, Firestore owner-only workspaces and optimistic revision checks.
- Domain functions manage stock math, purchase receipt, recipe scaling, batch production and packaging; UI components do not directly manipulate inventory balances.
- **Whole-number releases** (v1–v6). README stays descriptive; changes go in `CHANGELOG.md`.
- `docs/PROJECT_CONTEXT.md` is the authoritative conversation-handoff file. Update it whenever the scope, architecture or open decisions change.

## Security and current limitations

**No original private spreadsheets, business recipes, supplier pricing or user backups are committed to this public source repository.** Files selected for import are processed in the browser; only approved parsed records are written to the selected user's protected Firestore workspace.

Current cloud storage uses one revisioned JSON document per workspace. It is a practical first release with multiple devices signing in to the same account, **not** live concurrent collaboration: conflicting saves are rejected with a visible warning, and offline edits are not guaranteed. Workspaces are owner-only until a designed invitation and roles system ships. The storage model must be split into per-record collections before large production histories. Export regular backups.

Botanica is an inventory management application, not medical or treatment advice.

## Documentation

- [Project context and decisions](docs/PROJECT_CONTEXT.md)
- [Development and update rules](docs/DEVELOPMENT_RULES.md)
- [Data model and units](docs/DATA_MODEL.md)
- [Phone-first deployment checklist](docs/MOBILE_DEPLOYMENT.md)
- [Firebase account and deployment setup](docs/FIREBASE_SETUP.md)
- [Workbook import guidance](docs/IMPORT_GUIDE.md)
- [Release history](CHANGELOG.md)
