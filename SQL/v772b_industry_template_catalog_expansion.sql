-- =============================================================================
-- v772b: Industry Template Catalog Expansion (30 → 50) — POINTER ONLY
-- Plan: projectplan/v772_industry_template_springboard_content_plan.md Phase 0
-- Source draft: projectplan/v772c_new_industry_content_draft.md
--
-- THIS FILE DOES NOT INSERT INDUSTRIES.
-- Apply instead:
--   SQL/v772b_seed/batches/batch_01_of_05.sql
--   … through batch_05_of_05.sql
-- Then Admin:
--   E:\project-nidus-admin\SQL\v169_global_template_v772b_industries_catchup.sql
-- Regenerate: node scripts/generate-v772b-industry-expansion.mjs
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'v772b POINTER ONLY — run SQL/v772b_seed/batches/*.sql then Admin SQL/v169_…catchup.sql';
  RAISE NOTICE 'Example industry: insurance_underwriting (Insurance & Underwriting Transformation)';
END $$;
