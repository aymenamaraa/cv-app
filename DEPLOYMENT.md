# Europass CV Web Application — Pipeline & Deployment Documentation

> **Target Audience**: DevOps Engineers, Full-Stack Developers, Release Managers  
> **Status**: Production Reference Guide  
> **Primary Deployment Target**: Cloudflare Pages (Global Anycast Edge CDN + HTTP/3 + Edge Caching)  
> **Secondary / Fallback Target**: GitHub Pages (Static Hosting & Automated Mirror)  
> **Repository**: `aymenamaraa/cv-app` (Original: `aymenamaraa.github.io`)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [CI/CD Pipeline Architecture (GitHub Actions)](#2-cicd-pipeline-architecture-github-actions)
3. [Environment Variables & Secrets Matrix](#3-environment-variables--secrets-matrix)
4. [Cloudflare Infrastructure Provisioning](#4-cloudflare-infrastructure-provisioning)
5. [Europass Content & Data Architecture](#5-europass-content--data-architecture)
6. [Build & Execution Commands](#6-build--execution-commands)
7. [Hosting Architecture & Platform Comparison](#7-hosting-architecture--platform-comparison)
8. [Edge Optimization & Security Headers](#8-edge-optimization--security-headers)
9. [Pre-Flight & Post-Deployment Verification (Smoke Tests)](#9-pre-flight--post-deployment-verification-smoke-tests)
10. [Rollback & Disaster Recovery Procedures](#10-rollback--disaster-recovery-procedures)
11. [Troubleshooting & Common Failure Modes](#11-troubleshooting--common-failure-modes)
12. [Step-by-Step Deployment Work Plan & Milestones](#12-step-by-step-deployment-work-plan--milestones)

---

## 1. Architecture Overview

The Europass CV Web Application utilizes a modern Jamstack edge delivery architecture with dual-target publishing capabilities:

```
                                      +---------------------------------------------+
                                      |              GitHub Repository              |
                                      |            (aymenamaraa/cv-app)             |
                                      +----------------------+----------------------+
                                                             |
                                            git push to main | (or workflow_dispatch)
                                                             v
                                      +---------------------------------------------+
                                      |            GitHub Actions Runner            |
                                      |        (.github/workflows/deploy.yml)       |
                                      |                                             |
                                      | 1. node scripts/validate-data.js            |
                                      | 2. vite build -> ./dist                     |
                                      +----------------------+----------------------+
                                                             |
                                 +---------------------------+---------------------------+
                                 |                                                       |
        npx wrangler pages deploy| dist                              actions/deploy-pages| (artifact: dist)
                                 v                                                       v
        +-------------------------------------------------+     +-----------------------------------+
        |             Cloudflare Global Edge              |     |           GitHub Pages            |
        |              (Project: cv-app)                  |     |    (aymenamaraa.github.io)        |
        +------------------------+------------------------+     +-----------------+-----------------+
                                 |                                                |
               +-----------------+-----------------+                              | (Automated Fallback)
               |                                   |                              v
               v                                   v                     +------------------+
+-----------------------------+     +-----------------------------+      | Global CDN Edge  |
|  Immutable Hashed Assets    |     |   Dynamic Europass Layer    |      | (Fastly Anycast) |
|  - /assets/index-[hash].js  |     |   - /data.json (no-cache)   |      +------------------+
|  - /assets/index-[hash].css |     |   - /circle-profile.png     |
|  - Cache: 1 year (immutable)|     |   - /index.html (revalidate)|
|  - Edge Brotli / HTTP/3     |     |   - Security: HSTS, CSP     |
+-----------------------------+     +-----------------------------+
```

### Runtime Specifications

| Component | Technology | Role & Edge Behavior |
|---|---|---|
| **Frontend SPA** | React 19, JavaScript ES Modules, Vite 7 | Dynamic rendering of Europass CV, CEFR grid, EQF qualifications, bilingual switching (`fr` / `en`), and print-to-PDF styles. |
| **Edge Platform (Primary)** | Cloudflare Pages | Anycast 300+ PoP global CDN, zero-cold-start delivery, HTTP/3, TLS 1.3, 0-RTT, and Brotli/Zstandard compression. |
| **Edge Rules Engine** | Cloudflare `_headers` & `_redirects` | Custom caching rules (immutable hashed bundles vs. instantaneous revalidation for `data.json`), strict CSP, and SPA fallback. |
| **Content Pipeline** | `public/data.json` + `scripts/validate-data.js` | Single source of truth for resume data. Pre-build schema validation halts deployment if syntax or required fields are broken. |
| **Static Host (Secondary)** | GitHub Pages | Fallback mirror hosted at `https://aymenamaraa.github.io/`, built simultaneously via GitHub Actions. |
| **Configuration** | `wrangler.jsonc` | Declarative project spec defining output directory (`./dist`) and edge compatibility date (`2025-02-14`). |

---

## 2. CI/CD Pipeline Architecture (GitHub Actions)

The deployment pipeline is automated in [`.github/workflows/deploy.yml`](file:///c:/Users/aamaraa/Desktop/github/cv-app/.github/workflows/deploy.yml).

### Workflow Triggers

- **Push Event**: Triggered automatically on every push to the `main` branch.
- **Manual Trigger**: Triggered on-demand via `workflow_dispatch` through the GitHub Actions console.

### Job Specification & Step Execution

```yaml
name: Deploy to Cloudflare Pages & GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate & Build Application
        run: npm run build

      - name: Check Cloudflare Credentials
        id: check_cf_creds
        run: |
          if [ -z "${{ secrets.CLOUDFLARE_API_TOKEN }}" ]; then
            echo "::warning ::CLOUDFLARE_API_TOKEN secret is not set in GitHub repository settings. Skipping direct GitHub Action Cloudflare deployment. (If you connected your GitHub repository directly in the Cloudflare Pages Dashboard, Cloudflare automatically builds and deploys on push)."
            echo "has_token=false" >> $GITHUB_OUTPUT
          else
            echo "has_token=true" >> $GITHUB_OUTPUT
          fi

      - name: Deploy to Cloudflare Pages
        if: steps.check_cf_creds.outputs.has_token == 'true'
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          npx wrangler pages deploy dist --project-name=cv-app --commit-dirty=true

      - name: Configure GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact for GitHub Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy-github-pages:
    name: Publish to GitHub Pages
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build-and-deploy
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Pipeline Deployment Pathways

1. **Pathway A — Direct GitHub Actions Deployment (Recommended)**:
   - On commit to `main`, GitHub Actions validates `public/data.json`, compiles Vite bundles to `./dist`, and uses `wrangler pages deploy dist` with repository secrets.
   - Zero configuration needed on the Cloudflare dashboard once secrets are stored.

2. **Pathway B — Direct Cloudflare Pages Git Integration (Alternative)**:
   - Connect the repository inside **Cloudflare Dashboard > Workers & Pages > Create application > Pages > Connect to Git**.
   - Build command: `npm run build`.
   - Build output directory: `dist`.
   - Root directory: `/`.
   - On every Git push, Cloudflare's build fleet clones the repo, executes the build, and publishes to edge.

3. **Pathway C — Local Manual Deploy via Wrangler CLI**:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=cv-app
   ```

---

## 3. Environment Variables & Secrets Matrix

### Secrets Reference Table

| Variable Name | Required Scope | Storage Location | Description | Example / Format |
|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | CI/CD Pipeline | GitHub Repository Secret | Cloudflare API Token with `Cloudflare Pages: Edit` permissions | `v1.0-...` (40 chars) |
| `CLOUDFLARE_ACCOUNT_ID` | CI/CD Pipeline | GitHub Repository Secret | Cloudflare 32-character Account Identifier | `8f4b2c1a0e9...` |
| `NODE_VERSION` | Cloudflare Build Fleet | Cloudflare Pages Var (Dashboard) | Specifies Node runtime for Cloudflare native builds | `22` or `20` |

### Where to Configure Secrets

#### 1. In GitHub Repository (For GitHub Actions)
Navigate to **GitHub Repository > Settings > Secrets and variables > Actions > New repository secret**:
1. `CLOUDFLARE_API_TOKEN`:
   - Create at [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens).
   - Use the **Create Custom Token** button.
   - Permissions: `Account > Cloudflare Pages > Edit`.
   - Account Resources: `Include > All accounts` (or select your account).
2. `CLOUDFLARE_ACCOUNT_ID`:
   - Found on Cloudflare Dashboard homepage (right sidebar under **Account ID**).

#### 2. In Cloudflare Pages Dashboard (If using Cloudflare Git Integration)
Navigate to **Cloudflare Dashboard > Workers & Pages > cv-app > Settings > Environment Variables**:
- Add `NODE_VERSION` = `22` (ensures modern Node.js features during native Cloudflare builds).

---

## 4. Cloudflare Infrastructure Provisioning

### 4.1 Cloudflare Pages Project Configuration

The project configuration is declared in [`wrangler.jsonc`](file:///c:/Users/aamaraa/Desktop/github/cv-app/wrangler.jsonc):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "cv-app",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2025-02-14"
}
```

### 4.2 Provisioning via Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages > Create application > Pages**.
3. Select **Connect to Git** and choose the `aymenamaraa/cv-app` repository.
4. Configure the build settings:
   - **Project Name**: `cv-app`
   - **Production Branch**: `main`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
5. Click **Save and Deploy**.

### 4.3 Provisioning via Wrangler CLI

If creating the project from the command line:

```bash
# 1. Authenticate Wrangler with your Cloudflare account
npx wrangler login

# 2. Create the Cloudflare Pages project
npx wrangler pages project create cv-app --production-branch=main

# 3. Deploy the initial build
npm run build
npx wrangler pages deploy dist --project-name=cv-app
```

### 4.4 Custom Domain & DNS Configuration

To map a personal domain (e.g., `cv.aymenamara.com` or `aymenamara.dev`) to Cloudflare Pages:

1. In Cloudflare Dashboard, go to **Workers & Pages > cv-app > Custom Domains**.
2. Click **Set up a domain**.
3. Enter your domain or subdomain (e.g., `cv.yourdomain.com`).
4. **DNS Records**:
   - If domain is on Cloudflare DNS: Cloudflare automatically provisions the CNAME record with CNAME Flattening.
   - If domain is on external DNS (GoDaddy, Namecheap, Route53):
     - Record Type: `CNAME`
     - Host: `cv`
     - Target: `cv-app.pages.dev`
5. Cloudflare automatically generates an **Edge SSL/TLS certificate** (Universal SSL) supporting HTTP/3, TLS 1.3, and automatic HTTPS redirection.

---

## 5. Europass Content & Data Architecture

The entire curriculum vitae content is driven dynamically by [`public/data.json`](file:///c:/Users/aamaraa/Desktop/github/cv-app/public/data.json).

### Schema Architecture

```
data.json
├── fr (French Root)
│   ├── ui           -> Buttons, labels, CEFR headers, Europass title
│   ├── seo          -> Document title metadata
│   ├── person       -> Identity, role, profile photo, nationality
│   ├── contact      -> Address, phone, email links
│   ├── summary      -> Professional summary paragraph
│   ├── expertise    -> Core technology badges (variant: gold/green)
│   ├── digitalSkills-> Categorized skills (Frontend, Backend, AI/MCP, DevOps)
│   ├── experience   -> Chronological employment history with bullets & tags
│   ├── education    -> Academic degrees with EQF level (Niveau 7 CEC)
│   └── languages    -> Mother tongue & CEFR self-assessment grid (C1/C2)
└── en (English Root)
    └── [Identical structure mirrored in English]
```

### Pre-Deployment Data Validation Pipeline

To ensure a broken JSON edit never causes an edge deployment crash or white screen in production, the build pipeline enforces pre-flight validation via [`scripts/validate-data.js`](file:///c:/Users/aamaraa/Desktop/github/cv-app/scripts/validate-data.js):

```javascript
// Automatically executed prior to 'vite build'
npm run validate:data
```

The validator confirms:
1. Valid JSON syntax (no unescaped quotes, trailing commas, or encoding errors).
2. Presence of required top-level language objects (`fr` and `en`).
3. Presence of all critical Europass sections (`ui`, `person`, `contact`, `experience`, `education`, `languages`).
4. Non-empty arrays for work experience and education.
5. Presence of CEFR language grid metrics.

---

## 6. Build & Execution Commands

| Command | Purpose | Output / Environment |
|---|---|---|
| `npm run dev` | Starts Vite local development server with HMR | `http://localhost:5173/` |
| `npm run validate:data` | Verifies `public/data.json` integrity and schema | Exits `0` on success, `1` on error |
| `npm run build` | Runs `validate:data` then compiles Vite SPA for production | Writes output to `./dist` |
| `npm run preview` | Starts local preview of compiled `./dist` directory | `http://127.0.0.1:4173/` |
| `npm run deploy:pages` | Builds and deploys directly to Cloudflare Pages via Wrangler | Deploys to `cv-app.pages.dev` |
| `npx wrangler pages dev dist` | Emulates Cloudflare Pages edge runtime locally (tests headers & redirects) | `http://localhost:8788/` |
| `npx wrangler pages deployment list --project-name=cv-app` | Lists recent Cloudflare Pages deployments and URLs | Terminal output |

---

## 7. Hosting Architecture & Platform Comparison

| Capability | Cloudflare Pages (Primary) | GitHub Pages (Secondary) |
|---|---|---|
| **Edge Global PoPs** | 300+ Cities across 100+ countries | Fastly edge network |
| **Edge Time-to-First-Byte (TTFB)** | ~10–25ms globally | ~60–150ms depending on region |
| **HTTP Protocol Support** | HTTP/3 (QUIC), HTTP/2, 0-RTT | HTTP/2 |
| **Custom HTTP Headers (`_headers`)** | **Full native support** (Custom Cache-Control, CSP, HSTS) | Not supported (default GitHub headers only) |
| **SPA Route Handling (`_redirects`)** | **Native 200 rewrite fallback** | Requires `404.html` hack or refresh meta-tag |
| **Pull Request Preview Deployments** | **Automatic unique preview URL** for every branch/PR | Manual / single environment only |
| **Instant Rollbacks** | **Instant (0 seconds)** via Dashboard without rebuilding | Requires git commit revert & rebuild (2–3 mins) |
| **DDoS & Web Protection** | Cloudflare unmetered DDoS mitigation + Web Analytics | Standard GitHub rate limits |

---

## 8. Edge Optimization & Security Headers

Cloudflare Pages reads [`public/_headers`](file:///c:/Users/aamaraa/Desktop/github/cv-app/public/_headers) and [`public/_redirects`](file:///c:/Users/aamaraa/Desktop/github/cv-app/public/_redirects) during deployment and applies them directly at the CDN edge.

### Cache Strategy in `_headers`

```
# 1. Immutable Caching for Hashed Production Assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# 2. Revalidation for Europass CV Content (Instant Updates)
/data.json
  Cache-Control: public, max-age=0, must-revalidate
  Content-Type: application/json; charset=utf-8

# 3. HTML Shell - Always Fetch Fresh Fingerprints
/index.html
  Cache-Control: public, max-age=0, must-revalidate
```

### Security Headers in `_headers`

Every request served by Cloudflare Pages includes:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- `X-Frame-Options: SAMEORIGIN`: Protects against clickjacking.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer data leakage.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`: Disables unused browser hardware access.

### Single Page Application Fallback in `_redirects`

```
/*    /index.html   200
```
This rule guarantees that if a visitor refreshes on a subpath or deep link, Cloudflare rewrites the response to `/index.html` with status `200` instead of a `404 Not Found`.

---

## 9. Pre-Flight & Post-Deployment Verification (Smoke Tests)

### 9.1 Pre-Flight Quality Gates

Run these checks before committing or pushing to `main`:

```bash
# 1. Validate CV data integrity
npm run validate:data

# 2. Build production assets
npm run build

# 3. Verify dist contains necessary edge configuration files
ls -la dist/_headers dist/_redirects dist/data.json dist/index.html
```

### 9.2 Post-Deployment Smoke Test Checklist

Once the deployment completes on Cloudflare Pages (e.g., `https://cv-app.pages.dev` or custom domain):

- [ ] **Edge Response & HTTPS Verification**:
  ```bash
  curl -I https://cv-app.pages.dev/
  ```
  *Verify `HTTP/2 200` or `HTTP/3 200` with `server: cloudflare`.*

- [ ] **Security Headers Check**:
  ```bash
  curl -s -I https://cv-app.pages.dev/ | grep -E "x-content-type-options|x-frame-options|referrer-policy"
  ```
  *Verify `x-content-type-options: nosniff` and `x-frame-options: SAMEORIGIN` are returned.*

- [ ] **Hashed Asset Immutable Caching**:
  ```bash
  curl -I https://cv-app.pages.dev/assets/index-*.js
  ```
  *Verify `cache-control: public, max-age=31536000, immutable`.*

- [ ] **Data.json Freshness Check**:
  ```bash
  curl -I https://cv-app.pages.dev/data.json
  ```
  *Verify `cache-control: public, max-age=0, must-revalidate`.*

- [ ] **Bilingual Switcher Verification**:
  - Open `https://cv-app.pages.dev/` in browser.
  - Switch between **Français** and **English**.
  - Confirm UI labels, job titles, and CEFR grid update instantly without errors.

- [ ] **Print & PDF Layout Test**:
  - Press `Ctrl + P` (or click **Télécharger en PDF / Imprimer**).
  - Verify page breaks, background colors, and print typography render cleanly across pages.

---

## 10. Rollback & Disaster Recovery Procedures

### 10.1 Instant Cloudflare Pages Rollback (0 Seconds)

1. Open **Cloudflare Dashboard > Workers & Pages > cv-app**.
2. Go to the **Deployments** tab.
3. Locate the last known good deployment.
4. Click **••• (Actions) > Rollback to this deployment**.
5. The Cloudflare Anycast edge network instantly points traffic to the previous deployment archive with zero build delay.

### 10.2 Git Revert Rollback

```bash
# Revert the faulty commit on main
git revert HEAD --no-edit
git push origin main
# GitHub Actions will validate, rebuild, and deploy the previous working version
```

### 10.3 Emergency DNS Failover to GitHub Pages

If Cloudflare experiences an edge outage:
1. Update DNS record for your custom domain:
   - Change CNAME from `cv-app.pages.dev` to `aymenamaraa.github.io`.
2. Traffic will route to the synchronized GitHub Pages mirror.

---

## 11. Troubleshooting & Common Failure Modes

### 1. `JSON Syntax Error in public/data.json`
- **Symptom**: `npm run build` fails in CI/CD with `JSON Syntax Error`.
- **Cause**: A missing comma, trailing comma, or unescaped quotation mark was introduced into `public/data.json`.
- **Resolution**:
  1. Run `npm run validate:data` locally to see the exact line number and parsing error.
  2. Fix formatting errors (valid JSON cannot contain trailing commas).

### 2. Edits to `data.json` Not Reflected in Browser
- **Symptom**: You deployed a content change, but visitors still see the old text.
- **Cause**: Browser cached `data.json` aggressively.
- **Resolution**:
  1. Confirm `public/_headers` includes `/data.json` with `Cache-Control: public, max-age=0, must-revalidate`.
  2. Verify that `dist/_headers` was deployed by checking the response headers with `curl -I https://cv-app.pages.dev/data.json`.

### 3. Direct Page Refresh Returns 404
- **Symptom**: Navigating to a subpath or refreshing returns a Cloudflare 404 page.
- **Cause**: Missing `_redirects` SPA rule.
- **Resolution**: Ensure `public/_redirects` contains `/*  /index.html  200` and is present in `./dist`.

### 4. GitHub Action Warning: `CLOUDFLARE_API_TOKEN secret is not set`
- **Symptom**: The build finishes, but Cloudflare deployment is skipped with a warning.
- **Cause**: GitHub repository secrets are not yet configured.
- **Resolution**: Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` under **GitHub Repository > Settings > Secrets and variables > Actions**.

### 5. Relative Asset Path Resolution (`base: './'`)
- **Symptom**: Assets fail to load or show blank page when hosted on a subpath.
- **Cause**: In `vite.config.js`, `base` is configured as `'./'`.
- **Resolution**: For Cloudflare Pages, relative paths (`./`) work seamlessly on both apex domains, subdomains (`cv.domain.com`), and preview branch URLs (`<branch>.cv-app.pages.dev`).

---

## 12. Step-by-Step Deployment Work Plan & Milestones

| Milestone | Task Description | Commands / Actions | Deliverable / Verification |
|---|---|---|---|
| **Phase 1: Local Setup** | Validate schema & local build | `npm run validate:data`<br>`npm run build` | Verified `./dist` containing `_headers` and `_redirects` |
| **Phase 2: Cloudflare Setup** | Create Cloudflare Pages project | `npx wrangler pages project create cv-app` | Project `cv-app` created on Cloudflare |
| **Phase 3: Secrets Config** | Configure GitHub Actions Secrets | Add `CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ACCOUNT_ID` in GitHub Settings | Secrets accessible to CI/CD runner |
| **Phase 4: CI/CD Deployment** | Push to `main` branch | `git add .`<br>`git commit -m "feat: setup cloudflare pages deployment"`<br>`git push origin main` | GitHub Actions runs dual deployment successfully |
| **Phase 5: Smoke Testing** | Execute verification curl checklist | Check HTTP 200, `_headers`, and mobile rendering | Production live at `cv-app.pages.dev` |
| **Phase 6: Custom Domain** | Set up custom DNS mapping | Cloudflare Dashboard > Custom Domains > Add Domain | Universal SSL active on custom domain |
