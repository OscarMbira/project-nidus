# v931 — Local Register Engine Guide

## What this is

A generic, no-code register system. Instead of every new "register" (a list of records with
custom fields and a status workflow — think Risk Register, Issue Register, but for something
new) needing its own hand-built Postgres table, RLS policy, and React page, the Local Register
Engine provides one shared schema and one set of generic pages that any register — whether
shipped by the system or created by an organisation member — runs through identically.

Two kinds of register live side by side in the same tables:

- **System-defined registers** — the 28 industry-specific capability registers (Core Banking,
  Permits, Bill of Materials, Clinical Trials, and so on), seeded once
  (`SQL/v933_local_registers_system_seed.sql`) and tied to whichever industry pack(s) they
  belong to. Any organisation with the matching industry enabled can use them; nobody can rename,
  refield, or delete their structure — only use them.
- **Local (member-created) registers** — anything an organisation member defines for their own
  PMO, Portfolio, Programme, or Project. Fully custom fields and status workflow, scoped to
  wherever it was created.

## The scope model

Every register has a `scope_level`: `pmo`, `portfolio`, `programme`, or `project`.

- `pmo` — organisation-wide. Only PMO-admin-tier roles (`pmo_admin`/`org_admin`/`system_admin`/
  `super_admin`) can create these.
- `portfolio` / `programme` — tied to one specific portfolio/programme. Only that
  portfolio's/programme's manager (`portfolios.portfolio_manager_user_id` /
  `programmes.programme_manager_user_id`) can create one there.
- `project` — tied to one specific project. **Any** active project member can create one —
  Team Manager/Lead and Team Member included, not just Project Manager (a deliberate choice,
  not the default "admins only" pattern most other admin-configurable features use).

System-defined registers are always `project`-scoped by definition, but since they carry no
`account_id` or fixed entity of their own, each individual **record** of a system-defined
register carries its own `record_portfolio_id`/`record_programme_id`/`record_project_id` —
chosen by whoever creates that specific record, not baked into the register.

## Where things live

| Concern | Table |
|---|---|
| Register definitions (name, fields config, status workflow, scope) | `local_registers` |
| Custom field definitions | `local_register_fields` |
| Which industry pack(s) a system-defined register belongs to | `local_register_industry_packs` |
| Actual data rows | `local_register_records` |

| Page | Route | Purpose |
|---|---|---|
| List | `/platform/local-registers/:registerId` | Records for one register |
| Create | `/platform/local-registers/:registerId/create` | New record |
| Detail | `/platform/local-registers/:registerId/:recordId` | View one record + Audit tab |
| Edit | `/platform/local-registers/:registerId/:recordId/edit` | Edit one record |
| Builder | `/platform/local-registers/new` | Define a new local register (no-code) |
| Index | `/platform/local-registers` | Browse registers available at a scope |
| Admin oversight | `/platform/pmo-admin/local-registers` | Every register, any scope, for PMO Admins |

The Builder, List, and Index pages read `scopeLevel`/`scopeEntityId`/`scopeLabel` as URL query
params — that's how they know which Project/Programme/Portfolio/PMO context they're operating
in when reached from elsewhere in the app (e.g. `?scopeLevel=project&scopeEntityId=<uuid>`).

## Adding a field type or extending the engine

The field types supported today: `text`, `number`, `currency`, `date`, `dropdown`, `boolean`,
`user_picker` (renders as plain text in v1 — a real person-search picker is a future
extension). Adding a new one means extending the `FieldInput` switch in
`LocalRegisterForm.jsx` and the `fieldValueToText` formatter in `LocalRegisterListPage.jsx` /
`LocalRegisterDetailPage.jsx` — both apps.

## Adding a 29th system-defined register

No code. Add rows to `local_registers` (with a fixed UUID, matching the existing pattern),
`local_register_fields`, and `local_register_industry_packs`, then a `menu_items` row wired
through `industry_pack_menu_items` the same way `SQL/v934_local_registers_menu_wiring.sql` did
for the existing 28.

## Simulator scope (v938)

Simulator now supports registers scoped to its own Portfolio/Programme/Project practice
hierarchy (`sim.practice_portfolios`/`practice_programmes`/`practice_projects`), not just
`pmo`-level. The 28 system-defined registers are **not duplicated** into Simulator — they stay
the single source of truth in `public.local_registers` and are read cross-schema. Member-created
registers for Simulator live in their own `sim.local_registers`/`sim.local_register_fields`
tables; all of their records (system-defined or member-created) land in one
`sim.local_register_records` table, disambiguated by `is_system_register`.

Access follows the same four-tier model as Platform, but resolved against the practice
hierarchy directly (`auth.uid()` against `portfolio_manager_user_id`/`programme_manager_user_id`/
`practice_projects.user_id`/an active `sim.practice_project_memberships` row) rather than
Platform's `project_memberships`/manager-assignment columns. `pmo`-scope reuses the same shared
`public.is_pmo_admin_tier()` check as Platform.

**Not carried over to Simulator**: the submit-for-authorisation/approve-reject workflow.
Simulator has no live, routed authorisation queue (`RecordLifecycleRouteElements` is imported in
`simulatorRoutes.jsx` but never actually mounted) — it's a practice sandbox, not a governed
environment. `sim.local_register_records.status` is a plain display field.

## Submit for authorisation (Platform)

For the 4 approval-gated registers (Product Configuration, Parameterisation, Bill of Materials,
Go-Live), a record's detail page shows its current status and, while `record_status = 'live'`, a
"Submit for Authorisation" button. Submitting calls the shared `recordLifecycleService`
(`submitForAuthorisation('local_register_records', recordId, ...)`), the same generic mechanism
every other governed table uses — no local-register-specific queue page was needed:
`pmo/authorisation/queue` and `pm/authorisation/queue` already list pending requests for any
`table_name`. Deciding (approve/reject) happens on those existing generic pages, not on the
register's own detail page.

## Known gaps (not yet built — see `projectplan/v931_local_register_engine_plan.md` for detail)

- **No entry-point buttons yet**: nothing in the existing Project/Programme/Portfolio/PMO (or
  Simulator practice-hierarchy) pages links to "+ New Local Register" — it's reachable by URL
  only until that's added, page by page, as an opportunistic follow-up.
- **Index page's "visible from above" resolution is simplified**: viewing a project's Local
  Registers index currently shows that project's own registers plus `pmo`-level ones — it does
  not yet walk up to also show the project's parent programme's/portfolio's registers.
- **Not manually verified against live data** — see the plan's Phase 7/Phase 9 checklists.
