-- =============================================================================
-- v236: Simulator Practice Reports Tables
-- Purpose: Practice reports (checkpoint, highlight, exception, end stage, end project) for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.10
-- =============================================================================

-- Create practice_checkpoint_reports table
CREATE TABLE IF NOT EXISTS sim.practice_checkpoint_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_stage_id UUID REFERENCES sim.practice_project_stages(id),
    practice_work_package_id UUID REFERENCES sim.practice_work_packages(id),
    reported_by_user_id UUID REFERENCES auth.users(id),
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checkpoint_date DATE NOT NULL,
    report_title VARCHAR(200),
    report_summary TEXT,
    progress_summary TEXT,
    completed_work TEXT,
    work_in_progress TEXT,
    planned_work TEXT,
    issues_summary TEXT,
    risks_summary TEXT,
    changes_summary TEXT,
    quality_status TEXT,
    budget_status TEXT,
    schedule_status TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_checkpoint_reports_project_id 
    ON sim.practice_checkpoint_reports(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_checkpoint_reports_user_id 
    ON sim.practice_checkpoint_reports(user_id);

-- Create practice_highlight_reports table
CREATE TABLE IF NOT EXISTS sim.practice_highlight_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_stage_id UUID REFERENCES sim.practice_project_stages(id),
    prepared_by_user_id UUID REFERENCES auth.users(id),
    report_reference VARCHAR(100) UNIQUE NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reporting_period_start DATE,
    reporting_period_end DATE,
    report_title VARCHAR(200) NOT NULL,
    executive_summary TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'distributed')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    document_content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_highlight_reports_project_id 
    ON sim.practice_highlight_reports(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_highlight_reports_user_id 
    ON sim.practice_highlight_reports(user_id);

-- Create practice_exception_reports table
CREATE TABLE IF NOT EXISTS sim.practice_exception_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_stage_id UUID REFERENCES sim.practice_project_stages(id),
    practice_exception_id UUID, -- Link to exception/issue that triggered this
    report_reference VARCHAR(100) UNIQUE NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    report_title VARCHAR(200) NOT NULL,
    exception_description TEXT NOT NULL,
    exception_category VARCHAR(50),
    tolerance_exceeded VARCHAR(50) CHECK (tolerance_exceeded IN ('time', 'cost', 'quality', 'scope', 'risk', 'benefits', 'multiple')),
    impact_assessment TEXT,
    recommended_actions TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'distributed')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_exception_reports_project_id 
    ON sim.practice_exception_reports(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_exception_reports_user_id 
    ON sim.practice_exception_reports(user_id);

-- Create practice_end_stage_reports table
CREATE TABLE IF NOT EXISTS sim.practice_end_stage_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_stage_id UUID NOT NULL REFERENCES sim.practice_project_stages(id),
    report_reference VARCHAR(100) UNIQUE NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    report_title VARCHAR(200) NOT NULL,
    stage_summary TEXT,
    objectives_achieved TEXT,
    products_delivered TEXT,
    quality_review TEXT,
    risk_review TEXT,
    issue_review TEXT,
    business_case_review TEXT,
    recommendations TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'distributed')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    document_content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_end_stage_reports_project_id 
    ON sim.practice_end_stage_reports(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_end_stage_reports_stage_id 
    ON sim.practice_end_stage_reports(practice_stage_id);
CREATE INDEX IF NOT EXISTS idx_practice_end_stage_reports_user_id 
    ON sim.practice_end_stage_reports(user_id);

-- Create practice_end_project_reports table
CREATE TABLE IF NOT EXISTS sim.practice_end_project_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    report_reference VARCHAR(100) UNIQUE NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    report_title VARCHAR(200) NOT NULL,
    executive_summary TEXT,
    project_summary TEXT,
    objectives_review TEXT,
    benefits_review TEXT,
    lessons_summary TEXT,
    recommendations TEXT,
    handover_arrangements TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'distributed', 'closed')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    document_content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_end_project_reports_project_id 
    ON sim.practice_end_project_reports(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_practice_end_project_reports_user_id 
    ON sim.practice_end_project_reports(user_id);

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_checkpoint_reports', 'Practice checkpoint reports for simulator learning', false, true, 'simulation'),
    ('sim.practice_highlight_reports', 'Practice highlight reports for simulator learning', false, true, 'simulation'),
    ('sim.practice_exception_reports', 'Practice exception reports for simulator learning', false, true, 'simulation'),
    ('sim.practice_end_stage_reports', 'Practice end stage reports for simulator learning', false, true, 'simulation'),
    ('sim.practice_end_project_reports', 'Practice end project reports for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
