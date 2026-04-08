-- =============================================================================
-- v237: Simulator Practice Strategies Tables
-- Purpose: Practice communication and configuration management strategies for simulator learning
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.11
-- =============================================================================

-- Create practice_communication_management_strategies table
CREATE TABLE IF NOT EXISTS sim.practice_communication_management_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    cms_reference VARCHAR(100) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    author_id UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    purpose TEXT,
    objectives TEXT,
    scope TEXT,
    communication_planning_approach TEXT,
    communication_control_approach TEXT,
    communication_assurance_approach TEXT,
    variance_from_corporate TEXT,
    variance_justification TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'baseline')),
    approved_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_cms_project_id 
    ON sim.practice_communication_management_strategies(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_cms_user_id 
    ON sim.practice_communication_management_strategies(user_id) WHERE is_deleted = FALSE;

-- Create practice_configuration_management_strategies table
CREATE TABLE IF NOT EXISTS sim.practice_configuration_management_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID UNIQUE REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    cfgms_reference VARCHAR(100) UNIQUE NOT NULL,
    version_number VARCHAR(20) DEFAULT '1.0',
    author_id UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),
    purpose TEXT,
    objectives TEXT,
    scope TEXT,
    configuration_planning_approach TEXT,
    configuration_control_approach TEXT,
    configuration_verification_approach TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'baseline')),
    approved_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_config_ms_project_id 
    ON sim.practice_configuration_management_strategies(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_config_ms_user_id 
    ON sim.practice_configuration_management_strategies(user_id) WHERE is_deleted = FALSE;

-- Create practice_configuration_item_records table
CREATE TABLE IF NOT EXISTS sim.practice_configuration_item_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    practice_config_ms_id UUID REFERENCES sim.practice_configuration_management_strategies(id) ON DELETE CASCADE,
    item_reference VARCHAR(100) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    item_description TEXT,
    item_type VARCHAR(100),
    item_category VARCHAR(100),
    version_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'baseline', 'under_change', 'superseded', 'archived')),
    baseline_date DATE,
    owner_user_id UUID REFERENCES auth.users(id),
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_config_items_project_id 
    ON sim.practice_configuration_item_records(practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_practice_config_items_user_id 
    ON sim.practice_configuration_item_records(user_id) WHERE is_deleted = FALSE;

-- Register tables in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.practice_communication_management_strategies', 'Practice communication management strategies for simulator learning', false, true, 'simulation'),
    ('sim.practice_configuration_management_strategies', 'Practice configuration management strategies for simulator learning', false, true, 'simulation'),
    ('sim.practice_configuration_item_records', 'Practice configuration item records for simulator learning', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
