# v837 — PM Dashboard: seed Governance Reference & Initiation Documents for every project

## Problem

The PM Dashboard (`/pm/dashboard`, Platform app) has three panels circled in the
screenshot:

1. **Upcoming Deadlines** — already seeded (v819: 2 milestones/project). No action needed.
2. **Governance Reference** — nav links to Risk / Quality / Communication Management
   Strategy pages.
3. **Initiation Documents** — nav links to Business Case, Project Brief, PID, Benefits
   Review Plan pages.

Panels 2 and 3 are static nav cards on the dashboard itself, but every page they link to
opens **empty** — none of the seven underlying tables have ever been seeded:

| Panel | Table | SQL that created it |
|---|---|---|
| Governance | `risk_management_strategies` | `SQL/v197_risk_management_strategy_tables.sql` |
| Governance | `quality_management_strategies` | `SQL/v180_quality_management_strategy_tables.sql` |
| Governance | `communication_management_strategies` | `SQL/v190_communication_management_strategy_tables.sql` |
| Initiation | `business_cases` | `SQL/v260_business_case_tables.sql` |
| Initiation | `project_briefs` | `SQL/v163_project_brief_tables.sql` |
| Initiation | `project_initiation_documents` | `SQL/v07_structured_tables.sql` (+ v214 enhancement) |
| Initiation | `benefits_review_plans` | `SQL/v186_benefits_review_plan_tables.sql` |

## Scope

Companion **seed** SQL only (CLAUDE.md rule 18.2) — no application/service/route code
changes. Platform (`public` schema), one row per non-deleted project, for all 7 tables
above.

**Simulator parity (rule 34.1) — verified, not assumed.** Checked both Simulator-side
dashboards directly rather than taking the Platform screenshot at face value:

1. `apps/simulator/src/pages/pm/PMDashboard.jsx` — the Simulator app's own `/pm/dashboard`
   (port 5174). Confirmed line-for-line: it renders the **same three panels**
   (`Upcoming Deadlines` / `Governance Reference` / `Initiation Documents`), imports the
   plain `supabase` client (which resolves to the `public`-schema client, not `simDb`),
   and its `CurrentProjectContext` resolves the project list from
   `project_memberships → public.projects` — the identical table Platform uses, keyed by
   the identical `project_id`. It is a literal duplicate of the Platform dashboard, not a
   sim-schema view of it.
2. `apps/simulator/src/pages/simulator/pm/SimulatorPMDashboard.jsx` — a **different**,
   genuinely sim-schema dashboard (`simDb`, `practice_risks`, `practice_issues`, role
   score/learning-path widgets). Checked for the three panel headings — **absent**. This
   is the dashboard for the separate "Practice" flow (`sim.practice_risk_management_strategies`,
   `sim.practice_business_cases`, etc., v229/v230/v232/v234/v237/v238) and has no
   Governance Reference / Initiation Documents / Upcoming Deadlines panels to seed
   against.

**Conclusion:** because dashboard #1 reads the exact same `public` tables and rows as
Platform, seeding `public.risk_management_strategies` etc. for every row in
`public.projects` (this plan's approach, unchanged) makes both the Platform **and**
Simulator `/pm/dashboard` show populated panels — one seed file, no `sim`-schema
insertions needed. Parity is satisfied by the shared schema, not by a second seed pass.
`sim.practice_*` is intentionally left alone: it feeds a different dashboard with
different panels, so seeding it wouldn't affect any panel visible in the screenshot.

## Approach

New file `SQL/v834_pm_dashboard_governance_initiation_seed_data.sql`, following the same
pattern as v819/v829:

- Loop over `projects WHERE is_deleted = FALSE`; resolve a `seed_user_id` per project
  (project manager → owner → project member → any active user; skip + log if none).
- One row per project per table.
  - `risk_management_strategies`, `quality_management_strategies`,
    `communication_management_strategies`, `project_briefs`,
    `project_initiation_documents` all have `project_id UNIQUE NOT NULL` →
    `ON CONFLICT (project_id) DO NOTHING`.
  - `business_cases`, `benefits_review_plans` have nullable, non-unique `project_id` →
    deterministic `id = uuid_generate_v5(project.id, 'v834-<tag>')` with
    `ON CONFLICT (id) DO NOTHING`, same technique as v819/v829.
  - `project_initiation_documents.business_case_id` / `.project_brief_id` are set by
    looking up the row just inserted for the same project.
- Reference numbers (`rms_reference`, `qms_reference`, `cms_reference`,
  `case_reference`, `brief_reference`) are **left unset** — each table already has a
  `BEFORE INSERT` trigger that auto-generates them (`RMS-YYYY-NNN` etc.), so no manual
  sequence math is needed or safe to hand-mint.
- Each category wrapped in its own `BEGIN … EXCEPTION`, outcome logged to a temp table,
  final `SELECT` at the end — v819/v829's visible-diagnostics pattern (the Supabase SQL
  Editor Results panel does not surface `RAISE NOTICE`).
- Text fields (purpose/objectives/scope/approach/etc.) get short, plausible PM-style
  content scoped to `project_name`, so pages read as populated demo content rather than
  blank forms.

## Todo

- [x] Confirm exact tables/columns/triggers behind both panels (research pass)
- [x] Verify Simulator parity: confirmed `apps/simulator/.../pm/PMDashboard.jsx` renders
      the same 3 panels off the same `public` tables — no separate `sim` seed required
- [x] Write `projectplan/v837_pm_dashboard_governance_initiation_seed_plan.md` (this file)
- [x] Write `SQL/v834_pm_dashboard_governance_initiation_seed_data.sql`
- [x] `risk_management_strategies` — 1 row/project
- [x] `quality_management_strategies` — 1 row/project
- [x] `communication_management_strategies` — 1 row/project
- [x] `business_cases` — 1 row/project
- [x] `project_briefs` — 1 row/project
- [x] `project_initiation_documents` — 1 row/project, linked to the business case + brief
- [x] `benefits_review_plans` — 1 row/project
- [x] Review section

## Out of scope

- Any application/service/route code changes — dashboard nav cards already work, this
  is pure data.
- `sim.practice_*` tables (separate Practice flow — see scoping decision above).
- `project_milestones` / Upcoming Deadlines — already seeded by v819.

## How to run

Paste `SQL/v834_pm_dashboard_governance_initiation_seed_data.sql` into the Supabase SQL
Editor and run it. No ordering dependency on other pending files — all 7 target tables
already exist. The final `SELECT` returns one row per project per category showing `OK`
with a row count, `SKIPPED` (no resolvable seed user), or `FAILED` with the exact
Postgres error — check for any `FAILED` rows after running.

Safe to re-run any number of times: the five UNIQUE-`project_id` tables use
`ON CONFLICT (project_id) DO NOTHING`; `business_cases` and `benefits_review_plans` use
a deterministic `uuid_generate_v5` id with `ON CONFLICT (id) DO NOTHING`.

## Review

**File added:** `SQL/v834_pm_dashboard_governance_initiation_seed_data.sql` — one pass
over every `projects WHERE is_deleted = FALSE`, resolving a seed user per project
(project manager → owner → project member → any active user, same resolution order as
v819/v829), then inserting one row per project into all 7 tables behind the two
dashboard panels:

- **Governance Reference:** `risk_management_strategies`, `quality_management_strategies`,
  `communication_management_strategies` — each `status = 'approved'`, populated
  purpose/objectives/scope/approach text scoped to the project name.
- **Initiation Documents:** `business_cases` (recommended option `do_something`, cost/NPV/
  ROI figures deterministically varied per project via `hashtext()`), `project_briefs`,
  `project_initiation_documents` (linked to the seeded business case and brief via
  `business_case_id`/`project_brief_id`, `is_approved = TRUE`), `benefits_review_plans`
  (quarterly review cadence, linked to the seeded business case).

Reference numbers (`rms_reference`, `qms_reference`, `cms_reference`, `case_reference`,
`brief_reference`) were deliberately left out of every INSERT's column list — each
table's own `BEFORE INSERT` trigger auto-generates them (`RMS-YYYY-NNN` etc.), so no
manual sequence math was needed.

**Idempotency:** matches the file header — `ON CONFLICT (project_id) DO NOTHING` for the
5 tables with a UNIQUE `project_id`; deterministic `uuid_generate_v5(project_id, tag)` id
+ `ON CONFLICT (id) DO NOTHING` for the 2 that don't. Re-running the file is a no-op.

**Simulator:** no `sim`-schema changes. Verified (see "Simulator parity" above) that
`apps/simulator/src/pages/pm/PMDashboard.jsx` renders the same two panels off the same
`public` tables, so it picks up this seed automatically. The separate `sim.practice_*`
"Practice" dashboard was left untouched — it has no Governance Reference / Initiation
Documents panels.

**Not done:** no application/service/route code was changed — this is a pure data seed
for pages that already work. Not run against the live database from this session; the
user runs it via the Supabase SQL Editor per "How to run" above.
