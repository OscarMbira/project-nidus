-- =============================================================================
-- v241: Simulator Practice Governance Tables
-- Purpose: Practice governance decisions and document register for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.15
-- =============================================================================

-- Create practice_governance_decisions table
CREATE TABLE IF NOT EXISTS sim.practice_governance_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    decision_reference VARCHAR(100) UNIQUE NOT NULL,
    decision_title VARCHAR(200) NOT NULL,
    decision_description TEXT NOT NULL,
    decision_type VARCHAR(50) DEFAULT 'governance' CHECK (decision_type IN ('governance', 'approval', 'escalation', 'exception', 'change_control')),
    decision_category VARCHAR(100),
    decision_date DATE DEFAULT CURRENT_DATE,
    decided_by_user_id UUID REFERENCES auth.users(id),
    decision_rationale TEXT,
    decision_outcome TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deferred', 'implemented')),
    implementation_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_governance_decisions_project_id 
    ON sim.practice_governance_decisions(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_governance_decisions_user_id 
    ON sim.practice_governance_decisions(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_governance_decisions_status 
    ON sim.practice_governance_decisions(status) WHERE is_deleted = FALSE;

-- Create practice_document_register table
CREATE TABLE IF NOT EXISTS sim.practice_document_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    document_reference VARCHAR(100) UNIQUE NOT NULL,
    document_title VARCHAR(200) NOT NULL,
    document_description TEXT,
    document_type VARCHAR(100) NOT NULL, -- 'mandate', 'brief', 'business_case', 'pid', 'plan', 'report', etc.
    document_category VARCHAR(100), -- 'initiation', 'planning', 'execution', 'control', 'closure'
    document_version VARCHAR(20) DEFAULT '1.0',
    document_status VARCHAR(50) DEFAULT 'draft' CHECK (document_status IN ('draft', 'under_review', 'approved', 'baseline', 'superseded', 'archived')),
    document_location TEXT,
    document_url TEXT,
    author_id UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    approval_required BOOLEAN DEFAULT FALSE,
    approved_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    review_date DATE,
    next_review_date DATE,
    compliance_status VARCHAR(50) DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'non_compliant', 'under_review', 'exempt')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_document_register_project_id 
    ON sim.practice_document_register(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_document_register_user_id 
    ON sim.practice_document_register(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_document_register_type 
    ON sim.practice_document_register(document_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_document_register_status 
    ON sim.practice_document_register(document_status) WHERE is_deleted = FALSE;

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_governance_decisions', 'Practice governance decisions for simulator learning', false, true, 'simulation'),
    ('sim.practice_document_register', 'Practice document register for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
