-- =============================================================================
-- v710: Remove assigned work-package items from PMO layout roles
-- PMO administrators are not assigned personal/team work packages (TM/TL only).
-- Prerequisites: v681, v683
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
    'plat_tm_work_packages',
    'plat_tm_s_work_packages_ro',
    'plat_tl_work_packages'
  )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v710_remove_pmo_assigned_work_packages.sql applied';
END $$;
