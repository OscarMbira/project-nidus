-- ============================================================================
-- v922: SaaS Industry-Aware Tenant Provisioning — Phase 2 (existing-tenant migration)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md, decision 9.
--
-- Every account that existed before this feature shipped gets backfilled to the
-- "Cross-Industry" / General Project Management fallback pack as its primary industry.
-- This deliberately does NOT read/guess from accounts.metadata.industry (the old,
-- disconnected 11-item hardcoded list) — the brief is explicit that assigning a specific
-- real industry to an existing tenant based on that old value would be guesswork, not a
-- safe migration. Nothing is forced on the user; a dismissible prompt inviting them to pick
-- a real industry lives in the Organisation Settings UI (Phase 7), not in this migration.
--
-- Idempotent: only inserts for accounts with zero account_industries rows; safe to re-run.
-- Prerequisites: v918 (account_industries), v921 (industry_packs seeded, so the fallback
-- pack/category actually exists before this runs)
-- ============================================================================

DO $$
DECLARE
  v_cross_industry_id UUID;
  v_backfilled_count  INT;
BEGIN
  SELECT id INTO v_cross_industry_id
  FROM public.industry_categories
  WHERE name = 'Cross-Industry' AND is_active = TRUE
  LIMIT 1;

  IF v_cross_industry_id IS NULL THEN
    RAISE EXCEPTION 'v922: Cross-Industry industry_categories row not found — run v906/v907 first';
  END IF;

  INSERT INTO public.account_industries (account_id, industry_category_id, is_primary, added_by)
  SELECT a.id, v_cross_industry_id, TRUE, NULL
  FROM public.accounts a
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM public.account_industries ai WHERE ai.account_id = a.id
    )
  ON CONFLICT (account_id, industry_category_id) DO NOTHING;

  GET DIAGNOSTICS v_backfilled_count = ROW_COUNT;
  RAISE NOTICE 'v922: backfilled % existing account(s) to the Cross-Industry / General Project Management fallback pack', v_backfilled_count;
END $$;
