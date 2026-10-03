-- ============================================================================
-- v1039: Dedupe ITTO Templates — stale Structured-track copy vs. ITTO Framework
-- ============================================================================
-- Found live while auditing "Platform" > "Process Group Forms" per user request
-- (2026-09-11). Two menu_items point at the identical route /platform/itto/templates:
--
--   plat_s_itto            "ITTO Templates / Drafts"  parent: plat_grp_gov_standards
--                           (Governance & Standards, itself under the STRUCTURED track)
--   plat_pm_p_itto_templates "ITTO Templates"         parent: plat_grp_pm_itto
--                           ("ITTO Framework" group, under the STANDARDS-BASED track,
--                           siblings: ITTO Drafts /platform/itto/drafts,
--                           ITTO Project /platform/itto/project)
--
-- plat_pm_p_itto_templates is the one to keep: ITTO (Inputs/Tools & Techniques/Outputs) is
-- PMBOK/Standards-Based terminology, not a Structured/PRINCE2 concept, so its home under
-- Standards-Based's "ITTO Framework" is the correct classification — and it's the fuller-
-- featured branch (siblings Drafts/Project alongside Templates, matching the ITTO Framework
-- children already confirmed live and active). plat_s_itto is the stale, mis-homed single-leaf
-- duplicate — deactivated here, not deleted (same precedent as v963a/v965: same underlying
-- feature, just a redundant/misplaced menu entry point).
-- ============================================================================

UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_s_itto'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code = 'plat_s_itto'
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1039: plat_s_itto (stale Structured-track ITTO Templates duplicate) deactivated; plat_pm_p_itto_templates under ITTO Framework kept as canonical';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, is_active, is_visible,
--     (SELECT menu_code FROM public.menu_items p WHERE p.id = m.parent_menu_id) AS parent_code
--   FROM public.menu_items m
--   WHERE menu_code IN ('plat_s_itto', 'plat_pm_p_itto_templates', 'plat_grp_pm_itto');
--   -- expect: plat_s_itto is_active=false; plat_pm_p_itto_templates and plat_grp_pm_itto both
--   -- is_active=true.
