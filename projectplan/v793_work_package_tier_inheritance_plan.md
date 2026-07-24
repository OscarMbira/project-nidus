# v793 — Work Package: wire into the tier-inheritance system (reuses v785's infrastructure)

**Status: 100% complete**

**Prerequisite (verified complete):** `v785_native_register_methodology_awareness_plan.md` (Risk Register) and `v787_issue_register_tier_inheritance_plan.md` (Issue Register) — mechanism gaps are built, tested, and live in both apps.

## What's already confirmed reusable, unchanged
- `pmTemplateInheritanceService.js`, `TierFieldCustomisationPanel.jsx`, LDE value storage — no changes needed.

## Schema facts (verified this session)
- Public: `work_packages` base (`v23`) + v216 enhancement (~28 columns) + 8 supporting tables.
- Sim: `sim.practice_work_packages` (`v231`) previously mirrored only the pre-v216 base — **v793 adds the ~28 columns**. Supporting tables remain deferred.
- Components: `WorkPackageView.jsx` + `WorkPackageForm.jsx` (Platform + Simulator); Settings tab wired (previously unused `Settings` import).

## Field split (core/fixed vs customisable)
- **Core/fixed:** `work_package_name`, `wp_reference`, `work_package_code`, `status`, `project_id`, `stage_boundary_id`, planned/actual dates, `progress_percentage`.
- **Customisable via tier inheritance:** extra fields under category `work_package` (Global Template fields-domain + project overrides).

## Scope

1. **Sim parity fix:** add ~28 missing v216 columns to `sim.practice_work_packages` — **done** (`SQL/v793_...`).
2. **Screen identity:** `work_package` in `system_screens` (public + sim) — **done**.
3. **Category tag:** `category = 'work_package'` on Settings / resolveEffectiveFields — **done**.
4. **View wiring:** Settings tab on `WorkPackageView.jsx` (Platform + Simulator) — **done**.
5. **Form wiring:** `InheritedWorkPackageFields.jsx` in `WorkPackageForm.jsx` — **done**.
6. **Simulator parity** for steps 2–5 — **done**; also wired practice edit (`PracticeWorkPackageEdit`) with `simDb` so practice projects can customise the same category.

## Explicit non-goals
- No changes to the inheritance engine or panel component.
- No Admin-side Global Template content enrichment.
- No port of the 7 missing sim supporting tables.

## Todo
- [x] Sim parity migration: add ~28 v216 enhancement columns to `sim.practice_work_packages`
- [x] Register `work_package` screen_code (public + sim `system_screens`)
- [x] Create `InheritedWorkPackageFields.jsx` (Platform + Simulator)
- [x] Add Settings tab to `WorkPackageView.jsx` (Platform + Simulator)
- [x] Unit test: sticky-disable for `work_package` category merge
- [x] Documentation guide
- [x] Review section

## Review

### Delivered
| Area | Change |
|------|--------|
| SQL | `SQL/v793_work_package_tier_inheritance.sql` — sim column parity + `system_screens.work_package` |
| Inherited fields | `InheritedWorkPackageFields.jsx` (Platform + Simulator) |
| Forms / views | Wired on `WorkPackageForm` + Settings/overview on `WorkPackageView` (both apps) |
| Practice | `PracticeWorkPackageEdit` Settings + inherited fields via `simDb` |
| Tests | Sticky-disable case in `pmTemplateInheritanceService.test.js` |
| Docs | `Documentation/Work_Package_Tier_Field_Inheritance_Guide.md` |

### Apply reminder
User must apply `SQL/v793_work_package_tier_inheritance.sql` (and v788 if not already applied) on Supabase.

### Out of scope (unchanged)
- Port of 7 sim supporting tables (`wp_quality_criteria`, etc.)
- Admin Global Template enrichment for work-package fields
