-- ============================================================================
-- v1024: Scope & Deliverables taxonomy group (Platform PM sidebar)
-- ============================================================================
-- Creates plat_pm_scope_deliverables; moves Scope Statement + WBS out of Planning;
-- adds PBS + Deliverable Register leaves. Labels/hierarchy live in menu_items only.
-- Grants copy from plat_pm_planning_scope_statement (or plat_pm_a_scurve fallback).
-- Requires packages/config PM_CATEGORY_DEFS entry for plat_pm_scope_deliverables.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_scope_deliverables', 'Scope & Deliverables',
  'Scope statement, product breakdown, work breakdown, and deliverable register (taxonomy §3).',
  NULL, NULL, 1, 24, 'universal', 'layers', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Move Scope Statement
UPDATE public.menu_items
SET parent_menu_id = (
      SELECT id FROM public.menu_items
      WHERE menu_code = 'plat_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    ),
    menu_level = 2,
    menu_label = 'Scope Statement',
    route_path = '/platform/scope/statement',
    sort_order = 10,
    methodology = 'universal',
    is_active = TRUE,
    is_visible = TRUE,
    is_deleted = FALSE,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_planning_scope_statement'
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- Move WBS (relabel)
UPDATE public.menu_items
SET parent_menu_id = (
      SELECT id FROM public.menu_items
      WHERE menu_code = 'plat_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    ),
    menu_level = 2,
    menu_label = 'Work Breakdown Structure',
    route_path = '/platform/scope/wbs',
    sort_order = 30,
    methodology = 'universal',
    is_active = TRUE,
    is_visible = TRUE,
    is_deleted = FALSE,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_planning_wbs'
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- PBS leaf
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_sd_pbs', 'Product Breakdown Structure',
  'Product breakdown tree with product descriptions and acceptance criteria.',
  '/platform/scope/pbs',
  (SELECT id FROM public.menu_items
   WHERE menu_code = 'plat_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, 20, 'universal', 'git-branch', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_sd_pbs' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Deliverable Register leaf
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_sd_deliverable_register', 'Deliverable Register',
  'Project deliverables by status: Planned, Submitted, Accepted, Rework / Rejected.',
  '/platform/deliverable-register',
  (SELECT id FROM public.menu_items
   WHERE menu_code = 'plat_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, 40, 'universal', 'package-check', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_sd_deliverable_register' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grants: copy from Scope Statement, else S-Curve (dedupe — ON CONFLICT cannot
-- update the same (role_id, menu_item_id) twice in one statement).
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), role_id, menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (src.role_id, dst.id)
    src.role_id,
    dst.id AS menu_item_id
  FROM public.role_menu_items src
  JOIN public.menu_items ref ON ref.id = src.menu_item_id
    AND ref.menu_code IN ('plat_pm_planning_scope_statement', 'plat_pm_a_scurve')
  JOIN public.menu_items dst ON dst.menu_code IN (
    'plat_pm_sd_pbs', 'plat_pm_sd_deliverable_register'
  ) AND COALESCE(dst.is_deleted, FALSE) = FALSE
  WHERE src.can_view = TRUE
    AND src.is_active = TRUE
    AND COALESCE(src.is_deleted, FALSE) = FALSE
  ORDER BY src.role_id, dst.id,
    CASE ref.menu_code WHEN 'plat_pm_planning_scope_statement' THEN 0 ELSE 1 END
) AS grants
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1024: Scope & Deliverables menu group ready';
END $$;

SELECT mi.menu_code, mi.menu_label, mi.sort_order, mi.route_path,
  p.menu_code AS parent_code
FROM public.menu_items mi
LEFT JOIN public.menu_items p ON p.id = mi.parent_menu_id
WHERE mi.menu_code IN (
  'plat_pm_scope_deliverables',
  'plat_pm_planning_scope_statement',
  'plat_pm_sd_pbs',
  'plat_pm_planning_wbs',
  'plat_pm_sd_deliverable_register'
)
AND COALESCE(mi.is_deleted, FALSE) = FALSE
ORDER BY COALESCE(mi.parent_menu_id::text, ''), mi.sort_order;
