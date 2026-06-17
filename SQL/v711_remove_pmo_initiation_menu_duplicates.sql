-- =============================================================================
-- v711: Remove duplicate initiation aggregate menu rows from PMO layout roles
-- Granular v671 leaves (All Mandates, All Briefs, …) supersede v681 plat_s_* /
-- plat_pm_s_* aggregate rows assigned to pmo_admin via v683.
-- Runtime dedupe: src/config/pmoMenuSemanticDedupe.js
-- =============================================================================

UPDATE public.role_menu_items AS rmi
SET is_active = FALSE,
    can_view = FALSE,
    can_use = FALSE,
    updated_at = NOW()
FROM public.roles AS r,
     public.menu_items AS mi
WHERE rmi.role_id = r.id
  AND rmi.menu_item_id = mi.id
  AND r.role_name IN ('pmo_admin', 'account_owner', 'org_admin', 'super_admin', 'system_admin')
  AND mi.menu_code IN (
    'plat_s_mandates',
    'plat_s_briefs',
    'plat_s_business_cases',
    'plat_s_pids',
    'plat_s_benefits_review',
    'plat_pm_s_mandate',
    'plat_pm_s_brief',
    'plat_pm_s_business_case',
    'plat_pm_s_pid',
    'plat_pm_s_benefits_rp',
    'pmo_init_project_mandate',
    'pmo_init_project_brief',
    'pmo_init_business_case',
    'pmo_init_benefits_review_plan'
  )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v711_remove_pmo_initiation_menu_duplicates.sql applied';
END $$;
