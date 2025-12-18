# Architecture

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Cloudflare Pages Functions with Hono
- Database: Cloudflare D1 (SQLite)
- Media: URL-based now, R2-ready fields in products

## Folder structure
- `src/` React app
- `functions/api/[[route]].ts` API router
- `migrations/` D1 schema + seeds
- `scripts/` Wrangler automation
- `context/` project documentation

## Routing
- Customer: `/t/:tableCode`, `/order/:orderId`, `/profile`, `/leaderboard`
- Staff: `/staff/kitchen`, `/staff/frontdesk`
- Admin: `/admin`
- API: `/api/*`

## DB schema summary
- Core: locations, tables, users, sessions
- Menu: categories, products (bilingual fields)
- Orders: orders, order_items, order_events, reviews
- Membership: user_points, badge_levels
- Config: settings
- Audit: audit_logs
- OAuth scaffold: oauth_accounts

## Auth model
- Password auth using PBKDF2 (salt + pepper).
- Session stored in D1 with HttpOnly cookie (45 days).
- `must_change_password` flag for admin/staff first login.
- OAuth placeholders for future Google login.

## RBAC matrix
- Customer: menu, orders (own), review, profile
- Chef: staff orders (accepted/preparing), update status
- Employee: accept orders, mark served
- Manager/Admin: full admin CRUD + reports + settings

## Notifications
- Polling every 3-5 seconds on staff and customer status views.
- In-memory rate limiting for login attempts (per instance).

## Reporting
- Sales grouped by day/month/year.
- Best items by quantity.
- Badge distribution by points range.

## Deployment pipeline
1. `npm run build`
2. `wrangler pages deploy dist`
3. Apply D1 migrations (local/remote)
4. Seed default admin user via `npm run cf:seed`
