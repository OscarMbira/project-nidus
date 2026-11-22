# v1356 — Public API & SCIM Provisioning — Implementation plan

**PRD:** `projectprd/v1356_public_api_and_scim_PRD.md` (owner decisions D1–D12, 2026-11-22).
**Systems:** Platform and Planner edition (`public`); Admin (`E:\project-nidus-admin`) for plan switches, limits and
oversight. Simulator excluded (D11, recorded rule 34.1 exception).
**Method:** test-first vertical slices (App_Guide), one per D12 step; each slice builds, tests pass with no new
failures (suites run one at a time), is committed, and the owner runs its SQL and checks before the next starts. SQL
numbers are taken from `ls SQL` immediately before each file (rule 18.0), in each repo.

## Facts this plan builds on

- Unused scaffolding to retire: `api_keys` (v42, plain-text key / secret), `webhooks` / `webhook_events` /
  `webhook_logs` (v43; `apps/platform/src/services/webhookService.js`, no page renders it), `sso_providers` /
  `sso_sessions` / `sso_login_logs` (v51; `ssoService.js`, `SSOLoginButton` on the login pages). Check for rows
  before dropping; replace with the new tables; delete unreachable code (rule 78).
- Admin `admin.api_keys` (Admin SQL v23, hashed + prefix) — Admin’s own keys; pattern reference only.
- Edge Functions in `supabase/functions/` with `_shared`; v1352 background jobs (planned) for webhook delivery.
- Organisation membership, roles / custom roles, invitations (`accept-invitation`), seat limits on subscription
  plans, Planner edition accounts (`accounts.product_edition`), Planner table wall (v1251).

## Architecture

- **Gateway** `supabase/functions/api-gateway/` (TypeScript, framework-free core in `_shared/api/` so it can run on
  plain Node / Deno — D2): router → authenticate (key or SCIM token: prefix lookup, hash compare, timing-safe) →
  plan check + rate limit → scope check → handler → audit row.
- **Identity for RLS:** each key belongs to a service account (a `users` row flagged `is_service_account`, no login,
  member of the organisation with a role and project access). The gateway mints a short-lived JWT for that user, so
  every query runs under RLS (rule 42). Scopes are checked before the query (D3).
- **Resource mappers** `_shared/api/resources/*.ts`: public shape ↔ tables (display IDs, ISO dates, decimal-string
  amounts), filters, cursor pagination, ETag from `updated_at` (D5). Writes call the same RPCs / validations as the
  screens.
- **OpenAPI** generated from the resource definitions; developer page renders it (D5).

## Data model (`public`; RLS on; registered in `database_tables`; Planner wall re-run)

| Table | Slice | Purpose |
|---|---|---|
| `users.is_service_account` (column) | 1 | Non-login service accounts (D3) |
| `api_credentials` | 1 | Organisation key: display ID, name, prefix, hash, service account, scopes[], expires_at, last_used_at, revoked_at, rotated_from (D3) |
| `api_request_log` | 1 | Audit: credential, method, path, status, duration, IP, request id (retention per v1352) |
| `api_rate_counters` | 1 | Per-organisation minute / day counters (D6) |
| `api_idempotency_keys` | 3 | Key, request hash, stored response, 24 h expiry (D5) |
| `webhook_endpoints` | 3 | URL, events[], secret hash + encrypted secret, status, failure count (D7) |
| `webhook_outbox` / `webhook_deliveries` | 3 | Events written in the change transaction; attempts, status, response (D7) |
| `scim_settings` | 4 | Per organisation: enabled, token hash / prefix, welcome-email choice, block manual invites (D8, D9) |
| `scim_group_mappings` | 4 | IdP group → role (+ optional project team) (D8) |
| `scim_identities` | 4 | external id ↔ user, active, last sync (D8) |
| `sso_connections` | 5 | Per organisation: type SAML / OIDC, provider id, verified domains, SSO required, break-glass user (D10) |

Admin SQL (`E:\project-nidus-admin\SQL\`): plan columns / table for API + SCIM enablement and limits (D6); audited
`public.admin_api_*` RPCs for usage views and emergency revoke (new narrow exception, documented in both CLAUDE.md
files, rule 34.5); ID generation rules for `api_credentials`, `webhook_endpoints` (rule 16.2).

## Slice 1 — Foundations

Tests first: hash / prefix / timing-safe compare; scope ∩ role; rate limiter; plan gate; audit row per call;
cross-organisation isolation.
- [ ] SQL: service-account column, `api_credentials`, `api_request_log`, `api_rate_counters`, RLS, registry, Planner
      wall; retire v42 `api_keys` after the row check.
- [ ] Gateway skeleton with `/v1/ping` and `/v1/me`.
- [ ] Organisation Settings › Integrations & Security (routed pages): service accounts, API keys (create → shown
      once, rotate with overlap, revoke), usage vs limits. Field help, Audit tab, success modal.
- [ ] Admin: plan switch + limits; usage list; emergency revoke.
- [ ] Jobs (rule 80): `reminder_record_types` row for API key expiry (recipients: organisation admins).
- [ ] Menus (rule 75) + taxonomy / placement docs (70); Planner parity.
- [ ] Exit: builds, tests, commit; owner SQL + check with an HTTP client.

## Slice 2 — Read API

- [ ] Resource mappers for every D4 resource (list + get, filters, sort, cursor pagination, ETag).
- [ ] OpenAPI generation; developer page (reference + examples with `.example` hosts); contract tests.
- [ ] Exit as slice 1.

## Slice 3 — Write API and webhooks

- [ ] POST / PATCH / DELETE for D4 write resources through existing RPCs and validations; Idempotency-Key; If-Match.
- [ ] Outbox triggers on the D4 tables; event catalogue; endpoints page (subscribe, test ping, deliveries, replay).
- [ ] Delivery job `webhooks.deliver` (v1352 queue handler; D7 amended): HMAC signature + timestamp, v1352 per-item
      back-off for 24 h, endpoint disabled and admin alerted after repeated failures; replay uses v1352 single-item
      replay.
- [ ] Jobs (rule 80): `api.purge_idempotency_and_counters` (hourly); `retention_targets` rows for
      `api_request_log` and `webhook_deliveries`. Retire v43 tables and `webhookService.js`.
- [ ] Exit as slice 1.

## Slice 4 — SCIM

- [ ] `/scim/v2/ServiceProviderConfig`, `/Schemas`, `/ResourceTypes`, `/Users`, `/Groups` (filter, PATCH, delete).
- [ ] Provisioning RPCs: create / link by email, seat check with clear error + admin alert, deactivate (suspend
      membership, revoke sessions, keep records), group → role mapping.
- [ ] IdP lock: managed fields read-only in profile / member pages while SCIM is on; block manual invites option.
- [ ] SCIM settings page (token create / rotate, mappings, welcome email choice). Conformance tests; test IdP tenant.
- [ ] Jobs (rule 80): `reminder_record_types` row for SCIM token expiry.
- [ ] Exit as slice 1.

## Slice 5 — Per-organisation SSO

- [ ] `sso_connections`; domain verification (DNS TXT); SAML / OIDC through the auth provider’s SSO support.
- [ ] Login page: route by email domain; “SSO required” blocks password login except the break-glass owner.
- [ ] Retire v51 tables and `ssoService.js` / `SSOLoginButton` (rule 78).
- [ ] Jobs (rule 80): `sso.domain_recheck` (weekly; a failed re-check alerts the organisation admins and does not
      lock anyone out by itself); `reminder_record_types` row for SAML certificate expiry.
- [ ] Guide `Documentation/Public_API_SCIM_SSO_v1356_Guide.md`; ROADMAP R11 / R12 status; exit.

## Risks

| Risk | Mitigation |
|---|---|
| Data leak across organisations | RLS via service-account JWT (no RLS bypass), isolation tests per resource, security review (REVIEW.md) per slice |
| Leaked keys | Hash only, shown once, prefix for identification, expiry, rotation, emergency revoke, usage audit |
| Breaking customers when tables change | Own resource shapes + versioned `/v1`, contract tests |
| Webhook storms / slow endpoints | Outbox + queue, back-off, auto-disable, per-organisation caps |
| SCIM deprovisioning deletes work | Deactivate only; records kept; tested |
| SSO lock-out | Break-glass owner, domain verification, staged “SSO required” switch |
| Vendor lock-in | Framework-free gateway core; standard JWT; SQL kept portable where practical |

## Review

(to be completed after each slice)
