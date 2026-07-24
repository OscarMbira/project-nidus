# Admin System Setup Guide

## Prerequisites

- Supabase project with PostgreSQL 15
- Node.js 20+, pnpm 9+
- Separate deployment URL (non-obvious subdomain — not `admin.nidus.com`)

## SQL migration order

1. `SQL/v735_01_admin_schema.sql`
2. `SQL/v735_01b_admin_seed_data.sql`
3. `SQL/v735_02_admin_auth_functions.sql`
4. `SQL/v735_03_admin_subscription_functions.sql`
5. `SQL/v735_04_admin_system_tables.sql`
6. `SQL/v735_05_admin_support_tables.sql`
7. `SQL/v735_06_admin_error_monitoring.sql`
8. `SQL/v735_07_admin_2fa.sql`

## Initial Super Admin

```bash
cd "E:\project-nidus-admin"
pnpm install
pnpm run admin:seed-super
```

## Environment variables

Copy `.env.example` to `.env.local` in the admin project. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ADMIN_KEY` (service role key).

## Module deployment

```bash
pnpm turbo build --filter=@nidus-admin/<module-name>
```

Deploy `dist/assets/remoteEntry.js` to CDN. Update module URL env var on shell — no shell redeploy required.

## Security checklist

- [ ] IP allowlisting configured
- [ ] Cloudflare Zero Trust (optional)
- [ ] Service role key stored securely
- [ ] `dev-start-all.bat` not in deployment artifact
- [ ] Super Admin 2FA configured on first login
