-- ============================================================================
-- v1571 — Show Quantitative analysis inside Schedule (v1355)
-- v1569 placed plat_pm_qra as its own Plan & Schedule row, so it did not appear
-- in the Schedule submenu (Activity Register, Gantt, Workload, …).
-- This parents it under Schedule and grants it to the same roles as Activity Register.
-- Idempotent. Safe to re-run.
-- ============================================================================

UPDATE public.menu_items AS q
   SET parent_menu_id = p.id,
       menu_level = 4,
       sort_order = 70,
       is_active = TRUE,
       is_visible = TRUE,
       updated_at = NOW()
  FROM public.menu_items AS p
 WHERE q.menu_code = 'plat_pm_qra'
   AND p.menu_code = 'plat_pm_planning_schedule'
   AND COALESCE(p.is_deleted, FALSE) = FALSE
   AND COALESCE(q.is_deleted, FALSE) = FALSE;

-- A placement of its own pulls it out of the Schedule submenu. The Schedule
-- row is already placed in Plan & Schedule, and this page hangs off that row.
DELETE FROM public.menu_item_placements pl
 USING public.menu_items mi
 WHERE pl.menu_item_id = mi.id
   AND mi.menu_code = 'plat_pm_qra';

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_planning_activities'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_qra' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
