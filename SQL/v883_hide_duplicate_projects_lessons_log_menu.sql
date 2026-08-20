-- =============================================================================
-- v883: Hide duplicate Lessons Log under Projects (Platform)
-- Prerequisites: v879 (Controls & Registers — Knowledge & Governance Lessons Log)
--
-- Keep Controls → Knowledge & Governance → Lessons Log:
--   plat_pm_lessons_ctrl  (route /pm/controls/lessons-log)
-- Soft-delete the older Projects-group duplicate:
--   plat_pm_lessons
--
-- Client fix (required): pmoMenuHierarchyUtils was also re-parenting ANY
-- "Lessons Log" label under Projects (prefix match on plat_pm_lessons + label
-- rule). That made Controls → Lessons Log appear under / highlight Projects even
-- after this SQL. Deploy the JS hierarchy fix with this migration.
-- Idempotent — safe to re-run.
-- =============================================================================

UPDATE public.menu_items
SET
  is_active = FALSE,
  is_visible = FALSE,
  is_deleted = TRUE,
  updated_at = NOW()
WHERE menu_code = 'plat_pm_lessons'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET
  is_active = FALSE,
  is_visible = FALSE,
  is_deleted = TRUE,
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND menu_code <> 'plat_pm_lessons_ctrl'
  AND route_path = '/pm/controls/lessons-log';

-- Ensure the Controls leaf stays under Knowledge & Governance (not Projects).
UPDATE public.menu_items
SET
  parent_menu_id = (
    SELECT id FROM public.menu_items
    WHERE menu_code = 'plat_pm_ctrl_knowledge'
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1
  ),
  menu_level = 4,
  sort_order = 10,
  route_path = '/pm/controls/lessons-log',
  is_active = TRUE,
  is_visible = TRUE,
  is_deleted = FALSE,
  updated_at = NOW()
WHERE menu_code = 'plat_pm_lessons_ctrl';
