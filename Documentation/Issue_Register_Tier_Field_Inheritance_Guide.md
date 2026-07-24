# Issue Register tier field inheritance (v787)

## Purpose

Wire the Issue Register into the existing PM template hierarchy (same mechanism as Risk Register / v785) so orgs can inherit, disable, lock, and add fields per tier — without replacing fixed issue columns (`issue_type`, priority/severity, decisions, etc.).

## Apply SQL first

Run on Supabase (public + sim in one file):

`SQL/v789_issue_register_screen_and_sim_parity.sql`

Adds:

- `sim.practice_issues.closure_date` (parity with `public.issues.closure_date`)
- `system_screens.screen_code = issue_register` (public + sim; module `issues`)

Also ensure `SQL/v788_pm_template_field_links_locked_and_risk_register_screen.sql` is applied (sticky-disable / mandatory-lock machinery).

## Behaviour

| Rule | Effect |
|------|--------|
| Sticky disable | Once a tier disables a field, descendants cannot re-enable it |
| Mandatory lock | A tier can lock a field; descendants cannot disable it (UI greyed + write rejected) |
| Auth | `can_manage_pm_template_node` gates the customisation panel |
| Category | Issue Register chain uses `category = 'issue_register'` so it does not clobber generic project field templates |

## Where to use it

1. **Issue Register → Settings** — `TierFieldCustomisationPanel` with `category="issue_register"`.
2. **Issue Detail / Edit issue** — `InheritedIssueRegisterFields` loads enabled definitions via `resolveEffectiveFields` and stores values in `custom_field_values` (entity `issue`).

Platform uses `platformDb`; Simulator settings/extra fields use `simDb`.

## Global / PMO root

Tag Global→PMO synced field templates with `category = 'issue_register'` so `resolveStartNodeId` picks them as the Issue Register chain root when no entity-scoped node exists yet. (Content enrichment of the field catalog itself is out of scope for v787.)

## Related plan

`projectplan/v787_issue_register_tier_inheritance_plan.md`
