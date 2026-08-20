# Governance Strategy Display ID Fix (v838)

## Problem

Risk Management Strategy (and QMS / CMS) pages showed references such as:

`RMS-2026-42A1E47AE1BF4EA3A78CED278270458D`

instead of Admin ID Generation sequential IDs (`RMS-2026-001`).

The long hex suffix is the project UUID with hyphens removed. It is not a separate field — the UI correctly displays `rms_reference`.

## Root cause

Demo seeds `SQL/v834_pm_dashboard_governance_initiation_seed_data.sql` and `SQL/v836_repair_governance_initiation_seed_visibility.sql` hand-minted:

`PREFIX-YYYY-` + `UPPER(REPLACE(project_id::text, '-', ''))`

Because `rms_reference` / `qms_reference` / `cms_reference` were already non-empty, `trg_apply_admin_display_id` skipped `admin.generate_display_id()`, bypassing the Admin rule (`RMS` / `QMS` / `CMS` + `YYYY` + 3-digit sequence).

## Fix

1. **`SQL/v838_fix_governance_strategy_seed_display_ids.sql`**
   - Backfills rows matching the hex-suffix pattern via `admin.generate_display_id`
   - Rewrites `create_rms_for_project`, `create_qms_for_project`, and `create_cms_for_project` to insert `''` and let the AFTER INSERT admin trigger assign the reference (same pattern as v823 / v830)

2. **Seeds v834 / v836**
   - Insert references as `''` so new seed rows get proper Admin IDs

## Apply order

1. Ensure Admin sequential rules exist (`project-nidus-admin` `v156_id_generation_sequential_entity_rules_seed.sql`)
2. Ensure `v756b_id_generation_migration_public.sql` has been applied
3. Run `SQL/v838_fix_governance_strategy_seed_display_ids.sql` in the Supabase SQL Editor

## Verification

After apply, the Results grid from v838 should show `hex_style_left = 0` and non-zero `sequential_ok` for RMS / QMS / CMS. Reload the RMS page — the subtitle should show e.g. `… - RMS-2026-001`.
