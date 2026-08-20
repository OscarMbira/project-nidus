-- =============================================================================
-- v885: Fix get_relevant_corporate_lessons (project_type / lessons table drift)
-- =============================================================================
-- Symptom: Lessons Log Dashboard console error
--   record "v_project" has no field "project_type"  (42703)
-- Cause: v169 function used projects.project_type and public.lessons; live schema
--   has projects.project_type_id → project_types, and lessons_learned.
-- Apply in Supabase SQL editor after v884.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_relevant_corporate_lessons(p_project_id UUID)
RETURNS TABLE (
    lesson_id UUID,
    title VARCHAR,
    recommendations TEXT,
    category VARCHAR,
    relevance_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_organisation_id UUID;
    v_type_code TEXT;
BEGIN
    SELECT
        p.account_id,
        pt.type_code
    INTO
        v_organisation_id,
        v_type_code
    FROM public.projects p
    LEFT JOIN public.project_types pt
      ON pt.id = p.project_type_id
     AND COALESCE(pt.is_deleted, FALSE) = FALSE
    WHERE p.id = p_project_id
      AND COALESCE(p.is_deleted, FALSE) = FALSE;

    IF v_organisation_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        l.id AS lesson_id,
        COALESCE(l.lesson_title, '')::VARCHAR AS title,
        l.recommendations,
        COALESCE(l.lesson_category, 'other')::VARCHAR AS category,
        CASE
            WHEN v_type_code IS NOT NULL
                 AND clr.project_type_tags IS NOT NULL
                 AND v_type_code = ANY (clr.project_type_tags) THEN 1.0
            WHEN array_length(clr.project_type_tags, 1) IS NULL THEN 0.5
            ELSE 0.3
        END::DECIMAL AS relevance_score
    FROM public.corporate_lessons_repository clr
    JOIN public.lessons_learned l ON l.id = clr.lesson_id
    WHERE clr.organisation_id = v_organisation_id
      AND COALESCE(clr.is_active, TRUE) = TRUE
      AND COALESCE(l.is_deleted, FALSE) = FALSE
    ORDER BY 5 DESC, clr.usefulness_rating DESC NULLS LAST, clr.view_count DESC
    LIMIT 20;
END;
$$;

COMMENT ON FUNCTION public.get_relevant_corporate_lessons(UUID) IS
  'Returns corporate lessons relevant to a project (v885: project_type_id + lessons_learned).';

GRANT EXECUTE ON FUNCTION public.get_relevant_corporate_lessons(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_relevant_corporate_lessons(UUID) TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'v885_fix_get_relevant_corporate_lessons.sql applied';
END $$;
