# v963 — PMIS Core Gap Closure Guide

## What this covers

The `pmis-gaps` module (`apps/*/src/modules/pmis-gaps/`) held ~20 sidebar-linked features that
were wired up as **read-only stub list pages** (`createGapListPage()` — a generic table browser
with no create/edit/delete) instead of real CRUD. This initiative (v963) replaced every one of
those stubs with real, dedicated CRUD pages, for both Platform and Simulator, per
`projectprd/v963_pmis_core_gap_closure_PRD.md` and `projectplan/v963_pmis_core_gap_closure_plan.md`.

**Procurement was explicitly removed from scope** — the user determined procurement belongs
outside the PMIS system entirely. Its stub menu item is deactivated (SQL `v963a`), not rebuilt.

## Features closed (by GAP ID)

| GAP | Feature | Platform | Simulator |
|-----|---------|----------|-----------|
| GAP-01 | Automation Log (table-name bug fix) | ✅ | ✅ |
| GAP-03 | OKR (Objectives/Cycles) | ✅ | ✅ |
| GAP-04 | Custom Fields → redirects to Local Data Extensions | ✅ | ✅ |
| GAP-06 | Intake Forms | ✅ | ✅ |
| GAP-07 | Client Portal | ✅ | ✅ |
| GAP-08 | Recurring Tasks | ✅ | ✅ |
| GAP-10 | RACI Matrix | ✅ | ✅ |
| GAP-11 | Skills Matrix (catalog + competency matrix) | ✅ | ✅ |
| GAP-13 | Timesheet Approvals (period-level workflow) | ✅ | ✅ |
| GAP-19 | Guest Access | ✅ | ✅ |
| GAP-20 | Training Tracker | ✅ | ✅ |
| GAP-21 | Notification Preferences | ✅ | ✅ |
| GAP-22 | Project Clone | ✅ | ✅ |
| GAP-23 | Scheduled Health Reports | ✅ | ✅ |
| GAP-25 | Integrations Marketplace | ✅ | ✅ |

Also added: `public.unified_approvals_v` / `sim.unified_approvals_v` — a read-only rollup view
across mandate approvals, change requests, and benefits review approvals (Platform), and the
equivalent "Practice" data model tables (Simulator) — surfaced via a new **Approvals Register**
page and sidebar menu item.

## Critical bug found and fixed during final review (Phase 22)

**The entire Simulator `pmis-gaps` module was unmounted in the live app.**
`PmisGapRouteElements` (and `RecordLifecycleRouteElements`) were imported into
`apps/simulator/src/routes/simulatorRoutes.jsx` but never invoked inside
`SimulatorRouteElements()`'s returned JSX — so none of their `<Route>` children were ever
registered with React Router's `<Routes>` in `App.jsx`. This predates v963 (it affected the
pre-existing OKR/Automations/Calendar routes too, not just this initiative's new pages) but
meant **every feature in this table was unreachable in the Simulator app** despite being
correctly built and correctly linked from the sidebar — clicking any of these menu items would
have fallen through to the catch-all `<Route path="*" element={<Navigate to="/" replace />} />`.

Fixed by adding `{PmisGapRouteElements()}` and `{RecordLifecycleRouteElements()}` to the end of
`SimulatorRouteElements()` in `simulatorRoutes.jsx`. Platform's equivalent
(`platformRoutes.jsx`) already called both correctly — only Simulator had the gap.

Also found and fixed while auditing this: Simulator's Integrations Marketplace (GAP-25) was only
wired for the `simulator/pmo/admin/integrations` route — the `pm/integrations`,
`pmo/admin/integrations`, and `platform/admin/integrations` scopes still pointed at the old
read-only stub. All four scopes now use the real `IntegrationMarketplaceListPage` /
`IntegrationCatalogDetailPage`, mirroring Platform's basePath/configBasePath pattern
(`configBasePath="/simulator/integrations"` — the real "configured connectors" page).

## Pre-existing dead code removed from Platform's own route file

`apps/platform/src/modules/pmis-gaps/routes/PmisGapRoutes.jsx` had a `simulator/*` routes block
(using `SimulatorPMLayout`/`SimulatorPMOLayout` and the old stub `simList()` pages) left over
from before the Platform/Simulator app split. It was registered in Platform's own route tree but
**unreachable** — nothing in the Platform app links to `/simulator/*` URLs, and Platform's
sidebar never generates them. It also contained a live bug: `CustomFieldsPageSim` referenced an
undefined `CUSTOM_FIELD_COLUMNS` identifier, which would throw a `ReferenceError` at module-load
time (crashing the whole Platform app) the moment this dead code path was ever evaluated.

Removed entirely: the `SimulatorPMLayout`/`SimulatorPMOLayout` imports, the
`wrapSimPm`/`wrapSimPmo`/`wrapSimulator`/`wrapSimulatorOutlet`/`wrapSimPmOutlet`/
`wrapSimPmoOutlet` wrapper functions, the `simList()` helper and all ten `*PageSim` stub consts,
the four now-unused `Sim*Page` lazy imports (`SimMultiplayerPage` etc.), and the three
`<Route element={wrapSim...Outlet()}>` blocks (`simulator/*`, `simulator/pm/*`,
`simulator/pmo/*`). Verified via `esbuild.transformSync` and a full-file grep confirming zero
remaining references to any removed identifier.

## Assumptions Register schema collision (found when the SQL was first run)

`v963b_assumptions_register_schema.sql` originally failed with `ERROR 42703: column
"validation_status" does not exist`. Root cause: `public.assumptions` already existed —
created years earlier by `SQL/v26_risk_management.sql` (the RAID log feature), under a
completely different, incompatible column shape (`assumption_title`/`assumption_description`/
`status`/`validation_date`/`validated_by_user_id`/`validation_notes`, no conversion FKs).
`v963b`'s `CREATE TABLE IF NOT EXISTS public.assumptions` silently no-op'd against that
pre-existing table, and the next statement failed on a column that never existed on the real
table. The v963 PRD's stated premise for this feature — that assumptions had no queryable
record with a validation lifecycle — was factually wrong; v26 already had one.

Fixed by retargeting the feature onto the existing table (per explicit decision, not a
default/rename): `v963b` now `ALTER TABLE`s `public.assumptions` to add only
`converted_to_risk_id`/`converted_to_issue_id` (the one genuinely new capability), and
`apps/platform/src/services/assumptionService.js` was rewritten to read/write v26's real
columns while still presenting `assumption_text`/`validation_status`/`notes` to the three
existing pages (List/Detail/Form) — none of which needed to change. Status values map
`unvalidated<->active`, `validated<->validated`, `invalidated<->invalidated`/`closed`.
`sim.assumptions` was unaffected (no pre-existing Simulator table collided) and needed no
changes on either the SQL or service side.

## SQL — none of this is live until you run it

All 25 SQL files under `SQL/v963*` through `SQL/v964*` were written but **never executed**
against the database (per the standing instruction for this initiative — implementation only,
no direct DB writes). Run them in the order listed in
`projectplan/v963_pmis_core_gap_closure_plan.md` before testing any of the above in a browser.
Sidebar cache version was bumped to 54 in both apps' `menuCacheUtils.js` — a hard refresh/cache
clear is not required for that specifically, but *is* required to pick up the SQL-side menu
changes once run.
