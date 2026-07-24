# v791 — Business Case: wire into the tier-inheritance system (reuses v785's infrastructure)

**Prerequisite (verified complete):** `v785_native_register_methodology_awareness_plan.md` (Risk Register) and `v787_issue_register_tier_inheritance_plan.md` (Issue Register) — mechanism gaps are built, tested, and live in both apps.

## Why this one differs from Risk/Issue

Business Case is a single-instance document per project (not a register of many rows), and Platform/Simulator's shapes diverge more than Risk/Issue did — Simulator stores options inline as JSONB rather than a normalized satellite table, and carries governance/tailoring columns Platform lacks. The tier-inheritance wiring itself is still the same shape; the parity fix is asymmetric (each area is missing something the other has).

## What's already confirmed reusable, unchanged
- `pmTemplateInheritanceService.js`, `TierFieldCustomisationPanel.jsx`, LDE value storage — no changes needed.

## Schema facts (verified this session)
- Public: `business_cases` main table (`v260_business_case_tables.sql`) + satellite tables. Record Lifecycle columns via `v653` (`record_status`, etc.).
- Sim: `sim.practice_business_cases` (`v229`) thinner shape; v244 governance columns already on sim; lifecycle via `v656`.
- Components: `BusinessCaseEdit.jsx` / `BusinessCaseViewPage.jsx` (Platform + Simulator mirrors).

## Field split (core/fixed vs customisable)
- **Core/fixed:** `case_reference`, `case_title`, `document_status`, `project_id`/`programme_id`, `recommended_option`, `total_investment_cost`, audit fields.
- **Customisable via tier inheritance:** `strategic_alignment`, `problem_statement`, `funding_source`, `cost_assumptions`, `discount_rate`, `investment_appraisal_notes`, `major_risks`/`overall_risk_rating`, `key_milestones`, `timescale_description`, plus optional satellite-table sections as tier-gated blocks.

## Scope

1. **Parity fix:** sim ← missing Platform columns; **skip** public ← v244 governance (Record Lifecycle already present).
2. **Screen identity:** `business_case` in `system_screens` (public + sim).
3. **Category tag:** `category = 'business_case'`.
4. **View wiring:** Settings tab on `BusinessCaseEdit.jsx` + inherited fields on main tab / view page.
5. **Form wiring:** `InheritedBusinessCaseFields.jsx`.
6. **Simulator parity** for steps 2–5.

## Explicit non-goals
- No changes to the inheritance engine or panel component.
- No reconciliation of options-satellite-table-vs-JSONB.
- No Admin-side Global Template content enrichment.
- No public v244 governance columns (lifecycle covers rule 53).

## Todo
- [x] Confirm public.business_cases needs governance/tailoring columns → **No** (v653 Record Lifecycle already present)
- [x] Parity migration: add missing columns to `sim.practice_business_cases` only — `SQL/v792_business_case_tier_inheritance.sql`
- [x] Register `business_case` screen_code (public + sim `system_screens`)
- [x] Create `InheritedBusinessCaseFields.jsx` (Platform + Simulator)
- [x] Add Settings tab to `BusinessCaseEdit.jsx`, Platform + Simulator
- [x] Wire inherited fields on Edit main tab + View page (Platform + Simulator)
- [x] Verify sticky-disable via unit test
- [x] Review section

## Review

**Status: 100% complete (implementation).** Apply `SQL/v792_business_case_tier_inheritance.sql` on Supabase before using the screen / sim parity columns live.

### Decisions
| Question | Outcome |
|----------|---------|
| Add v244 governance cols to public? | **No** — `record_status` lifecycle already on `business_cases` (v653) |
| Generated `total_investment_cost` on sim? | **Skipped** — sim cost columns differ (`estimated_cost` vs development/ongoing) |
| SQL version | **v792** (plan is v791; v791 SQL is Quality) |
| Module for screen | `projects` (no dedicated BC module in v517) |

### What shipped
| Item | Change |
|------|--------|
| Sim parity | document_status, strategic_alignment, funding/appraisal/risk/timescale fields on `practice_business_cases` |
| Screen | `business_case` in public + sim `system_screens` |
| Settings | Edit → Settings → `TierFieldCustomisationPanel` (`category=business_case`) |
| Fields | `InheritedBusinessCaseFields` on Edit (main) + View |
| Verify | Unit test `business_case cascade: sticky disable…` |
| Docs | `Documentation/Business_Case_Tier_Field_Inheritance_Guide.md` |

### Key files
- `SQL/v792_business_case_tier_inheritance.sql`
- `apps/platform|simulator/.../InheritedBusinessCaseFields.jsx`
- `apps/platform|simulator/.../BusinessCaseEdit.jsx`
- `apps/platform|simulator/.../BusinessCaseViewPage.jsx`
