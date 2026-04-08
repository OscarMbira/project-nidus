-- ============================================================================
-- Simulator — Practice Test Management Core (sim schema)
-- Version: v347
-- Description: practice_test_suites, practice_test_cases, practice_test_case_steps
-- Prerequisites: sim.practice_projects, public.users
-- Date: 2026-03-27
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS sim.practice_test_case_ref_seq START WITH 1 INCREMENT BY 1 NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS sim.practice_test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    suite_type VARCHAR(50) DEFAULT 'functional'
        CHECK (suite_type IN ('functional','regression','smoke','uat','performance','security','integration','exploratory','sanity')),
    status VARCHAR(50) DEFAULT 'draft'
        CHECK (status IN ('draft','active','archived')),
    version VARCHAR(50) DEFAULT '1.0',
    tags JSONB DEFAULT '[]'::jsonb,
    environment VARCHAR(100),
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_test_suites_project ON sim.practice_test_suites(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_test_suites_deleted ON sim.practice_test_suites(is_deleted) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS sim.practice_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    suite_id UUID REFERENCES sim.practice_test_suites(id) ON DELETE SET NULL,
    test_case_ref VARCHAR(50) UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    preconditions TEXT,
    test_type VARCHAR(50) DEFAULT 'manual'
        CHECK (test_type IN ('manual','automated','exploratory')),
    priority VARCHAR(50) DEFAULT 'medium'
        CHECK (priority IN ('critical','high','medium','low')),
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('draft','active','deprecated','archived')),
    expected_result TEXT,
    test_data TEXT,
    environment VARCHAR(100),
    tags JSONB DEFAULT '[]'::jsonb,
    module_area VARCHAR(255),
    requirement_ref VARCHAR(255),
    estimated_duration_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_test_cases_project ON sim.practice_test_cases(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_test_cases_suite ON sim.practice_test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_practice_test_cases_deleted ON sim.practice_test_cases(is_deleted) WHERE is_deleted = FALSE;

CREATE OR REPLACE FUNCTION sim.fn_practice_generate_test_case_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.test_case_ref IS NULL OR NEW.test_case_ref = '' THEN
        NEW.test_case_ref := 'TC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
            LPAD(NEXTVAL('sim.practice_test_case_ref_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_practice_test_cases_ref ON sim.practice_test_cases;
CREATE TRIGGER trg_practice_test_cases_ref
    BEFORE INSERT ON sim.practice_test_cases
    FOR EACH ROW EXECUTE FUNCTION sim.fn_practice_generate_test_case_ref();

CREATE TABLE IF NOT EXISTS sim.practice_test_case_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id UUID NOT NULL REFERENCES sim.practice_test_cases(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action TEXT NOT NULL,
    expected_result TEXT,
    test_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_practice_test_case_steps UNIQUE (test_case_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_practice_test_case_steps_case ON sim.practice_test_case_steps(test_case_id);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.practice_test_suites', 'Simulator practice test suites for a practice project', false, true),
    ('sim.practice_test_cases', 'Simulator practice test cases/scripts', false, true),
    ('sim.practice_test_case_steps', 'Step-by-step instructions for practice test cases', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();
