-- ============================================================================
-- v1268 rollback (feature v1265): restore the sidebar labels renamed by v1268_rename_gantt_menus_plan_sheet.sql.
-- The forward script recorded each old label in menu_description ('renamed from "<old>"').
-- ============================================================================

UPDATE public.menu_items
   SET menu_label = substring(menu_description FROM 'renamed from "([^"]+)"'),
       menu_description = NULL,
       updated_at = NOW()
 WHERE COALESCE(is_deleted, FALSE) = FALSE
   AND menu_label = 'Plan Sheet'
   AND menu_description ~ 'renamed from "[^"]+", v1265';

SELECT menu_code, menu_label, route_path FROM public.menu_items
WHERE route_path ILIKE '%gantt%' AND COALESCE(is_deleted, FALSE) = FALSE ORDER BY menu_code;
