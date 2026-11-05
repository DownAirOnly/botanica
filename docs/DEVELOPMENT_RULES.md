# Development rules

## Update discipline

1. Use one whole-number version per published change: `v1`, `v2`, ... . Change `package.json`, `CHANGELOG.md`, and `PROJECT_CONTEXT.md` with each release.
2. Scope work before modifying files. Specify affected pages, state, data migrations, and reusable components. Favor coherent releases over scattered patches.
3. Prefer one shared component or design token over repeated page-specific copies. Update call sites together when changing shared APIs.
4. Keep focused Git commits and avoid mixing unrelated refactors with behavior fixes. Never force-push main without explicit approval.
5. Keep README descriptive; never use it as a version diary. Put change history only in `CHANGELOG.md`.
6. When a schema changes, add migration and backup compatibility before shipping. No deleting unknown user data.
7. Use stable IDs instead of names for linkages. Renaming is display-only, never a breaking reference change.
8. Separate transaction commands from UI and avoid writing stock quantities ad hoc from components.
9. Preserve audit history for adjustments, receiving, batch completion and packaging. Never silently erase corrections.
10. Test critical domain functions and a minimal build before shipping; skip excessive unrelated testing unless requested.

## UI system

- Use `src/styles.css` tokens for color, spacing, elevation, typography, and breakpoints.
- Prefer shared components in `src/components/` for cards, inputs, header, buttons, navigation and modal behavior.
- Phone: fixed bottom navigation and safe-area insets; larger screens: sidebar and constrained readable content.
- Ensure keyboard-friendly forms, visible focus states, sensible empty states, disabled states and semantic buttons.
- Avoid resetting scroll/focus on unrelated state updates and keep saved UI state intact.

## Safety, data and privacy

- Treat inventory, recipes, supplier pricing and customer records as business-private even if repo is public.
- Commit demonstration data only. Never commit source XLSX, private production records, secrets, Firebase service keys or credentials.
- No automatic conversion between ounces by weight and fluid ounces. Distinguish unit and physical form in all operations.
- Disallow negative inventory in normal operations; errors require explicit correction with reason.
- Always offer exportable backups before schema migration, bulk import or destructive operations.
- Do not claim a private, synchronized, audited production system until server authorization and storage are implemented.

## Account and workspace rules (v2)

11. Authenticated data is scoped to the chosen workspace ID and bound to the signed-in UID; never use one global mutable inventory for all Google users.
12. Firestore security rules are a release-blocking part of access design. Client-side filtering or a Google login button alone is insufficient protection.
13. A new user gets an **empty** workspace. Never auto-seed actual private workbook data or copy anonymous browser data into an account.
14. Do not claim offline reliability or live collaborative editing until that behavior has been designed and verified on target devices.
15. Cloud saves must show clear saved/saving/error state; reject stale updates instead of silently erasing another device's changes.
16. Add new inventory categories as small domain modules using shared components, not as hardcoded branches scattered across unrelated screens.
17. Do not import user spreadsheets into the public repo, GitHub Actions artifacts, log output or demonstration fixtures.
