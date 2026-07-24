# Quality Management tier field inheritance (v790)

## Purpose

Wire Quality Management (register, reviews, inspections) into the existing PM template hierarchy — same mechanism as Risk Register (v785) and Issue Register (v787) — without replacing fixed quality columns.

## Apply SQL first

`SQL/v791_quality_management_tier_inheritance.sql`

(Plan is numbered **v790**; SQL is **v791** because `v790_list_risk_category_options.sql` already exists.)

Adds:

- `sim.practice_quality_register` URL columns (`product_document_url`, `quality_plan_url`, `quality_report_url`)
- v184-equivalent columns on `sim.practice_quality_reviews` / `sim.practice_quality_inspections`
- `system_screens`: `quality_register`, `quality_review`, `quality_inspection` (public + sim, module `quality`)

Also ensure `SQL/v788_*.sql` is applied (sticky-disable / mandatory-lock machinery).

## Behaviour

| Rule | Effect |
|------|--------|
| Sticky disable | Ancestor disable stays off for descendants |
| Mandatory lock | Locked fields cannot be disabled below the locking tier |
| Auth | `can_manage_pm_template_node` gates the customisation panel |
| Categories | Three independent chains: `quality_register`, `quality_review`, `quality_inspection` |

## Where to use it

1. **Quality Management → Settings** — category selector + `TierFieldCustomisationPanel` (select a project first).
2. **Forms** — `InheritedQualityFields` on Quality Register / Review / Inspection forms (after the record exists).

Platform uses `platformDb`; Simulator settings/extra fields use `simDb`.

## Global / PMO root

Tag Global→PMO synced field templates with the matching `category` (`quality_register` / `quality_review` / `quality_inspection`). Catalog content enrichment is out of scope for this plan.

## Related plan

`projectplan/v790_quality_management_tier_inheritance_plan.md`
