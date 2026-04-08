# v212 Tolerance Fields: Multiple Values (List Editor)

## Summary
All six tolerance fields on the Create Project form (Time, Cost, Scope, Quality, Risk, Benefits) now support **multiple values** using the same list-editor pattern as Business Objective / Expected Benefits: add items via input + "Add" button, remove per item, Clear all, Enter to add.

## Changes

### 1. Database (SQL)
- **File:** `SQL/v267_project_tolerance_multiple_values.sql`
- Dropped numeric CHECK constraints on `tolerance_time_days` and `tolerance_cost_percentage`.
- Altered both columns from INTEGER/DECIMAL to **TEXT** so multiple values can be stored as newline-separated strings (e.g. `"7\n14"`, `"10\n15"`).
- Existing numeric values are cast to text on migration.

### 2. UI – LifecycleControlsSection
- **File:** `src/components/project/LifecycleControlsSection.jsx`
- **Time Tolerance (Days):** List editor – add/remove/clear; one value per line (e.g. 7, 14).
- **Cost Tolerance (%):** List editor – add/remove/clear; one value per line (e.g. 10%, 15%).
- **Scope, Quality, Risk, Benefits tolerance (description):** Each converted from single textarea to list editor – add/remove/clear; one description per line.
- Shared behaviour: `parseLines()` helper, local state for "new item" per field, list display with Trash2 per item, "Clear all" when non-empty, text input + "Add" button, Enter key adds item.
- Validation error `errors.tolerances` shown above the yellow note when "at least one time or cost" is not met.

### 3. ProjectsCreate – validation and payload
- **File:** `src/pages/ProjectsCreate.jsx`
- **Validation:** "At least one tolerance (time or cost) must be defined" now checks that at least one **line** exists in either `tolerance_time_days` or `tolerance_cost_percentage` (after splitting by newline and trimming).
- **Submit payload:** `tolerance_time_days` and `tolerance_cost_percentage` sent as strings (newline-separated when multiple). Empty sent as `null`. No `parseInt`/`parseFloat`.

## Deployment
1. Run `SQL/v266_project_tolerance_quality_risk_benefits.sql` if not already applied (Quality, Risk, Benefits columns).
2. Run `SQL/v267_project_tolerance_multiple_values.sql` to convert time/cost to TEXT and drop numeric constraints.
3. Deploy frontend; all tolerance fields will use the list-editor UI.

## Review
- Backend readiness checks (v154, v156) that require "at least one of time or cost" remain valid: they check for NULL; we send `null` when the field is empty and a string when the user has added at least one value.
- Scope, Quality, Risk, Benefits were already TEXT; no schema change, only UI change to multi-value list.
