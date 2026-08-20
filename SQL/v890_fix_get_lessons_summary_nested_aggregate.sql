-- =============================================================================
-- v890: Fix get_lessons_summary() — "aggregate function calls cannot be nested"
-- Error (42883/42803): aggregate function calls cannot be nested
--
-- Root cause (v169): the query passed COUNT(*) directly as the value argument
-- of jsonb_object_agg(...) in the same SELECT — Postgres does not allow one
-- aggregate call inside another. This has likely never worked for any project
-- that actually has lessons_learned rows (only just surfaced now that
-- SEED334-PRJ-08 has 10 seeded lessons and the Lessons Log page calls this RPC).
--
-- Fix: compute each JSONB breakdown (by category, by status) in its own
-- subquery that GROUPs and COUNTs first, then jsonb_object_agg's over that
-- already-aggregated result set — no nested aggregate calls.
-- Prerequisites: v169 (lessons_logs / lessons_learned / lesson_actions tables).
-- Idempotent: CREATE OR REPLACE.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_lessons_summary(p_project_id UUID)
RETURNS TABLE (
    total_lessons INTEGER,
    positive_lessons INTEGER,
    negative_lessons INTEGER,
    lessons_by_category JSONB,
    lessons_by_status JSONB,
    corporate_lessons INTEGER,
    actions_pending INTEGER
) AS $$
DECLARE
    v_log_id UUID;
BEGIN
    SELECT id INTO v_log_id
    FROM public.lessons_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_lessons,
        COUNT(*) FILTER (WHERE l.effect_type = 'positive')::INTEGER as positive_lessons,
        COUNT(*) FILTER (WHERE l.effect_type = 'negative')::INTEGER as negative_lessons,
        (
            SELECT jsonb_object_agg(cat.key, cat.cnt)
            FROM (
                SELECT COALESCE(lesson_category::TEXT, 'uncategorized') AS key, COUNT(*)::INTEGER AS cnt
                FROM public.lessons_learned
                WHERE lessons_log_id = v_log_id AND is_deleted = FALSE
                GROUP BY COALESCE(lesson_category::TEXT, 'uncategorized')
            ) cat
        ) as lessons_by_category,
        (
            SELECT jsonb_object_agg(st.key, st.cnt)
            FROM (
                SELECT COALESCE(status::TEXT, 'unknown') AS key, COUNT(*)::INTEGER AS cnt
                FROM public.lessons_learned
                WHERE lessons_log_id = v_log_id AND is_deleted = FALSE
                GROUP BY COALESCE(status::TEXT, 'unknown')
            ) st
        ) as lessons_by_status,
        COUNT(*) FILTER (WHERE l.is_corporate_lesson = TRUE)::INTEGER as corporate_lessons,
        (
            SELECT COUNT(*)::INTEGER
            FROM public.lesson_actions la
            WHERE la.lesson_id IN (SELECT id FROM public.lessons_learned WHERE lessons_log_id = v_log_id)
              AND la.status IN ('pending', 'in_progress')
              AND la.is_deleted = FALSE
        ) as actions_pending
    FROM public.lessons_learned l
    WHERE l.lessons_log_id = v_log_id
      AND l.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_lessons_summary(UUID) IS 'Returns summary statistics for a project''s lessons log. Category/status breakdowns are pre-aggregated in a subquery before jsonb_object_agg — do not inline COUNT(*) as its value argument (42803 nested aggregate).';

DO $$
BEGIN
  RAISE NOTICE 'v890_fix_get_lessons_summary_nested_aggregate.sql applied';
END $$;
