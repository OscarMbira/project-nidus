-- ============================================================================
-- v966c: Core PM Menu Rationalisation — Phase 3: Change Control consolidation
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 3.
--
-- Canonical: plat_pm_change_log (route /platform/change, live PM Controls & Registers tree
-- under plat_sec_universal — 23 role grants). Fresh verification (this session) confirmed
-- plat_oversight_change (route /pmo/registers/changes, PMO Oversight track — 3 role grants:
-- account_owner/pmo_admin/system_admin) has ZERO grants that aren't already present on
-- plat_pm_change_log, so this is a pure Pattern-B duplicate removal with no visibility loss.
-- Unlike Risk/Issue (Phase 2), the plan explicitly names this row for deactivation rather than
-- preserving it as a PMO-oversight variant.
-- ============================================================================

-- Safety migration (expected no-op — plat_oversight_change's 3 roles are already all present on
-- plat_pm_change_log per fresh verification) — included for defensiveness in case grants drifted
-- between audit and this SQL being run, same pattern as v966a's role_menu_items cleanup step.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, keeper.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items loser ON loser.id = src.menu_item_id AND loser.menu_code = 'plat_oversight_change'
JOIN public.menu_items keeper ON keeper.menu_code = 'plat_pm_change_log' AND COALESCE(keeper.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_oversight_change' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id AND mi.menu_code = 'plat_oversight_change' AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966c_phase3_change_control_consolidation.sql applied successfully'; END $$;
