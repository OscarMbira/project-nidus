-- =============================================================================
-- v892: Fix validate_lessons_report_completeness() variable-scope bug
-- Error: column "v_variables_complete" does not exist (42703)
--
-- Root cause (v203): v_variables_complete was declared inside a nested
-- `DECLARE ... BEGIN ... END;` block (Review of Measures section) but then
-- referenced again at `completeness_percentage := LEAST(100.0,
-- (v_variables_complete::DECIMAL / 6.0) * 100.0)` AFTER that block's END —
-- outside its declaration scope. This made the function fail to compile on
-- every single call, so the "Review report completeness" feature has never
-- worked since v203.
--
-- Fix: promote v_variables_complete to the function's top-level DECLARE
-- block (alongside v_report, v_sections_complete, etc.) so it stays in scope
-- for the rest of the function. No other logic changes.
-- Prerequisites: v203 (this function's original version).
-- Idempotent: CREATE OR REPLACE.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_lessons_report_completeness(p_report_id UUID)
RETURNS TABLE (
    section_name VARCHAR,
    is_complete BOOLEAN,
    missing_fields TEXT[],
    completeness_percentage DECIMAL
) AS $$
DECLARE
    v_report RECORD;
    v_sections_complete INTEGER := 0;
    v_total_sections INTEGER := 8;
    v_missing_fields TEXT[];
    v_variables_complete INTEGER := 0;
BEGIN
    -- Get report data
    SELECT * INTO v_report
    FROM public.lessons_reports
    WHERE id = p_report_id AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Check Overview section
    v_missing_fields := ARRAY[]::TEXT[];
    IF v_report.purpose IS NULL OR v_report.purpose = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'purpose');
    END IF;
    IF v_report.executive_summary IS NULL OR v_report.executive_summary = '' THEN
        v_missing_fields := array_append(v_missing_fields, 'executive_summary');
    END IF;
    section_name := 'Overview & Context';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 0.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Overall Review section
    v_missing_fields := ARRAY[]::TEXT[];
    IF (v_report.what_went_well_summary IS NULL OR v_report.what_went_well_summary = '') AND
       (v_report.what_did_not_go_well_summary IS NULL OR v_report.what_did_not_go_well_summary = '') THEN
        v_missing_fields := array_append(v_missing_fields, 'overall_review');
    END IF;
    section_name := 'Overall Review';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 50.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Review of Measures (at least 3 variables)
    v_missing_fields := ARRAY[]::TEXT[];
    v_variables_complete := 0;
    IF v_report.time_performance_review IS NOT NULL AND v_report.time_performance_review != '' THEN
        v_variables_complete := v_variables_complete + 1;
    END IF;
    IF v_report.cost_performance_review IS NOT NULL AND v_report.cost_performance_review != '' THEN
        v_variables_complete := v_variables_complete + 1;
    END IF;
    IF v_report.quality_performance_review IS NOT NULL AND v_report.quality_performance_review != '' THEN
        v_variables_complete := v_variables_complete + 1;
    END IF;
    IF v_report.scope_performance_review IS NOT NULL AND v_report.scope_performance_review != '' THEN
        v_variables_complete := v_variables_complete + 1;
    END IF;
    IF v_report.risk_performance_review IS NOT NULL AND v_report.risk_performance_review != '' THEN
        v_variables_complete := v_variables_complete + 1;
    END IF;
    IF v_report.benefits_performance_review IS NOT NULL AND v_report.benefits_performance_review != '' THEN
        v_variables_complete := v_variables_complete + 1;
    END IF;

    IF v_variables_complete < 3 THEN
        v_missing_fields := array_append(v_missing_fields, 'measures_review (need at least 3)');
    END IF;
    section_name := 'Review of Measures';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := LEAST(100.0, (v_variables_complete::DECIMAL / 6.0) * 100.0);
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Significant Lessons
    DECLARE
        v_lessons_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_lessons_count
        FROM public.lessons_report_lessons
        WHERE lessons_report_id = p_report_id;

        IF v_lessons_count = 0 THEN
            v_missing_fields := array_append(v_missing_fields, 'significant_lessons');
        END IF;
    END;
    section_name := 'Significant Lessons';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 0.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Check Recommendations
    DECLARE
        v_recommendations_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_recommendations_count
        FROM public.lessons_report_recommendations
        WHERE lessons_report_id = p_report_id;

        IF v_recommendations_count = 0 THEN
            v_missing_fields := array_append(v_missing_fields, 'recommendations');
        END IF;
    END;
    section_name := 'Recommendations';
    is_complete := array_length(v_missing_fields, 1) IS NULL;
    completeness_percentage := CASE WHEN is_complete THEN 100.0 ELSE 0.0 END;
    RETURN NEXT;
    IF is_complete THEN v_sections_complete := v_sections_complete + 1; END IF;

    -- Overall completeness
    section_name := 'Overall';
    is_complete := v_sections_complete >= 5;
    completeness_percentage := (v_sections_complete::DECIMAL / v_total_sections::DECIMAL) * 100.0;
    missing_fields := ARRAY[]::TEXT[];
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'v892_fix_lessons_report_completeness_scope_bug.sql applied';
END $$;
