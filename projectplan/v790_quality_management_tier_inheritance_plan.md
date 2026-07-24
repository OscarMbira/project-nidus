# v790 — Quality Management: wire into the tier-inheritance system (reuses v785's infrastructure)

**Prerequisite (verified complete):** `v785_native_register_methodology_awareness_plan.md` (Risk Register) and `v787_issue_register_tier_inheritance_plan.md` (Issue Register) — both prove the pattern. All core mechanism gaps (entity-scoped auth, sticky-disable, mandatory-lock, category-based resolver routing) are built, tested, and live in both apps.

## Why this one is bigger than v787 but still no mechanism work

Quality Management has more surface area than Issue Register — three linked register types (register, reviews, inspections) rather than one — but the wiring shape is identical: no changes to `pmTemplateInheritanceService.js` or `TierFieldCustomisationPanel.jsx`, just per-screen category routing and Settings tabs.

## What's already confirmed reusable, unchanged
- `pmTemplateInheritanceService.js` (`resolveEffectiveFields`, sticky-disable, mandatory-lock) — no changes needed.
- `TierFieldCustomisationPanel.jsx` — generic, permission-gated via `can_manage_pm_template_node`.
- `custom_field_values` / `custom_field_screen_map` (LDE) — generic value storage.

## Schema facts (verified this session)
- Public: `quality_register` (main, `v32_quality_management.sql:48-109`), `quality_reviews` (`v32:188-274`, enhanced `v184_quality_register_enhancements.sql:26-127`), `quality_inspections` (`v32:356-422`, enhanced `v184:134-241`), plus `quality_review_participants`, `quality_criteria_templates`, `quality_defects`, `quality_metrics`, `quality_activity_records`, `quality_activity_actions`, `quality_inspection_participants`, `quality_metrics_register` (`v504_missing_normalized_registers.sql:7-10`).
- Sim: `sim.practice_quality_register` — missing `product_document_url`, `quality_plan_url`, `quality_report_url`. `sim.practice_quality_reviews` / `practice_quality_inspections` (v299) are much thinner than v184's enhancement — missing `activity_identifier`, `programme_id`, `forecast_date`, `sign_off_planned/forecast_date`, `quality_records_refs`, `parent_review_id`/`is_reassessment`/`reassessment_count`, `qms_id`/`qms_method_id`/`qms_scheduled_activity_id`. `sim.quality_metrics_register` (v505) already has full parity via `LIKE ... INCLUDING ALL`. No sim equivalent exists at all for `quality_defects`, `quality_criteria_templates`, `quality_activity_records/actions`, or the participant tables.
- Components: `apps/platform/src/pages/QualityManagement.jsx` + `apps/platform/src/components/quality/` (QualityRegister.jsx, QualityRegisterForm.jsx, QualityReviewForm.jsx, QualityInspectionForm.jsx, QualityCriteriaManager.jsx, QualityMetricsDashboard.jsx, QualityActivityDetail.jsx). Simulator mirror exists with identical filenames plus `Practice*` variants. No Settings/tier-customisation concept exists today (confirmed via grep — zero matches).

## Field split (core/fixed vs customisable)
- **Core/fixed (never tier-customisable):** `project_id`, `product_name`, `quality_status`, `sign_off_required/status/date`, `quality_owner_user_id`, audit fields, `review_type`/`inspection_type`, dates, `review_status`, sign-off chain, `qms_*` FKs.
- **Customisable via tier inheritance:** `product_category`, `quality_method`, `quality_criteria`/`acceptance_criteria`, `quality_standards[]`, `compliance_requirements[]`, `quality_tolerance_description`, `defect_tolerance`, scoring fields, checklist JSONB blobs, `quality_criteria_templates`/`quality_metrics` cost-of-quality fields.

## Scope

1. **Sim parity fix:** add the missing v184-equivalent columns to `sim.practice_quality_reviews` / `sim.practice_quality_inspections`, plus the 3 missing URL columns on `sim.practice_quality_register`. Single migration, additive only (`ADD COLUMN IF NOT EXISTS`).
2. **Screen identity:** register `quality_register`, `quality_review`, `quality_inspection` screen_codes in `system_screens` (public + sim), same pattern as v788/v789.
3. **Category tags:** three categories — `quality_register`, `quality_review`, `quality_inspection` — so each surface resolves its own field set independently (a project may want different customisation on the register vs. reviews vs. inspections).
4. **View wiring:** add a "Settings" tab to `QualityManagement.jsx` (Platform + Simulator) embedding `TierFieldCustomisationPanel`, `entityType="project"`. Since there are 3 categories, the Settings tab shows three sub-panels (or a category selector) rather than one panel — this is the one piece of new UI, not just copy-adapt.
5. **Form wiring:** create `InheritedQualityFields.jsx` (mirrors `InheritedIssueRegisterFields.jsx`) parameterised by `category` so the same component serves register/review/inspection forms; render it in `QualityRegisterForm.jsx`, `QualityReviewForm.jsx`, `QualityInspectionForm.jsx`.
6. **Simulator parity** for steps 2–5 identically in `apps/simulator`.

## Explicit non-goals
- No changes to the inheritance engine or panel component — reused verbatim.
- No Admin-side Global Template content work (separate v189/v191-style completeness effort if the Quality field catalog itself needs enriching).
- No attempt to backfill `quality_defects` / `quality_criteria_templates` / activity tables into `sim` — those are a larger parity gap outside tier-inheritance wiring; flagged here for awareness only.

## Todo
- [x] Sim parity migration: add missing v184-equivalent columns to `sim.practice_quality_reviews`, `sim.practice_quality_inspections`, `sim.practice_quality_register` — `SQL/v791_quality_management_tier_inheritance.sql`
- [x] Register `quality_register` / `quality_review` / `quality_inspection` screen_codes (public + sim `system_screens`) — same file
- [x] Create `InheritedQualityFields.jsx` (Platform + Simulator), category-parameterised
- [x] Add Settings tab (category selector + panel) to `QualityManagement.jsx`, Platform + Simulator
- [x] Wire inherited fields into `QualityRegisterForm.jsx`, `QualityReviewForm.jsx`, `QualityInspectionForm.jsx` (Platform + Simulator)
- [x] Verify sticky-disable for all three quality_* field prefixes via unit test
- [x] Review section

## Review

**Status: 100% complete (implementation).** Apply `SQL/v791_quality_management_tier_inheritance.sql` on Supabase before using quality screen codes / sim parity columns live.

### What shipped

| Item | Change |
|------|--------|
| Sim parity | URL cols on `practice_quality_register`; v184-style cols on reviews/inspections |
| Screens | `quality_register`, `quality_review`, `quality_inspection` in public + sim `system_screens` |
| Settings | Quality Management → Settings with category chips + `TierFieldCustomisationPanel` (project required) |
| Forms | `InheritedQualityFields` on register / review / inspection forms (Platform `platformDb`, Simulator `simDb`) |
| Verify | Unit test `quality_* categories: sticky disable works independently per field set (v790)` |
| Docs | `Documentation/Quality_Management_Tier_Field_Inheritance_Guide.md` |

### Key files
- `SQL/v791_quality_management_tier_inheritance.sql`
- `apps/platform|simulator/.../InheritedQualityFields.jsx`
- `apps/platform|simulator/.../QualityManagement.jsx`
- `apps/platform|simulator/.../QualityRegisterForm.jsx`, `QualityReviewForm.jsx`, `QualityInspectionForm.jsx`

### SQL version note
Plan file is **v790**; migration file is **v791** to avoid colliding with `SQL/v790_list_risk_category_options.sql`.

### Global / PMO category convention
Tag fields-domain Global Templates with `quality_register` / `quality_review` / `quality_inspection` as needed. Catalog enrichment remains out of scope.
