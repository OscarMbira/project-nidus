# Product Requirements Document (PRD)
## Demo, Trial, and Showcase Access for the PMIS SaaS Suite

**First release:** locked in [v1261_shared_platform_demo_PRD.md](v1261_shared_platform_demo_PRD.md) (2026-10-12). That file wins for the first demo. This briefing remains the wider background for later trial, private proof-of-value, and Planning demo work.

**Audience:** Claude or Cursor, to assess the current codebase and produce an implementation-ready plan before code changes begin.

**Product context:** The PMIS SaaS suite currently contains:

1. **Platform** — the full PMIS.
2. **Simulator** — scenario-based PMIS learning, practice, and training.
3. **Admin** — system administration and internal operations.
4. **Planning** — a planning capability that is being designed as both an embedded Platform module and a standalone commercial product.

The suite is a multi-tenant SaaS application. The expected technical direction includes React/TypeScript, Tailwind, Supabase (PostgreSQL, Auth, RLS, Storage, and Edge Functions), but the repository must be inspected before treating this as authoritative.

---

## 1. Purpose

Design the product and technical implementation plan for controlled prospect demonstration and trial access. Prospective clients must be able to experience the PMIS and/or standalone Planning product sufficiently to make a buying decision, without creating another duplicate application or weakening tenant/data security.

The plan must enable:

- polished sales-led demonstrations;
- invite-only hands-on evaluations;
- an optional future public Planning sandbox;
- conversion from trial to paid customer with no project/data migration;
- reuse of shared Platform, Planning, Simulator, Admin, identity, entitlement, audit, and data-layer capabilities.

This PRD requests a comprehensive **implementation plan**, not immediate code changes.

---

## 2. Product decision and core principles

### Product decision

Provide Demo and Trial capabilities, but do **not** create a separately maintained “Demo PMIS” codebase.

Demo and Trial are commercial/operational modes within the shared multi-tenant suite. They may run in a dedicated non-production demo environment, but they use the same domain modules and governed tenancy model as the product.

### Mandatory principles

1. **One codebase; no product fork.** Platform, Planning, Simulator, Admin, Demo, and Trial must reuse the same shared domain capabilities where appropriate.
2. **Demo is not Simulator.** Simulator supports learning and practice; Demo supports product evaluation and sales. They may reuse reset/seed infrastructure but have different user journeys, content, permissions, and success measures.
3. **Trial is not shared demo.** A trial is a private, prospect-specific tenant/workspace. A shared demo is a curated showcase used by many prospects with strong access restrictions and frequent reset.
4. **Single source of truth.** A converting trial customer keeps the same organization, users, projects, plans, history, and identifiers; only commercial entitlement and operational status change.
5. **No customer data in demos.** Shared demos use only fictional, approved, non-sensitive sample data. Never copy production customer data into a demo environment.
6. **Tenant isolation is non-negotiable.** Tenant type is not an authorization bypass. RLS and backend authorization must apply to demo/trial users as rigorously as to paying customers.
7. **Entitlements, not hard-coded editions.** Available modules/actions must be calculated from subscription/entitlement, tenant type, user role, authority/scope, and feature flags.
8. **Safe and repeatable operations.** Seed, reset, expiry, conversion, deletion, monitoring, and support actions must be auditable and idempotent.

---

## 3. Target operating model

Specify the following tenant/workspace modes, assessing existing nomenclature and adapting it if needed:

| Mode | Audience | Data/usage model | Intended outcome |
|---|---|---|---|
| `customer` | Paying customer | Private production tenant | Product use |
| `trial` | Named prospect and invited evaluators | Private, time-limited tenant; may contain customer-entered data | Convert to paid customer without migration |
| `demo_shared` | Sales demos and invited prospects | Curated fictional sample organization; resettable; restricted | Demonstrate product value |
| `demo_private` | High-value prospect / proof-of-value | Prospect-specific fictional or approved test data; time-limited | Deep evaluation or POC |
| `simulator` | Learners/facilitators | Isolated scenario data; resettable | Training and practice |
| `internal` | Product/support users | Controlled internal use | Support, QA, seed management |

Do not assume these must all be physical database tenants. Recommend the safest and simplest logical and environmental model after inspecting current tenancy, auth, RLS, and deployment architecture.

---

## 4. Personas and user journeys

Define permissions, routes, and detailed journeys for:

- Sales/demo host;
- Prospect decision-maker attending a guided demonstration;
- Prospect evaluator invited to a private trial;
- Prospect trial administrator who invites colleagues;
- Planning-only prospect;
- Platform/full-PMIS prospect;
- Internal tenant/support administrator;
- Simulation facilitator and learner.

The implementation plan must cover these end-to-end journeys:

### 4.1 Guided sales demo

1. Sales user selects a curated demo scenario suited to the prospect industry/use case.
2. Prospect receives a secure, time-limited invite or joins a controlled session.
3. The host shows tailored dashboards, a project workspace, Planning/Gantt, risks, issues, reporting, and any relevant governance workflows.
4. The prospect cannot see any other audience’s activity, secrets, administration, or non-approved modules.
5. Sales captures meaningful engagement signals and can trigger a trial/next step.

### 4.2 Hands-on trial

1. A qualified prospect enters a trial request or is provisioned by Sales/Admin.
2. A private organization/tenant is created with trial entitlements, an expiry date, selected module pack(s), and a guided onboarding journey.
3. The prospect invites colleagues, creates/imports projects and plans, and explores allowed modules.
4. The system sends expiry/usage prompts and records lifecycle state without blocking normal legitimate work prematurely.
5. On conversion, billing/subscription changes and the tenant continues unchanged.
6. If the trial expires without conversion, access is suspended according to retention policy; later reactivation and secure deletion are supported.

### 4.3 Planning-only product evaluation

1. Prospect lands on the standalone Planning landing page.
2. They receive either a restricted shared Planning demo or a private Planning trial.
3. They create/import a plan, build WBS/tasks/dependencies, use Gantt and views, invite collaborators, and export only if entitled.
4. They upgrade either to paid Planning or to full Platform with no data copy.

### 4.4 Simulator

Simulator scenarios remain distinguishable from commercial demo/trial tenants. Learners can safely reset or replay scenarios; this must not alter showcase data or customer/trial data.

---

## 5. Functional requirements

### 5.1 Tenant and commercial lifecycle

Design a lifecycle state machine for provisioning, activation, expiry, suspension, conversion, archive, retention, and deletion. Include:

- tenant type and lifecycle status;
- subscription plan, module entitlements, seats/limits, trial start/end, and extension rules;
- tenant owner, sales owner, support owner, prospect account/contact information where appropriate;
- trial request, manual approval, self-service provisioning, or both;
- conversion to paid Planning or full Platform;
- downgrade/upgrade rules;
- retention, export, reactivation, and deletion policy;
- comprehensive audit events.

Ensure the model works for freelancers, PMOs, corporates, portfolios/programmes/projects, Planning-only users, and full-PMIS users.

### 5.2 Demo scenario catalogue and sample data

Provide requirements for a curated demo catalogue:

- multiple reusable fictional organizations/industries where justified;
- realistic portfolios, programmes, projects, plans, resources, risks, issues, changes, documents, dashboards, reports, and approvals;
- scenario metadata: industry, use case, enabled modules, recommended audience, persona/role, last reset, owner, and version;
- clear labelling that data is fictional;
- content versioning and controlled publishing;
- safe, repeatable seed generation and refresh;
- scenario-specific entry points/deep links for live demos;
- demo mode prompts/checklists for sales hosts.

Recommend a minimal initial scenario that best demonstrates the integrated PMIS and Planning value without excessive content creation.

### 5.3 Access control and restrictions

Define policies for each tenant type and role. At minimum address:

- authentication, invitation, MFA/SSO policy, trial account verification, passwordless/magic-link options where appropriate;
- demo session expiry and maximum session duration;
- read-only versus guided-edit/demo-edit capabilities;
- whether demo users can create/delete records, upload files, export data, invite users, configure integrations, access billing, or use AI features;
- granular Platform vs Planning entitlements;
- navigation/menu resolution that hides unavailable capabilities rather than merely failing after click;
- internal support access, support impersonation/break-glass controls, and mandatory audit logs;
- prevention of cross-tenant, cross-scenario, and demo-to-production data access.

### 5.4 Reset, isolation, and data operations

Define:

- a dedicated non-production Demo environment versus production-hosted demo tenants — assess and recommend the best model;
- a secure reset/snapshot/seed process for shared demos;
- reset schedule and on-demand reset permissions;
- per-user or per-session disposable sandboxes if public interaction is later introduced;
- seed-data test coverage, deterministic IDs where useful, idempotency, and failure recovery;
- use of synthetic data only;
- storage/file cleanup, comments/activity cleanup, background-job cleanup, search-index/cache clearing, and monitoring;
- hard prohibition on production customer data entering Demo;
- separation between development previews, staging/UAT, Demo, Simulator, and Production.

### 5.5 Trial onboarding, product guidance, and conversion

Specify:

- tailored first-run experience by product: full Platform versus standalone Planning;
- checklists, guided sample projects/templates, activation prompts, help centre links, and sales contact path;
- upgrade CTA placement and entitlement-aware messaging;
- conversion workflow and acceptance criteria proving no duplicate/missing tenant/project/plan/user/history/document records;
- trial expiry reminders and sensible grace/extension workflow;
- a sales/support console view for tenant lifecycle and activity, respecting least privilege;
- customer-facing communication templates/events, but do not send messages automatically until approvals/integrations exist.

### 5.6 Analytics and reporting

Define product, sales, and operational instrumentation including:

- demo invitations, logins, sessions, feature engagement, scenario completion, trial activation, team invitations, project/plan creation, imports, report views, conversion, expiry, extensions, and support incidents;
- tenant-aware event model with privacy controls;
- internal dashboards for trial health and conversion funnel;
- no storage of sensitive project content in analytics events;
- retention and consent considerations.

---

## 6. Architecture and data requirements

### 6.1 Shared architecture

The preferred direction is a shared modular architecture rather than duplicate applications. Inspect the existing repository and recommend:

- which app shells/routes exist or should exist: Platform, standalone Planning, Simulator, Admin, Demo landing/onboarding;
- shared packages/services for identity, tenancy, authorization, subscription/entitlements, UI/design system, navigation, audit, notifications, analytics, files, Planning domain, seed fixtures, and configuration;
- domain ownership and dependency direction;
- feature-flag approach;
- API/BFF/Edge Function boundaries and validation;
- repository layout changes, if needed, that avoid premature microservices or duplication.

### 6.2 Proposed logical data model

Review and improve the current schema. Produce a table-ownership matrix and recommended migration path for the following conceptual entities:

- organizations/tenants/workspaces;
- memberships, identities, roles, scopes, authority, invitations;
- tenant type, lifecycle, subscriptions, module entitlements, trial terms, limits, extension/conversion history;
- demo scenarios, scenario versions, seed configurations, reset jobs/runs, scenario membership;
- projects, plans, WBS/tasks, resources, risks, issues, documents, reports, activity/audit;
- analytics events, lifecycle communications, sales/support ownership;
- retention/deletion requests and execution evidence.

Address tenancy key consistency, indexes, soft deletion, immutable audit data, timestamps, UUIDs, optimistic concurrency, data ownership, and migration/backfill/rollback strategy.

### 6.3 Supabase/security requirements

If Supabase is confirmed, propose concrete but safe RLS/authorization patterns. Must include:

- every tenant-owned row protected by trusted tenant membership/policy evaluation;
- RLS test suite for `customer`, `trial`, `demo_shared`, `demo_private`, `simulator`, and internal support roles;
- no service-role keys in browser clients;
- server-side secrets and restricted Edge Function access;
- storage object access isolation;
- authenticated/background reset jobs with explicit tenant/scenario scope;
- authorization checks before cache/search/analytics retrieval;
- adversarial tests for cross-tenant reads/writes, stale tenant context, ID guessing, export bypasses, and demo reset mistakes;
- change-control rules for schema/RLS migrations.

### 6.4 Environments and deployment

Recommend environment separation, including local development, ephemeral preview, integration/staging, demo, simulator, and production. Define:

- which environments require their own Supabase project/branch, secrets, domains, and storage;
- data allowed/prohibited in each;
- deployment promotion path;
- CI quality gates, migration checks, RLS tests, seed/reset tests, end-to-end smoke tests, and manual approval gates;
- rollback and incident response;
- safe cloud-agent access for Claude/Cursor: agents may use development/staging/demo credentials only and must work through branches/pull requests.

---

## 7. Non-functional requirements

Propose measurable targets and acceptance tests for:

- tenant isolation, privacy, auditability, security, rate limiting, abuse prevention, and least privilege;
- availability and recovery for demo/trial workflows;
- reset/provisioning performance and reliability;
- capacity/limits for shared demo concurrency, trial tenants, files, sessions, and seed jobs;
- accessibility, responsive UX, localisation/time-zone behaviour;
- observability: structured logs, traces, metrics, alerts, reset failures, suspicious access, expiry job failures, and conversion errors;
- cost controls for demo environments, feature usage, storage, AI features, and abandoned trials.

---

## 8. MVP scope and acceptance criteria

Recommend and justify a phased delivery plan: **MVP**, **Release 2**, and **future**.

The likely MVP should be deliberately focused:

1. One protected shared Demo tenant with high-quality fictional sample data.
2. One private, invite-only trial type for selected prospects.
3. Trial expiry, extension, conversion, and audit lifecycle.
4. Platform and Planning entitlement-aware navigation.
5. A safe reset/seed mechanism for the shared demo.
6. Strict RLS/authorization regression tests and operational monitoring.

Do not include self-service public signup, public editable sandboxes, extensive scenario catalogue, or complex billing integration in MVP unless repository maturity supports it.

Write MVP acceptance criteria in Given/When/Then form, including at least:

- demo user cannot access another tenant or internal Admin functions;
- a trial user can use only the modules/resources enabled for that tenant;
- a trial converted to customer preserves IDs, records, files, history, memberships, and permissions appropriately;
- demo reset restores the approved baseline and leaves no prior prospect edits/files;
- expired trial access is suspended without unauthorized data loss;
- Planning-only trial cannot accidentally use full-Platform-only features;
- RLS/API tests prove attempted cross-tenant reads/writes fail;
- every privileged support/reset/conversion operation is audited.

---

## 9. Deliverables requested from Claude/Cursor

Before recommending code changes, inspect the existing codebase, database migrations/schema, RLS policies, routes, packages, auth/session context, admin flows, entitlement logic, deployment configuration, seed data, and test suite.

Then produce:

1. **Current-state assessment** — what exists, reusable assets, gaps, risks, and assumptions.
2. **Recommended target architecture** — diagrams, app shells, shared modules, data/tenant boundaries, and alternatives considered.
3. **Demo/Trial/Simulator distinction matrix** — personas, data, permissions, lifecycle, environment, reset rules, metrics, and conversion objective.
4. **Tenant lifecycle state model** — states, transitions, actors, triggers, policy rules, and audit events.
5. **Domain/table ownership matrix** — shared tables, owned tables, RLS policies, APIs/functions, and migration implications.
6. **MVP product backlog** — epics, user stories, acceptance criteria, dependencies, complexity estimates, and prioritisation.
7. **Detailed implementation sequence** — repository/folder changes, migrations, data seeds, UI routes, APIs, background jobs, tests, CI/CD changes, and rollback points.
8. **Security threat model and test strategy** — tenant isolation, abuse, secrets, demo data leakage, privileged support access, and privacy.
9. **Environment/deployment plan** — local → preview → staging → demo → production with credentials and approval boundaries.
10. **Operational playbook** — create/reset demo, provision/extend/convert/suspend/delete trial, monitor failures, and handle an incident.
11. **Risk register** — technical, data, sales, cost, operational, and adoption risks with mitigations.
12. **Decision log/open questions** — questions requiring product-owner decisions, with recommended defaults.

Use tables where useful. Label every uncertain point as an assumption; do not invent repository facts. Prefer incremental, backward-compatible delivery over a rewrite.

---

## 10. Working instructions

Do not implement immediately. First return the requested plan and identify the smallest safe MVP.

Preserve the suite’s foundational strategy:

- shared modules and database tables where ownership and security are explicit;
- no duplicated Planning logic for standalone, embedded, demo, or trial contexts;
- no production customer data in a demo environment;
- human review and pull-request approval for schema, RLS, security, entitlement, and lifecycle changes;
- code changes must be covered by relevant unit, integration, end-to-end, and authorization/tenant-isolation tests.
