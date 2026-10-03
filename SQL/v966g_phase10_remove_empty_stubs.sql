-- ============================================================================
-- v966g: Core PM Menu Rationalisation — Phase 10 (partial): remove empty plat_sec_* stubs
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 10.
-- projectprd/v966_core_pm_menu_rationalisation_PRD.md decision 4.
--
-- The 8 empty plat_sec_* stub roots the audit identified (0 children, but each still carries
-- real role_menu_items grants — i.e. real users see an empty, clickable, content-free sidebar
-- heading today): plat_sec_comm_reporting, plat_sec_quality_testing, plat_sec_quality_
-- assurance, plat_sec_approvals_reporting, plat_sec_reporting_controls, plat_sec_approvals_gov,
-- plat_sec_email, plat_sec_admin. Freshly re-verified in this session (immediately before
-- writing this file) — all 8 are still confirmed childless. Per decision 4, their would-be
-- content already has a canonical home elsewhere in the rationalised structure (Quality &
-- Testing -> plat_pm_quality_testing under Universal; Administration -> the pmo-admin-* flat
-- leaves; Email & Notifications -> the pmo-email-* flat leaves + pmo-cat-email-notifications,
-- etc.) so these are deactivated outright, not populated.
--
-- plat_sec_email and plat_sec_admin were deliberately left OUT of this session's Phase 1
-- "Platform" top-level wrapper change (apps/platform/src/config/pmoMenuHierarchyUtils.js's
-- PLATFORM_INFRA_TOP_LEVEL_CODES) specifically because they are empty stubs with nothing to
-- show — confirmed here that nothing was re-parented under either of them in this session, so
-- deactivating them is safe and consistent with that earlier decision.
--
-- This is the "8 empty stub roots" half of Phase 10 only. The other Phase 10 bullet
-- ("duplicate rows that lost out to their canonical counterpart in Phases 2-5") was already
-- handled directly inside v966b/v966c/v966d's own deactivation statements — no further action
-- needed for that half.
-- ============================================================================

DO $$
DECLARE
  v_deactivated_count INT := 0;
BEGIN
  UPDATE public.menu_items
  SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_code IN (
    'plat_sec_comm_reporting', 'plat_sec_quality_testing', 'plat_sec_quality_assurance',
    'plat_sec_approvals_reporting', 'plat_sec_reporting_controls', 'plat_sec_approvals_gov',
    'plat_sec_email', 'plat_sec_admin'
  )
  AND COALESCE(is_deleted, FALSE) = FALSE;
  GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
  RAISE NOTICE 'v966g: deactivated % empty plat_sec_* stub roots (expected 8)', v_deactivated_count;
END $$;

UPDATE public.role_menu_items rmi
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code IN (
    'plat_sec_comm_reporting', 'plat_sec_quality_testing', 'plat_sec_quality_assurance',
    'plat_sec_approvals_reporting', 'plat_sec_reporting_controls', 'plat_sec_approvals_gov',
    'plat_sec_email', 'plat_sec_admin'
  )
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966g_phase10_remove_empty_stubs.sql applied successfully'; END $$;
