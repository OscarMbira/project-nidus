-- ============================================================================
-- v1194: Restore the Quality and Testing sections of the Core PM menu
-- ============================================================================
-- Several PM menu rows (plat_pm_quality_*, plat_pm_testing_*, plat_pm_testing_centre)
-- point at parent rows that no longer exist, so the sidebar never shows them.
-- This recreates the missing parents under their original ids (so the existing
-- children re-attach without being moved) and copies role grants to the restored
-- parents from their children. Nothing is deleted. Safe to re-run.
--
--   6f46a9bc-…  was the Quality section    -> plat_pm_quality (L1, Quality)
--   cdade5c5-…  was the Test group          -> plat_pm_testing_mgmt (L2, Test Management)
--   plus a new  plat_pm_testing (L1, Testing) root above Test Management
-- Taxonomy §3: Quality and Testing are top-level Core PM sections.
-- ============================================================================

-- 1) Quality root (original id)
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_system_menu, is_active, is_deleted, methodology, created_at, updated_at)
VALUES ('6f46a9bc-08ca-4708-9341-8f24e53b601b', 'plat_pm_quality', 'Quality',
    'Quality plan, reviews, acceptance and non-conformance (taxonomy §3, Quality).', NULL, 1, 60,
    NULL, 'shield-check', TRUE, FALSE, TRUE, FALSE, 'universal', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    menu_code = EXCLUDED.menu_code, menu_label = EXCLUDED.menu_label, parent_menu_id = NULL,
    menu_level = 1, sort_order = EXCLUDED.sort_order, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- 2) Testing root (new id, looked up by code so re-runs do not duplicate it)
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_system_menu, is_active, is_deleted, methodology, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_pm_testing', 'Testing',
    'Test planning, cases, execution, defects and evidence (taxonomy §3, Testing).', NULL, 1, 70,
    NULL, 'flask-conical', TRUE, FALSE, TRUE, FALSE, 'universal', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_testing');

-- 3) Test Management group (original id) under the Testing root
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_system_menu, is_active, is_deleted, methodology, created_at, updated_at)
SELECT 'cdade5c5-c49f-4dd2-925c-7d733f3e5d27', 'plat_pm_testing_mgmt', 'Test Management',
    'Test planning, cases, execution, defects and evidence (restored in v1194).',
    t.id, 2, 10, NULL, 'list-checks', TRUE, FALSE, TRUE, FALSE, 'universal', NOW(), NOW()
FROM public.menu_items t
WHERE t.menu_code = 'plat_pm_testing'
ON CONFLICT (id) DO UPDATE SET
    menu_code = EXCLUDED.menu_code, menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = 2, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- 4) Re-attach the Test-group leaves that were orphaned, and fix their level to match
UPDATE public.menu_items
SET parent_menu_id = 'cdade5c5-c49f-4dd2-925c-7d733f3e5d27', updated_at = NOW()
WHERE menu_code IN ('plat_pm_testing_plan', 'plat_pm_testing_cases', 'plat_pm_testing_exec',
                    'plat_pm_testing_defects', 'plat_pm_testing_evidence');

-- 5) Quality children were attached to the restored Quality root; keep their levels consistent
UPDATE public.menu_items
SET menu_level = 2, updated_at = NOW()
WHERE parent_menu_id = '6f46a9bc-08ca-4708-9341-8f24e53b601b'
  AND menu_level <> 2;

-- 6) Grants: roles that can see any child of a restored parent also see the parent
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
    SELECT DISTINCT ON (rmi.role_id, p.id)
        rmi.role_id,
        p.id AS menu_item_id
    FROM public.role_menu_items rmi
    JOIN public.menu_items child ON child.id = rmi.menu_item_id
    JOIN public.menu_items p ON p.id = child.parent_menu_id
    WHERE rmi.can_view = TRUE AND rmi.is_active = TRUE
      AND p.menu_code IN ('plat_pm_quality', 'plat_pm_testing', 'plat_pm_testing_mgmt')
    ORDER BY rmi.role_id, p.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- 7) Testing root is the parent of Test Management: grant it to the same roles
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, t.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
    SELECT DISTINCT rmi.role_id
    FROM public.role_menu_items rmi
    JOIN public.menu_items m ON m.id = rmi.menu_item_id
    WHERE m.menu_code = 'plat_pm_testing_mgmt' AND rmi.can_view = TRUE AND rmi.is_active = TRUE
) x
CROSS JOIN public.menu_items t
WHERE t.menu_code = 'plat_pm_testing'
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Verify: no PM row should now point at a missing parent.
-- SELECT menu_code FROM public.menu_items c
-- WHERE c.menu_code LIKE 'plat_pm_%' AND c.parent_menu_id IS NOT NULL
--   AND NOT EXISTS (SELECT 1 FROM public.menu_items p WHERE p.id = c.parent_menu_id);
