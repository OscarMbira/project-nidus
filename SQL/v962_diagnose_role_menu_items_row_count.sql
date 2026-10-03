-- ============================================================================
-- v962: Diagnostic ONLY — confirms or rules out a silent PostgREST default row-limit truncation
-- on role_menu_items fetches for this account's roles.
-- ============================================================================

SELECT COUNT(*) AS total_role_menu_items_for_your_roles
FROM public.role_menu_items rmi
JOIN public.roles r ON r.id = rmi.role_id
JOIN public.user_roles ur ON ur.role_id = r.id AND ur.is_active = TRUE
JOIN public.users u ON u.id = ur.user_id
WHERE u.full_name = 'Mojaa Makanaka'
  AND rmi.can_view = TRUE
  AND rmi.is_active = TRUE
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;
