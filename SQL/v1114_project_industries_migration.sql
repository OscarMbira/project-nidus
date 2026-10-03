-- ============================================================================
-- v1114: Backfill existing projects.industry_category_id into project_industries
-- ============================================================================
-- projectplan/v1106_project_multi_industry_plan.md Phase 0.
-- Every existing project that already had a single industry_category_id keeps that industry,
-- now as its primary row in project_industries — no re-tagging required (PRD user story 9).
-- Idempotent: guarded by the same unique index project_industries relies on, safe to re-run.
-- Nothing to backfill in sim — sim.practice_projects never had an industry_category_id column.
-- ============================================================================

INSERT INTO public.project_industries (project_id, industry_category_id, is_primary, added_by)
SELECT p.id, p.industry_category_id, TRUE, p.created_by
FROM public.projects p
WHERE p.industry_category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_industries pi
    WHERE pi.project_id = p.id AND pi.industry_category_id = p.industry_category_id
  );

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.project_industries;
  RAISE NOTICE 'v1114_project_industries_migration.sql applied successfully — % project_industries row(s) now exist', v_count;
END $$;
