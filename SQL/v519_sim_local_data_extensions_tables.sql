-- =============================================================================
-- v519_sim_local_data_extensions_tables.sql
-- Phase 11 — Simulator (sim schema): Local Data Extensions DDL mirrors public LDE
-- Prerequisites: v515 (platform LDE), sim.practice_projects, public.accounts,
--                public.users, public.roles, uuid-ossp
-- Notes:
--   - Metadata (definitions, groups, screens) lives in sim.* with account_id → public.accounts
--   - Scalar/group-instance rows use practice_project_id → sim.practice_projects (not public.projects)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Registry: modules & screens (sim-local IDs for screen_map FKs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.system_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_code VARCHAR(80) NOT NULL,
    module_name VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sim_system_modules_code UNIQUE (module_code)
);

CREATE INDEX IF NOT EXISTS idx_sim_system_modules_active ON sim.system_modules (is_active, sort_order);

CREATE TABLE IF NOT EXISTS sim.system_screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES sim.system_modules(id) ON DELETE CASCADE,
    screen_code VARCHAR(100) NOT NULL,
    screen_name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    route_hint TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sim_system_screens_module_code UNIQUE (module_id, screen_code)
);

CREATE INDEX IF NOT EXISTS idx_sim_system_screens_entity ON sim.system_screens (entity_type) WHERE is_active = TRUE;

-- -----------------------------------------------------------------------------
-- 2) Field groups
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.custom_field_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    group_code VARCHAR(100) NOT NULL,
    label VARCHAR(300) NOT NULL,
    description TEXT,
    min_rows INTEGER DEFAULT 0,
    max_rows INTEGER DEFAULT 50,
    workflow_status VARCHAR(40) NOT NULL DEFAULT 'draft',
    display_sort_order INTEGER DEFAULT 0,
    include_in_export BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_sim_custom_field_groups_account_code UNIQUE (account_id, group_code),
    CONSTRAINT chk_sim_cfg_workflow CHECK (workflow_status IN ('draft','submitted','approved','published','deprecated'))
);

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_groups_account ON sim.custom_field_groups (account_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS sim.custom_field_group_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES sim.custom_field_groups(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL,
    sort_order INTEGER DEFAULT 0,
    CONSTRAINT uq_sim_cfg_group_field UNIQUE (group_id, field_definition_id)
);

-- -----------------------------------------------------------------------------
-- 3) Definitions & options
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    field_code VARCHAR(120) NOT NULL,
    label VARCHAR(300) NOT NULL,
    description TEXT,
    field_type VARCHAR(40) NOT NULL DEFAULT 'text',
    workflow_status VARCHAR(40) NOT NULL DEFAULT 'draft',
    validation_rules JSONB DEFAULT '{}'::jsonb,
    display_sort_order INTEGER DEFAULT 0,
    include_in_export BOOLEAN DEFAULT TRUE,
    is_sensitive BOOLEAN DEFAULT FALSE,
    field_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_sim_custom_field_defs_account_code UNIQUE (account_id, field_code),
    CONSTRAINT chk_sim_cfd_workflow CHECK (workflow_status IN ('draft','submitted','approved','published','deprecated')),
    CONSTRAINT chk_sim_cfd_type CHECK (field_type IN (
        'text','long_text','number','integer','date','datetime','boolean','url','email',
        'dropdown','multi_select','json'
    ))
);

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_defs_account ON sim.custom_field_definitions (account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_custom_field_defs_publish ON sim.custom_field_definitions (account_id, workflow_status) WHERE is_deleted = FALSE;

ALTER TABLE sim.custom_field_group_fields
    DROP CONSTRAINT IF EXISTS sim_custom_field_group_fields_field_definition_id_fkey;
ALTER TABLE sim.custom_field_group_fields
    ADD CONSTRAINT sim_custom_field_group_fields_field_definition_id_fkey
    FOREIGN KEY (field_definition_id) REFERENCES sim.custom_field_definitions(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS sim.custom_field_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_definition_id UUID NOT NULL REFERENCES sim.custom_field_definitions(id) ON DELETE CASCADE,
    option_value VARCHAR(500) NOT NULL,
    option_label VARCHAR(500) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_options_field ON sim.custom_field_options (field_definition_id, sort_order);

CREATE TABLE IF NOT EXISTS sim.custom_field_screen_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_definition_id UUID NOT NULL REFERENCES sim.custom_field_definitions(id) ON DELETE CASCADE,
    screen_id UUID NOT NULL REFERENCES sim.system_screens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sim_field_screen UNIQUE (field_definition_id, screen_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_screen_map_screen ON sim.custom_field_screen_map (screen_id);

CREATE TABLE IF NOT EXISTS sim.custom_field_group_screen_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES sim.custom_field_groups(id) ON DELETE CASCADE,
    screen_id UUID NOT NULL REFERENCES sim.system_screens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sim_group_screen UNIQUE (group_id, screen_id)
);

-- -----------------------------------------------------------------------------
-- 4) Values (practice projects)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_definition_id UUID NOT NULL REFERENCES sim.custom_field_definitions(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number DOUBLE PRECISION,
    value_boolean BOOLEAN,
    value_date DATE,
    value_timestamptz TIMESTAMPTZ,
    value_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    CONSTRAINT uq_sim_custom_field_value_entity_field UNIQUE (field_definition_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_values_practice_proj ON sim.custom_field_values (practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_custom_field_values_entity ON sim.custom_field_values (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 5) Group instances & cells
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.custom_field_group_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES sim.custom_field_groups(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    row_sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_cfg_instances_lookup ON sim.custom_field_group_instances (group_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS sim.custom_field_group_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_instance_id UUID NOT NULL REFERENCES sim.custom_field_group_instances(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES sim.custom_field_definitions(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number DOUBLE PRECISION,
    value_boolean BOOLEAN,
    value_date DATE,
    value_timestamptz TIMESTAMPTZ,
    value_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sim_cfg_group_cell UNIQUE (group_instance_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_cfg_group_values_inst ON sim.custom_field_group_values (group_instance_id);

-- -----------------------------------------------------------------------------
-- 6) Permissions & audit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.custom_field_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES sim.custom_field_definitions(id) ON DELETE CASCADE,
    group_id UUID REFERENCES sim.custom_field_groups(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_configure BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_publish BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_sim_cfp_target CHECK (
        (field_definition_id IS NOT NULL AND group_id IS NULL)
        OR (field_definition_id IS NULL AND group_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_cfp_field_perm
    ON sim.custom_field_permissions (role_id, field_definition_id)
    WHERE group_id IS NULL AND field_definition_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_cfp_group_perm
    ON sim.custom_field_permissions (role_id, group_id)
    WHERE field_definition_id IS NULL AND group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_permissions_account ON sim.custom_field_permissions (account_id);

CREATE TABLE IF NOT EXISTS sim.custom_field_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.users(id),
    action_type VARCHAR(80) NOT NULL,
    entity_table VARCHAR(120) NOT NULL,
    entity_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_audit_account ON sim.custom_field_audit_log (account_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- RLS (policies v520)
-- -----------------------------------------------------------------------------
ALTER TABLE sim.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.system_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_group_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_screen_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_group_screen_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_group_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_group_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_field_audit_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON sim.system_modules TO authenticated;
GRANT SELECT ON sim.system_screens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_group_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_screen_map TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_group_screen_map TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_group_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_group_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.custom_field_permissions TO authenticated;
GRANT SELECT, INSERT ON sim.custom_field_audit_log TO authenticated;

COMMENT ON TABLE sim.custom_field_definitions IS 'Simulator Phase 11 LDE definitions (sim schema; account-scoped)';
COMMENT ON TABLE sim.custom_field_values IS 'Simulator LDE values; practice_project_id → sim.practice_projects';

-- -----------------------------------------------------------------------------
-- Seed modules/screens (same logical codes as platform for shared screenCode strings)
-- -----------------------------------------------------------------------------
INSERT INTO sim.system_modules (module_code, module_name, description, sort_order, is_active)
VALUES
  ('portfolio', 'Portfolio', 'Portfolio management', 10, TRUE),
  ('programme', 'Programme', 'Programme management', 20, TRUE),
  ('projects', 'Projects', 'Project delivery', 30, TRUE),
  ('planning', 'Planning', 'Schedules and planning', 40, TRUE),
  ('financial', 'Financial', 'Budget and cost', 50, TRUE),
  ('risk', 'Risk', 'Risk management', 60, TRUE),
  ('issues', 'Issues', 'Issue management', 70, TRUE),
  ('change', 'Change', 'Change control', 80, TRUE),
  ('quality', 'Quality & QA', 'Quality assurance', 90, TRUE),
  ('resources', 'Resources', 'People and capacity', 100, TRUE),
  ('communications', 'Communications', 'Stakeholders and comms', 110, TRUE),
  ('procurement', 'Procurement', 'Procurement and contracts', 120, TRUE),
  ('reporting', 'Reporting', 'Reports and analytics', 130, TRUE),
  ('administration', 'Administration', 'Configuration', 140, TRUE)
ON CONFLICT (module_code) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO sim.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM sim.system_modules m
JOIN (
  VALUES
    ('projects', 'project_detail', 'Project details', 'project', '/simulator/practice-projects/:id', 1),
    ('risk', 'risk_detail', 'Risk register entry', 'risk', '/simulator/practice-risk-register/:id', 1),
    ('issues', 'issue_detail', 'Issue register entry', 'issue', '/simulator/practice-issue-register/:id', 1)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();
