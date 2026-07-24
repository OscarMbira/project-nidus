# Industry Plan Template Grid Parity (Platform + Simulator)

**Plan:** `projectplan/v190_industry_plan_grid_parity_platform_simulator_plan.md`  
**Admin companions:** Admin v181 / v183 / v184 (Global Template Library)

## Overview

Platform and Simulator PMO **Industry Template** wizards now support the same grid behaviours as Admin’s industry_plan editor:

| Feature | Behaviour |
|---|---|
| Card ⊞ / Grid ≡ | Per entity step; remembered in `localStorage` (`nidus.industryPlan.view.<tab>`) |
| Phases → Grid | WBS hierarchy with **child indentation**, expand/collapse |
| Other entity steps → Grid | Flat spreadsheet + click → edit modal |
| Columns ▾ | Show/hide/reorder standard + custom columns (`nidus.industryPlan.columns.*`) |
| Custom columns | Stored on template `ui.custom_column_defs`; values on row `custom_fields` |
| Nesting | `row_id` / `parent_id` (display WBS `1.2.1`) |
| Skills / planning defaults | Persisted on child tables (see SQL) |

## Apply SQL

```bash
# from monorepo root — use your usual Supabase SQL runner
# SQL/v782_industry_plan_grid_parity_columns.sql
```

Also refreshes `public._sync_global_industry_template_catalog` so Admin publish maps the new fields.

## Key files

| Path | Role |
|---|---|
| `packages/shared/src/utils/industryPlanGridColumns.js` | Column catalog + layout |
| `packages/shared/src/utils/industryPlanGridUtils.js` | WBS grouping / flatten |
| `packages/shared/src/utils/industryPlanCustomColumnOps.js` | Custom column CRUD + row ids |
| `packages/ui/src/industryPlan/*` | ColumnChooser, WBS/Flat grids, toolbar |
| `apps/platform|simulator/src/pages/pmo/IndustryTemplateForm.jsx` | Wizard wiring |
| `apps/platform|simulator/src/services/industryTemplateService.js` | Persist new columns + `ui` |
| `SQL/v782_industry_plan_grid_parity_columns.sql` | Schema + sync |

## Manual check

1. Apply `v782` SQL.
2. Platform → PMO → Industry Templates → New/Edit → Phases → Grid ≡.
3. Confirm WBS indentation on nested children; Columns ▾ show Priority / custom create.
4. Save and reopen — nesting, skills, custom defs persist.
5. Repeat on Simulator (same `public` PMO tables).
6. Re-publish an Admin industry_plan template — catalog row picks up skills / planning / custom fields.
