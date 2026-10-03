-- ============================================================================
-- v965: Sidebar fix — duplicate "Process Group Forms" category (Platform)
-- ============================================================================
-- Bug report: "Process Group Forms" appears TWICE, back-to-back, under Core Project
-- Management in the Platform sidebar (localhost:5173/platform/dashboard).
--
-- Root cause (confirmed via live DB read, not guesswork): SQL/v681_menu_revamp_platform_
-- hierarchy.sql seeded the same "Process Group Forms" category TWICE under the exact same
-- parent row (originally menu_code 'plat_sec_pmbok', later renamed/consolidated to
-- 'plat_sec_standards_based') — a copy-paste duplication between its "[P] PMBOK SECTION" block
-- (~line 233, menu_code 'plat_grp_process_groups', 7 children 'plat_p_*') and its "PM [P] PMBOK
-- SECTION" block (~line 716, menu_code 'plat_grp_pm_process_groups', 7 children 'plat_pm_p_*').
-- Both branches point at the identical target routes (/platform/process-group-forms?group=...)
-- and are granted to essentially the same set of roles via role_menu_items — so both render as
-- siblings under the same category with no code-side filter to separate them (unlike Simulator's
-- equivalent sim_pmo_*/sim_pm_* pair, which IS correctly scope-separated by
-- applySimulatorMenuTransform's isSimNode() prefix check — confirmed via the same live read;
-- Simulator needs no equivalent fix).
--
-- 'plat_grp_process_groups' ('plat_p_*') is the one still actively maintained — it has since
-- gained an extra child ('plat_p_new_form_template', added by v754b_form_template_builder_menu_
-- items.sql) that 'plat_grp_pm_process_groups' ('plat_pm_p_*') never received. Kept: plat_p_*.
-- Deactivated (not deleted, matching the v963a Procurement precedent — same underlying feature,
-- just a redundant menu entry point): plat_pm_p_*.
-- ============================================================================

DO $$
DECLARE
  v_children_deactivated INT := 0;
  v_parent_deactivated INT := 0;
BEGIN
  UPDATE public.menu_items
  SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
  WHERE menu_code IN (
    'plat_pm_p_initiating', 'plat_pm_p_planning', 'plat_pm_p_executing',
    'plat_pm_p_mc', 'plat_pm_p_closing', 'plat_pm_p_drafts', 'plat_pm_p_approvals'
  )
  AND COALESCE(is_deleted, FALSE) = FALSE;
  GET DIAGNOSTICS v_children_deactivated = ROW_COUNT;

  UPDATE public.menu_items
  SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
  WHERE menu_code = 'plat_grp_pm_process_groups'
    AND COALESCE(is_deleted, FALSE) = FALSE;
  GET DIAGNOSTICS v_parent_deactivated = ROW_COUNT;

  RAISE NOTICE 'v965: deactivated % duplicate plat_pm_p_* children and % duplicate plat_grp_pm_process_groups parent', v_children_deactivated, v_parent_deactivated;
END $$;

-- Deactivate the now-orphaned role_menu_items grants for the deactivated branch too — the
-- menu_items rows being inactive already hides them, but leaving live grants pointed at a
-- deactivated menu_item is needless stale state.
UPDATE public.role_menu_items rmi
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code IN (
    'plat_grp_pm_process_groups',
    'plat_pm_p_initiating', 'plat_pm_p_planning', 'plat_pm_p_executing',
    'plat_pm_p_mc', 'plat_pm_p_closing', 'plat_pm_p_drafts', 'plat_pm_p_approvals'
  )
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v965_duplicate_process_group_forms_menu_fix.sql applied successfully'; END $$;
