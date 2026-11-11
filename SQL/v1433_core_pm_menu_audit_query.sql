-- ============================================================================
-- v1433: Read-only audit query — Core Project Management sidebar menus
-- ============================================================================
-- Owner request 2026-11-11: audit the Core PM pages (Projects … Email & Notifications) before
-- adding fields and sample data. Lists every active Core PM menu (menu_code plat_pm_…) with its
-- section path and route, so each page can be matched to its form and database table.
-- Changes nothing. After running, export the result as CSV and save it as:
--   E:\project-nidus\CSV Files\core_pm_menu_audit.csv
-- ============================================================================

WITH RECURSIVE tree AS (
  SELECT m.id, m.menu_code, m.menu_label::text AS label, m.route_path, m.parent_menu_id, m.sort_order,
         m.menu_label::text AS path, 1 AS depth,
         lpad(COALESCE(m.sort_order, 0)::text, 6, '0') AS sort_key
  FROM public.menu_items m
  WHERE m.menu_code LIKE 'plat\_pm\_%'
    AND COALESCE(m.is_deleted, FALSE) = FALSE AND m.is_active = TRUE
    AND (m.parent_menu_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.menu_items p
      WHERE p.id = m.parent_menu_id AND p.menu_code LIKE 'plat\_pm\_%'
        AND COALESCE(p.is_deleted, FALSE) = FALSE AND p.is_active = TRUE))
  UNION ALL
  SELECT c.id, c.menu_code, c.menu_label::text, c.route_path, c.parent_menu_id, c.sort_order,
         t.path || ' › ' || c.menu_label::text, t.depth + 1,
         t.sort_key || '.' || lpad(COALESCE(c.sort_order, 0)::text, 6, '0')
  FROM public.menu_items c
  JOIN tree t ON c.parent_menu_id = t.id
  WHERE COALESCE(c.is_deleted, FALSE) = FALSE AND c.is_active = TRUE AND t.depth < 6
)
SELECT depth, path, menu_code, route_path
FROM tree
ORDER BY sort_key;
