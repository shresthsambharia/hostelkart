# HostelKart Operations Runbook

This runbook contains setup, troubleshooting, backup, and deployment guidelines for the production release of HostelKart.

---

## 🚀 1. Deployment Guides

### Frontend (Vercel)
The frontend is built and deployed using Vite on Vercel.
- **Production Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Required Env Variables**:
  * `VITE_API_URL`: Backend API URL (e.g. `https://hostelkart-backend.onrender.com`)
  * `VITE_CASHFREE_ENV`: Cashfree payment environment (e.g. `TEST` or `PRODUCTION`)
  * `VITE_SENTRY_DSN` (Optional): DSN string for Sentry UI error telemetry.

### Backend (Render)
The backend is a Node/Express server deployed on Render.
- **Start Command**: `node server.js`
- **Health Check Route**: Mount health checks at `/api/health`. Enable Render automatic health checks with:
  * **Path**: `/api/health`
- **Required Env Variables**:
  * `PORT`: `5000`
  * `MONGO_URI`: MongoDB production connection string.
  * `JWT_SECRET`: Standard secure HS256 JWT encryption key.
  * `NODE_ENV`: `production` (Must be set to suppress stack traces).
  * `CASHFREE_APP_ID`: Cashfree App ID.
  * `CASHFREE_SECRET_KEY`: Cashfree Secret Key.
  * `CASHFREE_ENV`: Cashfree environment (`TEST` or `PRODUCTION`).
  * `SENTRY_DSN` (Optional): DSN string for Sentry backend error telemetry.

---

## 💾 2. Backup & Restore Procedures

HostelKart includes a portable Node-based MongoDB backup utility to ensure quick recovery.

### To Run an Automated Database Backup:
1. SSH into the server or run locally from the workspace root:
   ```bash
   node backend/scripts/backupDatabase.js --backup
   ```
2. The backups are saved as JSON files in a timestamped folder: `backups/backup-YYYY-MM-DDTHH-MM-SS`.

### To Restore From a Backup:
1. Trigger the restore command with the backup folder name:
   ```bash
   node backend/scripts/backupDatabase.js --restore backup-YYYY-MM-DDTHH-MM-SS
   ```
2. **Caution**: This wipes the active database collections and inserts the backup documents back.

---

## 🩺 3. Uptime & Error Monitoring

### Sentry Error Tracking
- If the `SENTRY_DSN` (backend) or `VITE_SENTRY_DSN` (frontend) variables are present during start/build, Sentry will automatically initialize.
- Capture groups include:
  - React render crashes (captured by the custom `ErrorBoundary` component).
  - Unhandled backend runtime exceptions.
  - API failures and database queries throwing errors.

### Health Diagnostics
Use the `/api/health` endpoint to monitor:
- MongoDB connection readiness.
- Process uptime.
- Host memory allocations and Node runtime versions.

---

## 🛠️ 4. Troubleshooting Guide

### 1. Server Returns 504 Gateway Timeout
- **Cause**: An API request took longer than the 15-second timeout threshold.
- **Action**: Check server logs (using structured log traces) to locate the endpoint. Verify database performance and ensure heavy queries are indexed.

### 2. Images fail to load (showing blanks)
- **Cause**: Orphaned or missing local upload assets.
- **Action**: Run the storage auditor utility:
  ```bash
   node backend/scripts/auditUploads.js
  ```
  This will print list of missing or orphaned files on disk.

### 3. Database Slowdowns / Listing Delays
- **Action**: Verify that essential indexes are built.
  - Product category filters and text searches are indexed.
  - Order histories and delivery dashboards are indexed (`{ deliveryPartner: 1 }` and `{ user: 1, orderStatus: 1 }`).
