-- =============================================================================
-- v674: Fix PMO sidebar category parent-child relationships
--
-- Problem: pmo-cat-financial-commercial and pmo-cat-risk-issues-quality were
-- stored in menu_items as children of pmo-cat-delivery-management. This caused
-- the sidebar transform to place them inside Delivery Management instead of as
-- separate top-level categories.
--
-- Fix: Detach these category rows from pmo-cat-delivery-management by setting
-- their parent_menu_id to NULL so they become root-level items that the transform
-- classifies into the correct top-level category buckets.
-- =============================================================================

-- 1. Detach Financial & Commercial from Delivery Management
UPDATE public.menu_items
SET
  parent_menu_id = NULL,
  menu_level = 1,
  updated_at = NOW()
WHERE
  COALESCE(is_deleted, FALSE) = FALSE
  AND menu_code IN ('pmo-cat-financial-commercial')
  AND parent_menu_id = (
    SELECT id FROM public.menu_items
    WHERE menu_code = 'pmo-cat-delivery-management'
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1
  );

-- 2. Detach Risk, Issues & Quality from Delivery Management
UPDATE public.menu_items
SET
  parent_menu_id = NULL,
  menu_level = 1,
  updated_at = NOW()
WHERE
  COALESCE(is_deleted, FALSE) = FALSE
  AND menu_code IN ('pmo-cat-risk-issues-quality')
  AND parent_menu_id = (
    SELECT id FROM public.menu_items
    WHERE menu_code = 'pmo-cat-delivery-management'
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1
  );

-- 3. Broader safety: detach any other non-delivery-management pmo-cat-* nodes
-- that are incorrectly children of pmo-cat-delivery-management.
-- Only detach category nodes (pmo-cat-* codes) — not actual navigable menu items.
UPDATE public.menu_items AS child
SET
  parent_menu_id = NULL,
  menu_level = 1,
  updated_at = NOW()
FROM public.menu_items AS parent
WHERE
  child.parent_menu_id = parent.id
  AND parent.menu_code = 'pmo-cat-delivery-management'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND COALESCE(child.is_deleted, FALSE) = FALSE
  AND child.menu_code LIKE 'pmo-cat-%'
  AND child.menu_code NOT IN (
    'pmo-cat-portfolio',
    'pmo-cat-programme',
    'pmo-cat-projects',
    'pmo-cat-project-oversight',
    'pmo-cat-delivery-controls',
    'pmo-cat-agile-lean'
  );

-- 4. Similarly fix simulator: ensure sim equivalents are not wrongly nested
UPDATE public.menu_items AS child
SET
  parent_menu_id = NULL,
  menu_level = 1,
  updated_at = NOW()
FROM public.menu_items AS parent
WHERE
  child.parent_menu_id = parent.id
  AND parent.menu_code = 'sim-pmo-cat-delivery-management'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND COALESCE(child.is_deleted, FALSE) = FALSE
  AND child.menu_code LIKE 'sim-pmo-cat-%'
  AND child.menu_code NOT IN (
    'sim-pmo-cat-portfolio',
    'sim-pmo-cat-programme',
    'sim-pmo-cat-projects',
    'sim-pmo-cat-project-oversight',
    'sim-pmo-cat-delivery-controls',
    'sim-pmo-cat-agile-lean'
  );

-- 5. Tag newly detached category rows as universal so the transform recognises them
UPDATE public.menu_items
SET
  methodology = 'universal',
  updated_at = NOW()
WHERE
  COALESCE(is_deleted, FALSE) = FALSE
  AND parent_menu_id IS NULL
  AND menu_code LIKE 'pmo-cat-%'
  AND (methodology IS NULL OR methodology = 'universal');

DO $$ BEGIN RAISE NOTICE 'v674_fix_pmo_category_parent_relationships.sql applied'; END $$;
