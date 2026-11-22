# v1356 — Public API & SCIM Provisioning — PRD

**Status:** Decisions D1–D12 settled with the owner on 2026-11-22 (interview, rules 56–60). Plan:
`projectplan/v1356_public_api_and_scim_plan.md`.
**Roadmap:** R12 (enterprise hardening & release readiness); R11 (integrations: external APIs, webhooks); RD-001
(identity / organisation / access model).
**Systems:** Platform and Planner edition (`public`); Admin for plan switches, limits and oversight. Simulator excluded (D11).

---

## a) Problem statement

Enterprise customers expect two things Nidus does not offer:

1. **A supported public API** — to read and write project data from their own tools (BI, ERP, ticketing, data
   warehouses) without screen-scraping or CSV round-trips, with webhooks for changes.
2. **Automatic user provisioning (SCIM 2.0)** — so joiners, movers and leavers in their identity provider (e.g. an
   enterprise directory) are created, updated and removed in Nidus without manual invitations, and leavers lose
   access the same day.

What exists (codebase, 2026-11-22):

| Area | What exists | Gap |
|---|---|---|
| API keys | `api_keys` (v42): key + secret stored in plain columns, project / user scope, rate limit, expiry; no code uses it. Admin `admin.api_keys` (hashed, prefix) is for the Admin app only | No public API, no hashed organisation keys, no scopes enforced |
| Webhooks | `webhooks`, `webhook_events`, `webhook_logs` (v43); `webhookService.js` (CRUD only, no page renders it, nothing sends) | No delivery, signing, retries |
| SSO | `sso_providers`, `sso_sessions`, `sso_login_logs` (v51); `ssoService.js`, `SSOLoginButton` on the login pages | Configuration scaffolding; not tied per organisation |
| Integrations | `integration_catalog`, `integration_connections`, `integration_sync_log`, `jira_webhooks` | Connector-specific, not a general API |
| Users | Invitation flow, organisation membership, roles, custom roles, account owner; Edge Functions (e.g. `accept-invitation`, `send-email`) | No external provisioning; leavers removed by hand |
| Background jobs | v1352 planned (catalogue, queue, retries) | Webhook delivery could use it |

## b) Solution (shape)

1. **Public REST API** — versioned (`/v1`), organisation-scoped, authenticated with organisation API keys or OAuth
   client credentials, scope-based permissions that never exceed RLS, rate limits, pagination, filtering, idempotent
   writes, OpenAPI documentation and a developer page.
2. **Webhooks** — organisation subscriptions to record events, signed payloads, retries, delivery log.
3. **SCIM 2.0** — `/scim/v2/Users` and `/Groups` per organisation with a bearer token, mapping IdP users to Nidus
   users and IdP groups to Nidus roles; deprovisioning removes access.
4. **Per-organisation SSO** — SAML 2.0 / OIDC by verified email domain, optional “SSO required” (D10).
5. **Admin and audit** — keys, tokens and deliveries visible and revocable; every call audited.

## c) User stories

1. As an organisation admin, I can create an API key with chosen scopes and an expiry, see it once, and revoke it.
2. As an integrator, I can list, read, create and update projects, tasks, risks, issues, etc. through `/v1` with
   pagination and filters.
3. As an integrator, I get the same access rules as the key’s owner / scope — never more than RLS allows.
4. As an integrator, I can subscribe to events and receive signed webhooks, with retries.
5. As an IT admin, I can connect our identity provider via SCIM so users are created, updated and deactivated
   automatically.
6. As an IT admin, I can map IdP groups to Nidus roles.
7. As a security officer, I can see every API / SCIM call in an audit log and spot failures.
8. As a developer, I can read OpenAPI documentation and try calls.
9. As an organisation admin, I can rotate a key with an overlap period so integrations do not break.
10. As an integrator, retrying a create with the same Idempotency-Key never creates a duplicate.
11. As an integrator, an update based on a stale version is refused (ETag) instead of overwriting newer data.
12. As an organisation admin, I see API usage against my plan limits.
13. As an organisation admin, I can see webhook deliveries, failures and replay one.
14. As an IT admin, a leaver disabled in our identity provider loses Nidus access at once, and their records stay.
15. As an IT admin, users already in Nidus are matched by email, not duplicated.
16. As an IT admin, I can require SSO for our email domain and keep a break-glass owner.
17. As a SaaS operator (Admin app), I can enable API / SCIM per plan, set limits and revoke a key in an emergency.

## d) Implementation decisions

*(settled one at a time in the interview)*

- **D1 Shape (owner, 2026-11-22): one PRD, API first, SCIM second.** The API foundation (keys, scopes, audit, rate
  limits, gateway) is reused by SCIM. The unused v42 / v43 scaffolding (`api_keys`, `webhooks` with plain-text
  secrets) is replaced, not reused.
- **D2 Gateway (owner, 2026-11-22): our own portable API gateway.** One server function (TypeScript; a Supabase Edge
  Function today, portable to plain Node / Deno) serves `/v1` and `/scim/v2`. It authenticates the key, applies scope,
  rate limit and audit, then calls the database as the key’s identity so RLS still applies. Resources have our own
  stable shapes, not raw table names, so internal tables can change without breaking customers.
- **D3 Authentication (owner, 2026-11-22): organisation API keys bound to service accounts, narrowed by scopes.**
  An organisation admin creates a key bound to a service account (a non-login member of the organisation with a
  chosen role and project access). Scopes (e.g. `projects:read`, `tasks:write`) narrow it further; effective access =
  role / RLS ∩ scopes. Keys are hashed, shown once, with a visible prefix, an expiry (max one year) and rotation with
  an overlap period. OAuth client credentials can come later.
- **D4 Resources (owner, 2026-11-22): core PM set, read first then write.** Read and write: projects, tasks (with
  dependencies and assignments), milestones, risks, issues, changes, decisions, actions, stakeholders, timesheet
  entries, document metadata and local register records (generic, by register key). Read only: users, portfolios,
  programmes, budgets / actuals and EVM summary. Other modules are added on demand. Simulator data is not exposed.
- **D5 Conventions (owner, 2026-11-22): standard REST.** JSON; display IDs as the public id, UUIDs also accepted
  (rule 16.1); cursor pagination (limit ≤ 200); simple filters (`?status=open&updated_since=…`) and sort; PATCH for
  partial updates; `Idempotency-Key` header on create; optimistic concurrency with ETag / `If-Match`; errors as RFC 9457
  problem+json; dates ISO 8601 UTC; amounts as decimal strings with currency. Writes go through the same validation
  and lifecycle rules as the screens (e.g. an approval stays pending).
- **D6 Limits and plans (owner, 2026-11-22): per-plan, set in Admin.** API and SCIM are enabled per subscription
  plan in Admin. Each plan sets per-organisation limits per minute and per day (defaults e.g. 120 / minute,
  50,000 / day); over the limit returns 429 with `Retry-After`; usage is shown to the organisation admin. SCIM has
  its own small allowance so provisioning is never starved by API traffic.
- **D7 Webhooks (owner, 2026-11-22): signed, queued and retried via v1352 jobs.** An organisation admin subscribes an
  HTTPS endpoint to events for the API resources (e.g. `project.updated`, `task.created`, `risk.status_changed`).
  Events are written to an outbox table in the same transaction as the change; the v1352 queue delivers them with an
  HMAC-SHA256 signature and timestamp, retries with back-off for 24 hours, then disables the endpoint after repeated
  failures and alerts the admin. Payload = event, resource id and changed fields (the full record is fetched via the
  API). The delivery log is visible and deliveries can be replayed. Until v1352 ships, a minimal sender uses the same
  tick pattern.
- **D8 SCIM scope (owner, 2026-11-22): users and groups → roles; deactivate on leave.** SCIM 2.0 `/Users` (create,
  update, PATCH `active=false`, delete) and `/Groups`. IdP groups map to Nidus roles (and optionally project teams)
  on a mapping page. Deactivate / delete = membership suspended, sessions revoked, records kept with the person shown
  as inactive; data is never hard-deleted. Users created by SCIM skip the invitation email (or receive a welcome
  email — organisation’s choice). One SCIM token per organisation, rotatable.
- **D9 Matching and seats (owner, 2026-11-22): match by email, respect seats, the IdP wins.** An incoming user who
  matches an existing member by email is linked, not duplicated. When the plan’s seat limit is reached, SCIM returns
  a clear error and the organisation admin is alerted (no silent overage). While SCIM is on, name, email, active
  status and group-based roles are managed by the IdP and read-only in Nidus; manual invitations can be blocked
  (organisation setting). Turning SCIM off returns control to Nidus.
- **D10 SSO (owner, 2026-11-22): per-organisation SSO as a slice.** Per-organisation SAML 2.0 / OIDC through the auth
  provider’s SSO support, on a verified email domain, with an “SSO required” option (password login off for that
  domain; a break-glass account owner is kept). The login page routes by email domain. Replaces the v51 scaffolding.
- **D11 Systems and management (owner, 2026-11-22): Platform + Planner; organisation admins manage; Admin
  oversees.** API, webhooks, SCIM and SSO for Platform and Planner-edition accounts (same `public` schema). Simulator
  is excluded (learning sandbox — a recorded rule 34.1 exception). Organisation admins (Account Owner / PMO Admin)
  manage keys, webhooks, SCIM and SSO in Organisation Settings › Integrations & Security. The Admin app enables the
  features per plan, sets limits, shows usage and failures, and can revoke a key or token in an emergency through
  audited admin RPCs (a new narrow exception under rule 34.5).
- **D12 Delivery order (owner, 2026-11-22): five slices.** (1) Foundations: gateway, service accounts, hashed keys
  and scopes, rate limits, audit log, Integrations & Security page, Admin plan switch. (2) Read API for all D4
  resources, OpenAPI documentation and developer page. (3) Write API (idempotency, ETag) and webhooks (outbox, signed
  delivery, log). (4) SCIM users and groups, mappings, seats, IdP lock. (5) Per-organisation SSO (SAML / OIDC, domain
  verification, SSO required). Each slice tested and committed before the next.

Standing rules that apply throughout (not re-decided): RLS without bypass (42) — the gateway never uses a key that
skips RLS for customer data; routed pages (65); Audit tab (63.1); field help (76); success modal (16); list sort, row
numbers, exports (38–44); theme-aware (28.1); menus via catalogue + placement (75, 70); examples per rule 77.

## e) Testing decisions

- **Security (highest priority):** a key never sees another organisation’s data; effective access = role / RLS ∩
  scopes (D3) — tested per resource with keys of different roles and scopes; revoked / expired keys refused; keys
  and tokens stored only as hashes; timing-safe comparison; SCIM token cannot call the API and vice versa; webhook
  signatures verify; SSO-required domains refuse password login except the break-glass owner.
- **Contract tests:** each `/v1` endpoint against its OpenAPI schema (shape, pagination, filters, errors as
  problem+json, ETag / If-Match, Idempotency-Key replay) — D5.
- **SCIM conformance:** create / get / filter (`userName eq`) / replace / PATCH (active false) / delete for Users;
  Groups membership; email matching and seat-limit errors (D8, D9) — run against the SCIM spec examples and a
  common IdP’s test suite.
- **Webhooks:** outbox written in the same transaction; retry with back-off; endpoint disabled after repeated failure;
  replay (D7).
- **Rate limits:** 429 + Retry-After at the plan limit; SCIM allowance separate (D6).
- **Database (rolled-back SQL scripts):** service-account RLS, hashed storage, audit rows for every call.
- **Done:** each slice builds, tests pass with no new failures, owner runs SQL, and a manual check with a real HTTP
  client (and, for slice 4–5, a test IdP tenant) passes.

## f) Out of scope

- OAuth 2.0 authorisation-code flow / third-party app marketplace (D3 — later).
- GraphQL and bulk export endpoints beyond paginated lists (D2).
- Simulator API (D11).
- Modules outside the D4 list until requested.
- SCIM creating projects or teams from groups beyond the mapping (D8).
- Hard deletion of user data via SCIM (D8).
- Live accounting / ERP connectors (separate integrations work).

## g) Further notes

- Examples follow rule 77 (`.example` domains, role titles).
- Portability (v1352 D-decisions): avoid features that lock the API to one database vendor where practical.
