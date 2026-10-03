-- ============================================================================
-- v1064: Working Days & Holidays discoverability (v1066)
-- ============================================================================
-- projectprd/v1066_working_days_holidays_discoverability_PRD.md
-- projectplan/v1066_working_days_holidays_discoverability_plan.md
--
-- 1) Rename Calendar leaves (Platform + Simulator)
-- 2) Project Setup → Working Days & Holidays (dual-location → same calendar route)
-- 3) Copy grants from pm_project_calendar
-- Simulator: rename only (no Project Setup root in sim menus today)
-- ============================================================================

-- ── Platform renames ──────────────────────────────────────────────────────────

UPDATE public.menu_items
SET
  menu_label = 'Working Days',
  menu_description = 'Working days and weekends (non-working weekdays) for this project.',
  updated_at = NOW()
WHERE menu_code = 'pm_project_calendar'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET
  menu_label = 'Public Holidays & Exceptions',
  menu_description = 'Public holidays and other calendar exceptions for this project.',
  updated_at = NOW()
WHERE menu_code = 'pm_project_calendar_exceptions'
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── Project Setup leaf (second location) ──────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'plat_pm_s_working_days_holidays',
  'Working Days & Holidays',
  'Working days, weekends, and a link to public holidays for this project (same schedule calendar as Calendar → Working Days).',
  (SELECT route_path FROM public.menu_items WHERE menu_code = 'pm_project_calendar' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 76, 'universal', 'calendar-days', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_s_working_days_holidays' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'pm_project_calendar' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Keep route in sync if leaf already existed
UPDATE public.menu_items dst
SET
  menu_label = 'Working Days & Holidays',
  menu_description = 'Working days, weekends, and a link to public holidays for this project (same schedule calendar as Calendar → Working Days).',
  route_path = src.route_path,
  parent_menu_id = COALESCE(
    (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
    dst.parent_menu_id
  ),
  is_active = TRUE,
  is_visible = TRUE,
  updated_at = NOW()
FROM public.menu_items src
WHERE dst.menu_code = 'plat_pm_s_working_days_holidays'
  AND COALESCE(dst.is_deleted, FALSE) = FALSE
  AND src.menu_code = 'pm_project_calendar'
  AND COALESCE(src.is_deleted, FALSE) = FALSE;

-- Grants: copy from pm_project_calendar (dedupe roles)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (src.role_id, dst.id)
    src.role_id,
    dst.id AS menu_item_id
  FROM public.role_menu_items src
  JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'pm_project_calendar'
  JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_s_working_days_holidays'
    AND COALESCE(dst.is_deleted, FALSE) = FALSE
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
  ORDER BY src.role_id, dst.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── Simulator renames ─────────────────────────────────────────────────────────

UPDATE public.menu_items
SET
  menu_label = 'Working Days',
  menu_description = 'Working days and weekends (non-working weekdays) for this practice project.',
  updated_at = NOW()
WHERE menu_code = 'sim_pp_project_calendar'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET
  menu_label = 'Public Holidays & Exceptions',
  menu_description = 'Public holidays and other calendar exceptions for this practice project.',
  updated_at = NOW()
WHERE menu_code = 'sim_pp_project_calendar_exceptions'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE 'v1064: Working Days / Public Holidays & Exceptions labels + Project Setup leaf wired';
END $$;
