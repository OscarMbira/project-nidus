# DB Rollback Guide (v729 Option B)

## Migration layout

```
supabase/migrations/
  shared/       — auth, countries, cross-domain tables (apply before domain migrations)
  platform/     — public schema changes
  simulator/    — sim schema changes
```

Legacy versioned scripts remain in `SQL/` until fully migrated.

## Platform rollback

1. Identify the last good migration in `supabase/migrations/platform/`.
2. Connect to the database with service role (staging first).
3. Write a reverse migration SQL file (e.g. `rollback_YYYYMMDD_description.sql`).
4. Apply manually via Supabase SQL editor or `psql "$PLATFORM_DATABASE_URL" -f rollback.sql`.
5. Re-deploy the previous Platform frontend artifact from GitHub Actions / Vercel.

## Simulator rollback

Same steps using `supabase/migrations/simulator/` and `SIMULATOR_DATABASE_URL`.

## Shared migration rollback

Shared migrations affect both domains. Coordinate rollback with both Platform and Simulator teams.

## Edge Functions

Edge Functions are deployed independently. To rollback a function:

```bash
supabase functions deploy <function-name> --project-ref $PROJECT_REF
```

Use git to checkout the previous function version before redeploying.

## CI/CD

- `db-platform.yml` runs on changes to `supabase/migrations/platform/**` or `shared/**`
- `db-simulator.yml` runs on changes to `supabase/migrations/simulator/**` or `shared/**`

Always test migrations on a staging Supabase project before merging to `main`.

---

## v730 Monorepo note (single Supabase project)

During development, Platform and Simulator share **one Supabase project** (`public` + `sim` schemas).  
Rollback steps above apply to the same project until a post-launch split to separate projects.

When splitting (future):

- `supabase-platform/` — Platform project migrations + Edge Functions
- `supabase-simulator/` — Simulator project migrations + Edge Functions
- Roll back each project independently via its CI workflow (`db-platform.yml`, `db-simulator.yml`)
