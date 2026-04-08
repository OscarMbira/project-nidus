-- =============================================================================
-- v299: Simulator Practice Quality Reviews & Inspections
-- Purpose: Practice quality reviews and inspections tables for simulator (sim schema).
-- Plan: v219_Quality_Module_Completion_Plan.md Phase 3
-- =============================================================================

-- TABLE: sim.practice_quality_reviews
CREATE TABLE IF NOT EXISTS sim.practice_quality_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_quality_register_id UUID REFERENCES sim.practice_quality_register(id) ON DELETE SET NULL,

    review_reference VARCHAR(100),
    review_title VARCHAR(200) NOT NULL,
    review_type VARCHAR(100) DEFAULT 'peer-review',
    review_scope TEXT,

    planned_date DATE,
    planned_duration_minutes INTEGER DEFAULT 60,
    actual_start_datetime TIMESTAMPTZ,
    actual_end_datetime TIMESTAMPTZ,

    review_status VARCHAR(50) DEFAULT 'planned' CHECK (review_status IN ('planned', 'in-progress', 'completed', 'cancelled')),
    review_outcome VARCHAR(50),
    overall_score DECIMAL(5,2),
    issues_found_count INTEGER DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_reviews_project ON sim.practice_quality_reviews(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_reviews_user ON sim.practice_quality_reviews(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_reviews_status ON sim.practice_quality_reviews(review_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_reviews_date ON sim.practice_quality_reviews(planned_date) WHERE is_deleted = FALSE;

-- TABLE: sim.practice_quality_inspections
CREATE TABLE IF NOT EXISTS sim.practice_quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_quality_register_id UUID REFERENCES sim.practice_quality_register(id) ON DELETE SET NULL,

    inspection_reference VARCHAR(100),
    inspection_title VARCHAR(200) NOT NULL,
    inspection_type VARCHAR(100),
    inspection_scope TEXT,

    inspector_user_id UUID REFERENCES auth.users(id),
    inspection_date DATE NOT NULL,
    inspection_duration_minutes INTEGER,

    inspection_result VARCHAR(50) CHECK (inspection_result IN ('passed', 'passed-with-conditions', 'failed', 'deferred')),
    defects_found_count INTEGER DEFAULT 0,
    critical_defects_count INTEGER DEFAULT 0,
    major_defects_count INTEGER DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_inspections_project ON sim.practice_quality_inspections(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_inspections_user ON sim.practice_quality_inspections(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_inspections_date ON sim.practice_quality_inspections(inspection_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_quality_inspections_result ON sim.practice_quality_inspections(inspection_result) WHERE is_deleted = FALSE;

-- RLS
ALTER TABLE sim.practice_quality_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_quality_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_quality_reviews_user_access" ON sim.practice_quality_reviews;
CREATE POLICY "practice_quality_reviews_user_access" ON sim.practice_quality_reviews
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS "practice_quality_inspections_user_access" ON sim.practice_quality_inspections;
CREATE POLICY "practice_quality_inspections_user_access" ON sim.practice_quality_inspections
    FOR ALL TO authenticated
    USING (user_id = sim.get_current_user_id())
    WITH CHECK (user_id = sim.get_current_user_id());

-- Register in database_tables if the table exists
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.practice_quality_reviews', 'Simulator practice quality reviews', false, true),
    ('sim.practice_quality_inspections', 'Simulator practice quality inspections', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'v299: sim.practice_quality_reviews and sim.practice_quality_inspections created with RLS';
END $$;
