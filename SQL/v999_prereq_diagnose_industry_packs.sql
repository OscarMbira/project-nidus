-- ============================================================================
-- v999-prereq: Diagnose industry pack rename chain
-- ============================================================================
-- Run in the SAME Supabase project as Platform. Apply MISSING files in order,
-- then finish with v999.
--
-- Required order for the "... Pack" sidebar rename:
--   1) v906_industry_categories_schema.sql
--   2) v907_industry_role_catalog_seed_data.sql   (industry names / seed)
--   3) v918_industry_segments_and_account_industries_schema.sql
--   4) v920_industry_packs_schema.sql
--   5) v921_industry_packs_content_seed.sql
--   6) v946_industry_master_expansion.sql         (expanded industry names)
--   7) v999_industry_pack_names_drop_pack_suffix.sql
-- ============================================================================

SELECT
  CASE WHEN to_regclass('public.industry_categories') IS NULL
       THEN 'MISSING — run SQL/v906_industry_categories_schema.sql NEXT'
       ELSE 'OK' END AS step1_industry_categories,
  CASE WHEN to_regclass('public.account_industries') IS NULL
       THEN 'MISSING — run SQL/v918_industry_segments_and_account_industries_schema.sql (after v906)'
       ELSE 'OK' END AS step3_account_industries,
  CASE WHEN to_regclass('public.industry_packs') IS NULL
       THEN 'MISSING — run SQL/v920_industry_packs_schema.sql (after v906 + v918)'
       ELSE 'OK' END AS step4_industry_packs,
  CASE WHEN to_regclass('public.industry_pack_menu_items') IS NULL
       THEN 'MISSING — created by v920'
       ELSE 'OK' END AS step4b_industry_pack_menu_items;

DO $$
BEGIN
  IF to_regclass('public.industry_categories') IS NULL THEN
    RAISE NOTICE 'Stop here. Run v906_industry_categories_schema.sql first, then re-check.';
  ELSIF to_regclass('public.industry_packs') IS NULL THEN
    RAISE NOTICE 'industry_categories OK. Next: v918 (if needed), then v920, v921, v946, v999.';
  ELSE
    RAISE NOTICE 'industry_packs exists. Run v921/v946 if needed, then v999.';
  END IF;
END $$;
