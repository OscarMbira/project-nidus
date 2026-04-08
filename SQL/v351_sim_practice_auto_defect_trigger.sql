-- ============================================================================
-- Simulator — Auto-create practice defect on failed execution
-- Version: v351
-- Prerequisites: v349
-- Date: 2026-03-27
-- ============================================================================
--
-- Deadlock avoidance:
--   Run this script alone (no parallel Supabase SQL tabs on sim testing tables).
--   Pause Simulator traffic briefly if possible. Do not run v350 and v351 concurrently.
--   The block below uses one transaction + LOCK TABLE in a fixed order so no
--   cross-session lock-order cycle can form with other DDL following the same pattern.
--
-- If you still see 40P01: retry once after other queries finish; check pg_stat_activity.
-- ============================================================================

BEGIN;

SET LOCAL lock_timeout = '120s';

-- Fixed lock order (alphabetical by table name) — always use this order in related migrations
LOCK TABLE sim.practice_defects IN ACCESS EXCLUSIVE MODE;
LOCK TABLE sim.practice_test_case_executions IN ACCESS EXCLUSIVE MODE;
LOCK TABLE sim.practice_test_cases IN ACCESS EXCLUSIVE MODE;
LOCK TABLE sim.practice_test_runs IN ACCESS EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION sim.fn_practice_auto_create_defect_on_failure()
RETURNS TRIGGER AS $$
DECLARE
    v_defect_id   UUID;
    v_tc_ref      VARCHAR(50);
    v_tc_title    VARCHAR(500);
    v_project_id  UUID;
    v_environment VARCHAR(100);
BEGIN
    IF NEW.status <> 'failed' OR OLD.status = 'failed' THEN
        RETURN NEW;
    END IF;

    SELECT test_case_ref, title, practice_project_id
    INTO v_tc_ref, v_tc_title, v_project_id
    FROM sim.practice_test_cases
    WHERE id = NEW.test_case_id;

    SELECT COALESCE(NEW.environment, tr.environment)
    INTO v_environment
    FROM sim.practice_test_runs tr
    WHERE tr.id = NEW.run_id;

    INSERT INTO sim.practice_defects (
        practice_project_id,
        test_case_id,
        execution_id,
        title,
        description,
        severity,
        priority,
        status,
        environment,
        browser_os,
        actual_behavior,
        reported_by,
        created_by
    )
    VALUES (
        v_project_id,
        NEW.test_case_id,
        NEW.id,
        '[FAILED] ' || COALESCE(v_tc_ref, '') || ' - ' || COALESCE(v_tc_title, 'Test Case'),
        'Automatically created when practice test case ' || COALESCE(v_tc_ref, 'N/A') || ' was marked failed.',
        'medium',
        'medium',
        'new',
        v_environment,
        NEW.browser_os,
        NEW.actual_result,
        NEW.executed_by,
        NEW.executed_by
    )
    RETURNING id INTO v_defect_id;

    NEW.defect_id := v_defect_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_practice_auto_defect ON sim.practice_test_case_executions;
CREATE TRIGGER trg_practice_auto_defect
    BEFORE UPDATE OF status ON sim.practice_test_case_executions
    FOR EACH ROW EXECUTE FUNCTION sim.fn_practice_auto_create_defect_on_failure();

COMMIT;
