-- =============================================================================
-- v832: Fix get_risk_summary() - nested aggregate makes the function fail for
--       every project that actually has a risk register
--
-- Symptom: POST /rest/v1/rpc/get_risk_summary returns HTTP 400, surfacing in the
--          browser console as "Error fetching risk summary". This blanks the risk
--          summary cards on the Risk Register page (RiskRegisterView) and the
--          ProjectRiskSummary widget on the project detail page.
--
-- Cause:  SQL/v172_risk_register_enhancement.sql:1147-1150 builds the
--         risks_by_category column as
--
--             jsonb_object_agg(
--                 COALESCE(r.risk_category, 'uncategorized')::TEXT,
--                 COUNT(*)::INTEGER
--             )
--
--         COUNT(*) sits inside jsonb_object_agg, and PostgreSQL rejects nested
--         aggregate calls outright (SQLSTATE 42803, "aggregate function calls
--         cannot be nested"). PostgREST maps 42803 to HTTP 400.
--
--         The failure is invisible on projects with no risk register, because the
--         function returns early at the v_register_id IS NULL guard before the
--         offending query is ever planned. It only started showing up once
--         projects had registers - v822 created one per project and seeded
--         10-20 risks into each.
--
--         get_issue_summary() in v174 builds its equivalent issues_by_status
--         column correctly, with a grouped subquery. This applies that same shape
--         to the risk side.
--
-- Also folded in, since the function is being replaced anyway:
--   * active_risks now counts rows whose status_enum IS NULL. NOT IN (...)
--     evaluates to NULL for those, so they were silently dropped from the count.
--     Risks seeded before status_enum was populated have NULL there, and a risk
--     with no recorded status is certainly neither closed nor expired.
--   * risks_by_category returns '{}' rather than NULL for a register with no
--     risks, so callers can index it without a null check.
--
-- Prerequisites: v172_risk_register_enhancement.sql
-- Platform (public) schema only - the sim schema has no risk_registers table.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_risk_summary(p_project_id UUID)
RETURNS TABLE (
    total_risks INTEGER,
    active_risks INTEGER,
    threats_count INTEGER,
    opportunities_count INTEGER,
    high_risks INTEGER,
    medium_risks INTEGER,
    low_risks INTEGER,
    overdue_responses INTEGER,
    risks_by_category JSONB
) AS $$
DECLARE
    v_register_id UUID;
BEGIN
    SELECT id INTO v_register_id
    FROM risk_registers
    WHERE project_id = p_project_id
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    IF v_register_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_risks,
        COUNT(*) FILTER (
            WHERE r.status_enum IS NULL
               OR r.status_enum NOT IN ('closed', 'expired')
        )::INTEGER AS active_risks,
        COUNT(*) FILTER (WHERE r.risk_type = 'threat')::INTEGER AS threats_count,
        COUNT(*) FILTER (WHERE r.risk_type = 'opportunity')::INTEGER AS opportunities_count,
        COUNT(*) FILTER (WHERE r.pre_risk_score IN ('high', 'very_high'))::INTEGER AS high_risks,
        COUNT(*) FILTER (WHERE r.pre_risk_score = 'medium')::INTEGER AS medium_risks,
        COUNT(*) FILTER (WHERE r.pre_risk_score IN ('low', 'very_low'))::INTEGER AS low_risks,
        (
            SELECT COUNT(*)::INTEGER
            FROM risk_responses rr
            WHERE rr.risk_id IN (
                    SELECT r2.id FROM risks r2
                    WHERE r2.risk_register_id = v_register_id
                      AND COALESCE(r2.is_deleted, FALSE) = FALSE
                  )
              AND rr.status IN ('planned', 'in_progress')
              AND rr.target_date < CURRENT_DATE
        ) AS overdue_responses,
        (
            -- Grouped subquery: jsonb_object_agg cannot take COUNT(*) directly.
            SELECT COALESCE(jsonb_object_agg(c.category, c.category_count), '{}'::JSONB)
            FROM (
                SELECT
                    COALESCE(r3.risk_category, 'uncategorized')::TEXT AS category,
                    COUNT(*)::INTEGER AS category_count
                FROM risks r3
                WHERE r3.risk_register_id = v_register_id
                  AND COALESCE(r3.is_deleted, FALSE) = FALSE
                GROUP BY COALESCE(r3.risk_category, 'uncategorized')
            ) c
        ) AS risks_by_category
    FROM risks r
    WHERE r.risk_register_id = v_register_id
      AND COALESCE(r.is_deleted, FALSE) = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_risk_summary(UUID) IS
    'Returns summary statistics for a project''s risk register (v832: risks_by_category built via grouped subquery - the original nested COUNT(*) inside jsonb_object_agg raised 42803).';

DO $$
BEGIN
  RAISE NOTICE 'v832_fix_get_risk_summary_nested_aggregate.sql applied';
END $$;
