# Public API, SCIM & SSO (v1356)

## What shipped

Organisation admins manage **Integrations & Security** on Platform (`/platform/organisation/integrations`) and Planner (`/app/settings/integrations`):

| Area | Purpose |
|------|---------|
| API keys | Service accounts + hashed keys (shown once), scopes, rotate/revoke, usage |
| Webhooks | Subscribe to record events; HMAC-signed delivery via `webhooks.deliver` |
| SCIM | Token + group→role mappings; IdP manages joiners/leavers |
| SSO | Per-org SAML/OIDC connections; login routes by verified email domain |
| API reference | Live OpenAPI from the gateway (`/v1/openapi.json`) |

Admin: **System › Public API** (`/system/api-usage`) for usage and emergency revoke; plan catalog fields for API/SCIM enablement and rates.

## SQL to run (owner)

**Monorepo (`E:\project-nidus\SQL\`):**

1. `v1585_api_foundations.sql`
2. `v1586_api_webhooks.sql`
3. `v1587_scim_provisioning.sql`
4. `v1588_sso_connections.sql`
5. `v1589_api_planner_menus_and_assertions.sql`
6. `v1590_retire_api_webhook_sso_scaffolding.sql` (optional; drops empty v42/v43/v51 tables when the DB is quiet)

**Fixes from the v1359 gap closure (run after the above):**

7. `v1609_integrations_admin_only_and_webhook_worker.sql` — webhook, SCIM and SSO settings for the Account Owner
   or a PMO Admin only; webhook delivery through worker functions.
8. `v1611_sso_domain_verification.sql` — real DNS verification of SSO email domains (see below).

**Admin (`E:\project-nidus-admin\SQL\`):**

1. `v260_api_scim_admin.sql`

## Gateway

- Function: `supabase/functions/api-gateway`
- Deploy with `--no-verify-jwt` (included in `CRON_FUNCTIONS` / no-verify set in `supabase-functions.yml`)
- Auth: Bearer organisation API key (`nds_live_…`) or SCIM token
- Queries run as the key’s service-account JWT so **RLS still applies**
- Pure helpers: `supabase/functions/_shared/api/` (crypto, scopes, rate, pagination, etag, handlers, scim, openapi)

## Background jobs

| Code | Role |
|------|------|
| `webhooks.deliver` | HMAC POST to endpoint; v1352 back-off / replay |
| `api.purge_idempotency_and_counters` | Hourly clean-up |
| `sso.domain_verify` | DNS TXT check of an SSO connection's domains (DNS over HTTPS); queued by Verify domain and by the weekly re-check (v1611) |
| `sso.domain_recheck` | Weekly: queues a real re-check of every verified domain; a failure tells the Account Owner and does not lock anyone out (v1611) |

Reminders: API key expiry, SCIM token expiry, SAML certificate expiry (org admins).

## Calling the API

```http
GET /functions/v1/api-gateway/v1/projects
Authorization: Bearer nds_live_…
```

```http
GET /functions/v1/api-gateway/v1/openapi.json
```

SCIM base: `/functions/v1/api-gateway/scim/v2`

## Scope notes

- **Platform + Planner** share `public` schema (D11).
- **Simulator** is excluded from the public API.
- Empty v42/v43/v51 scaffolding is dropped only when row counts are zero (migrations check first).
- Login “Continue with SSO” resolves `sso_resolve_login_domain`; password login is blocked when SSO is required except break-glass / account owner.

## Verifying an SSO domain (v1611)

1. In **Integrations & Security › Single sign-on**, save the connection with its email domains. The page shows a TXT
   record, `nidus-verify=<token>`, made by the server.
2. Publish that TXT record on every domain listed (for example on `company.example`).
3. Select **Verify domain**. The worker looks the record up over DNS and shows *Verified* or the reason it failed
   within a few minutes.
4. Only then can **Require SSO** be switched on. Changing the domains clears the verification.
5. A domain can be verified by one organisation only. The weekly re-check repeats the DNS lookup; if the record has
   gone, the Account Owner is told and SSO keeps working.

Only the Account Owner and PMO Admins can see or change webhooks, SCIM and SSO settings (v1609).

## Tests

```bash
npx vitest run --config supabase/functions/vitest.config.js
```

Covers crypto, scopes, rate, pagination, etag, OpenAPI catalogue shape.
