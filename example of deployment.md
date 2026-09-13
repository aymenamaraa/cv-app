# Tuniverse — Pipeline & Deployment Documentation

> **Target Audience**: DevOps Engineers, Full-Stack Developers, Release Managers  
> **Status**: Production Reference Guide  
> **Primary Deployment Target**: Cloudflare Pages + Pages Functions + D1 + R2  
> **Secondary / Container Target**: Node.js + Express (Cloud Run / Docker)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [CI/CD Pipeline Architecture (GitHub Actions)](#2-cicd-pipeline-architecture-github-actions)
3. [Environment Variables & Secrets Matrix](#3-environment-variables--secrets-matrix)
4. [Cloudflare Infrastructure Provisioning](#4-cloudflare-infrastructure-provisioning)
5. [Database Migrations & Seeding Pipeline](#5-database-migrations--seeding-pipeline)
6. [Build & Execution Commands](#6-build--execution-commands)
7. [Alternative Container Deployment (Cloud Run / Docker)](#7-alternative-container-deployment-cloud-run--docker)
8. [Pre-Flight & Post-Deployment Verification (Smoke Tests)](#8-pre-flight--post-deployment-verification-smoke-tests)
9. [Rollback & Disaster Recovery Procedures](#9-rollback--disaster-recovery-procedures)
10. [Troubleshooting & Common Failure Modes](#10-troubleshooting--common-failure-modes)

---

## 1. Architecture Overview

Tuniverse is architectured with a dual-runtime strategy:

```
                                  +---------------------------------------+
                                  |            GitHub Repository          |
                                  |        (aymenamaraa/TuniverseWebApp)  |
                                  +-------------------+-------------------+
                                                      |
                                     git push to main | (or manual dispatch)
                                                      v
                                  +---------------------------------------+
                                  |         GitHub Actions Runner         |
                                  |        (.github/workflows/deploy.yml) |
                                  +-------------------+-------------------+
                                                      |
                                          npm ci & npm run build:pages
                                          npx wrangler pages deploy
                                                      v
                          +-------------------------------------------------------+
                          |                 Cloudflare Global Edge                |
                          |               (Project: tuniverse-travel)             |
                          +---------------------------+---------------------------+
                                                      |
                      +-------------------------------+-------------------------------+
                      |                                                               |
                      v                                                               v
        +---------------------------+                                   +---------------------------+
        |   Static Assets (SPA)     |                                   |  Pages Functions Runtime  |
        |   - React 19 + TypeScript |                                   |  - V8 Edge Serverless     |
        |   - Vite 6 + Tailwind 4   |                                   |  - nodejs_compat          |
        |   - Output: ./dist        |                                   |  - Middleware & REST APIs |
        +---------------------------+                                   +-------------+-------------+
                                                                                      |
                                                  +-----------------------------------+-----------------------------------+
                                                  |                                                                       |
                                                  v                                                                       v
                                    +---------------------------+                                           +---------------------------+
                                    |     Cloudflare D1 (DB)    |                                           |     Cloudflare R2         |
                                    |   - Distributed SQLite    |                                           |   - S3-Compatible Storage |
                                    |   - Binding: DB           |                                           |   - Binding: PRIVATE_FILES|
                                    |   - 6 SQL Migrations      |                                           |   - Provider KYC Uploads  |
                                    +---------------------------+                                           +---------------------------+
```

### Runtime Specifications

| Component | Technology | Role & Behavior |
|---|---|---|
| **Frontend SPA** | React 19, TypeScript 5.8, Tailwind CSS 4, Vite 6 | Client-side routing, multi-tenant UI, trilingual dynamic layouts (`FR`, `EN`, `AR` with RTL support). |
| **Edge API Functions** | Cloudflare Pages Functions (`functions/`) | Serverless API routes executing on Cloudflare's global edge network. Uses `nodejs_compat` runtime flag. |
| **Relational Storage** | Cloudflare D1 (`tuniverse-db`) | Serverless edge SQLite storing multi-tenant identities, catalog, rate plans, bookings, vouchers, and audit logs. |
| **Object Storage** | Cloudflare R2 (`tuniverse-private-files`) | S3-compatible private storage for KYC compliance documentation and verification files. |
| **AI Integration** | Google Gemini 2.5 Flash (`@google/genai`) | Server-side AI itinerary generation, refinement, and concierge service. |
| **Legacy/Node Runtime** | Express 4, `server.ts`, `esbuild` | Self-hosted or containerized fallback serving both Vite static assets and backend endpoints. |

---

## 2. CI/CD Pipeline Architecture (GitHub Actions)

The deployment pipeline is automated via GitHub Actions in [`.github/workflows/deploy.yml`](file:///c:/Users/aamaraa/Desktop/github/tuniverse/.github/workflows/deploy.yml).

### Workflow Triggers

- **Push Event**: Automatically runs on every push to the `main` branch.
- **Manual Trigger**: Runs on-demand via `workflow_dispatch` through the GitHub Actions UI.

### Job Specification & Step Execution

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    name: Build & Deploy to Cloudflare Pages
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build:pages

      - name: Check Cloudflare Credentials
        id: check_creds
        run: |
          if [ -z "${{ secrets.CLOUDFLARE_API_TOKEN }}" ]; then
            echo "::warning ::CLOUDFLARE_API_TOKEN secret is not set in GitHub repository settings. Skipping direct GitHub Action deployment. (If you connected your GitHub repository directly in the Cloudflare Pages Dashboard, Cloudflare automatically builds and deploys on push)."
            echo "has_token=false" >> $GITHUB_OUTPUT
          else
            echo "has_token=true" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to Cloudflare Pages
        if: steps.check_creds.outputs.has_token == 'true'
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          npx wrangler pages deploy dist --project-name=tuniverse-travel --commit-dirty=true
```

### Pipeline Deployment Pathways

1. **Pathway A — GitHub Actions Deployment (Default)**:
   - Triggered on Git push to `main`.
   - Node 22 environment builds static bundles to `./dist`.
   - `wrangler pages deploy dist` pushes `./dist` and compiles `functions/` to Cloudflare Pages.
   - Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` stored in GitHub repository secrets.

2. **Pathway B — Direct Cloudflare Git Integration (Fallback)**:
   - If `CLOUDFLARE_API_TOKEN` is absent in GitHub, the GitHub Action issues a graceful non-blocking warning.
   - If the repository is connected directly inside the **Cloudflare Pages Dashboard**, Cloudflare pulls commits directly, executes `npm run build:pages`, and deploys natively.

---

## 3. Environment Variables & Secrets Matrix

### Secrets Reference Table

| Variable Name | Required Runtime | Scope / Storage Location | Description | Example / Format |
|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | CI/CD Pipeline | GitHub Repository Secret | Cloudflare API Token with `Cloudflare Pages: Edit` permissions | `v1.0-...` (40 chars) |
| `CLOUDFLARE_ACCOUNT_ID` | CI/CD Pipeline | GitHub Repository Secret | Cloudflare 32-character Account Identifier | `a1b2c3d4e5f6...` |
| `GEMINI_API_KEY` | Edge API / Express | Cloudflare Pages Secret & `.dev.vars` / `.env` | Google AI Studio API key for Gemini 2.5 Flash | `AIzaSy...` |
| `JWT_SECRET` | Edge API | Cloudflare Pages Secret & `.dev.vars` | High-entropy HMAC-SHA256 key for signing auth session tokens | 64+ hex characters |
| `PAYMENT_MODE` | Edge API | Cloudflare Pages Var & `.dev.vars` | Payment gateway state. Set to `disabled` for production, `demo` for non-prod testing | `disabled` \| `demo` |
| `PAYMENT_WEBHOOK_SECRET` | Edge API | Cloudflare Pages Secret & `.dev.vars` | Shared secret to authenticate inbound payment webhooks | 32+ hex characters |
| `ENVIRONMENT` | Edge API | Cloudflare Pages Var & `.dev.vars` | Deployment stage | `production` \| `staging` \| `preview` |
| `APP_URL` | Express / SSR | Environment Variable (`.env`) | Base public URL of the application | `https://tuniverse-travel.pages.dev` |

### Where to Configure Secrets

#### 1. In GitHub (For Actions CI/CD)
Navigate to **Repository > Settings > Secrets and variables > Actions**:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

#### 2. In Cloudflare Pages Dashboard (For Live Functions Runtime)
Navigate to **Cloudflare Dashboard > Workers & Pages > tuniverse-travel > Settings > Environment Variables**:
- Under **Production** and **Preview**, configure:
  - `GEMINI_API_KEY` (Encrypt as secret)
  - `JWT_SECRET` (Encrypt as secret)
  - `PAYMENT_WEBHOOK_SECRET` (Encrypt as secret)
  - `PAYMENT_MODE` = `disabled`
  - `ENVIRONMENT` = `production`

#### 3. Via Wrangler CLI
```bash
# Set secrets directly into Cloudflare Pages
npx wrangler pages secret put GEMINI_API_KEY --project-name=tuniverse-travel
npx wrangler pages secret put JWT_SECRET --project-name=tuniverse-travel
npx wrangler pages secret put PAYMENT_WEBHOOK_SECRET --project-name=tuniverse-travel
```

#### 4. Local Development Files (Ignored by Git)
- For `server.ts` (Express server): `.env` (derived from `.env.example`)
- For `wrangler pages dev` (Edge Functions): `.dev.vars` (derived from `.dev.vars.example`)

---

## 4. Cloudflare Infrastructure Provisioning

### 4.1 Cloudflare Pages Project Configuration

The project is declared in [`wrangler.jsonc`](file:///c:/Users/aamaraa/Desktop/github/tuniverse/wrangler.jsonc):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tuniverse-travel",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2025-02-14",
  "compatibility_flags": [
    "nodejs_compat"
  ]
}
```

> [!NOTE]
> `wrangler.jsonc` does not hardcode static D1 UUIDs to prevent invalid UUID deployment failures during CI builds. Bindings are mapped via the Cloudflare Pages Dashboard or a local `wrangler.jsonc` copied from `wrangler.example.jsonc`.

### 4.2 Provisioning Cloudflare D1 (Database)

1. **Create the remote D1 Database**:
   ```bash
   npx wrangler d1 create tuniverse-db
   ```
   *Output will return the `database_name` and `database_id` (UUID).*

2. **Bind D1 to Cloudflare Pages**:
   - Go to **Cloudflare Dashboard > Workers & Pages > tuniverse-travel > Settings > Functions**.
   - In the **D1 database bindings** section, click **Add binding**:
     - **Variable name**: `DB`
     - **D1 database**: Select `tuniverse-db`
   - Save and redeploy.

### 4.3 Provisioning Cloudflare R2 (Object Storage)

1. **Create the R2 Bucket**:
   ```bash
   npx wrangler r2 bucket create tuniverse-private-files
   ```

2. **Bind R2 to Cloudflare Pages**:
   - Go to **Cloudflare Dashboard > Workers & Pages > tuniverse-travel > Settings > Functions**.
   - In the **R2 bucket bindings** section, click **Add binding**:
     - **Variable name**: `PRIVATE_FILES`
     - **R2 bucket**: Select `tuniverse-private-files`
   - Save and redeploy.

---

## 5. Database Migrations & Seeding Pipeline

The database schema is divided into 6 sequential migrations located under `migrations/`:

| Migration File | Domain / Scope | Key Tables Created |
|---|---|---|
| `0001_identity_tenants.sql` | Tenants, Identity & Auth | `tenants`, `users`, `sessions`, `password_resets`, `tenant_users` |
| `0002_providers_catalog.sql` | Providers & Inventory | `providers`, `categories`, `listings`, `rate_plans`, `availability_slots` |
| `0003_itineraries.sql` | Itineraries | `itineraries`, `itinerary_versions`, `itinerary_days`, `itinerary_activities` |
| `0004_booking_payments_vouchers.sql` | Commercial Loop | `quotes`, `quote_items`, `bookings`, `booking_items`, `payments`, `vouchers` |
| `0005_operations_messaging.sql` | Operations & Incidents | `conversations`, `messages`, `kyc_documents`, `incident_reports` |
| `0006_platform_audit.sql` | Compliance & Observability | `audit_events`, `ai_usage_telemetry`, `system_metrics` |
| `seed.sql` | Demo Fixtures | Comprehensive initial data set generated by `scripts/seed-demo.ts` |

### 5.1 Applying Migrations

#### Local SQLite (Wrangler Emulation)
```bash
# Apply pending migrations locally
npx wrangler d1 migrations apply DB --local
```

#### Production / Staging (Cloudflare Remote D1)
```bash
# Apply migrations to live remote D1
npx wrangler d1 migrations apply DB --remote
```

### 5.2 Seeding Initial / Demonstration Data

1. **Generate the Seed SQL file** (if updating definitions):
   ```bash
   npx tsx scripts/seed-demo.ts
   ```

2. **Execute Seed locally**:
   ```bash
   npx wrangler d1 execute DB --local --file=./migrations/seed.sql
   ```

3. **Execute Seed on Remote Production D1**:
   ```bash
   npx wrangler d1 execute DB --remote --file=./migrations/seed.sql
   ```

> [!IMPORTANT]
> Always execute migrations on the remote database **BEFORE** deploying code that depends on new tables or columns to prevent edge function runtime crashes.

---

## 6. Build & Execution Commands

| Command | Purpose | Output / Environment |
|---|---|---|
| `npm run dev` | Starts local Express hybrid dev server with Vite HMR | `http://localhost:3000` (Node runtime) |
| `npm run lint` | Runs strict TypeScript type checking without emitting files | Checks `src/`, `functions/`, `server.ts` |
| `npm run build:pages` | Compiles Vite SPA frontend for Cloudflare Pages | Output written to `./dist` |
| `npm run pages:dev` | Compiles SPA and emulates Cloudflare Pages Functions & D1 locally | Emulates Cloudflare Edge on `http://localhost:8788` |
| `npm run deploy` | Builds SPA and triggers direct Wrangler Pages deploy | Deploys directly to Cloudflare Pages |
| `npm run build` | Dual build: Vite SPA + bundled Node.js server via `esbuild` | Creates `./dist` and `./dist/server.cjs` |
| `npm run start` | Executes compiled Node.js Express server bundle | Runs `node dist/server.cjs` in Node 20+ |
| `npm run clean` | Cleans build artifacts and dist directories | Deletes `./dist` and temporary files |

---

## 7. Alternative Container Deployment (Cloud Run / Docker)

For environments requiring a traditional containerized service (e.g., Google Cloud Run, AWS ECS, or bare-metal VPS), the application can be packaged via Docker using `dist/server.cjs`.

### 7.1 Multi-Stage Dockerfile Reference

```dockerfile
# Stage 1: Build Frontend and Server Bundle
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Minimal Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
```

### 7.2 Google Cloud Run Deployment Sequence

```bash
# 1. Build and push image to Google Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tuniverse:latest

# 2. Deploy service to Cloud Run
gcloud run deploy tuniverse \
  --image gcr.io/YOUR_PROJECT_ID/tuniverse:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=projects/YOUR_PROJECT_ID/secrets/GEMINI_API_KEY:latest,APP_URL=https://your-domain.com"
```

---

## 8. Pre-Flight & Post-Deployment Verification (Smoke Tests)

### 8.1 Pre-Flight Quality Gates

Execute these checks before merging or pushing to `main`:

```bash
# 1. Static typing check
npm run lint

# 2. Translation & i18n resolution verification
npx tsx scripts/test-i18n.ts

# 3. Production build test
npm run build:pages
```

### 8.2 Post-Deployment Smoke Test Checklist

Once the deployment completes on Cloudflare Pages:

- [ ] **Request Correlation Header**:
  ```bash
  curl -I https://tuniverse-travel.pages.dev/api/health
  ```
  *Verify that `X-Request-Id` UUID header is present in the response.*
- [ ] **CORS Preflight**:
  ```bash
  curl -I -X OPTIONS https://tuniverse-travel.pages.dev/api/generate-itinerary \
    -H "Origin: https://tuniverse-travel.pages.dev" \
    -H "Access-Control-Request-Method: POST"
  ```
  *Verify response is `HTTP 204` with proper CORS headers.*
- [ ] **AI Endpoint Smoke Test**:
  ```bash
  curl -X POST https://tuniverse-travel.pages.dev/api/generate-itinerary \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Weekend in Tunis & Sidi Bou Said","duration":2,"theme":"Culture","lang":"FR"}'
  ```
  *Verify `200 OK` JSON response with generated day-by-day activities.*
- [ ] **Trilingual & RTL Rendering**:
  - Visit `https://tuniverse-travel.pages.dev/?lang=FR` (LTR, French).
  - Visit `https://tuniverse-travel.pages.dev/?lang=EN` (LTR, English).
  - Visit `https://tuniverse-travel.pages.dev/?lang=AR` (Verify document direction `dir="rtl"` and layout mirroring).
- [ ] **Database Connectivity**:
  - Verify public catalog query loads listings without database errors.

---

## 9. Rollback & Disaster Recovery Procedures

### 9.1 Instant Cloudflare Pages Rollback
1. Open the **Cloudflare Dashboard > Workers & Pages > tuniverse-travel**.
2. Go to the **Deployments** tab.
3. Locate the last known good deployment.
4. Click **••• (Actions) > Rollback to this deployment**.
5. The edge network immediately routes traffic to the selected build artifact (0 seconds build latency).

### 9.2 Git Pipeline Rollback
```bash
# Revert the faulty commit on main
git revert HEAD --no-edit
git push origin main
# GitHub Actions will rebuild and deploy the prior state
```

### 9.3 Emergency Operational Kill Switches
- **Disable All Payment Flows**:
  In Cloudflare Pages Dashboard, update environment variable:
  `PAYMENT_MODE="disabled"` (Immediate effect on new requests).
- **Invalidate All Active Auth Sessions**:
  In Cloudflare Pages Dashboard, rotate `JWT_SECRET`:
  Generate a new random 64-character secret and update the variable. All existing user sessions will be invalidated immediately.

### 9.4 D1 Backup and Point-in-Time Recovery
```bash
# Export remote database backup to SQL
npx wrangler d1 export tuniverse-db --remote --output=./backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database from backup
npx wrangler d1 execute DB --remote --file=./backup_2026xxxx_xxxxxx.sql
```

---

## 10. Troubleshooting & Common Failure Modes

### 1. `D1_ERROR: no such table` or UUID Error
- **Cause**: Migrations were not applied to the target remote environment, or `wrangler.jsonc` contains an unconfigured placeholder UUID.
- **Fix**:
  1. Ensure `wrangler.jsonc` does not have an invalid placeholder UUID.
  2. Run `npx wrangler d1 migrations apply DB --remote`.
  3. Ensure the binding variable in Cloudflare Pages Dashboard is named exactly `DB`.

### 2. GitHub Actions Warning: `CLOUDFLARE_API_TOKEN secret is not set`
- **Cause**: GitHub repository secrets are missing.
- **Fix**: Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Settings > Secrets and variables > Actions.

### 3. API Returns 500: `JWT_SECRET is not configured`
- **Cause**: The authentication middleware or token verification requires `JWT_SECRET`.
- **Fix**: Set `JWT_SECRET` in Cloudflare Pages Dashboard under **Settings > Environment Variables** (or locally in `.dev.vars`).

### 4. `nodejs_compat` Flag Missing
- **Cause**: Cloudflare Pages Function fails when importing Node built-in modules (`crypto`, `buffer`, etc.).
- **Fix**: Ensure `"compatibility_flags": ["nodejs_compat"]` is specified in `wrangler.jsonc`.

### 5. AI Route Exceeds Timeout
- **Cause**: Gemini API calls taking longer than edge subrequest limits.
- **Fix**: Verify `GEMINI_API_KEY` validity; check Gemini API quota in Google AI Studio console; review error response returned in `X-Request-Id` logs.
