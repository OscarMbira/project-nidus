-- =============================================================================
-- v729: Remove billing menus from pmo_admin; keep for account_owner
-- Prerequisites: v681/v683 menu hierarchy
-- =============================================================================

-- Soft-delete legacy Administration Subscription leaf for all roles
UPDATE public.menu_items
SET is_deleted = TRUE, is_active = FALSE, updated_at = NOW()
WHERE menu_code IN ('pmo-admin-subscription', 'plat_admin_subscription')
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- Remove plat_sec_account + plat_acct_* from pmo_admin role assignments
UPDATE public.role_menu_items rmi
SET is_active = FALSE, is_deleted = TRUE, updated_at = NOW()
FROM public.roles r, public.menu_items mi
WHERE rmi.role_id = r.id
  AND rmi.menu_item_id = mi.id
  AND r.role_name = 'pmo_admin'
  AND (
    mi.menu_code LIKE 'plat_sec_account'
    OR mi.menu_code LIKE 'plat_acct_%'
    OR mi.menu_code IN ('pmo-admin-subscription', 'plat_admin_subscription')
  )
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

-- Ensure account_owner retains Account & Subscription section
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'account_owner'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE (
  mi.menu_code LIKE 'plat_sec_account'
  OR mi.menu_code LIKE 'plat_acct_%'
)
AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v729: billing menus removed from pmo_admin; account_owner billing menus confirmed';
END $$;
