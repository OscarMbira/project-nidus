-- =============================================================================
-- v515_local_data_extensions_tables.sql
-- Phase 11 — Local Data Extensions: DDL, indexes, enable RLS
-- Prerequisites: accounts, users, projects, roles, uuid-ossp, trigger functions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Registry: modules & screens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_code VARCHAR(80) NOT NULL,
    module_name VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_system_modules_code UNIQUE (module_code)
);

CREATE INDEX IF NOT EXISTS idx_system_modules_active ON public.system_modules (is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.system_screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
    screen_code VARCHAR(100) NOT NULL,
    screen_name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    route_hint TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_system_screens_module_code UNIQUE (module_id, screen_code)
);

CREATE INDEX IF NOT EXISTS idx_system_screens_entity ON public.system_screens (entity_type) WHERE is_active = TRUE;

-- -----------------------------------------------------------------------------
-- 2) Field groups (repeating blocks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_field_groups (
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
    CONSTRAINT uq_custom_field_groups_account_code UNIQUE (account_id, group_code),
    CONSTRAINT chk_cfg_workflow CHECK (workflow_status IN ('draft','submitted','approved','published','deprecated'))
);

CREATE INDEX IF NOT EXISTS idx_custom_field_groups_account ON public.custom_field_groups (account_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.custom_field_group_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.custom_field_groups(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL,
    sort_order INTEGER DEFAULT 0,
    CONSTRAINT uq_cfg_group_field UNIQUE (group_id, field_definition_id)
);

-- FK added after custom_field_definitions exists — applied below via ALTER

-- -----------------------------------------------------------------------------
-- 3) Field definitions & options
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
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
    CONSTRAINT uq_custom_field_defs_account_code UNIQUE (account_id, field_code),
    CONSTRAINT chk_cfd_workflow CHECK (workflow_status IN ('draft','submitted','approved','published','deprecated')),
    CONSTRAINT chk_cfd_type CHECK (field_type IN (
        'text','long_text','number','integer','date','datetime','boolean','url','email',
        'dropdown','multi_select','json'
    ))
);

CREATE INDEX IF NOT EXISTS idx_custom_field_defs_account ON public.custom_field_definitions (account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_publish ON public.custom_field_definitions (account_id, workflow_status) WHERE is_deleted = FALSE;

ALTER TABLE public.custom_field_group_fields
    DROP CONSTRAINT IF EXISTS custom_field_group_fields_field_definition_id_fkey;
ALTER TABLE public.custom_field_group_fields
    ADD CONSTRAINT custom_field_group_fields_field_definition_id_fkey
    FOREIGN KEY (field_definition_id) REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.custom_field_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    option_value VARCHAR(500) NOT NULL,
    option_label VARCHAR(500) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_options_field ON public.custom_field_options (field_definition_id, sort_order);

CREATE TABLE IF NOT EXISTS public.custom_field_screen_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    screen_id UUID NOT NULL REFERENCES public.system_screens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_field_screen UNIQUE (field_definition_id, screen_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_screen_map_screen ON public.custom_field_screen_map (screen_id);

CREATE TABLE IF NOT EXISTS public.custom_field_group_screen_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.custom_field_groups(id) ON DELETE CASCADE,
    screen_id UUID NOT NULL REFERENCES public.system_screens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_group_screen UNIQUE (group_id, screen_id)
);

-- -----------------------------------------------------------------------------
-- 4) Values (scalar fields per entity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number DOUBLE PRECISION,
    value_boolean BOOLEAN,
    value_date DATE,
    value_timestamptz TIMESTAMPTZ,
    value_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    CONSTRAINT uq_custom_field_value_entity_field UNIQUE (field_definition_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_proj ON public.custom_field_values (project_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON public.custom_field_values (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 5) Repeating group instances & cell values
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_field_group_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.custom_field_groups(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    row_sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfg_instances_lookup ON public.custom_field_group_instances (group_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.custom_field_group_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_instance_id UUID NOT NULL REFERENCES public.custom_field_group_instances(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number DOUBLE PRECISION,
    value_boolean BOOLEAN,
    value_date DATE,
    value_timestamptz TIMESTAMPTZ,
    value_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_cfg_group_cell UNIQUE (group_instance_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_cfg_group_values_inst ON public.custom_field_group_values (group_instance_id);

-- -----------------------------------------------------------------------------
-- 6) Permissions & audit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_field_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.custom_field_groups(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_configure BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_publish BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_cfp_target CHECK (
        (field_definition_id IS NOT NULL AND group_id IS NULL)
        OR (field_definition_id IS NULL AND group_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cfp_field_perm
    ON public.custom_field_permissions (role_id, field_definition_id)
    WHERE group_id IS NULL AND field_definition_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cfp_group_perm
    ON public.custom_field_permissions (role_id, group_id)
    WHERE field_definition_id IS NULL AND group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_custom_field_permissions_account ON public.custom_field_permissions (account_id);

CREATE TABLE IF NOT EXISTS public.custom_field_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.users(id),
    action_type VARCHAR(80) NOT NULL,
    entity_table VARCHAR(120) NOT NULL,
    entity_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_audit_account ON public.custom_field_audit_log (account_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- RLS enable (policies in v516)
-- -----------------------------------------------------------------------------
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_group_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_screen_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_group_screen_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_group_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_group_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_audit_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.system_modules TO authenticated;
GRANT SELECT ON public.system_screens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_group_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_screen_map TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_group_screen_map TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_group_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_group_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_field_permissions TO authenticated;
GRANT SELECT, INSERT ON public.custom_field_audit_log TO authenticated;

COMMENT ON TABLE public.custom_field_definitions IS 'Phase 11 local metadata-driven field definitions per account';
COMMENT ON TABLE public.custom_field_values IS 'Captured scalar custom field values; project_id for RLS';
