# Prompt Rules

## Coding standards
- TypeScript strict mode; avoid `any` unless unavoidable.
- Prefer small, composable functions and shared utilities.
- Keep UI accessible (keyboard focus, contrast, labels).

## Database migrations
- Never change schema without adding a new migration.
- Seed data belongs in `0002`/`0003` or explicit seed scripts.
- Use `wrangler d1 migrations apply` for local/remote.

## API endpoints
- All endpoints live under `/api` in `functions/api/[[route]].ts`.
- Validate input with Zod and return structured errors.
- Enforce RBAC for every staff/admin route.

## Auth & security
- Never store plaintext passwords.
- Always hash with PBKDF2 + salt + pepper.
- Keep sessions HttpOnly; `SameSite=Lax`.

## Changelog updates
- Add new features to `context/CHANGELOG.md` with semver-ish entries.
- Keep entries short and user-facing.
