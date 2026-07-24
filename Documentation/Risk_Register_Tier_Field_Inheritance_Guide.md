# Risk Register tier field inheritance (v785)

## Purpose

Wire the Risk Register into the existing PM template hierarchy so orgs can inherit, disable, lock, and add fields per tier — without replacing the fixed risk columns (proximity, pre/post assessment, etc.).

## Apply SQL first

Run on Supabase (public + sim in one file):

`SQL/v788_pm_template_field_links_locked_and_risk_register_screen.sql`

Adds:

- `pm_template_field_links.locked` (mandatory lock)
- `system_screens.screen_code = risk_register` (separate from `risk_detail`)

## Behaviour

| Rule | Effect |
|------|--------|
| Sticky disable | Once a tier disables a field, descendants cannot re-enable it |
| Mandatory lock | A tier can lock a field; descendants cannot disable it (UI greyed + write rejected) |
| Auth | `can_manage_pm_template_node` gates the customisation panel |
| Category | Risk Register chain uses `category = 'risk_register'` so it does not clobber generic project field templates |

## Where to use it

1. **Risk Register → Settings** — `TierFieldCustomisationPanel` with `category="risk_register"`.
2. **Risk Detail / Edit risk** — `InheritedRiskRegisterFields` loads enabled definitions via `resolveEffectiveFields` and stores values in `custom_field_values` (entity `risk`).

Platform uses `platformDb`; Simulator settings/extra fields use `simDb`.

## Global / PMO root

Tag Global→PMO synced field templates with `category = 'risk_register'` so `resolveStartNodeId` picks them as the Risk Register chain root when no entity-scoped node exists yet.

## Related plan

`projectplan/v785_native_register_methodology_awareness_plan.md`
