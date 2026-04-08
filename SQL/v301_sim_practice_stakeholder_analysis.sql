-- =============================================================================
-- v301: Simulator Practice Stakeholder Analysis, Engagement, Communication Plans
-- Purpose: Practice stakeholder analysis, engagement plans, communication plans and log (sim schema).
-- Plan: v220_Stakeholder_Management_Implementation_Plan.md
-- =============================================================================

-- TABLE: sim.practice_stakeholder_analysis
CREATE TABLE IF NOT EXISTS sim.practice_stakeholder_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_stakeholder_id UUID NOT NULL REFERENCES sim.practice_stakeholder_register(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    analysis_period VARCHAR(100),
    power_level INTEGER CHECK (power_level >= 1 AND power_level <= 5),
    interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 5),
    matrix_quadrant VARCHAR(50),
    current_attitude VARCHAR(50),
    desired_attitude VARCHAR(50),
    impact_on_project INTEGER CHECK (impact_on_project IS NULL OR (impact_on_project >= 1 AND impact_on_project <= 5)),
    power_sources TEXT[],
    key_messages TEXT,
    engagement_strategy TEXT,
    engagement_priority VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_stakeholder_analysis_project ON sim.practice_stakeholder_analysis(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_stakeholder_analysis_stakeholder ON sim.practice_stakeholder_analysis(practice_stakeholder_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_stakeholder_analysis_quadrant ON sim.practice_stakeholder_analysis(matrix_quadrant) WHERE is_deleted = FALSE;

-- TABLE: sim.practice_engagement_plans
CREATE TABLE IF NOT EXISTS sim.practice_engagement_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_stakeholder_id UUID NOT NULL REFERENCES sim.practice_stakeholder_register(id) ON DELETE CASCADE,
    engagement_priority VARCHAR(50),
    engagement_strategy TEXT,
    engagement_method VARCHAR(100),
    preferred_engagement_format TEXT,
    engagement_frequency VARCHAR(50),
    current_engagement_level VARCHAR(50),
    target_engagement_level VARCHAR(50),
    satisfaction_level INTEGER CHECK (satisfaction_level IS NULL OR (satisfaction_level >= 1 AND satisfaction_level <= 5)),
    next_engagement_date DATE,
    engagement_notes TEXT,
    engagement_owner_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_engagement_plans_project ON sim.practice_engagement_plans(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_engagement_plans_stakeholder ON sim.practice_engagement_plans(practice_stakeholder_id) WHERE is_deleted = FALSE;

-- TABLE: sim.practice_communication_plans
CREATE TABLE IF NOT EXISTS sim.practice_communication_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    plan_title VARCHAR(200) NOT NULL,
    communication_type VARCHAR(100),
    target_audience UUID[],
    communication_channel VARCHAR(100),
    frequency VARCHAR(50),
    schedule TEXT,
    objective TEXT,
    key_messages TEXT,
    success_metrics TEXT,
    plan_owner_user_id UUID REFERENCES auth.users(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_communication_plans_project ON sim.practice_communication_plans(practice_project_id) WHERE is_deleted = FALSE;

-- TABLE: sim.practice_communication_log
CREATE TABLE IF NOT EXISTS sim.practice_communication_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_communication_plan_id UUID REFERENCES sim.practice_communication_plans(id) ON DELETE SET NULL,
    communication_type VARCHAR(100),
    content TEXT,
    sent_date DATE,
    target_stakeholder_ids UUID[],
    status VARCHAR(50) DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sim_practice_communication_log_project ON sim.practice_communication_log(practice_project_id) WHERE is_deleted = FALSE;

-- RLS
ALTER TABLE sim.practice_stakeholder_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_engagement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_communication_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_communication_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_stakeholder_analysis_user_access" ON sim.practice_stakeholder_analysis;
CREATE POLICY "practice_stakeholder_analysis_user_access" ON sim.practice_stakeholder_analysis
    FOR ALL TO authenticated USING (user_id = sim.get_current_user_id()) WITH CHECK (user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS "practice_engagement_plans_user_access" ON sim.practice_engagement_plans;
CREATE POLICY "practice_engagement_plans_user_access" ON sim.practice_engagement_plans
    FOR ALL TO authenticated USING (user_id = sim.get_current_user_id()) WITH CHECK (user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS "practice_communication_plans_user_access" ON sim.practice_communication_plans;
CREATE POLICY "practice_communication_plans_user_access" ON sim.practice_communication_plans
    FOR ALL TO authenticated USING (user_id = sim.get_current_user_id()) WITH CHECK (user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS "practice_communication_log_user_access" ON sim.practice_communication_log;
CREATE POLICY "practice_communication_log_user_access" ON sim.practice_communication_log
    FOR ALL TO authenticated USING (user_id = sim.get_current_user_id()) WITH CHECK (user_id = sim.get_current_user_id());

-- Register in database_tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.practice_stakeholder_analysis', 'Simulator practice stakeholder power/interest analysis', false, true),
    ('sim.practice_engagement_plans', 'Simulator practice engagement plans', false, true),
    ('sim.practice_communication_plans', 'Simulator practice communication plans', false, true),
    ('sim.practice_communication_log', 'Simulator practice communication log', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
