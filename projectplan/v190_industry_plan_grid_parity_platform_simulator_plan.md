# v190 — Industry Plan Grid Parity (Platform + Simulator)

**Repo:** `E:\project-nidus` (monorepo)  
**Companion Admin:** `project-nidus-admin` v181 / v183 / v184 (Global Template Library JSON editor)  
**Status:** ✅ Complete (100%)  
**Docs:** `Documentation/Industry_Plan_Template_Grid_Parity.md`

## Goal

Apply Admin industry-plan editor behaviours to **Platform and Simulator** PMO Industry Template wizards:

- Card ⊞ / Grid ≡ view toggle  
- Phases **WBS** grid with nested indentation (`1.2.1`) via `row_id` / `parent_id`  
- Flat entity grids + row detail modal  
- **Columns ▾** show/hide/reorder (localStorage)  
- **Custom columns** (template `ui.custom_column_defs` + row `custom_fields`)  
- Planning defaults + `required_skills`  
- Non-lossy Admin→Platform catalog sync  

## Decisions

| Item | Choice |
|---|---|
| Schema | `public.pmo_*` only (both apps use `platformDb` for PMO templates) |
| Shared code | `@nidus/shared` utils + `@nidus/ui` grid components |
| Sim schema child tables | N/A for PMO master; practice copies remain JSONB snapshots |

## Todos

- [x] SQL `v782_industry_plan_grid_parity_columns.sql` (+ sync RPC update)  
- [x] Port `industryPlanGridColumns` / `industryPlanGridUtils` / custom column ops to `@nidus/shared`  
- [x] Shared `@nidus/ui` ColumnChooser + WBS/Flat grids (indentation)  
- [x] Wire Platform + Simulator `IndustryTemplateForm` / services  
- [x] Unit tests for shared helpers  
- [x] Docs + mark Admin v181/v183/v184 companion notes + this plan Review 100%  

## Review

**Status: 100% complete**

### Shipped

| Area | Change |
|---|---|
| SQL | `SQL/v782_industry_plan_grid_parity_columns.sql` — planning defaults, skills, nesting, custom_fields, `ui`, sync RPC |
| Shared | `packages/shared/src/utils/industryPlanGrid*.js` + `industryPlanCustomColumnOps.js` |
| UI | `packages/ui/src/industryPlan/*` — Columns ▾, WBS with indentation, flat grids, edit modals |
| Apps | Platform + Simulator `IndustryTemplateForm.jsx` + `industryTemplateService.js` (identical parity) |
| Docs | `Documentation/Industry_Plan_Template_Grid_Parity.md`; Admin plans cross-linked |

### Apply before use

Run `SQL/v782_industry_plan_grid_parity_columns.sql` on Supabase.
