-- ============================================================================
-- v1192: Move Environments from Testing to Project Setup
-- ============================================================================
-- Capturing target environments is a project-setup activity. v1191 inserted
-- plat_pm_testing_environments under Testing. This moves that same item under
-- Project Setup. The page route stays /platform/testing/environments.
-- Run this after v1191.
-- ============================================================================

UPDATE public.menu_items AS child
SET
    parent_menu_id = parent.id,
    menu_level = parent.menu_level + 1,
    sort_order = 85,
    menu_description = 'Target environments a test suite can run against. Captured during project setup (v1192).',
    updated_at = NOW()
FROM public.menu_items AS parent
WHERE child.menu_code = 'plat_pm_testing_environments'
  AND COALESCE(child.is_deleted, FALSE) = FALSE
  AND parent.menu_code = 'plat_pm_project_setup'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE;

-- Anyone who can open Project Details can open Environments.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
    SELECT DISTINCT ON (src.role_id, dst.id)
        src.role_id,
        dst.id AS menu_item_id
    FROM public.role_menu_items src
    JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_project_details'
    JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_testing_environments' AND COALESCE(dst.is_deleted, FALSE) = FALSE
    WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
    ORDER BY src.role_id, dst.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
