-- ============================================================================
-- v961: Diagnostic ONLY — no data changes. Your SQL client only shows the LAST statement's
-- result when running a multi-statement script — this version combines everything into ONE
-- query (UNION ALL) so it all shows in a single Results table. Run this one query and paste
-- back the whole table.
-- ============================================================================

SELECT '1. delivery_team group role count (expect 13)' AS check_name,
  (SELECT COUNT(*)::text FROM public.menu_role_grant_groups WHERE group_code = 'delivery_team') AS result
UNION ALL
SELECT '2. grant_menu_role_group() function exists (expect 1)',
  (SELECT COUNT(*)::text FROM pg_proc WHERE proname = 'grant_menu_role_group')
UNION ALL
SELECT '3. new local_registers rows (expect 382)',
  (SELECT COUNT(*)::text FROM public.local_registers WHERE id::text LIKE '00000000-0000-4000-90%')
UNION ALL
SELECT '4. new category menu_items rows (expect 120)',
  (SELECT COUNT(*)::text FROM public.menu_items WHERE menu_code ~ '^(fin|con|ict|hlt|gov|tel|enr|mfg|edu|ngo|ret|mkt|hrm|lco)_cat_')
UNION ALL
SELECT '5. new register menu_items rows (expect 382)',
  (SELECT COUNT(*)::text FROM public.menu_items WHERE menu_code ~ '^(fin|con|ict|hlt|gov|tel|enr|mfg|edu|ngo|ret|mkt|hrm|lco)_reg_')
UNION ALL
SELECT '6. reuse-link menu_items rows (expect 23)',
  (SELECT COUNT(*)::text FROM public.menu_items WHERE menu_code ~ '^(ict|mkt|hrm|lco)_reuse_')
UNION ALL
SELECT '7. role_menu_items grants for new CATEGORY items (expect >0, ideally 120 x however many roles matched)',
  (SELECT COUNT(*)::text FROM public.role_menu_items rmi JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
   WHERE mi.menu_code ~ '^(fin|con|ict|hlt|gov|tel|enr|mfg|edu|ngo|ret|mkt|hrm|lco)_cat_')
UNION ALL
SELECT '8. role_menu_items grants for new REGISTER items (expect >0)',
  (SELECT COUNT(*)::text FROM public.role_menu_items rmi JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
   WHERE mi.menu_code ~ '^(fin|con|ict|hlt|gov|tel|enr|mfg|edu|ngo|ret|mkt|hrm|lco)_reg_')
UNION ALL
SELECT '9. industry_pack_menu_items links (expect ~405)',
  (SELECT COUNT(*)::text FROM public.industry_pack_menu_items ipmi JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id
   WHERE mi.menu_code ~ '^(fin|con|ict|hlt|gov|tel|enr|mfg|edu|ngo|ret|mkt|hrm|lco)_(reg|cat|reuse)_')
UNION ALL
SELECT '10. your role name(s) + whether in delivery_team group',
  (SELECT string_agg(r.role_name || '=' ||
    (EXISTS (SELECT 1 FROM public.menu_role_grant_groups g WHERE g.group_code = 'delivery_team'
      AND g.role_name_normalized = lower(replace(r.role_name, ' ', '_'))))::text, ', ')
   FROM public.users u
   JOIN public.user_roles ur ON ur.user_id = u.id AND ur.is_active = TRUE
   JOIN public.roles r ON r.id = ur.role_id
   WHERE u.full_name = 'Mojaa Makanaka');
