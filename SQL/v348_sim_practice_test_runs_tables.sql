-- ============================================================================
-- Simulator — Practice Test Runs & Executions
-- Version: v348
-- Prerequisites: v347_sim_practice_test_core_tables.sql
-- Date: 2026-03-27
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    suite_id UUID REFERENCES sim.practice_test_suites(id) ON DELETE SET NULL,
    run_name VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(100) DEFAULT 'uat'
        CHECK (environment IN ('dev','staging','uat','production','other')),
    run_date DATE DEFAULT CURRENT_DATE,
    build_version VARCHAR(100),
    status VARCHAR(50) DEFAULT 'planned'
        CHECK (status IN ('planned','in_progress','completed','cancelled','aborted','on_hold')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    run_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    summary JSONB DEFAULT '{"total":0,"passed":0,"failed":0,"blocked":0,"skipped":0,"pending":0}'::jsonb,
    notes TEXT,
    pass_criteria TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_test_runs_project ON sim.practice_test_runs(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_test_runs_deleted ON sim.practice_test_runs(is_deleted) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS sim.practice_test_case_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES sim.practice_test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES sim.practice_test_cases(id) ON DELETE CASCADE,
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending','passed','failed','blocked','skipped','in_progress')),
    actual_result TEXT,
    notes TEXT,
    step_results JSONB DEFAULT '[]'::jsonb,
    executed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    executed_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    environment VARCHAR(100),
    browser_os VARCHAR(255),
    defect_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_practice_tce_run_case UNIQUE (run_id, test_case_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_tce_run ON sim.practice_test_case_executions(run_id);
CREATE INDEX IF NOT EXISTS idx_practice_tce_case ON sim.practice_test_case_executions(test_case_id);

CREATE OR REPLACE FUNCTION sim.fn_practice_update_test_run_summary()
RETURNS TRIGGER AS $$
DECLARE v_summary JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'passed', COUNT(*) FILTER (WHERE status = 'passed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
        'skipped', COUNT(*) FILTER (WHERE status = 'skipped'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')
    ) INTO v_summary
    FROM sim.practice_test_case_executions WHERE run_id = NEW.run_id;

    UPDATE sim.practice_test_runs SET summary = v_summary, updated_at = NOW() WHERE id = NEW.run_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_practice_tce_run_summary ON sim.practice_test_case_executions;
CREATE TRIGGER trg_practice_tce_run_summary
    AFTER INSERT OR UPDATE OF status ON sim.practice_test_case_executions
    FOR EACH ROW EXECUTE FUNCTION sim.fn_practice_update_test_run_summary();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.practice_test_runs', 'Simulator practice test execution sessions', false, true),
    ('sim.practice_test_case_executions', 'Per-case results within a practice test run', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
