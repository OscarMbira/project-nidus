-- ============================================================================
-- Test Case Management - Core Tables
-- Version: v338
-- Description: Creates test_suites, test_cases, and test_case_steps tables
-- Date: 2026-03-27
-- ============================================================================
--
-- Purpose:
-- Implements the Test Case Management module enabling project teams to
-- organise, document, and track test cases/scripts for all project types
-- (UAT, regression, functional, smoke, performance, security, integration).
--
-- Prerequisites:
-- - projects table must exist
-- - users table must exist
-- - trigger_set_created_fields() function must exist
-- - trigger_update_audit_fields() function must exist
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: SEQUENCES FOR REFERENCE GENERATION
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS test_case_ref_seq
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    CACHE 1;

-- ============================================================================
-- SECTION 2: TEST_SUITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_suites (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Suite Identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    suite_type VARCHAR(50) DEFAULT 'functional'
        CHECK (suite_type IN ('functional','regression','smoke','uat','performance','security','integration','exploratory','sanity')),
    status VARCHAR(50) DEFAULT 'draft'
        CHECK (status IN ('draft','active','archived')),
    version VARCHAR(50) DEFAULT '1.0',
    tags JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    environment VARCHAR(100),           -- Target environment this suite runs against
    estimated_duration_minutes INTEGER, -- Estimated total run time

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
CREATE INDEX IF NOT EXISTS idx_test_suites_project_id       ON test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_status           ON test_suites(status);
CREATE INDEX IF NOT EXISTS idx_test_suites_suite_type       ON test_suites(suite_type);
CREATE INDEX IF NOT EXISTS idx_test_suites_is_deleted       ON test_suites(is_deleted) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_test_suites_before_insert ON test_suites;
CREATE TRIGGER trg_test_suites_before_insert
    BEFORE INSERT ON test_suites
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_test_suites_before_update ON test_suites;
CREATE TRIGGER trg_test_suites_before_update
    BEFORE UPDATE ON test_suites
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 3: TEST_CASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_cases (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    suite_id   UUID REFERENCES test_suites(id) ON DELETE SET NULL,  -- nullable: cases can exist without a suite

    -- Case Identification
    test_case_ref VARCHAR(50) UNIQUE,   -- Auto-generated: TC-YYYYMMDD-NNNN
    title         VARCHAR(500) NOT NULL,
    description   TEXT,
    preconditions TEXT,

    -- Classification
    test_type  VARCHAR(50) DEFAULT 'manual'
        CHECK (test_type IN ('manual','automated','exploratory')),
    priority   VARCHAR(50) DEFAULT 'medium'
        CHECK (priority IN ('critical','high','medium','low')),
    status     VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('draft','active','deprecated','archived')),

    -- Test Design
    expected_result TEXT,
    test_data       TEXT,               -- Sample data required to run the test
    environment     VARCHAR(100),       -- Specific environment requirement

    -- Categorisation
    tags                     JSONB DEFAULT '[]'::jsonb,
    module_area              VARCHAR(255),   -- Application area/module being tested
    requirement_ref          VARCHAR(255),   -- Link to requirement/user story reference
    estimated_duration_minutes INTEGER DEFAULT 5,

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
CREATE INDEX IF NOT EXISTS idx_test_cases_project_id       ON test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_suite_id         ON test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_case_ref    ON test_cases(test_case_ref);
CREATE INDEX IF NOT EXISTS idx_test_cases_status           ON test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_priority         ON test_cases(priority);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_type        ON test_cases(test_type);
CREATE INDEX IF NOT EXISTS idx_test_cases_is_deleted       ON test_cases(is_deleted) WHERE is_deleted = FALSE;

-- ============================================================================
-- SECTION 3a: TEST_CASE_REF AUTO-GENERATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_generate_test_case_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.test_case_ref IS NULL OR NEW.test_case_ref = '' THEN
        NEW.test_case_ref := 'TC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                             LPAD(NEXTVAL('test_case_ref_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_test_cases_generate_ref ON test_cases;
CREATE TRIGGER trg_test_cases_generate_ref
    BEFORE INSERT ON test_cases
    FOR EACH ROW EXECUTE FUNCTION fn_generate_test_case_ref();

DROP TRIGGER IF EXISTS trg_test_cases_before_insert ON test_cases;
CREATE TRIGGER trg_test_cases_before_insert
    BEFORE INSERT ON test_cases
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_test_cases_before_update ON test_cases;
CREATE TRIGGER trg_test_cases_before_update
    BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 4: TEST_CASE_STEPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_case_steps (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,

    -- Step Data
    step_number     INTEGER NOT NULL,           -- Display order (1, 2, 3…)
    action          TEXT NOT NULL,              -- What the tester does
    expected_result TEXT,                       -- What should happen after this action
    test_data       TEXT,                       -- Data required for this specific step

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_case_steps_test_case_id ON test_case_steps(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_steps_step_number  ON test_case_steps(test_case_id, step_number);

-- Unique constraint: each step number unique within a test case
ALTER TABLE test_case_steps
    DROP CONSTRAINT IF EXISTS uq_test_case_steps_case_step;
ALTER TABLE test_case_steps
    ADD CONSTRAINT uq_test_case_steps_case_step UNIQUE (test_case_id, step_number);

DROP TRIGGER IF EXISTS trg_test_case_steps_before_insert ON test_case_steps;
CREATE TRIGGER trg_test_case_steps_before_insert
    BEFORE INSERT ON test_case_steps
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_test_case_steps_before_update ON test_case_steps;
CREATE TRIGGER trg_test_case_steps_before_update
    BEFORE UPDATE ON test_case_steps
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- ============================================================================
-- SECTION 5: DATABASE TABLE REGISTRY
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('test_suites',      'Test suites grouping related test cases for a project', false, true),
    ('test_cases',       'Individual test cases/scripts with steps and expected results', false, true),
    ('test_case_steps',  'Step-by-step instructions for each test case action and expected result', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table   = EXCLUDED.is_system_table,
    updated_at        = NOW();
