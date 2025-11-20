-- =====================================================
-- Project Nidus - Critical Path Method (CPM) Functions
-- Version: v19
-- Description: PostgreSQL functions for calculating critical path,
--              earliest/latest dates, and slack for project tasks
-- Date: 2025-11-16
-- Dependencies: v18_gantt_enhancements_clean.sql
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTION: Get Task Dependencies
-- =====================================================
-- This function retrieves all dependencies for tasks in a project
-- including dependency type and lag days

CREATE OR REPLACE FUNCTION get_task_dependencies(p_project_id UUID)
RETURNS TABLE (
    task_id UUID,
    predecessor_id UUID,
    dependency_type VARCHAR(10),
    lag_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        td.target_task_id as task_id,
        td.source_task_id as predecessor_id,
        td.dependency_type,
        COALESCE(td.lag_days, 0) as lag_days
    FROM task_dependencies td
    INNER JOIN tasks t ON td.target_task_id = t.id
    WHERE t.project_id = p_project_id
    AND td.is_deleted = FALSE
    AND t.is_deleted = FALSE
    ORDER BY td.target_task_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_task_dependencies(UUID) IS
'Retrieves all task dependencies for a project with dependency type and lag days';


-- =====================================================
-- 2. HELPER FUNCTION: Detect Circular Dependencies
-- =====================================================
-- Detects if adding a dependency would create a circular reference
-- Returns TRUE if circular dependency exists, FALSE otherwise

CREATE OR REPLACE FUNCTION has_circular_dependency(
    p_source_task_id UUID,
    p_target_task_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_task UUID;
    v_visited_tasks UUID[] := ARRAY[]::UUID[];
    v_stack UUID[] := ARRAY[p_target_task_id];
BEGIN
    -- If source equals target, it's circular
    IF p_source_task_id = p_target_task_id THEN
        RETURN TRUE;
    END IF;

    -- Traverse the dependency graph from target to see if we reach source
    WHILE array_length(v_stack, 1) > 0 LOOP
        -- Pop from stack
        v_current_task := v_stack[1];
        v_stack := v_stack[2:array_length(v_stack, 1)];

        -- Skip if already visited
        IF v_current_task = ANY(v_visited_tasks) THEN
            CONTINUE;
        END IF;

        -- Mark as visited
        v_visited_tasks := array_append(v_visited_tasks, v_current_task);

        -- If we reached the source task, it's circular
        IF v_current_task = p_source_task_id THEN
            RETURN TRUE;
        END IF;

        -- Add all successors of current task to stack
        v_stack := v_stack || ARRAY(
            SELECT td.target_task_id
            FROM task_dependencies td
            WHERE td.source_task_id = v_current_task
            AND td.is_deleted = FALSE
        );
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION has_circular_dependency(UUID, UUID) IS
'Detects if adding a dependency from source to target would create a circular reference';


-- =====================================================
-- 3. CPM FORWARD PASS FUNCTION
-- =====================================================
-- Calculates Earliest Start (ES) and Earliest Finish (EF) dates
-- for all tasks in a project

CREATE OR REPLACE FUNCTION calculate_forward_pass(p_project_id UUID)
RETURNS TABLE (
    task_id UUID,
    earliest_start_date DATE,
    earliest_finish_date DATE
) AS $$
DECLARE
    v_task RECORD;
    v_max_predecessor_finish DATE;
    v_task_duration INTEGER;
    v_calculated_start DATE;
    v_calculated_finish DATE;
    v_iteration_count INTEGER := 0;
    v_max_iterations INTEGER := 1000; -- Prevent infinite loops
BEGIN
    -- Create temporary table to store results
    CREATE TEMP TABLE IF NOT EXISTS temp_forward_pass (
        task_id UUID PRIMARY KEY,
        es_date DATE,
        ef_date DATE,
        processed BOOLEAN DEFAULT FALSE
    );

    -- Clear temp table
    DELETE FROM temp_forward_pass;

    -- Initialize all tasks with their actual dates or NULL
    INSERT INTO temp_forward_pass (task_id, es_date, ef_date, processed)
    SELECT
        t.id,
        t.start_date,
        t.end_date,
        FALSE
    FROM tasks t
    WHERE t.project_id = p_project_id
    AND t.is_deleted = FALSE;

    -- Iteratively calculate ES and EF for tasks
    WHILE EXISTS (SELECT 1 FROM temp_forward_pass WHERE processed = FALSE)
          AND v_iteration_count < v_max_iterations LOOP

        v_iteration_count := v_iteration_count + 1;

        -- Process tasks that have all predecessors processed or no predecessors
        FOR v_task IN
            SELECT
                tfp.task_id,
                t.start_date,
                t.end_date,
                t.duration_days
            FROM temp_forward_pass tfp
            INNER JOIN tasks t ON tfp.task_id = t.id
            WHERE tfp.processed = FALSE
            AND NOT EXISTS (
                -- Check if any predecessor is not yet processed
                SELECT 1
                FROM task_dependencies td
                INNER JOIN temp_forward_pass tfp2 ON td.source_task_id = tfp2.task_id
                WHERE td.target_task_id = tfp.task_id
                AND td.is_deleted = FALSE
                AND tfp2.processed = FALSE
            )
        LOOP
            -- Calculate max predecessor finish date
            SELECT MAX(
                CASE
                    WHEN td.dependency_type = 'FS' THEN tfp_pred.ef_date + td.lag_days
                    WHEN td.dependency_type = 'SS' THEN tfp_pred.es_date + td.lag_days
                    WHEN td.dependency_type = 'FF' THEN tfp_pred.ef_date + td.lag_days - v_task.duration_days
                    WHEN td.dependency_type = 'SF' THEN tfp_pred.es_date + td.lag_days - v_task.duration_days
                    ELSE tfp_pred.ef_date + td.lag_days
                END
            ) INTO v_max_predecessor_finish
            FROM task_dependencies td
            INNER JOIN temp_forward_pass tfp_pred ON td.source_task_id = tfp_pred.task_id
            WHERE td.target_task_id = v_task.task_id
            AND td.is_deleted = FALSE;

            -- Calculate ES (earliest start)
            v_calculated_start := GREATEST(
                COALESCE(v_max_predecessor_finish, v_task.start_date),
                COALESCE(v_task.start_date, v_max_predecessor_finish)
            );

            -- Calculate EF (earliest finish)
            v_task_duration := COALESCE(v_task.duration_days,
                EXTRACT(DAY FROM (v_task.end_date - v_task.start_date))::INTEGER);
            v_calculated_finish := v_calculated_start + COALESCE(v_task_duration, 0);

            -- Update temp table
            UPDATE temp_forward_pass
            SET
                es_date = v_calculated_start,
                ef_date = v_calculated_finish,
                processed = TRUE
            WHERE task_id = v_task.task_id;
        END LOOP;
    END LOOP;

    -- Return results
    RETURN QUERY
    SELECT
        tfp.task_id,
        tfp.es_date,
        tfp.ef_date
    FROM temp_forward_pass tfp
    ORDER BY tfp.es_date, tfp.task_id;

    -- Cleanup
    DROP TABLE IF EXISTS temp_forward_pass;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_forward_pass(UUID) IS
'Calculates Earliest Start and Earliest Finish dates for all tasks using CPM forward pass';


-- =====================================================
-- 4. CPM BACKWARD PASS FUNCTION
-- =====================================================
-- Calculates Latest Start (LS) and Latest Finish (LF) dates
-- for all tasks in a project

CREATE OR REPLACE FUNCTION calculate_backward_pass(
    p_project_id UUID,
    p_project_end_date DATE
)
RETURNS TABLE (
    task_id UUID,
    latest_start_date DATE,
    latest_finish_date DATE
) AS $$
DECLARE
    v_task RECORD;
    v_min_successor_start DATE;
    v_task_duration INTEGER;
    v_calculated_finish DATE;
    v_calculated_start DATE;
    v_iteration_count INTEGER := 0;
    v_max_iterations INTEGER := 1000;
    v_project_finish DATE;
BEGIN
    -- Determine project finish date (max EF date)
    IF p_project_end_date IS NULL THEN
        SELECT MAX(ef_date) INTO v_project_finish
        FROM calculate_forward_pass(p_project_id);
    ELSE
        v_project_finish := p_project_end_date;
    END IF;

    -- Create temporary table to store results
    CREATE TEMP TABLE IF NOT EXISTS temp_backward_pass (
        task_id UUID PRIMARY KEY,
        ls_date DATE,
        lf_date DATE,
        processed BOOLEAN DEFAULT FALSE
    );

    -- Clear temp table
    DELETE FROM temp_backward_pass;

    -- Initialize all tasks
    INSERT INTO temp_backward_pass (task_id, ls_date, lf_date, processed)
    SELECT
        t.id,
        NULL,
        NULL,
        FALSE
    FROM tasks t
    WHERE t.project_id = p_project_id
    AND t.is_deleted = FALSE;

    -- Iteratively calculate LS and LF for tasks (starting from end)
    WHILE EXISTS (SELECT 1 FROM temp_backward_pass WHERE processed = FALSE)
          AND v_iteration_count < v_max_iterations LOOP

        v_iteration_count := v_iteration_count + 1;

        -- Process tasks that have all successors processed or no successors
        FOR v_task IN
            SELECT
                tbp.task_id,
                t.start_date,
                t.end_date,
                t.duration_days,
                fp.ef_date
            FROM temp_backward_pass tbp
            INNER JOIN tasks t ON tbp.task_id = t.id
            LEFT JOIN calculate_forward_pass(p_project_id) fp ON fp.task_id = t.id
            WHERE tbp.processed = FALSE
            AND NOT EXISTS (
                -- Check if any successor is not yet processed
                SELECT 1
                FROM task_dependencies td
                INNER JOIN temp_backward_pass tbp2 ON td.target_task_id = tbp2.task_id
                WHERE td.source_task_id = tbp.task_id
                AND td.is_deleted = FALSE
                AND tbp2.processed = FALSE
            )
        LOOP
            -- Calculate min successor start date
            SELECT MIN(
                CASE
                    WHEN td.dependency_type = 'FS' THEN tbp_succ.ls_date - td.lag_days
                    WHEN td.dependency_type = 'SS' THEN tbp_succ.ls_date - td.lag_days
                    WHEN td.dependency_type = 'FF' THEN tbp_succ.lf_date - td.lag_days
                    WHEN td.dependency_type = 'SF' THEN tbp_succ.lf_date - td.lag_days
                    ELSE tbp_succ.ls_date - td.lag_days
                END
            ) INTO v_min_successor_start
            FROM task_dependencies td
            INNER JOIN temp_backward_pass tbp_succ ON td.target_task_id = tbp_succ.task_id
            WHERE td.source_task_id = v_task.task_id
            AND td.is_deleted = FALSE;

            -- Calculate LF (latest finish)
            v_calculated_finish := COALESCE(v_min_successor_start, v_project_finish);

            -- Calculate LS (latest start)
            v_task_duration := COALESCE(v_task.duration_days,
                EXTRACT(DAY FROM (v_task.end_date - v_task.start_date))::INTEGER);
            v_calculated_start := v_calculated_finish - COALESCE(v_task_duration, 0);

            -- Update temp table
            UPDATE temp_backward_pass
            SET
                ls_date = v_calculated_start,
                lf_date = v_calculated_finish,
                processed = TRUE
            WHERE task_id = v_task.task_id;
        END LOOP;
    END LOOP;

    -- Return results
    RETURN QUERY
    SELECT
        tbp.task_id,
        tbp.ls_date,
        tbp.lf_date
    FROM temp_backward_pass tbp
    ORDER BY tbp.lf_date DESC, tbp.task_id;

    -- Cleanup
    DROP TABLE IF EXISTS temp_backward_pass;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_backward_pass(UUID, DATE) IS
'Calculates Latest Start and Latest Finish dates for all tasks using CPM backward pass';


-- =====================================================
-- 5. MAIN CPM CALCULATION FUNCTION
-- =====================================================
-- Calculates complete CPM analysis including ES, EF, LS, LF, Slack,
-- and identifies critical path tasks

CREATE OR REPLACE FUNCTION calculate_critical_path(
    p_project_id UUID,
    p_update_tasks BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    task_id UUID,
    task_name VARCHAR,
    earliest_start DATE,
    earliest_finish DATE,
    latest_start DATE,
    latest_finish DATE,
    slack_days INTEGER,
    is_critical BOOLEAN
) AS $$
DECLARE
    v_project_end_date DATE;
BEGIN
    -- Get project end date from forward pass
    SELECT MAX(ef_date) INTO v_project_end_date
    FROM calculate_forward_pass(p_project_id);

    -- Return combined CPM results
    RETURN QUERY
    WITH forward AS (
        SELECT * FROM calculate_forward_pass(p_project_id)
    ),
    backward AS (
        SELECT * FROM calculate_backward_pass(p_project_id, v_project_end_date)
    )
    SELECT
        t.id as task_id,
        t.task_name,
        f.earliest_start_date,
        f.earliest_finish_date,
        b.latest_start_date,
        b.latest_finish_date,
        EXTRACT(DAY FROM (b.latest_start_date - f.earliest_start_date))::INTEGER as slack_days,
        (EXTRACT(DAY FROM (b.latest_start_date - f.earliest_start_date))::INTEGER = 0) as is_critical
    FROM tasks t
    INNER JOIN forward f ON t.id = f.task_id
    INNER JOIN backward b ON t.id = b.task_id
    WHERE t.project_id = p_project_id
    AND t.is_deleted = FALSE
    ORDER BY f.earliest_start_date, t.task_name;

    -- Optionally update tasks table with CPM results
    IF p_update_tasks THEN
        WITH forward AS (
            SELECT * FROM calculate_forward_pass(p_project_id)
        ),
        backward AS (
            SELECT * FROM calculate_backward_pass(p_project_id, v_project_end_date)
        )
        UPDATE tasks t
        SET
            earliest_start_date = f.earliest_start_date,
            earliest_finish_date = f.earliest_finish_date,
            latest_start_date = b.latest_start_date,
            latest_finish_date = b.latest_finish_date,
            slack_days = EXTRACT(DAY FROM (b.latest_start_date - f.earliest_start_date))::INTEGER,
            is_critical_path = (EXTRACT(DAY FROM (b.latest_start_date - f.earliest_start_date))::INTEGER = 0),
            updated_at = NOW()
        FROM forward f
        INNER JOIN backward b ON f.task_id = b.task_id
        WHERE t.id = f.task_id
        AND t.project_id = p_project_id
        AND t.is_deleted = FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_critical_path(UUID, BOOLEAN) IS
'Calculates complete CPM analysis for a project and optionally updates tasks table with results';


-- =====================================================
-- 6. GET CRITICAL PATH TASKS FUNCTION
-- =====================================================
-- Returns only the tasks on the critical path

CREATE OR REPLACE FUNCTION get_critical_path_tasks(p_project_id UUID)
RETURNS TABLE (
    task_id UUID,
    task_name VARCHAR,
    start_date DATE,
    end_date DATE,
    duration_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.task_id,
        cp.task_name,
        cp.earliest_start as start_date,
        cp.earliest_finish as end_date,
        EXTRACT(DAY FROM (cp.earliest_finish - cp.earliest_start))::INTEGER as duration_days
    FROM calculate_critical_path(p_project_id, FALSE) cp
    WHERE cp.is_critical = TRUE
    ORDER BY cp.earliest_start;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_critical_path_tasks(UUID) IS
'Returns only the tasks on the critical path for a project';


-- =====================================================
-- 7. CALCULATE PROJECT DURATION FUNCTION
-- =====================================================
-- Calculates the minimum project duration based on critical path

CREATE OR REPLACE FUNCTION calculate_project_duration(p_project_id UUID)
RETURNS TABLE (
    project_start_date DATE,
    project_end_date DATE,
    total_duration_days INTEGER,
    critical_path_length INTEGER
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_duration INTEGER;
    v_critical_count INTEGER;
BEGIN
    -- Get min ES and max EF from forward pass
    SELECT
        MIN(fp.earliest_start_date),
        MAX(fp.earliest_finish_date)
    INTO v_start_date, v_end_date
    FROM calculate_forward_pass(p_project_id) fp;

    -- Calculate duration
    v_duration := EXTRACT(DAY FROM (v_end_date - v_start_date))::INTEGER;

    -- Count critical path tasks
    SELECT COUNT(*) INTO v_critical_count
    FROM calculate_critical_path(p_project_id, FALSE) cp
    WHERE cp.is_critical = TRUE;

    RETURN QUERY
    SELECT
        v_start_date,
        v_end_date,
        v_duration,
        v_critical_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_project_duration(UUID) IS
'Calculates the minimum project duration and critical path information';


-- =====================================================
-- 8. USAGE EXAMPLES AND TESTING
-- =====================================================

/*
-- Example 1: Calculate and view critical path for a project
SELECT * FROM calculate_critical_path('your-project-id-here', FALSE);

-- Example 2: Calculate and UPDATE tasks table with CPM results
SELECT * FROM calculate_critical_path('your-project-id-here', TRUE);

-- Example 3: Get only critical path tasks
SELECT * FROM get_critical_path_tasks('your-project-id-here');

-- Example 4: Get project duration
SELECT * FROM calculate_project_duration('your-project-id-here');

-- Example 5: Check for circular dependency before adding
SELECT has_circular_dependency('source-task-id', 'target-task-id');

-- Example 6: Get all dependencies for a project
SELECT * FROM get_task_dependencies('your-project-id-here');
*/

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_task_dependencies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_circular_dependency(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_forward_pass(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_backward_pass(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_critical_path(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_critical_path_tasks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_project_duration(UUID) TO authenticated;

-- =====================================================
-- END OF CPM FUNCTIONS
-- =====================================================

-- Register this script in database registry (if database_tables exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'database_tables') THEN
        -- No new tables created, just functions
        -- Log in system notes if logging table exists
        RAISE NOTICE 'CPM functions v19 installed successfully';
    END IF;
END $$;
