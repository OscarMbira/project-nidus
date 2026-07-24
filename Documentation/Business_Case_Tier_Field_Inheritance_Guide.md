# Business Case tier field inheritance (v791 plan / SQL v792)

## Purpose

Wire the Business Case document into the existing PM template hierarchy — same mechanism as Risk (v785), Issue (v787), and Quality (v790) — without replacing fixed business-case columns.

## Apply SQL first

`SQL/v792_business_case_tier_inheritance.sql`

(Plan file is **v791**; SQL is **v792** because `v791_quality_management_tier_inheritance.sql` already exists.)

Adds:

- Parity columns on `sim.practice_business_cases` (`document_status`, `strategic_alignment`, funding/appraisal/risk/timescale fields, etc.)
- `system_screens.screen_code = business_case` (public + sim, module `projects`)

**Not added:** v244 governance/tailoring columns on `public.business_cases` — Record Lifecycle (`record_status`, etc.) already covers rule 53 via v653.

Also ensure `SQL/v788_*.sql` is applied (sticky-disable / mandatory-lock machinery).

## Behaviour

| Rule | Effect |
|------|--------|
| Sticky disable | Ancestor disable stays off for descendants |
| Mandatory lock | Locked fields cannot be disabled below the locking tier |
| Auth | `can_manage_pm_template_node` gates the customisation panel |
| Category | Chain uses `category = 'business_case'` |

## Where to use it

1. **Business Case Edit → Settings** — `TierFieldCustomisationPanel` (requires linked `project_id`).
2. **Edit main tab / View page** — `InheritedBusinessCaseFields` loads enabled definitions via `resolveEffectiveFields`.

Platform uses `platformDb`; Simulator settings/extra fields use `simDb`.

## Known divergence (out of scope)

Public keeps normalized `business_case_options`; Simulator may still use JSONB `options_considered`. Not reconciled here.

## Related plan

`projectplan/v791_business_case_tier_inheritance_plan.md`
