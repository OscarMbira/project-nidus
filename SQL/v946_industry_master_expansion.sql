-- ============================================================================
-- v946: Industry master data expansion — 9 -> 13 real industries + Cross-Industry
-- ============================================================================
-- Phase 1 of projectplan/v946_industry_capability_content_taxonomy_plan.md.
-- Reconciles public.industry_categories (v906/v907 seed) to
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md (12 industries) +
-- Documentation/Marketing_and_Creative_Menu_Taxonomy.md (13th, Marketing/Advertising/Creative).
--
-- 5 existing rows are RENAMED (label only — industry_category_id FK is unchanged everywhere,
-- so no organisation's selection, no local_register_industry_packs link, no role tagging is
-- affected): Financial Services -> Banking & Financial Services; IT & Software -> Information
-- Technology; Healthcare & Life Sciences -> Healthcare; Manufacturing & Operations ->
-- Manufacturing; Marketing & Creative -> Marketing, Advertising & Creative Services.
--
-- 4 rows are genuinely NEW: Telecommunications, NGO / Development, Retail, General Project
-- Management.
--
-- industry_packs.pack_code is derived from industry_categories.name at INSERT time (v921) and
-- has its own UNIQUE constraint independent of industry_category_id — renaming the category and
-- blindly re-running v921's pack-insert would derive a NEW pack_code for the renamed row and
-- INSERT A DUPLICATE pack (orphaning the old one, breaking every existing
-- local_register_industry_packs link that points at it). For the 5 renames this migration
-- explicitly UPDATEs the existing industry_packs row's pack_name/description in place,
-- deliberately leaving pack_code untouched. For the 4 new industries it inserts fresh pack rows
-- (safe — their derived pack_code cannot collide with anything existing).
-- ============================================================================

-- ── 1. Rename 5 existing industry_categories rows ──────────────────────────────────

UPDATE public.industry_categories SET name = 'Banking & Financial Services', updated_at = NOW()
  WHERE name = 'Financial Services';
UPDATE public.industry_categories SET name = 'Information Technology', updated_at = NOW()
  WHERE name = 'IT & Software';
UPDATE public.industry_categories SET name = 'Healthcare', updated_at = NOW()
  WHERE name = 'Healthcare & Life Sciences';
UPDATE public.industry_categories SET name = 'Manufacturing', updated_at = NOW()
  WHERE name = 'Manufacturing & Operations';
UPDATE public.industry_categories SET name = 'Marketing, Advertising & Creative Services', updated_at = NOW()
  WHERE name = 'Marketing & Creative';

-- ── 2. Update the corresponding industry_packs rows in place (pack_code unchanged) ─────

UPDATE public.industry_packs ip
SET pack_name = 'Banking & Financial Services Pack',
    description = 'Menu items and capabilities relevant to Banking & Financial Services organisations.',
    updated_at = NOW()
FROM public.industry_categories ic
WHERE ip.industry_category_id = ic.id AND ic.name = 'Banking & Financial Services';

UPDATE public.industry_packs ip
SET pack_name = 'Information Technology Pack',
    description = 'Menu items and capabilities relevant to Information Technology organisations.',
    updated_at = NOW()
FROM public.industry_categories ic
WHERE ip.industry_category_id = ic.id AND ic.name = 'Information Technology';

UPDATE public.industry_packs ip
SET pack_name = 'Healthcare Pack',
    description = 'Menu items and capabilities relevant to Healthcare organisations.',
    updated_at = NOW()
FROM public.industry_categories ic
WHERE ip.industry_category_id = ic.id AND ic.name = 'Healthcare';

UPDATE public.industry_packs ip
SET pack_name = 'Manufacturing Pack',
    description = 'Menu items and capabilities relevant to Manufacturing organisations.',
    updated_at = NOW()
FROM public.industry_categories ic
WHERE ip.industry_category_id = ic.id AND ic.name = 'Manufacturing';

UPDATE public.industry_packs ip
SET pack_name = 'Marketing, Advertising & Creative Services Pack',
    description = 'Menu items and capabilities relevant to Marketing, Advertising & Creative Services organisations.',
    updated_at = NOW()
FROM public.industry_categories ic
WHERE ip.industry_category_id = ic.id AND ic.name = 'Marketing, Advertising & Creative Services';

-- ── 3. Insert the 4 genuinely new industry_categories rows ─────────────────────────

INSERT INTO public.industry_categories (name, is_active)
VALUES
  ('Telecommunications', TRUE),
  ('NGO / Development', TRUE),
  ('Retail', TRUE),
  ('General Project Management', TRUE)
ON CONFLICT (name) WHERE is_active = TRUE DO UPDATE SET
  updated_at = NOW();

-- ── 4. Insert the 4 new industry_packs rows (safe — fresh pack_code, no collision risk) ──

INSERT INTO public.industry_packs (industry_category_id, pack_code, pack_name, description)
SELECT
  ic.id,
  lower(regexp_replace(regexp_replace(ic.name, '[^a-zA-Z0-9]+', '_', 'g'), '^_+|_+$', '', 'g')),
  ic.name || ' Pack',
  'Menu items and capabilities relevant to ' || ic.name || ' organisations.'
FROM public.industry_categories ic
WHERE ic.name IN ('Telecommunications', 'NGO / Development', 'Retail', 'General Project Management')
  AND ic.is_active = TRUE
ON CONFLICT (pack_code) DO UPDATE SET
  pack_name = EXCLUDED.pack_name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

DO $$
DECLARE
  v_categories INT;
  v_packs INT;
BEGIN
  SELECT COUNT(*) INTO v_categories FROM public.industry_categories WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_packs FROM public.industry_packs WHERE is_active = TRUE;
  RAISE NOTICE 'v946: % active industry_categories rows (expect 14: 13 real + Cross-Industry), % active industry_packs rows', v_categories, v_packs;
END $$;

-- Read-only verification — returns rows directly in the Results tab.
SELECT ic.name AS industry, ip.pack_code, ip.pack_name
FROM public.industry_categories ic
JOIN public.industry_packs ip ON ip.industry_category_id = ic.id
WHERE ic.is_active = TRUE
ORDER BY ic.name;
