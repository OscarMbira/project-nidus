-- ============================================================================
-- v946b: Fix — remove the redundant "General Project Management" industry_categories row
-- ============================================================================
-- SQL/v946_industry_master_expansion.sql mistakenly inserted a new "General Project Management"
-- industry_categories row. This duplicates the EXISTING "Cross-Industry" row, whose pack is
-- already named "General Project Management" (v921's own seed: "The generic PM core — always
-- available regardless of which industries an organisation selects"). The taxonomy's GEN section
-- (Core_PM_and_Industry_Menu_Taxonomy.md Section 15) explicitly says GEN contributes no new
-- registers, just the generic core — which is exactly what Cross-Industry already is. No
-- organisation could have selected the new row yet (this migration runs immediately after
-- v946, in the same session) — safe to hard-delete rather than soft-deactivate.
-- ============================================================================

DELETE FROM public.industry_packs
WHERE industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'General Project Management'
);

DELETE FROM public.industry_categories
WHERE name = 'General Project Management';

DO $$
DECLARE
  v_categories INT;
BEGIN
  SELECT COUNT(*) INTO v_categories FROM public.industry_categories WHERE is_active = TRUE;
  RAISE NOTICE 'v946b: removed redundant General Project Management row — % active industry_categories rows remain', v_categories;
END $$;

-- Read-only verification — full current industry list.
SELECT ic.name AS industry, ip.pack_code, ip.pack_name
FROM public.industry_categories ic
JOIN public.industry_packs ip ON ip.industry_category_id = ic.id
WHERE ic.is_active = TRUE
ORDER BY ic.name;
