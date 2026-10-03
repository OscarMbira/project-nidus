-- ============================================================================
-- v1067: Backfill projects.industry_category_id from the account's selected industry
-- ============================================================================
-- One-time DATA repair only — not a runtime menu fallback.
--
-- Symptom (live 2026-09-17): Account had Banking & Financial Services selected, but the
-- Delivery sidebar only showed "Core Project Management" + "Platform". pm/tm pack grouping
-- reads ONLY the currently open project's industry_category_id (no account-level fallback).
-- Projects created before v1010 (or never given an industry in Project Setup) still have
-- NULL, so no industry pack section can appear until the project row itself is set.
--
-- This migration copies the account's primary real industry (else first real
-- account_industries row) onto those NULL project rows. Cross-Industry is excluded via the
-- existing industry_categories.name row (same filter used elsewhere in industry RPCs). Rows
-- that already have an industry are left alone. Idempotent.
--
-- After this runs, the sidebar continues to use projects.industry_category_id only.
-- ============================================================================

DO $$
DECLARE
  v_public_updated INT := 0;
  v_sim_updated INT := 0;
BEGIN
  WITH preferred AS (
    SELECT DISTINCT ON (ai.account_id)
      ai.account_id,
      ai.industry_category_id
    FROM public.account_industries ai
    JOIN public.industry_categories ic ON ic.id = ai.industry_category_id
    WHERE COALESCE(ic.is_active, TRUE) = TRUE
      AND ic.name IS DISTINCT FROM 'Cross-Industry'
    ORDER BY ai.account_id, ai.is_primary DESC NULLS LAST, ai.added_at ASC NULLS LAST
  ),
  updated AS (
    UPDATE public.projects p
    SET industry_category_id = preferred.industry_category_id,
        updated_at = NOW()
    FROM preferred
    WHERE p.account_id = preferred.account_id
      AND p.industry_category_id IS NULL
      AND COALESCE(p.is_deleted, FALSE) = FALSE
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_public_updated FROM updated;

  IF to_regclass('sim.projects') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'sim'
         AND table_name = 'projects'
         AND column_name = 'industry_category_id'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'sim'
         AND table_name = 'projects'
         AND column_name = 'account_id'
     )
  THEN
    WITH preferred AS (
      SELECT DISTINCT ON (ai.account_id)
        ai.account_id,
        ai.industry_category_id
      FROM public.account_industries ai
      JOIN public.industry_categories ic ON ic.id = ai.industry_category_id
      WHERE COALESCE(ic.is_active, TRUE) = TRUE
        AND ic.name IS DISTINCT FROM 'Cross-Industry'
      ORDER BY ai.account_id, ai.is_primary DESC NULLS LAST, ai.added_at ASC NULLS LAST
    ),
    updated AS (
      UPDATE sim.projects p
      SET industry_category_id = preferred.industry_category_id,
          updated_at = NOW()
      FROM preferred
      WHERE p.account_id = preferred.account_id
        AND p.industry_category_id IS NULL
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_sim_updated FROM updated;
  END IF;

  RAISE NOTICE 'v1067: backfilled industry_category_id on % public.projects row(s), % sim.projects row(s)',
    v_public_updated, v_sim_updated;
END $$;

-- Read-only spot-check: projects still missing an industry despite a real account industry
SELECT p.id, p.project_code, p.account_id
FROM public.projects p
JOIN public.account_industries ai ON ai.account_id = p.account_id
JOIN public.industry_categories ic ON ic.id = ai.industry_category_id
WHERE p.industry_category_id IS NULL
  AND COALESCE(p.is_deleted, FALSE) = FALSE
  AND ic.name IS DISTINCT FROM 'Cross-Industry'
LIMIT 20;
