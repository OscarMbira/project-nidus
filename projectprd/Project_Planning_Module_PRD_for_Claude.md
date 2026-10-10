# Product Requirements Document (PRD)
## Standalone and Embedded Project Planning Module

**Product context:** A PMIS SaaS suite currently contains three systems:

1. **Platform** — the full Project Management Information System (PMIS).
2. **Simulator** — PMIS simulations for training and practice.
3. **Admin** — system administration, configuration, support, and tenant operations.

This PRD asks for a comprehensive implementation plan for a fourth commercial experience: a **Project Planning Module** that can be sold and used independently, while also functioning as a deeply integrated module inside the existing Platform.

---

## 1. Purpose of this request

Design a pragmatic product, architecture, data, security, UX, delivery, and migration plan for a Project Planning Module comparable in everyday usefulness to a modern lightweight project planning tool (for example, the planning experience users expect from Microsoft Project), but designed as part of the existing PMIS SaaS suite.

The solution must support two modes without creating two divergent products:

| Mode | Customer experience |
|---|---|
| **Standalone Planning** | A customer subscribes only to Project Planning. They use its own public landing page, onboarding, workspace, navigation, billing entitlement, and app URL. |
| **Embedded Planning** | A full PMIS customer opens the same planning capability from within Platform. Planning must share project data, security, people, documents, workflows, reporting, and administration with Platform where applicable. |

The existing codebase has partially progressed an embedded planning module. Preserve useful work where feasible, but first assess it rather than assuming it is ready to become a standalone product.

---

## 2. Business problem and opportunity

Some prospective customers need robust project scheduling and planning, but do not yet need — or cannot justify purchasing — the full PMIS. A standalone Planning offering creates a lower-friction entry product and a clear upgrade path into the full Platform.

The product must avoid the common failure mode of building a separate application that later duplicates projects, users, reference data, permissions, and planning logic. Shared modules and database tables are a strategic strength of this suite and must remain so.

### Primary goals

- Sell Project Planning as a focused SaaS product with its own landing page and product journey.
- Let users create, schedule, track, collaborate on, import, export, and report on project plans independently.
- Let the same plan be opened inside Platform with no copy, synchronization delay, or conflicting version of truth.
- Reuse common code, services, tables, identity, design system, audit trail, notifications, documents, and administration wherever sensible.
- Enable a smooth commercial and data-preserving upgrade from Planning-only to the full PMIS.
- Keep the module deployable, supportable, observable, secure, and scalable.

### Non-goals for the first release (unless an assessment shows they are already mature)

- Rebuilding every full-PMIS capability in Planning.
- Creating separate customer/tenant, user, project, task, or resource databases for standalone customers.
- Maintaining separate feature implementations for standalone versus embedded experiences.
- A big-bang rewrite of the current PMIS or planning work.

---

## 3. Product positioning and customer segments

Define a clear product boundary and recommend packaging/tiering. At a minimum, consider:

- Small teams that need schedules, tasks, milestones, dependencies, and Gantt views.
- Project managers working before their organization is ready for a full PMIS.
- Training/simulation users who should practise using realistic planning capabilities, with safely isolated simulation data.
- Existing Platform tenants that require embedded planning as part of the full suite.
- Enterprise customers requiring governance, roles, audit, SSO, data isolation, and controlled migration to full PMIS.

Recommend a concise value proposition and the distinction between **Planning Core**, optional planning add-ons, and full Platform-only capabilities.

---

## 4. Product principles and mandatory constraints

1. **One capability, two entry points.** Standalone and embedded modes must invoke the same domain capabilities and shared components; only the shell, navigation, entitlement, and permitted scope should differ.
2. **Single source of truth.** A plan, project, task, dependency, calendar, resource, document link, and audit event must have one authoritative record.
3. **Tenant-safe by design.** Every query, API, job, attachment, and export must enforce tenant isolation and authorization.
4. **Entitlements, not forks.** Product access must be determined by subscription/feature entitlement and policy, not by branching the codebase into separate customer editions.
5. **Progressive expansion.** A customer can begin with Planning and later activate the full Platform without data export/import or account recreation.
6. **Composition over duplication.** Shared UI, APIs, services, packages, tables, and rules should be reused deliberately. Independent deployment does not require duplicated source code or duplicated business data.
7. **Explicit module ownership.** Identify which system owns each domain and avoid circular dependencies.
8. **Backward-compatible evolution.** Treat the partially developed embedded planning module as a migration source; preserve live functionality and data while improving the architecture incrementally.

---

## 5. Key user roles

Define detailed permissions and journeys for at least these roles:

- Planning account owner / tenant administrator
- Portfolio or programme manager
- Project manager / planner
- Team member / task assignee
- Read-only stakeholder / client viewer
- PMIS Platform administrator
- Internal SaaS support administrator
- Simulator learner and simulation facilitator

Use a role-and-policy model that can support tenant-defined roles later. Explain precisely how the Admin system provisions, administers, and audits Planning-only tenants without exposing Platform-only data or functionality.

---

## 6. Functional scope

Produce a prioritised release scope: **MVP**, **Release 2**, and **future roadmap**. State assumptions and dependencies. Include acceptance criteria for the MVP.

### 6.1 Planning workspace

At minimum, assess and specify:

- Create project / plan from blank, template, copy, or import.
- Work breakdown structure (summary tasks, tasks, milestones).
- Task attributes: IDs, names, descriptions, owners, start/finish dates, duration, effort, status, priority, tags, custom fields, notes, attachments/links.
- Task dependency types and constraints; critical path and schedule recalculation rules.
- Calendars, working time, holidays, and time zones.
- Baselines, plan versions, variance, progress, and change history.
- Resource planning: people, roles, capacity/availability, assignments, effort, allocations, cost/rate only if recommended for MVP.
- Views: grid/list, Gantt, timeline, board, calendar, resource/workload, and executive summary where justified.
- Filters, sorts, grouping, saved views, search, bulk updates, keyboard productivity, undo/redo where feasible.
- Collaboration: comments, @mentions, notifications, approvals or change requests if in scope.
- Templates, project import/export (including a deliberate recommendation on Microsoft Project compatibility), print/PDF/CSV/XLSX exports.
- Dashboards and reporting appropriate to Planning-only users.

For each item, identify whether it should be shared with Platform, Planning-specific, or deferred.

### 6.2 Embedded Platform integration

Define how an embedded plan connects to Platform capabilities including:

- Project initiation/charter and project master data.
- Project team, organizational structure, roles, and resource directory.
- Risks, issues, changes, actions, decisions, benefits, documents, approvals, budgets, timesheets, procurement, and portfolio reporting where those Platform modules exist.
- Cross-module deep links and contextual navigation.
- Shared search, notifications, activity/audit trail, files, reporting, and custom fields.
- Rules for what happens when a Platform project is created before, after, or from a Planning-only project.

Distinguish direct shared-data relationships from integration events/API contracts. Recommend a user experience that feels native in Platform without embedding the Planning application in an insecure iframe or duplicating its UI.

### 6.3 Standalone Planning experience

Specify:

- Separate marketing landing page, pricing/trial CTA, product login, workspace selection, onboarding, and help journey.
- Recommended URL/domain/subdomain scheme.
- Standalone navigation and a focused home/dashboard.
- Tenant creation, invitations, trial conversion, plan limits, billing/entitlement hooks, and upgrade CTA to full PMIS.
- How users discover full-PMIS capabilities without being shown inaccessible screens or creating confusion.
- How a tenant that purchases Platform sees the same plan in the Platform context immediately.

### 6.4 Simulator relationship

Propose whether Simulator should reuse the same planning UI/domain components with isolated scenario data, seeded templates, resettable workspaces, and restricted integrations. Do not mix learning/simulation records with production tenant records unless there is a compelling, safe design.

---

## 7. Required target architecture

Create an architecture that is technology-agnostic where current technology is unknown, then provide concrete patterns compatible with a modern SaaS stack (the existing environment is understood to include React, Tailwind, and Supabase; validate this from the codebase before recommending changes).

### 7.1 Recommended application structure

Evaluate and recommend a modular monolith, microservices, or hybrid approach. The preferred default is a **modular monolith with well-defined domain boundaries**, unless codebase evidence or scale demands otherwise.

Describe:

- App shells: Platform, standalone Planning, Simulator, and Admin.
- Shared workspace/packages: design system, planning domain, planning UI, API client, authentication, authorization, tenant context, feature flags/entitlements, files, audit, notifications, analytics, i18n, and shared utilities.
- A planning domain layer that is independent of which app shell invokes it.
- API/BFF routing and versioning strategy.
- Module boundaries and dependency direction.
- Feature flags/configuration per tenant and per environment.
- How to deploy independently when needed while retaining a shared codebase.

Include a component/domain dependency diagram and a repository/package layout proposal.

### 7.2 Data architecture and schema strategy

Propose the logical data model and a migration approach. It must include, at minimum:

- tenants/organizations, subscriptions/entitlements, users/memberships, roles/policies;
- project master and plan/workspace relationship;
- WBS/tasks, dependencies, milestones, calendars, resources, assignments, baselines, versions, activity/audit, comments, notifications, attachments, custom fields, templates, imports/exports;
- unique identifiers, tenancy keys, indexes, soft deletion/retention, timestamps, concurrency/version columns, data lineage, and RLS/authorization approach;
- a precise ownership matrix identifying which tables are shared versus planning-owned;
- how Planning-only projects become full Platform projects without copying the plan;
- strategy to isolate Simulator scenarios;
- database migration sequencing, backfill, rollback, and compatibility considerations for the partially implemented planning data model.

Do not recommend shared tables casually: explain ownership, write boundaries, and how to prevent accidental tight coupling. Avoid a broad collection of publicly accessible tables. Treat row-level security and least privilege as mandatory.

### 7.3 Scheduling engine and consistency rules

Specify a scheduling calculation approach for task dependencies, calendars, constraints, critical path, recalculation triggers, baselines, and concurrent edits. State whether calculation happens client-side, server-side, or both; explain conflict resolution, optimistic concurrency, locking policy, recalculation jobs, and auditability.

### 7.4 Identity, authorization, and tenancy

Define:

- SSO/authentication and single-account experience across all four systems;
- tenant selection/context propagation;
- RBAC/ABAC/policy enforcement and API-level authorization;
- Planning-only versus Platform entitlement enforcement;
- internal support access, impersonation/break-glass audit controls;
- RLS policy test strategy and tenant-bound background jobs;
- data export, privacy, retention, and deletion concerns.

---

## 8. Non-functional requirements

Set measurable proposed targets for:

- Performance (large plans, Gantt rendering, bulk actions, imports, calculation latency).
- Scalability and limits (tasks per plan, concurrent editors, tenants, files).
- Availability, recovery, backup, RPO/RTO, and deployment rollback.
- Security, privacy, data residency, auditability, OWASP controls, rate limiting, secrets, dependency security, and observability.
- Accessibility (WCAG target), responsiveness, browser support, and localisation/time-zone handling.
- Monitoring: product metrics, traces/logs, error alerts, security/audit alerts, tenant-level diagnostics.

---

## 9. User journeys and acceptance criteria

Document end-to-end user journeys for:

1. A new customer discovers the Planning landing page, starts a trial, creates a tenant, invites a team, creates a plan, and publishes an initial schedule.
2. A Planning customer imports an existing schedule, assigns people, manages changes, and exports a stakeholder view.
3. A Planning customer upgrades to full Platform and continues with the exact same projects/plans, users, roles, documents, and history.
4. A full Platform customer opens Planning in context and uses linked PMIS objects without duplicate records.
5. An internal Admin administrator manages a Planning-only tenant safely.
6. A Simulator facilitator provisions a resettable simulation that uses planning capabilities without production data leakage.

For MVP acceptance criteria, use clear Given/When/Then statements, including tenant isolation, entitlement checks, upgrade continuity, schedule recalculation, and role permissions.

---

## 10. Implementation plan requested from Claude

Produce a phased, implementation-ready plan with these outputs:

1. **Discovery and codebase assessment checklist** — files, existing modules, schema, auth/RLS policies, APIs, routes, deployments, and tests to inspect before design decisions.
2. **Recommended target architecture** — include diagrams and reasoning; clearly list decisions, alternatives rejected, and assumptions.
3. **Domain ownership and shared-module matrix** — UI packages, services, APIs, database tables, events, and ownership.
4. **Detailed MVP scope** — epics, user stories, acceptance criteria, prioritisation, and excluded work.
5. **Technical backlog** — sequenced stories/tasks with dependencies, estimates/complexity bands, suggested folder/package changes, APIs, migrations, and test requirements.
6. **Data migration and compatibility plan** for the partial embedded planning implementation, including validation, backup, rollout, rollback, and data reconciliation.
7. **Security and tenancy plan** — including Supabase/RLS-specific recommendations if Supabase is confirmed.
8. **Landing page and go-to-market product requirements** — IA, sections, conversion paths, pricing/entitlement touchpoints, and links into the product.
9. **UX information architecture** for standalone and embedded contexts, including navigation maps and upgrade flows.
10. **Release plan** — feature flags, environments, pilot tenants, QA/UAT, operational readiness, telemetry, support runbook, and go/no-go criteria.
11. **Risk register** — architecture, commercial, data, schedule engine, security, adoption, and operational risks with mitigations.
12. **Decision log / open questions** — questions that must be answered by the product owner before implementation, with recommended defaults.

Use tables where they improve clarity. Be specific enough for engineering execution, but explicitly label uncertain parts as assumptions rather than inventing current codebase facts.

---

## 11. Success measures

Recommend quantitative targets and instrumentation for:

- trial-to-active-workspace conversion;
- time to first usable plan;
- weekly active planners and team collaborators;
- plans created/imported and schedules published;
- planning-to-full-PMIS upgrade conversion;
- upgrade data continuity incidents (target: zero);
- scheduling/import error rate, performance, support tickets, retention, and customer satisfaction.

---

## 12. Initial assumptions to validate

- The suite is multi-tenant SaaS and currently has separate landing pages for Platform, Simulator, and Admin.
- Planning already exists partially as an embedded Platform module.
- The desired technology direction includes React, Tailwind, and Supabase, but the current repository and schema must be inspected before recommendations are final.
- Planning should be commercially sellable as a product but technically use shared identity, tenant, policy, audit, and foundational PMIS services.
- A separate landing page and app shell are desired; separate copies of the planning domain and its data are not.

---

## 13. Working instructions for Claude

Begin by restating your understanding and identifying any assumptions that require confirmation. Then inspect the codebase before proposing invasive restructuring. Where information is missing, provide the best recommended default and place the question in the decision log.

Do not start by generating a generic product plan. Ground the plan in the actual repository structure, current data model, existing embedded planning flows, authentication/authorization implementation, and deployment environment. Preserve existing working capabilities and propose incremental, testable changes.

Your final output should be a comprehensive plan, not production code, unless asked in a subsequent step to implement an agreed phase.
