# Change Management tier field inheritance (v792 plan / SQL v794)

## Purpose

Port Simulator Change Management onto `sim.practice_change_*`, then wire Change Requests into the existing PM template hierarchy — same mechanism as Risk (v785), Issue (v787), Quality (v790), and Business Case (v791) — without replacing fixed change-request columns.

## Phase 0 finding

`apps/simulator/src/pages/ChangeManagement.jsx` was a **public-schema clone** (`supabase` / `platformDb` against `public.change_*`). It was effectively dead/unrouted for Simulator practice data and violated schema separation. Phase 0 creates sim tables and a `simDb`-backed service.

## Apply SQL first

`SQL/v794_change_management_sim_and_tier_inheritance.sql`

(Plan file is **v792**; SQL is **v794** because `v792_business_case_tier_inheritance.sql` already exists and `v793` is reserved for the Work Package plan.)

Adds:

- Seven `sim.practice_change_*` tables (board, board members, requests, assessments, approvals, implementations, log) with owner-scoped RLS
- `database_tables` registry rows for those tables
- `system_screens.screen_code = change_request` (public + sim, module `change`)

Classic LDE screen `change_request_detail` (v517) remains unchanged for non-tier custom-field maps.

Also ensure `SQL/v788_*.sql` is applied (sticky-disable / mandatory-lock machinery).

## Behaviour

| Rule | Effect |
|------|--------|
| Sticky disable | Ancestor disable stays off for descendants |
| Mandatory lock | Locked fields cannot be disabled below the locking tier |
| Auth | `can_manage_pm_template_node` gates the customisation panel |
| Category | Chain uses `category = 'change_request'` |

## Where to use it

1. **Change Management → Settings** — `TierFieldCustomisationPanel` (`entityType="project"`, `category="change_request"`).
2. **Change Request form / Assessment form** — `InheritedChangeRequestFields` loads enabled definitions via `resolveEffectiveFields` (requires a saved request id).

Platform uses `platformDb`; Simulator uses `simDb` + `getCurrentUserAccountId()`.

## Explicit non-goals

- No inheritance engine changes
- No Admin Global Template content enrichment
- No Simulator gameplay/scoring for change events
- `ChangeBoardDashboard` meeting tables were not part of Phase 0

## Related plan

`projectplan/v792_change_management_tier_inheritance_plan.md`
