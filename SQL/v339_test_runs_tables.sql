-- ============================================================================
-- Test Runs & Test Case Executions Tables
-- Version: v339
-- Description: Creates test_runs and test_case_executions tables
-- Date: 2026-03-27
-- ============================================================================
--
-- Purpose:
-- Implements test execution tracking. A Test Run is an execution session for
-- a test suite or a selection of test cases. Each test case within a run gets
-- a test_case_execution record that captures pass/fail status, actual results,
-- and links to any auto-created defect.
--
-- Note on circular FK:
-- test_case_executions has a defect_id column (nullable) that will reference
-- the defects table. Since defects is created in v340 (after this file), the
-- FK constraint is added at the end of v340 via ALTER TABLE.
--
-- Prerequisites:
-- - v338_test_management_core_tables.sql must be run first
-- - projects, users tables must exist
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: TEST_RUNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_runs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    suite_id   UUID REFERENCES test_suites(id) ON DELETE SET NULL,  -- nullable: ad-hoc runs possible

    -- Run Identification
    run_name    VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(100) DEFAULT 'uat'
        CHECK (environment IN ('dev','staging','uat','production','other')),
    run_date    DATE DEFAULT CURRENT_DATE,
    build_version VARCHAR(100),         -- Software build / release version under test

    -- Status Lifecycle
    status       VARCHAR(50) DEFAULT 'planned'
        CHECK (status IN ('planned','in_progress','completed','cancelled','aborted','on_hold')),
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    run_by       UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Auto-updated summary (recalculated by trigger after each execution update)
    summary JSONB DEFAULT '{"total":0,"passed":0,"failed":0,"blocked":0,"skipped":0,"pending":0}'::jsonb,

    -- Notes
    notes            TEXT,
    pass_criteria    TEXT,   -- What constitutes a successful run (e.g., "95% pass rate")
    failure_reason   TEXT,   -- Populated when status = 'aborted' or 'cancelled'

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_runs_project_id  ON test_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_suite_id    ON test_runs(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status      ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_run_date    ON test_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_test_runs_is_deleted  ON test_runs(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_test_runs_before_insert ON test_runs;
CREATE TRIGGER trg_test_runs_before_insert
    BEFORE INSERT ON test_runs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_test_runs_before_update ON test_runs;
CREATE TRIGGER trg_test_runs_before_update
    BEFORE UPDATE ON test_runs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 2: TEST_CASE_EXECUTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_case_executions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    run_id       UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Execution Result
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending','passed','failed','blocked','skipped','in_progress')),
    actual_result    TEXT,   -- What actually happened (especially useful for failures)
    notes            TEXT,   -- Additional notes from tester
    step_results     JSONB DEFAULT '[]'::jsonb,   -- Per-step results [{step_number, status, actual_result}]

    -- Execution Context
    executed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    executed_at       TIMESTAMPTZ,
    duration_minutes  INTEGER,
    environment       VARCHAR(100),   -- Override the run environment if needed
    browser_os        VARCHAR(255),   -- Browser/OS details for the execution

    -- Defect Link (FK added in v340 after defects table is created)
    -- defect_id references defects(id) -- constraint added in v340
    defect_id UUID,   -- populated automatically by trigger when status = 'failed'

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tce_run_id        ON test_case_executions(run_id);
CREATE INDEX IF NOT EXISTS idx_tce_test_case_id  ON test_case_executions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tce_project_id    ON test_case_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_tce_status        ON test_case_executions(status);
CREATE INDEX IF NOT EXISTS idx_tce_executed_by   ON test_case_executions(executed_by);

-- Unique: one execution record per test case per run
ALTER TABLE test_case_executions
    DROP CONSTRAINT IF EXISTS uq_tce_run_test_case;
ALTER TABLE test_case_executions
    ADD CONSTRAINT uq_tce_run_test_case UNIQUE (run_id, test_case_id);

-- Triggers
DROP TRIGGER IF EXISTS trg_tce_before_insert ON test_case_executions;
CREATE TRIGGER trg_tce_before_insert
    BEFORE INSERT ON test_case_executions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_tce_before_update ON test_case_executions;
CREATE TRIGGER trg_tce_before_update
    BEFORE UPDATE ON test_case_executions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 3: RUN SUMMARY RECALCULATION FUNCTION + TRIGGER
-- (Fires after each execution status change to keep test_runs.summary current)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_test_run_summary()
RETURNS TRIGGER AS $$
DECLARE
    v_summary JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total',   COUNT(*),
        'passed',  COUNT(*) FILTER (WHERE status = 'passed'),
        'failed',  COUNT(*) FILTER (WHERE status = 'failed'),
        'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
        'skipped', COUNT(*) FILTER (WHERE status = 'skipped'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')
    )
    INTO v_summary
    FROM test_case_executions
    WHERE run_id = NEW.run_id;

    UPDATE test_runs
    SET summary    = v_summary,
        updated_at = NOW()
    WHERE id = NEW.run_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tce_update_run_summary ON test_case_executions;
CREATE TRIGGER trg_tce_update_run_summary
    AFTER INSERT OR UPDATE OF status ON test_case_executions
    FOR EACH ROW EXECUTE FUNCTION fn_update_test_run_summary();

-- ============================================================================
-- SECTION 4: DATABASE TABLE REGISTRY
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('test_runs',             'Test execution sessions tying test suites to a run environment and date', false, true),
    ('test_case_executions',  'Individual test case execution results within a test run, including pass/fail status', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table   = EXCLUDED.is_system_table,
    updated_at        = NOW();
