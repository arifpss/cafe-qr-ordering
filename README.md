# Cafe QR Ordering Webapp

Production-ready QR ordering webapp for cafes using Cloudflare Pages + D1. Customers scan a QR, order from their table, and track status. Staff handles acceptance and prep flow. Admins manage menu, pricing, themes, and reports.

## Features
- Customer ordering flow with live status polling
- Staff kitchen/front-desk views
- Admin dashboard with CRUD, reports, theme, and discounts
- Role-based access control with secure sessions
- Multi-language UI (EN/BN)
- Cyberpunk / Windows 11 / Apple themes

## Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Cloudflare Pages Functions (Hono)
- Database: Cloudflare D1

## Getting Started

### 1) Install dependencies
```
npm install
```

### 2) Configure secrets
Copy `.dev.vars.example` to `.dev.vars` and fill:
```
SESSION_SECRET=change-me
PASSWORD_PEPPER=change-me
```

### 3) Login to Cloudflare
```
npx wrangler login
```

### 4) Initialize Cloudflare resources
```
npm run cf:init
```

### 4.1) Set Cloudflare secrets (optional helper)
```
SESSION_SECRET=change-me PASSWORD_PEPPER=change-me npm run cf:secrets
```

### 5) Apply migrations (local)
```
npm run cf:migrate:local
```

### 6) Seed default admin (local)
```
PASSWORD_PEPPER=your-pepper npm run cf:seed -- --local
```
Default admin:
- Username: `admin`
- Phone: `01000000000`
- Password: `Admin123`

### 7) Run locally
```
npm run dev
```
Open the Pages dev server URL printed by Wrangler.

## Deploy to Cloudflare

### Manual deploy
```
npm run build
npm run deploy
```

### GitHub Actions deploy
1. Push to GitHub.
2. Set GitHub secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. (Optional) Add repo variable `CF_PAGES_PROJECT` with your Pages project name.

## Scripts
- `npm run dev`: build + local Pages dev
- `npm run build`: production build
- `npm run cf:init`: create D1 + Pages project
- `npm run cf:migrate:local`: apply migrations locally
- `npm run cf:migrate:remote`: apply migrations remotely
- `npm run cf:seed`: seed admin user
- `npm run deploy`: deploy to Pages

## API Notes
- All endpoints are under `/api`.
- Sessions are stored in D1 with HttpOnly cookies.
- Login rate limiting is per-instance; use a durable store if you need stricter enforcement.

## Optional GitHub Repo Bootstrap
If GitHub CLI is installed:
```
GH_REPO=cafe-qr-ordering node scripts/gh-init.mjs
```

## Future
- Add Google OAuth to `oauth_accounts` once env vars are set.
- Add R2 uploads for media.
