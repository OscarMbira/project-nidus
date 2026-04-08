-- =============================================================================
-- v233: Simulator Practice Issue Management Tables
-- Purpose: Practice issue registers and issue reports for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.7
-- =============================================================================

-- Create practice_issue_register table (header)
CREATE TABLE IF NOT EXISTS sim.practice_issue_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    register_reference VARCHAR(50) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    update_process TEXT,
    escalation_threshold TEXT,
    priority_scale JSONB DEFAULT '{}'::jsonb,
    severity_scale JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_issue_register_project_id 
    ON sim.practice_issue_register(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_issue_register_user_id 
    ON sim.practice_issue_register(user_id) WHERE is_deleted = FALSE;

-- Create practice_issues table (issue entries)
CREATE TABLE IF NOT EXISTS sim.practice_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_issue_register_id UUID REFERENCES sim.practice_issue_register(id) ON DELETE CASCADE,
    practice_work_package_id UUID REFERENCES sim.practice_work_packages(id),
    
    -- Issue Information
    issue_title VARCHAR(200) NOT NULL,
    issue_description TEXT NOT NULL,
    issue_code VARCHAR(50),
    issue_identifier VARCHAR(50),
    issue_number INTEGER,
    
    -- Categorization
    issue_type VARCHAR(50) DEFAULT 'bug' CHECK (issue_type IN ('bug', 'enhancement', 'task', 'question', 'blocker', 'risk', 'other')),
    issue_category VARCHAR(50),
    sub_category VARCHAR(100),
    cause_description TEXT,
    
    -- Priority & Severity
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    priority_rationale TEXT,
    severity_rationale TEXT,
    urgency VARCHAR(50),
    
    -- Status Workflow
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'cancelled')),
    
    -- Assignment
    reported_by_user_id UUID REFERENCES auth.users(id),
    assigned_to_user_id UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by_user_id UUID REFERENCES auth.users(id),
    resolution_type VARCHAR(50),
    resolution_notes TEXT,
    
    -- Closure
    closed_at TIMESTAMPTZ,
    closed_by_user_id UUID REFERENCES auth.users(id),
    
    -- Dates
    due_date DATE,
    estimated_resolution_date DATE,
    
    -- Impact
    impact_description TEXT,
    affected_areas TEXT[],
    cost_impact DECIMAL(15, 2),
    schedule_impact_days INTEGER,
    quality_impact TEXT,
    scope_impact TEXT,
    
    -- Learning/Scoring
    practice_score INTEGER,
    feedback TEXT,
    
    -- Tags
    tags TEXT[],
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_issues_project_id 
    ON sim.practice_issues(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_issues_register_id 
    ON sim.practice_issues(practice_issue_register_id) WHERE practice_issue_register_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_issues_user_id 
    ON sim.practice_issues(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_issues_status 
    ON sim.practice_issues(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_issues_priority 
    ON sim.practice_issues(priority) WHERE is_deleted = FALSE;

-- Create practice_issue_reports table
CREATE TABLE IF NOT EXISTS sim.practice_issue_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_issue_id UUID REFERENCES sim.practice_issues(id) ON DELETE CASCADE,
    report_reference VARCHAR(100) UNIQUE NOT NULL,
    report_title VARCHAR(200) NOT NULL,
    report_description TEXT,
    report_date DATE DEFAULT CURRENT_DATE,
    report_status VARCHAR(50) DEFAULT 'draft' CHECK (report_status IN ('draft', 'submitted', 'under_review', 'approved', 'distributed')),
    author_id UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ,
    submitted_to_id UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by_id UUID REFERENCES auth.users(id),
    document_content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_issue_reports_project_id 
    ON sim.practice_issue_reports(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_issue_reports_issue_id 
    ON sim.practice_issue_reports(practice_issue_id) WHERE practice_issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_issue_reports_user_id 
    ON sim.practice_issue_reports(user_id);

-- Create practice_issue_actions table
CREATE TABLE IF NOT EXISTS sim.practice_issue_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_issue_id UUID NOT NULL REFERENCES sim.practice_issues(id) ON DELETE CASCADE,
    action_title VARCHAR(200) NOT NULL,
    action_description TEXT,
    action_type VARCHAR(50) DEFAULT 'corrective' CHECK (action_type IN ('corrective', 'preventive', 'improvement', 'observation')),
    assigned_to_user_id UUID REFERENCES auth.users(id),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_practice_issue_actions_issue_id 
    ON sim.practice_issue_actions(practice_issue_id);
CREATE INDEX IF NOT EXISTS idx_practice_issue_actions_assigned_to 
    ON sim.practice_issue_actions(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;

-- Create practice_issue_decisions table
CREATE TABLE IF NOT EXISTS sim.practice_issue_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_issue_id UUID NOT NULL REFERENCES sim.practice_issues(id) ON DELETE CASCADE,
    decision_title VARCHAR(200) NOT NULL,
    decision_description TEXT,
    decision_type VARCHAR(50) DEFAULT 'resolution' CHECK (decision_type IN ('resolution', 'escalation', 'deferral', 'acceptance')),
    decided_by_user_id UUID REFERENCES auth.users(id),
    decision_date DATE DEFAULT CURRENT_DATE,
    decision_rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_issue_decisions_issue_id 
    ON sim.practice_issue_decisions(practice_issue_id);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_issue_register', 'Practice issue register header for simulator learning', false, true, 'simulation'),
    ('sim.practice_issues', 'Practice issue entries for simulator learning', false, true, 'simulation'),
    ('sim.practice_issue_reports', 'Practice issue reports for simulator learning', false, true, 'simulation'),
    ('sim.practice_issue_actions', 'Practice issue actions for simulator learning', false, true, 'simulation'),
    ('sim.practice_issue_decisions', 'Practice issue decisions for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
