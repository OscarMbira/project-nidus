-- ============================================================================
-- v999: Drop trailing " Pack" from industry_packs.pack_name (sidebar labels)
-- ============================================================================
-- Sidebar industry sections render industry_packs.pack_name as-is
-- (groupMenuTreeByIndustryPack). Users asked for labels like
-- "Information Technology" / "Banking & Financial Services" without the
-- redundant "Pack" suffix.
--
-- Prerequisite: public.industry_packs from SQL/v920_industry_packs_schema.sql
-- (then seed via v921 / rename content via v946 as applicable).
-- Run this on the SAME Supabase project the Platform app uses.
-- ============================================================================

DO $$
DECLARE
  v_updated INT := 0;
  v_remaining INT := 0;
BEGIN
  IF to_regclass('public.industry_packs') IS NULL THEN
    RAISE EXCEPTION
      'v999: public.industry_packs does not exist on this database. '
      'Run SQL/v920_industry_packs_schema.sql first (then v921_industry_packs_content_seed.sql '
      'and v946_industry_master_expansion.sql if those have not been applied), '
      'on the same Supabase project your Platform app connects to, then re-run v999.';
  END IF;

  UPDATE public.industry_packs
  SET pack_name = regexp_replace(pack_name, ' Pack$', ''),
      updated_at = NOW()
  WHERE pack_name ~ ' Pack$';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT COUNT(*) INTO v_remaining
  FROM public.industry_packs
  WHERE pack_name ~ ' Pack$';

  RAISE NOTICE 'v999: renamed % industry_packs row(s); remaining with trailing '' Pack'': % (expect 0)',
    v_updated, v_remaining;
END $$;

SELECT pack_code, pack_name, is_active
FROM public.industry_packs
ORDER BY pack_name;
