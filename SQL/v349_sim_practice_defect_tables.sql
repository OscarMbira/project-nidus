-- ============================================================================
-- Simulator — Practice Defect Tables + execution.defect_id FK
-- Version: v349
-- Prerequisites: v347, v348
-- Date: 2026-03-27
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS sim.practice_defect_ref_seq START WITH 1 INCREMENT BY 1 NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS sim.practice_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES sim.practice_test_cases(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES sim.practice_test_case_executions(id) ON DELETE SET NULL,
    defect_ref VARCHAR(50) UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'medium'
        CHECK (severity IN ('critical','high','medium','low','trivial')),
    priority VARCHAR(50) DEFAULT 'medium'
        CHECK (priority IN ('critical','high','medium','low')),
    defect_type VARCHAR(50) DEFAULT 'functional'
        CHECK (defect_type IN ('functional','ui','performance','security','data','integration','regression','environment','other')),
    status VARCHAR(50) DEFAULT 'new'
        CHECK (status IN ('new','open','in_progress','resolved','closed','reopened','deferred','duplicate')),
    environment VARCHAR(100),
    browser_os VARCHAR(255),
    build_version VARCHAR(100),
    module_area VARCHAR(255),
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    test_data_used TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolution TEXT,
    resolution_type VARCHAR(50)
        CHECK (resolution_type IS NULL OR resolution_type IN (
            'fixed','wont_fix','duplicate','cannot_reproduce','by_design','deferred','not_a_defect'
        )),
    resolved_at TIMESTAMPTZ,
    due_date DATE,
    reopen_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_defects_project ON sim.practice_defects(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_defects_deleted ON sim.practice_defects(is_deleted) WHERE is_deleted = FALSE;

CREATE OR REPLACE FUNCTION sim.fn_practice_generate_defect_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.defect_ref IS NULL OR NEW.defect_ref = '' THEN
        NEW.defect_ref := 'DEF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
            LPAD(NEXTVAL('sim.practice_defect_ref_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_practice_defects_ref ON sim.practice_defects;
CREATE TRIGGER trg_practice_defects_ref
    BEFORE INSERT ON sim.practice_defects
    FOR EACH ROW EXECUTE FUNCTION sim.fn_practice_generate_defect_ref();

ALTER TABLE sim.practice_test_case_executions
    DROP CONSTRAINT IF EXISTS fk_practice_tce_defect;
ALTER TABLE sim.practice_test_case_executions
    ADD CONSTRAINT fk_practice_tce_defect
    FOREIGN KEY (defect_id) REFERENCES sim.practice_defects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS sim.practice_defect_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    defect_id UUID NOT NULL REFERENCES sim.practice_defects(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_defect_comments_defect ON sim.practice_defect_comments(defect_id);

CREATE TABLE IF NOT EXISTS sim.practice_defect_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    defect_id UUID NOT NULL REFERENCES sim.practice_defects(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    is_screenshot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_defect_attachments_defect ON sim.practice_defect_attachments(defect_id);

CREATE TABLE IF NOT EXISTS sim.practice_defect_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    defect_id UUID NOT NULL REFERENCES sim.practice_defects(id) ON DELETE CASCADE,
    field_changed VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_note TEXT,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_defect_history_defect ON sim.practice_defect_history(defect_id);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.practice_defects', 'Simulator practice defects / bugs', false, true),
    ('sim.practice_defect_comments', 'Comments on practice defects', false, true),
    ('sim.practice_defect_attachments', 'File attachments for practice defects', false, true),
    ('sim.practice_defect_history', 'Field-level audit for practice defects', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
