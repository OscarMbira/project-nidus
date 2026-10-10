-- ============================================================================
-- v1199: Remove the Test Management wrapper; keep its children under Testing
-- ============================================================================
-- v1194 put Test Planning, Test Cases, Test Execution, Defects, and Evidence
-- under plat_pm_testing_mgmt (Test Management), which itself sat under Testing.
-- Taxonomy §3 has those items directly under Testing. This moves every child of
-- Test Management onto Testing and retires the wrapper.
--
-- Re-running v1194 after this file puts Test Management back. Run this file
-- again if that happens. Safe to re-run on its own.
-- ============================================================================

-- 1) Children of Test Management become children of Testing
UPDATE public.menu_items AS child
SET parent_menu_id = testing.id,
    menu_level = COALESCE(testing.menu_level, 1) + 1,
    updated_at = NOW()
FROM public.menu_items AS mgmt
JOIN public.menu_items AS testing
  ON testing.menu_code = 'plat_pm_testing'
 AND COALESCE(testing.is_deleted, FALSE) = FALSE
WHERE mgmt.menu_code = 'plat_pm_testing_mgmt'
  AND child.parent_menu_id = mgmt.id
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- 2) One level below those (Repository, Suites, Defect Register, …) stays aligned
UPDATE public.menu_items AS grand
SET menu_level = parent.menu_level + 1,
    updated_at = NOW()
FROM public.menu_items AS parent
WHERE grand.parent_menu_id = parent.id
  AND parent.menu_code IN (
    'plat_pm_testing_plan',
    'plat_pm_testing_cases',
    'plat_pm_testing_exec',
    'plat_pm_testing_defects',
    'plat_pm_testing_evidence'
  )
  AND COALESCE(grand.is_deleted, FALSE) = FALSE
  AND grand.menu_level IS DISTINCT FROM parent.menu_level + 1;

-- 3) Retire Test Management only after Testing exists, so the children are not orphaned
UPDATE public.menu_items
SET is_visible = FALSE,
    is_active = FALSE,
    is_deleted = TRUE,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_testing_mgmt'
  AND EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE menu_code = 'plat_pm_testing' AND COALESCE(is_deleted, FALSE) = FALSE
  );
