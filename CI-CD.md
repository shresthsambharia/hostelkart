# HostelKart CI/CD Pipeline Documentation

This document explains the workflows, environment secrets, caching mechanisms, deployment triggers, and rollback behaviors set up for HostelKart.

---

## 1. GitHub Workflows Map

The project contains five isolated GitHub Actions files inside `.github/workflows/`:
1. **Continuous Integration (`ci.yml`)**:
   - Executes on every push or pull request to the `main` and `develop` branches.
   - Restores npm caching, runs ESLint on frontend and backend, runs automated testing suite, checks Vite builds, and tests server boot configurations.
2. **Continuous Deployment (`cd.yml`)**:
   - Launches automatically when new commits are pushed/merged to the `main` branch.
   - Deploys frontend build to Vercel and notifies Render deployment endpoints.
3. **Security Analysis (`security.yml`)**:
   - Performs critical dependency audits via `npm audit` and runs secret scans.
4. **Release Automation (`release.yml`)**:
   - Creates GitHub Releases and tags automatically when release tags (e.g. `v1.2.0`) are pushed.
5. **Dependency Updates (`dependency-update.yml`)**:
   - Periodically checks for outdated npm packages every Sunday.

---

## 2. Secrets Management

Configure the following secrets in GitHub Repository Settings (`Settings > Secrets and variables > Actions`):

| Secret Name | Description / Target |
| :--- | :--- |
| `VERCEL_TOKEN` | Access Token for Vercel API authorization |
| `VERCEL_ORG_ID` | Vercel Organization ID |
| `VERCEL_PROJECT_ID` | Vercel Project ID |
| `RENDER_DEPLOY_HOOK_URL` | Hook URL to trigger Render backend deployment |
| `MONGO_URI` | Production database connection string |
| `JWT_SECRET` | Secret token string for signing login sessions |

---

## 3. Caching Strategy
- **npm Cache**: Uses GitHub Actions native `cache: 'npm'` property inside `actions/setup-node@v4` to cache global packages and reduce dependencies download times.
- **Vite Cache**: Caches the `.vite` cache directories to speed up local bundler compilation cycles.

---

## 4. Rollback and Recovery
If a deployment fails:
1. Vercel automatically reverts route targets to the last successful production deployment.
2. Render maintains the previous container build online if a new container startup check crashes.
3. Administrator notifications are triggered via GitHub Workflow run status emails.
