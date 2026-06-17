-- =============================================================================
-- v675: Nuclear PMO sidebar category rebuild
--
-- Root cause: pmo-cat-* category container rows were seeded into menu_items
-- by earlier migrations. The sidebar transform is designed to generate these
-- VIRTUALLY at runtime — having them as real DB rows corrupts the hierarchy
-- (e.g. pmo-cat-delivery-management appears as a real expandable section with
-- pmo-cat-financial-commercial and pmo-cat-risk-issues-quality as its children).
--
-- Fix:
--   1. Re-parent any leaf items (route_path IS NOT NULL) that are buried under
--      pmo-cat-* category container nodes → make them root-level (parent_menu_id = NULL).
--   2. Deactivate all pmo-cat-* rows that are pure category containers (no route_path).
--      The runtime transform creates these virtually — the DB rows are redundant and harmful.
--   3. Update methodology tags on newly-rooted items.
-- =============================================================================

-- ─── STEP 1: Surface leaf items buried under pmo-cat-delivery-management ─────

-- 1a. Direct children of pmo-cat-delivery-management that have a route
UPDATE public.menu_items AS child
SET
  parent_menu_id = NULL,
  menu_level     = 1,
  updated_at     = NOW()
FROM public.menu_items AS parent
WHERE child.parent_menu_id  = parent.id
  AND parent.menu_code       = 'pmo-cat-delivery-management'
  AND child.route_path IS NOT NULL
  AND child.route_path <> ''
  AND COALESCE(child.is_deleted,  FALSE) = FALSE
  AND COALESCE(parent.is_deleted, FALSE) = FALSE;

-- 1b. Grandchildren of pmo-cat-delivery-management (e.g. items under pmo-cat-financial-commercial)
UPDATE public.menu_items AS leaf
SET
  parent_menu_id = NULL,
  menu_level     = 1,
  updated_at     = NOW()
FROM public.menu_items AS mid
JOIN public.menu_items AS dm ON dm.id = mid.parent_menu_id
WHERE leaf.parent_menu_id   = mid.id
  AND dm.menu_code            = 'pmo-cat-delivery-management'
  AND leaf.route_path IS NOT NULL
  AND leaf.route_path <> ''
  AND COALESCE(leaf.is_deleted, FALSE) = FALSE
  AND COALESCE(mid.is_deleted,  FALSE) = FALSE
  AND COALESCE(dm.is_deleted,   FALSE) = FALSE;

-- 1c. Surface any items under pmo-cat-financial-commercial regardless of parent
UPDATE public.menu_items AS child
SET
  parent_menu_id = NULL,
  menu_level     = 1,
  updated_at     = NOW()
FROM public.menu_items AS cat
WHERE child.parent_menu_id = cat.id
  AND cat.menu_code          = 'pmo-cat-financial-commercial'
  AND child.route_path IS NOT NULL
  AND child.route_path <> ''
  AND COALESCE(child.is_deleted, FALSE) = FALSE
  AND COALESCE(cat.is_deleted,   FALSE) = FALSE;

-- 1d. Surface any items under pmo-cat-risk-issues-quality regardless of parent
UPDATE public.menu_items AS child
SET
  parent_menu_id = NULL,
  menu_level     = 1,
  updated_at     = NOW()
FROM public.menu_items AS cat
WHERE child.parent_menu_id = cat.id
  AND cat.menu_code          = 'pmo-cat-risk-issues-quality'
  AND child.route_path IS NOT NULL
  AND child.route_path <> ''
  AND COALESCE(child.is_deleted, FALSE) = FALSE
  AND COALESCE(cat.is_deleted,   FALSE) = FALSE;

-- ─── STEP 2: Deactivate ALL pmo-cat-* container rows (no route_path) ─────────
-- These should be virtual nodes built by applyRoleSidebarRevamp at runtime.
-- Having them as real DB rows creates duplicate / misplaced sections.

UPDATE public.menu_items
SET
  is_active  = FALSE,
  is_visible = FALSE,
  updated_at = NOW()
WHERE menu_code LIKE 'pmo-cat-%'
  AND (route_path IS NULL OR route_path = '')
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 3: Deactivate pmo-cat-structured / methodology track rows if present ─
-- These methodology track headers are also virtual — never DB rows.

UPDATE public.menu_items
SET
  is_active  = FALSE,
  is_visible = FALSE,
  updated_at = NOW()
WHERE menu_code IN (
  'pmo-cat-structured',
  'pmo-cat-pmbok-track',
  'pmo-cat-agile-track',
  'pmo-cat-delivery-management',
  'pmo-cat-financial-commercial',
  'pmo-cat-risk-issues-quality',
  'pmo-cat-delivery-controls-group',
  'pmo-cat-project-oversight-group'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 4: Tag newly-surfaced root items with correct methodology ───────────

-- Financial items → methodology = universal (they route to reporting-intelligence)
UPDATE public.menu_items
SET methodology = 'universal', updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND parent_menu_id IS NULL
  AND (route_path IS NOT NULL AND route_path <> '')
  AND methodology IS NULL
  AND (
    route_path ILIKE '%financial%'
    OR route_path ILIKE '%expense%'
    OR route_path ILIKE '%budget%'
    OR route_path ILIKE '%evm%'
  );

-- Risk/issue items → methodology = universal (they route to project-delivery)
UPDATE public.menu_items
SET methodology = 'universal', updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND parent_menu_id IS NULL
  AND (route_path IS NOT NULL AND route_path <> '')
  AND methodology IS NULL
  AND (
    menu_label ILIKE '%risk register%'
    OR menu_label ILIKE '%issue register%'
    OR menu_label ILIKE '%issue log%'
  );

-- ─── STEP 5: Apply same cleanup to sim schema if applicable ──────────────────

UPDATE public.menu_items
SET
  is_active  = FALSE,
  is_visible = FALSE,
  updated_at = NOW()
WHERE menu_code LIKE 'sim-pmo-cat-%'
  AND (route_path IS NULL OR route_path = '')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v675_nuclear_menu_category_rebuild.sql applied successfully';
END $$;
