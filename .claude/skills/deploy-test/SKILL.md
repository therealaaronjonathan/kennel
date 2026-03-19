# Deploy to Test

Deploy the shomer-app to Firebase Hosting (test environment) and return the live URL.

## Steps

Run these steps in order. If any step fails, stop and report the error clearly.

### 1. Ensure on main branch

```bash
cd /Users/aj/Shomer/kennel && git status
```

Check that the working branch is `main`. If it's not, note this but continue — the user may intentionally be deploying a feature branch. Report the current branch at the end.

### 2. Build for test

```bash
cd /Users/aj/Shomer/kennel/apps/shomer-app && bun run build:test
```

This uses Vite `--mode development`, which loads `.env` only (no `.env.production`), so the build connects to the **test** Firestore database.

### 3. Deploy to test hosting target

```bash
cd /Users/aj/Shomer/kennel && firebase deploy --only hosting:app-test
```

This deploys `apps/shomer-app/dist` to the `app-test` hosting target (`shomer-app-test` site).

### 4. Report result

On success, output:

```
✅ Deployed to test

🔗 https://shomer-app-test.web.app

Branch: <branch-name>
Build: development mode (test Firestore DB)
```

Make the URL clickable/prominent so the user can click it directly.
