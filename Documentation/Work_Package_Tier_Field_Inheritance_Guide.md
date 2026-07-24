# Work Package tier field inheritance (v793)

## Purpose

Wire Work Packages into the existing PM template hierarchy — same mechanism as Risk (v785), Issue (v787), Quality (v790), Business Case (v791), and Change Management (v792) — without replacing fixed work-package columns.

## Apply SQL first

`SQL/v793_work_package_tier_inheritance.sql`

Adds:

- ~28 v216 enhancement columns on `sim.practice_work_packages` (parity with `public.work_packages`)
- Unique index on `wp_reference` (when present)
- Soft CHECK on `progress_indicator`
- Backfill `work_description` from `work_package_description` where empty
- `system_screens.screen_code = work_package` (public + sim, module `projects`)

**Not added:** the 7 missing sim supporting tables (`wp_quality_criteria`, etc.) — out of scope for this plan.

Also ensure `SQL/v788_*.sql` is applied (sticky-disable / mandatory-lock machinery).

## Behaviour

| Rule | Effect |
|------|--------|
| Sticky disable | Ancestor disable stays off for descendants |
| Mandatory lock | Locked fields cannot be disabled below the locking tier |
| Auth | `can_manage_pm_template_node` gates the customisation panel |
| Category | Chain uses `category = 'work_package'` |

## Where to use it

1. **Work Package View → Settings** — `TierFieldCustomisationPanel` (`entityType="project"`, `category="work_package"`).
2. **Work Package Form / Overview** — `InheritedWorkPackageFields` via `resolveEffectiveFields`.
3. **Simulator practice edit** — same panel + inherited fields on `PracticeWorkPackageEdit` using `simDb`.

Platform uses `platformDb`; Simulator practice uses `simDb` + `getCurrentUserAccountId()`.

## Related plan

`projectplan/v793_work_package_tier_inheritance_plan.md`
