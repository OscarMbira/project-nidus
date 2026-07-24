# v792 — Change Management: port Simulator schema, then wire into the tier-inheritance system

**Status: 100% complete**

**Prerequisite (verified complete):** `v785_native_register_methodology_awareness_plan.md` (Risk Register) and `v787_issue_register_tier_inheritance_plan.md` (Issue Register) — mechanism gaps are built, tested, and live in both apps.

## ⚠ This one is materially different — Simulator had ZERO tables for this feature

Unlike Risk/Issue/Quality/Work Package/Business Case, which all have a **partial** Simulator parity gap (some columns/tables missing), Change Management had **no Simulator schema at all**. Work was **schema-port-first, then tier-wiring**.

## What's already confirmed reusable, unchanged
- `pmTemplateInheritanceService.js`, `TierFieldCustomisationPanel.jsx`, LDE value storage — no changes needed once the sim schema exists.

## Schema facts (verified this session)
- Public: 7 tables from `v31_change_management.sql` + `v487_change_log_attachments.sql`.
- Sim (after this plan): `sim.practice_change_*` (7 tables) via `SQL/v794_change_management_sim_and_tier_inheritance.sql`.
- Components: `ChangeManagement.jsx` + `components/change/` forms; Settings tab added (Phase 1).

## Field split (core/fixed vs customisable)
- **Core/fixed:** `id`, `project_id` / `practice_project_id`, `change_reference`, `change_title`, `change_description`, `status`, `submitted_by`, `submission_date`, audit fields.
- **Customisable via tier inheritance:** extra fields under category `change_request` (Global Template fields-domain + project overrides).

## Scope

### Phase 0 — Port the Simulator schema
1. Verify Simulator `ChangeManagement.jsx` behaviour — **done** (public-schema clone / dead for practice data).
2. Create `sim.practice_change_*` (7 tables) + RLS — **done** (`SQL/v794_...`).
3. Create `practiceChangeService.js` + sim-backed `changeManagementService.js` — **done**.
4. Repoint Simulator page/forms to sim service — **done**.

### Phase 1 — Tier-inheritance wiring
5. Register `change_request` screen_code (public + sim) — **done**.
6. Category tag `change_request` on Settings / resolveEffectiveFields — **done**.
7. Settings tab + `TierFieldCustomisationPanel` — **done** (Platform + Simulator).
8. `InheritedChangeRequestFields` on request + assessment forms — **done**.

## Explicit non-goals
- No changes to the inheritance engine or panel component.
- No Admin-side Global Template content enrichment.
- Phase 0 only ports the schema shape needed for tier-inheritance parity — it does not re-implement Simulator-specific gameplay/scoring for change events.

## Todo
- [x] Confirm current behaviour of Simulator's `ChangeManagement.jsx` (reads public schema? unused?) before writing migrations
- [x] Phase 0: create `sim.practice_change_*` tables (7 tables) + RLS
- [x] Phase 0: create `practiceChangeService.js`, repoint Simulator `ChangeManagement.jsx` + components to it
- [x] Phase 1: register `change_request` screen_code (public + sim `system_screens`)
- [x] Phase 1: create `InheritedChangeRequestFields.jsx` (Platform + Simulator)
- [x] Phase 1: add Settings tab to `ChangeManagement.jsx`, Platform + Simulator
- [x] Unit test: sticky-disable for `change_request` category merge
- [x] Documentation guide
- [x] Review section

## Review

### Phase 0 finding
Simulator `ChangeManagement.jsx` was a byte-level clone of Platform and queried **`public`** via `supabase` / `platformDb`. It was not a valid practice-data surface. Fixed by porting schema + service to `simDb`.

### SQL versioning
Plan file is **v792**; migration is **`SQL/v794_change_management_sim_and_tier_inheritance.sql`** (`v792` = business-case SQL; `v793` reserved for Work Package plan).

### Delivered
| Area | Change |
|------|--------|
| SQL | 7 `sim.practice_change_*` tables, RLS, registry, `system_screens.change_request` (public + sim) |
| Sim service | `apps/simulator/src/services/changeManagementService.js` + `sim/practiceChangeService.js` |
| Inherited fields | `InheritedChangeRequestFields.jsx` (Platform + Simulator) |
| Forms | Wired on `ChangeRequestForm` + `ChangeAssessmentForm` (both apps) |
| Settings | Third tab on `ChangeManagement.jsx` with `TierFieldCustomisationPanel` |
| Tests | Sticky-disable case in `pmTemplateInheritanceService.test.js` |
| Docs | `Documentation/Change_Management_Tier_Field_Inheritance_Guide.md` |

### Apply reminder
User must apply `SQL/v794_change_management_sim_and_tier_inheritance.sql` (and earlier unapplied tier migrations such as v788) on Supabase.

### Out of scope (unchanged)
- `ChangeBoardDashboard` still may reference public meeting/member tables not in Phase 0
- Admin Global Template enrichment for change fields
- Simulator gameplay/scoring for change events
