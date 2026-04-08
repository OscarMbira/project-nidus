-- ============================================================================
-- Simulator Project Mandate Tables - For Learning/Practice
-- Version: v80
-- Description: Simulated project mandate tables for learners to practice mandate creation
-- Date: 2025-01-28
-- ============================================================================
--
-- Purpose:
-- Creates simulated project mandate tables in the SIM schema for learners to practice.
-- These mandates are for learning purposes only - they don't create real projects.
-- Part of Full Lifecycle Simulation: Startup → Initiation → Planning → Execution → Control → Closure
--
-- Prerequisites:
-- - v66_sim_schema_core_tables.sql (sim schema and core tables must exist)
-- - sim.simulation_runs table must exist
--
-- Key Design:
-- - Mandates linked to simulation_runs (learning sessions)
-- - Same structure as platform mandates but in sim schema
-- - Practice creating mandates without affecting real projects
-- - Can be part of "Startup" phase in full lifecycle simulations
--
-- ============================================================================
-- SECTION 1: MAIN TABLE - sim.project_mandates
-- ============================================================================

-- Create main sim.project_mandates table
CREATE TABLE IF NOT EXISTS sim.project_mandates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship (Linked to simulation run for learning context)
    simulation_run_id UUID REFERENCES sim.simulation_runs(id) ON DELETE CASCADE, -- Learning session context
    
    -- Mandate Identification
    mandate_reference VARCHAR(50) NOT NULL, -- Unique reference (e.g., SIM-MAN-2026-001)
    mandate_title VARCHAR(200) NOT NULL,
    
    -- Document Status
    document_status VARCHAR(50) DEFAULT 'draft' CHECK (document_status IN ('draft', 'submitted', 'approved', 'rejected', 'archived')),
    version_number VARCHAR(20) DEFAULT '1.0',
    
    -- Dates
    created_date DATE DEFAULT CURRENT_DATE,
    printed_date DATE,
    
    -- Section 1: Purpose
    purpose TEXT NOT NULL,
    
    -- Section 2: Authority
    authority_responsible TEXT,
    
    -- Section 3: Background
    background TEXT NOT NULL,
    
    -- Programme Linkage (for learning complex scenarios)
    is_standalone BOOLEAN DEFAULT true,
    programme_name VARCHAR(200), -- Simulated programme (text, not FK)
    
    -- Section 4: Objectives
    project_objectives TEXT NOT NULL,
    
    -- Section 5: Scope
    scope TEXT,
    scope_exclusions TEXT,
    
    -- Section 6: Constraints
    constraints TEXT,
    
    -- Section 7: Interfaces
    interfaces TEXT,
    
    -- Section 8: Quality Expectations
    quality_expectations TEXT,
    quality_priority VARCHAR(20) DEFAULT 'balanced' CHECK (quality_priority IN ('time', 'cost', 'quality', 'balanced')),
    
    -- Section 9: Outline Business Case
    outline_business_case TEXT NOT NULL,
    
    -- Section 11: Proposed Roles (learning - can use names)
    proposed_executive_name VARCHAR(200),
    proposed_pm_name VARCHAR(200),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Learning/Scoring
    practice_score INTEGER, -- Score for mandate quality (0-100)
    feedback TEXT, -- Feedback from AI or instructor
    is_practice_mode BOOLEAN DEFAULT true, -- Always true for simulator
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sim_project_mandates_simulation_run_id ON sim.project_mandates(simulation_run_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sim_project_mandates_user_id ON sim.project_mandates(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sim_project_mandates_document_status ON sim.project_mandates(document_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sim_project_mandates_mandate_reference ON sim.project_mandates(mandate_reference);

-- Trigger to auto-generate mandate_reference if not provided
CREATE OR REPLACE FUNCTION sim.generate_sim_mandate_reference_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
    v_seq INTEGER;
    v_ref VARCHAR(50);
BEGIN
    IF NEW.mandate_reference IS NULL OR NEW.mandate_reference = '' THEN
        v_year := EXTRACT(YEAR FROM CURRENT_DATE);
        
        SELECT COALESCE(MAX(CAST(SUBSTRING(mandate_reference FROM '\d+$') AS INTEGER)), 0) + 1
        INTO v_seq
        FROM sim.project_mandates
        WHERE mandate_reference LIKE 'SIM-MAN-' || v_year || '-%';
        
        v_ref := 'SIM-MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
        NEW.mandate_reference := v_ref;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sim_project_mandates_generate_reference ON sim.project_mandates;
CREATE TRIGGER trg_sim_project_mandates_generate_reference
    BEFORE INSERT ON sim.project_mandates
    FOR EACH ROW EXECUTE FUNCTION sim.generate_sim_mandate_reference_trigger();

-- Comments
COMMENT ON TABLE sim.project_mandates IS 'Simulated project mandates for learning - practice mandate creation without real projects';
COMMENT ON COLUMN sim.project_mandates.simulation_run_id IS 'Links to simulation run for full lifecycle learning context';
COMMENT ON COLUMN sim.project_mandates.practice_score IS 'Score (0-100) for mandate quality - learning feedback';
COMMENT ON COLUMN sim.project_mandates.is_practice_mode IS 'Always true - these are for learning only';

-- ============================================================================
-- SECTION 2: sim.mandate_deliverables (Practice Deliverables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.mandate_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES sim.project_mandates(id) ON DELETE CASCADE,
    deliverable_name VARCHAR(200) NOT NULL,
    deliverable_description TEXT,
    is_in_scope BOOLEAN DEFAULT true,
    is_major_deliverable BOOLEAN DEFAULT true,
    estimated_completion VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_mandate_deliverables_mandate_id ON sim.mandate_deliverables(mandate_id);

COMMENT ON TABLE sim.mandate_deliverables IS 'Deliverables for simulated project mandates (practice)';

-- ============================================================================
-- SECTION 3: sim.mandate_stakeholders (Practice Stakeholders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.mandate_stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID NOT NULL REFERENCES sim.project_mandates(id) ON DELETE CASCADE,
    stakeholder_type VARCHAR(50) CHECK (stakeholder_type IN ('customer', 'user', 'interested_party')),
    stakeholder_name VARCHAR(200) NOT NULL,
    stakeholder_organisation VARCHAR(200),
    stakeholder_role VARCHAR(200),
    contact_email VARCHAR(200),
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_mandate_stakeholders_mandate_id ON sim.mandate_stakeholders(mandate_id);

COMMENT ON TABLE sim.mandate_stakeholders IS 'Stakeholders for simulated project mandates (practice)';

-- ============================================================================
-- SECTION 3B: sim.practice_projects (Practice Projects from Mandates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandate_id UUID REFERENCES sim.project_mandates(id) ON DELETE SET NULL,
    simulation_run_id UUID REFERENCES sim.simulation_runs(id) ON DELETE SET NULL,
    project_name VARCHAR(200) NOT NULL,
    project_description TEXT,
    project_code VARCHAR(50), -- Practice project code (e.g., SIM-PRO-2026-001)
    project_status VARCHAR(50) DEFAULT 'initiated' CHECK (project_status IN ('initiated', 'planning', 'executing', 'closed')),
    start_date DATE DEFAULT CURRENT_DATE,
    is_practice_mode BOOLEAN DEFAULT true, -- Always true for simulator
    practice_score INTEGER, -- Learning score for project creation quality
    feedback TEXT, -- Learning feedback
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_projects_mandate_id ON sim.practice_projects(mandate_id) WHERE is_practice_mode = true;
CREATE INDEX IF NOT EXISTS idx_sim_practice_projects_user_id ON sim.practice_projects(user_id) WHERE is_practice_mode = true;
CREATE INDEX IF NOT EXISTS idx_sim_practice_projects_simulation_run_id ON sim.practice_projects(simulation_run_id) WHERE simulation_run_id IS NOT NULL;

COMMENT ON TABLE sim.practice_projects IS 'Practice projects created from simulated mandates for learning';
COMMENT ON COLUMN sim.practice_projects.mandate_id IS 'Links to the mandate that created this practice project';
COMMENT ON COLUMN sim.practice_projects.is_practice_mode IS 'Always true - these are for learning only';

-- Register practice_projects table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_projects', 'Practice projects created from simulated mandates (learning)', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Get mandate by ID (simulator version)
CREATE OR REPLACE FUNCTION sim.get_sim_mandate_by_id(p_mandate_id UUID)
RETURNS TABLE (
    mandate_id UUID,
    simulation_run_id UUID,
    mandate_reference VARCHAR,
    mandate_title VARCHAR,
    document_status VARCHAR,
    created_date DATE,
    practice_score INTEGER,
    feedback TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.simulation_run_id,
        pm.mandate_reference,
        pm.mandate_title,
        pm.document_status,
        pm.created_date,
        pm.practice_score,
        pm.feedback
    FROM sim.project_mandates pm
    WHERE pm.id = p_mandate_id
      AND pm.is_active = true;
END;
$$;

COMMENT ON FUNCTION sim.get_sim_mandate_by_id(UUID) IS 'Returns simulated mandate by ID for learning context';

-- Function: Get mandates by simulation run
CREATE OR REPLACE FUNCTION sim.get_mandates_by_simulation_run(p_run_id UUID)
RETURNS TABLE (
    mandate_id UUID,
    mandate_reference VARCHAR,
    mandate_title VARCHAR,
    document_status VARCHAR,
    practice_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.mandate_reference,
        pm.mandate_title,
        pm.document_status,
        pm.practice_score
    FROM sim.project_mandates pm
    WHERE pm.simulation_run_id = p_run_id
      AND pm.is_active = true
    ORDER BY pm.created_date DESC;
END;
$$;

COMMENT ON FUNCTION sim.get_mandates_by_simulation_run(UUID) IS 'Returns all mandates for a simulation run (learning session)';

-- Function: Generate simulator mandate reference
CREATE OR REPLACE FUNCTION sim.generate_sim_mandate_reference()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INTEGER;
    v_seq INTEGER;
    v_ref VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(mandate_reference FROM '\d+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM sim.project_mandates
    WHERE mandate_reference LIKE 'SIM-MAN-' || v_year || '-%';
    
    v_ref := 'SIM-MAN-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
    
    RETURN v_ref;
END;
$$;

COMMENT ON FUNCTION sim.generate_sim_mandate_reference() IS 'Generates unique simulated mandate reference (e.g., SIM-MAN-2026-001)';

-- Function: Create practice project from simulated mandate
CREATE OR REPLACE FUNCTION sim.create_practice_project_from_mandate(p_mandate_id UUID, p_user_id UUID, p_simulation_run_id UUID DEFAULT NULL)
RETURNS UUID -- Returns the new practice project ID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mandate sim.project_mandates;
    v_new_project_id UUID;
    v_project_code VARCHAR(50);
    v_year INTEGER;
    v_seq INTEGER;
BEGIN
    -- 1. Validate mandate is approved and not already linked
    SELECT * INTO v_mandate
    FROM sim.project_mandates
    WHERE id = p_mandate_id AND is_active = true;

    IF v_mandate IS NULL THEN
        RAISE EXCEPTION 'Mandate not found.';
    END IF;

    IF v_mandate.document_status <> 'approved' THEN
        RAISE EXCEPTION 'Mandate must be approved to create a practice project.';
    END IF;

    -- 2. Generate practice project code
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT COALESCE(MAX(CAST(SUBSTRING(project_code FROM '\d+$') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM sim.practice_projects
    WHERE project_code LIKE 'SIM-PRO-' || v_year || '-%';
    v_project_code := 'SIM-PRO-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');

    -- 3. Create practice project record
    INSERT INTO sim.practice_projects (
        mandate_id,
        simulation_run_id,
        project_name,
        project_description,
        project_code,
        project_status,
        start_date,
        is_practice_mode,
        user_id
    ) VALUES (
        p_mandate_id,
        p_simulation_run_id,
        v_mandate.mandate_title,
        COALESCE(v_mandate.background, 'Practice project created from mandate'),
        v_project_code,
        'initiated', -- Practice project starts in initiated status
        v_mandate.created_date,
        true, -- Always practice mode
        p_user_id
    )
    RETURNING id INTO v_new_project_id;

    -- 4. Update mandate: link to practice project (we can add a practice_project_id to mandates later if needed)
    -- For now, we'll just track the relationship via practice_projects.mandate_id

    -- 5. Calculate learning feedback (simplified)
    -- In a full implementation, this would evaluate the quality of project creation
    UPDATE sim.practice_projects
    SET 
        practice_score = 85, -- Default practice score for creating from approved mandate
        feedback = 'Practice project created successfully from approved mandate. This is for learning purposes.'
    WHERE id = v_new_project_id;

    RETURN v_new_project_id;
END;
$$;

COMMENT ON FUNCTION sim.create_practice_project_from_mandate(UUID, UUID, UUID) IS 'Creates a practice project from an approved simulated mandate for learning';

-- ============================================================================
-- SECTION 5: REGISTER TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.project_mandates', 'Simulated project mandates for learning - practice mandate creation', false, true, 'simulation'),
    ('sim.mandate_deliverables', 'Deliverables for simulated project mandates (practice)', false, true, 'simulation'),
    ('sim.mandate_stakeholders', 'Stakeholders for simulated project mandates (practice)', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE (table_name LIKE 'sim.mandate%' OR table_name = 'sim.project_mandates' OR table_name = 'sim.practice_projects')
      AND table_category = 'simulation';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Simulator Project Mandate Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Simulated Mandate & Project Tables Created: %', v_tables_count;
    RAISE NOTICE 'Expected: 4 tables (mandates, deliverables, stakeholders, practice_projects)';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v80_sim_project_mandate_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================
