# GitHub CI Setup Guide

## ✅ Created: `.github/workflows/ci.yml`

You now have a GitHub Actions CI pipeline that will automatically run on every push and pull request!

---

## 🎯 What It Does

### On Every Push/PR to `main` or `develop`:
1. ✅ **Checks formatting** - Ensures code style is consistent
2. ✅ **Runs linting** - Catches errors and bad patterns
3. ✅ **Runs tests** - Verifies functionality
4. ✅ **Builds project** - Ensures production build succeeds
5. ✅ **Runs coverage** (PRs only) - Measures test coverage

### ⏱️ Estimated Time: 2-3 minutes per run

---

## 🚀 Setup Steps

### 1. Add Required Scripts to `package.json`

The CI expects these commands to exist (most already do):

```json
{
  "scripts": {
    "format": "prettier --write .",
    "lint": "eslint .",
    "test": "vitest run",      // Change from "vitest" to "vitest run"
    "test:coverage": "vitest --coverage",
    "build": "tsc -b && vite build"
  }
}
```

**Important**: Change your `test` script from:
```json
"test": "vitest"
```

To:
```json
"test": "vitest run"
```

This ensures tests exit after running (required for CI).

---

### 2. Add GitHub Secrets (Required for Build)

Your build needs environment variables. Add them to GitHub:

#### Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | Required? |
|------------|-------|-----------|
| `VITE_MAPBOX_ACCESS_TOKEN` | Your Mapbox token | ✅ Yes |
| `VITE_TURSO_URL` | Your Turso database URL | ⚠️ If build needs it |
| `VITE_TURSO_AUTH_TOKEN` | Your Turso auth token | ⚠️ If build needs it |
| `VITE_FIREBASE_API_KEY` | Firebase API key | ⚠️ If build needs it |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | ⚠️ If build needs it |

**Note**: Only add secrets that are actually needed for the **build step**. Runtime-only secrets aren't needed.

---

### 3. Update CI File (If Needed)

If you need more environment variables, edit `.github/workflows/ci.yml`:

```yaml
- name: 🏗️ Build application
  run: npm run build
  env:
    VITE_MAPBOX_ACCESS_TOKEN: ${{ secrets.VITE_MAPBOX_ACCESS_TOKEN }}
    VITE_TURSO_URL: ${{ secrets.VITE_TURSO_URL }}
    VITE_TURSO_AUTH_TOKEN: ${{ secrets.VITE_TURSO_AUTH_TOKEN }}
    # Add more as needed
```

---

## 📊 Current Status

### Before This CI Setup:
```
Developer Push → Vercel Deploy → 🤞 Hope it works
```

### After This CI Setup:
```
Developer Push 
  ↓
GitHub CI validates (2-3 min)
  ├─ ✅ Format check
  ├─ ✅ Lint check  
  ├─ ✅ Tests pass
  └─ ✅ Build succeeds
  ↓
Merge to main
  ↓
Vercel Deploy → ✅ Confident it works
```

---

## 🔴 What Happens When CI Fails?

### On Pull Requests:
- ❌ Red X appears on PR
- 🚫 Can't merge until fixed
- 📝 Shows which step failed

### On Push to Main:
- ⚠️ Warning notification
- 🔍 Investigate and fix
- 🔄 Push fix

---

## 🟢 How to See CI Status

### 1. On Pull Requests
Look for the checks at the bottom:
```
✅ CI / Lint, Test & Build (pull_request)
✅ CI / Test Coverage (pull_request)
```

### 2. On Repository
- Go to **Actions** tab
- See all workflow runs
- Click any run to see details

### 3. On Commit/PR Badge (Optional)
Add this to your `README.md`:

```markdown
![CI Status](https://github.com/YOUR_USERNAME/Wich-Wayz-Map/workflows/CI/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 🎯 Workflow Behavior

### Triggers:
- ✅ Push to `main` branch
- ✅ Push to `develop` branch  
- ✅ Pull request to `main`
- ✅ Pull request to `develop`

### What Runs:
| Branch | Format Check | Lint | Test | Build | Coverage |
|--------|-------------|------|------|-------|----------|
| `main` push | ✅ | ✅ | ✅ | ✅ | ❌ |
| `develop` push | ✅ | ✅ | ✅ | ✅ | ❌ |
| PR to `main` | ✅ | ✅ | ✅ | ✅ | ✅ |
| PR to `develop` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 💡 Optimizations

### Skip CI for Documentation
Add to commit message:
```bash
git commit -m "docs: update README [skip ci]"
```

### Cache Dependencies
Already configured! Uses `cache: 'npm'` in workflow.

### Fail Fast
If formatting fails, other steps won't run (saves time).

---

## 🔧 Troubleshooting

### "npm ci" Fails
**Problem**: `package-lock.json` out of sync

**Fix**:
```bash
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

---

### "npm run format -- --check" Fails
**Problem**: Code not formatted

**Fix**:
```bash
npm run format
git add .
git commit -m "style: format code"
```

---

### "npm run lint" Fails
**Problem**: ESLint errors

**Fix**:
```bash
npm run lint  # See errors
# Fix the errors manually, or:
npm run lint -- --fix  # Auto-fix if possible
git add .
git commit -m "fix: resolve linting errors"
```

---

### "npm test" Fails
**Problem**: Tests failing

**Fix**:
```bash
npm test  # See which tests fail
# Fix the tests or code
git add .
git commit -m "test: fix failing tests"
```

---

### "npm run build" Fails
**Problem**: Missing environment variables or build errors

**Fix**:
1. Check if you added all required secrets to GitHub
2. Test build locally: `npm run build`
3. Check CI logs for specific error

---

### Tests Hang in CI
**Problem**: `"test": "vitest"` doesn't exit

**Fix**: Change to `"test": "vitest run"` in package.json

---

## 📈 Monitoring

### View Workflow History
1. Go to **Actions** tab
2. Click **CI** workflow
3. See all runs with status

### View Specific Run
1. Click on a run
2. See each step's output
3. Download artifacts (if any)

---

## 🎨 Optional: Add Status Badge

Add to your `README.md`:

```markdown
# Wich Wayz Map

![CI Status](https://github.com/YOUR_USERNAME/Wich-Wayz-Map/workflows/CI/badge.svg)
![License](https://img.shields.io/github/license/YOUR_USERNAME/Wich-Wayz-Map)

...rest of README
```

---

## 🚀 Advanced: Matrix Testing (Optional)

To test on multiple Node versions, edit `.github/workflows/ci.yml`:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

This tests on Node 18, 20, and 22. Takes 3x longer but more thorough.

---

## 📋 Summary

### ✅ What You Get:
- Automated quality checks on every PR
- Confidence before merging
- Build verification before deploy
- Test coverage tracking
- Free for public repos

### ⏱️ Cost:
- Time: 2-3 minutes per run
- Money: $0 (free for public repos)

### 🎯 Recommendation:
**Yes, absolutely keep this!** It's a best practice and will save you from broken deployments.

---

## 🔄 Next Steps

1. ✅ Change `"test": "vitest"` to `"test": "vitest run"` in package.json
2. ✅ Add required secrets to GitHub (Settings → Secrets → Actions)
3. ✅ Push this change to trigger first CI run
4. ✅ Check Actions tab to see it run
5. ✅ Add status badge to README (optional)

---

## 🤝 Working with Vercel

### Current Setup:
```
GitHub PR → CI validates → Vercel builds preview
     ↓
   Merge
     ↓
GitHub CI validates → Vercel deploys to production
```

### Perfect Workflow:
1. Create PR
2. GitHub CI runs (2-3 min)
3. Vercel builds preview (parallel)
4. Review both checks
5. If both ✅, merge
6. Vercel deploys to production

Both complement each other:
- **GitHub CI**: Validates code quality
- **Vercel**: Handles deployment

---

## 📝 Quick Reference

```bash
# Local development
npm run dev              # Start dev server
npm run format          # Format code
npm run lint            # Check for errors
npm test                # Run tests
npm run build           # Build for production

# Before pushing
npm run format          # Format
npm run lint            # Lint
npm test                # Test
# OR use pre-commit hook (already configured)

# CI will automatically run:
npm run format -- --check
npm run lint
npm test
npm run build
```

---

**Questions?** Check the GitHub Actions logs in the Actions tab, or review this guide!