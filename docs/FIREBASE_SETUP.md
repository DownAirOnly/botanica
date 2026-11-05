# Firebase setup — Botanica

Botanica uses **its own Firebase project**, separate from the Everyday app or other personal projects. This is intentional: business inventory must not share authentication rules, database data, or lifecycle with unrelated applications.

## Firebase Console

1. Create a new Firebase project for Botanica and register a **Web app**.
2. Under **Authentication → Sign-in method**, enable **Google** and select the appropriate support email.
3. Under **Authentication → Settings → Authorized domains**, add the actual hostname serving Botanica (for GitHub Pages, `downaironly.github.io`). Keep `localhost` authorized for local development if needed.
4. Create **Cloud Firestore** in production mode, in your preferred region. Do not leave public test rules enabled.
5. Deploy the included `firestore.rules` before adding business data. The rules are owner-only, not a broad `request.auth != null` permission.
6. Copy `.env.example` to `.env.local` and populate its `VITE_FIREBASE_...` values from Firebase Console → Project settings → Web app configuration. Never put Admin SDK service accounts in Vite variables.
7. Run `npm install`, then `npm run dev`. After signing in, create your first workspace.

## GitHub Pages deployment

In GitHub repository **Settings → Secrets and variables → Actions → Variables**, create `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. The workflow passes these public web configuration fields to the build. Enable Pages deployment via GitHub Actions.

**Important:** Firebase's web API key and client config aren't sufficient to read private inventory—Firestore rules are the access boundary. Nevertheless, avoid checking in personal service credentials, business spreadsheets or data exports.

### Google login on iPhone / installed PWA

The current integration uses `signInWithPopup` to avoid common cross-origin redirect issues on GitHub Pages. Popup behavior can vary on mobile/iOS installed PWAs; test sign-in on the exact devices before relying on it. Redirect sign-in needs the auth-domain cross-origin-storage precautions documented by Firebase. Hosting the app on a same-site Firebase Hosting domain is a future alternative if mobile popup support is inconsistent.

## Firestore data organization

```
workspaces/{workspaceId}
  name, kind, ownerUid, createdAt
workspaces/{workspaceId}/data/current
  revision, json, updatedAt, updatedBy
```

Workspaces are selected after signing in and separated by `workspaceId`. Queries list only workspaces owned by the current user. No public inventories, cross-owner reads, or shared editor permissions are enabled.

Every inventory save is a Firestore transaction that compares the last-read revision. If another device has changed the workspace, Botanica **rejects** the stale write instead of quietly replacing it. An error is shown and the local in-memory state can be exported before reloading. This is **not** collaborative real-time editing.

This first cloud version stores one revisioned JSON snapshot per workspace. It simplifies secure backups and migrations but has a document-size limit and is not designed for high-frequency simultaneous editing or very large histories. The next major storage milestone should split catalog, movements and batches into independent collections with atomic per-item operations.

## Operating boundaries

- Google sign-in and Firestore rules protect independent users. No invites/collaboration yet.
- Cloud writes require connectivity. This version does not guarantee offline edits or automatic conflict merging.
- Export JSON backups periodically. Firebase is storage, not automatically a full disaster-recovery plan.
- Workspaces are owner-only by design. Adding shared users later requires explicit membership schema and audited rules changes.
- Original business workbook imports are parsed locally; **confirmed** imported inventory is then written into the chosen private workspace.
