-- ============================================================================
-- Test Management — Auto-Defect Creation Trigger
-- Version: v344
-- Description: Fires when a test case execution is marked as 'failed' and
--              automatically creates a defect record pre-populated with context
-- Date: 2026-03-27
-- ============================================================================
--
-- Trigger behaviour:
--   AFTER UPDATE OF status ON test_case_executions
--   WHEN (NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed')
--   → Inserts a new defect record
--   → Sets test_case_executions.defect_id = new defect's id
--
-- The frontend detects the returned defect_id and auto-navigates to
-- DefectDetail for the tester to add screenshots, severity, assignee etc.
--
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_auto_create_defect_on_failure()
RETURNS TRIGGER AS $$
DECLARE
    v_defect_id   UUID;
    v_tc_ref      VARCHAR(50);
    v_tc_title    VARCHAR(500);
    v_project_id  UUID;
    v_environment VARCHAR(100);
BEGIN
    -- Only fire when transitioning TO 'failed'
    IF NEW.status <> 'failed' OR OLD.status = 'failed' THEN
        RETURN NEW;
    END IF;

    -- Fetch test case details for pre-population
    SELECT test_case_ref, title, project_id
    INTO   v_tc_ref, v_tc_title, v_project_id
    FROM   test_cases
    WHERE  id = NEW.test_case_id;

    -- Use execution environment, fall back to run environment
    SELECT COALESCE(NEW.environment, tr.environment)
    INTO   v_environment
    FROM   test_runs tr
    WHERE  tr.id = NEW.run_id;

    -- Insert pre-populated defect
    INSERT INTO defects (
        project_id,
        test_case_id,
        execution_id,
        title,
        description,
        severity,
        priority,
        status,
        environment,
        browser_os,
        steps_to_reproduce,
        actual_behavior,
        reported_by,
        created_by
    )
    VALUES (
        v_project_id,
        NEW.test_case_id,
        NEW.id,
        '[FAILED] ' || COALESCE(v_tc_ref, '') || ' - ' || COALESCE(v_tc_title, 'Test Case'),
        'This defect was automatically created when test case ' || COALESCE(v_tc_ref, 'N/A') ||
        ' was marked as failed during a test run.',
        'medium',         -- Default severity; tester should update
        'medium',         -- Default priority; tester should update
        'new',
        v_environment,
        NEW.browser_os,
        NULL,             -- Tester fills in steps to reproduce
        NEW.actual_result,
        NEW.executed_by,
        NEW.executed_by
    )
    RETURNING id INTO v_defect_id;

    -- Back-link the execution to the new defect
    NEW.defect_id := v_defect_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_auto_create_defect ON test_case_executions;
CREATE TRIGGER trg_auto_create_defect
    BEFORE UPDATE OF status ON test_case_executions
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_create_defect_on_failure();
