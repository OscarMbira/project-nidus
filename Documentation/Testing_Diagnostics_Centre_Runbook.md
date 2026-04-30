# Testing & Diagnostics Centre — Runbook

## Database

Apply migrations v493–v498 from the repository `SQL/` folder in order.

## Test runner (local/CI)

- Project stub: `test-runner/runner.mjs`
- Planned adapters (see `projectplan/v493_...`): `playwright-adapter`, `vitest-adapter`, `evidence-uploader`, `diagnostic-engine` — implement beside `runner.mjs` as your CI requires.

## Supabase

- **Bucket:** `testing-centre-evidence` — private, signed URLs for downloads.
- **RLS:** relies on `app_user_has_testing_centre_permission` — ensure JWT users map to `public.users` and `user_roles` correctly.

## Playwright (optional)

Add `@playwright/test` to the repo and create `playwright.config.ts` under project root; base URL from `VITE_APP_URL` or similar.
