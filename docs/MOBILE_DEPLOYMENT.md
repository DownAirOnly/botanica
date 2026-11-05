# Botanica v3 — phone-first deployment

This is the current guide. Repo: https://github.com/DownAirOnly/botanica. Firebase project: `botanica-45e4b`. Business spreadsheets and private records stay out of the public repository.

## Already done

- Uploaded app source, README, separate changelog, project context, responsive components and inventory screens to GitHub `main`.
- Set the public Firebase web-app configuration in `src/lib/firebase.ts`. No need to paste config again or connect Firebase Hosting to the repo.
- Installed automatic GitHub Pages workflow at `.github/workflows/deploy.yml`.
- Made initial TypeScript compile fixes. Check the **latest** Actions build before assuming success.

## You do these from your phone

1. [GitHub Pages settings](https://github.com/DownAirOnly/botanica/settings/pages): in **Build and deployment**, set **Source → GitHub Actions**.
2. [Botanica Firebase Console](https://console.firebase.google.com/project/botanica-45e4b/overview): go to **Authentication → Sign-in method**, enable **Google**, choose support email, and save.
3. In Firebase **Authentication → Settings → Authorized domains**, add `downaironly.github.io` (the hostname only, no URL path).
4. Firebase **Firestore Database → Rules**: replace the starting deny-all rule with the exact contents of [firestore.rules](../firestore.rules). Tap **Publish**. Never use open/test rules.
5. [GitHub Actions](https://github.com/DownAirOnly/botanica/actions): select **Deploy Botanica** and check the latest run. If needed, tap **Run workflow** from its workflow page. Resolve any build or Pages error before using the site.
6. Open https://downaironly.github.io/botanica/ only **after** the Pages workflow succeeds. Test Google sign-in, new herbal/general workspaces, a test stock adjustment, page refresh and preserved cloud state.

## Security and business readiness

A public static site is normal; inventory records live in private Firestore workspaces behind owner-only security rules. Do not add private XLSX files, actual recipes, purchase histories, or user exports to GitHub. Web client Firebase API keys are public identifiers, **not** admin credentials.

Current cloud model supports account-private workspaces with revision-checked snapshot saves. It does **not** support invitation sharing or real-time multi-editor collaboration. Verify rules and backup/restore, plus sign-in on your mom's Android and your iPhone (browser and installed PWA), before using actual business inventory.

## Official help

- [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
