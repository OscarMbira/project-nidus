-- =============================================================================
-- v764d: PM Template Hierarchy — seed / registry (idempotent)
-- Plan: projectplan/v764_project_management_template_hierarchy_plan.md (Phase 0)
-- No demo content — registers tables for ID Generation Rules (Database Table
-- Registration Rule). Demo/sample hierarchy rows land in later phases (v767).
-- =============================================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'pm_template_nodes',
        'PM template hierarchy backbone nodes (PMO/Portfolio/Programme/Project; Global sync via is_system_synced).',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'pm_template_field_links',
        'Links custom field definitions to pm_template_nodes with per-tier enable/required/default/label overrides.',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'pm_template_entity_assignment',
        'Maps Portfolio/Programme/Project entities to a template node (or NULL for nearest-ancestor default).',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'pm_template_change_notifications',
        'Node-to-node notifications when a parent template publishes a new version for descendant review.',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Simulator mirrors (registered with sim. prefix for clarity)
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'sim.pm_template_nodes',
        'Simulator mirror of pm_template_nodes (sim schema).',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'sim.pm_template_field_links',
        'Simulator mirror of pm_template_field_links (sim schema).',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'sim.pm_template_entity_assignment',
        'Simulator mirror of pm_template_entity_assignment (sim schema).',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    (
        'sim.pm_template_change_notifications',
        'Simulator mirror of pm_template_change_notifications (sim schema).',
        false,
        true
    )
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'v764d_pm_template_hierarchy_seed.sql applied';
END $$;
