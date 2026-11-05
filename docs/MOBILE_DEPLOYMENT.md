# Botanica — mobile-first deployment checklist

This guide assumes GitHub repository `DownAirOnly/botanica` and the v2 source package. It intentionally keeps private business spreadsheets and recipes out of the public GitHub repository.

## 1 — Authorize the GitHub integration to write Botanica

Open [Installed GitHub Apps](https://github.com/settings/installations) in your phone browser. Find the GitHub integration connected to ChatGPT, tap **Configure**, choose **Only select repositories**, add **DownAirOnly/botanica**, and save. If already selected, review its permissions and reconnect the GitHub app in ChatGPT if necessary. Previously the integration returned **403 Resource not accessible by integration** for repository writes.

Return to ChatGPT and say **“GitHub access updated; upload Botanica.”** ChatGPT can then try committing the current project source. Do **not** upload the ZIP as one opaque file to the repository: GitHub needs the extracted app files and directories to build the site.

## 2 — Create a dedicated Firebase project

Open [Firebase Console](https://console.firebase.google.com/). Create a new project named Botanica (or another available project ID) that is separate from Everyday. Register a **Web app (</>)** and save the **web app config** shown after registration. Firebase web client fields such as `apiKey`, `authDomain`, `projectId` and `appId` are public client identifiers; never send **service-account/private-key** material.

Under **Authentication → Sign-in method**, enable **Google** and select a support email.

Under **Authentication → Settings → Authorized domains**, add `downaironly.github.io` for the GitHub Pages deployment.

Under **Firestore Database**, create a database in **production mode**, then open the **Rules** tab and replace the starting rules with the exact contents of `firestore.rules` included with Botanica. Tap **Publish**. **Do not** leave permissive/test rules active.

## 3 — Configure the app's Firebase web settings

**Simplest with GitHub write access restored:** Paste the web app `firebaseConfig` object into the same ChatGPT conversation; ask ChatGPT to wire the *web client* settings into the app and push the commit. Do not paste Admin SDK credentials. The Vite build currently reads four `VITE_FIREBASE_...` values.

**Alternative, without sharing config in chat:** Under [GitHub Actions variables](https://github.com/DownAirOnly/botanica/settings/variables/actions), add four repository variables with values from Firebase Web app config:

- `VITE_FIREBASE_API_KEY` ← `apiKey`
- `VITE_FIREBASE_AUTH_DOMAIN` ← `authDomain`
- `VITE_FIREBASE_PROJECT_ID` ← `projectId`
- `VITE_FIREBASE_APP_ID` ← `appId`

Firebase web client keys are not a substitute for Firestore security rules; **the rules protect your data**.

## 4 — Enable automatic Pages deployment

Open [Botanica Pages settings](https://github.com/DownAirOnly/botanica/settings/pages). Under **Build and deployment**, set **Source** to **GitHub Actions**. The repository includes `.github/workflows/deploy.yml` which builds the Vite app on pushes to `main`.

Open [GitHub Actions](https://github.com/DownAirOnly/botanica/actions), select **Deploy Botanica**, and verify a successful run. If a run failed, inspect the build error rather than assuming the page was published.

Expected public **website address** (not proof of a deployment): https://downaironly.github.io/botanica/

The website assets are public, but inventory content belongs only in protected Firebase workspaces. Before relying on it, verify account separation, rules, Google sign-in and cloud saves.

## 5 — Verify on phone before entering real inventory

1. Open the published site in Safari/Chrome and choose **Continue with Google**. Verify mobile login works, including outside an installed PWA.
2. Create a test **herbal** workspace, add/adjust a test herb, refresh the page, and verify that cloud saves persisted.
3. Create a **general inventory** workspace; ensure it remains separate.
4. Check the Firestore rules by logging into a different Google account and verifying it cannot open the first account’s workspace.
5. Export a JSON backup and test import/restore in a spare workspace before using real inventory.
6. Only then confirm physical counts with the business owner and import real data through the review workflow. Do not treat example/demo figures as real stock.
7. iPhone: Safari **Share → Add to Home Screen**. Android: Chrome **Install app/Add to Home screen** if offered.

## Known limitations of v2

- **Not fully tested:** a local pure-domain smoke test passed; a full production dependency install/build and end-to-end Firebase tests remain outstanding.
- Google sign-in currently uses `signInWithPopup`. Installed iPhone/Android PWA behavior must be checked on the actual devices. Firebase Hosting and a same-origin auth flow may be needed if popup support is inconsistent.
- Workspaces are **owner-only**, not shared across different Google accounts. Do not share Google account passwords; implement invitation-based collaboration and per-user roles before multiple people need access to the same inventory.
- Storage uses a revision-checked whole-document snapshot and may reject simultaneous edits, rather than providing real-time shared editing.
- Keep business spreadsheets, private formulas, purchase records and backup exports outside the public repository.

## Official references

- [GitHub: configure installed GitHub App access](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps)
- [GitHub: Pages using custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Firebase: Google sign-in on web](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase: Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
