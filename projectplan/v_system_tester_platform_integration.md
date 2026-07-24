# System Tester Platform Integration

**Status:** Complete  
**Companion to:** `project-nidus-admin/projectplans/v11.0_system_tester_program_plan.md`

## Scope (project-nidus)

| Item | Location | Status |
|---|---|---|
| `is_tester` gate — Platform | `apps/platform/src/services/platformSubscriptionService.js` | Done |
| `is_tester` gate — Simulator | `apps/simulator/src/services/subscriptionService.js` | Done |
| Moratorium CTA banner | `apps/*/src/components/TesterMoratoriumBanner.jsx` + Subscription dashboards | Done |
| Sandbox auto-provision | `project-nidus-admin/SQL/v82` trigger on `organisation_invitations` | Done |
| Expiry notification processor | `admin.process_tester_expiry_notifications()` (call via pg_cron / scheduled job) | Done (RPC + email templates in v83) |

## Scheduled job (ops)

Run daily (pg_cron or external scheduler):

```sql
SELECT admin.process_tester_expiry_notifications();
```

Wire to your email delivery service using templates `tester_moratorium_expiry_{90d,30d,7d,0d}` from `admin.email_templates`.

## Migrations (admin repo)

```bash
cd project-nidus-admin
pnpm run admin:migrate-system-testers
pnpm run admin:seed-testers
```
