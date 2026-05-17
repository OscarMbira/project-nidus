-- =============================================================================
-- v520_sim_local_data_extensions_rls.sql
-- Phase 11 — RLS for sim Local Data Extensions (mirrors v516 semantics)
-- Prerequisites: v519, v242 (sim.get_current_user_id), public.user_has_access_to_account,
--                  public.is_pmo_admin_user
-- =============================================================================

CREATE OR REPLACE FUNCTION sim.auth_user_can_access_practice_project(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sim.practice_projects pp
    WHERE pp.id = p_practice_project_id
      AND COALESCE(pp.is_deleted, FALSE) = FALSE
      AND (
        pp.user_id = sim.get_current_user_id()
        OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id
            AND m.user_id = sim.get_current_user_id()
            AND COALESCE(m.is_active, TRUE) = TRUE
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION sim.auth_user_can_access_practice_project(UUID) TO authenticated;

-- Registry (global read)
DROP POLICY IF EXISTS sim_system_modules_read ON sim.system_modules;
CREATE POLICY sim_system_modules_read ON sim.system_modules
    FOR SELECT TO authenticated USING (COALESCE(is_active, TRUE));

DROP POLICY IF EXISTS sim_system_screens_read ON sim.system_screens;
CREATE POLICY sim_system_screens_read ON sim.system_screens
    FOR SELECT TO authenticated USING (COALESCE(is_active, TRUE));

-- Definitions
DROP POLICY IF EXISTS sim_custom_field_definitions_select ON sim.custom_field_definitions;
CREATE POLICY sim_custom_field_definitions_select ON sim.custom_field_definitions
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id) AND COALESCE(is_deleted, FALSE) = FALSE);

DROP POLICY IF EXISTS sim_custom_field_definitions_insert ON sim.custom_field_definitions;
CREATE POLICY sim_custom_field_definitions_insert ON sim.custom_field_definitions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_definitions_update ON sim.custom_field_definitions;
CREATE POLICY sim_custom_field_definitions_update ON sim.custom_field_definitions
    FOR UPDATE TO authenticated
    USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id) AND COALESCE(is_deleted, FALSE) = FALSE)
    WITH CHECK (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_definitions_delete ON sim.custom_field_definitions;
CREATE POLICY sim_custom_field_definitions_delete ON sim.custom_field_definitions
    FOR DELETE TO authenticated
    USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

-- Groups
DROP POLICY IF EXISTS sim_custom_field_groups_select ON sim.custom_field_groups;
CREATE POLICY sim_custom_field_groups_select ON sim.custom_field_groups
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id) AND COALESCE(is_deleted, FALSE) = FALSE);

DROP POLICY IF EXISTS sim_custom_field_groups_insert ON sim.custom_field_groups;
CREATE POLICY sim_custom_field_groups_insert ON sim.custom_field_groups
    FOR INSERT TO authenticated
    WITH CHECK (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_groups_update ON sim.custom_field_groups;
CREATE POLICY sim_custom_field_groups_update ON sim.custom_field_groups
    FOR UPDATE TO authenticated
    USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id) AND COALESCE(is_deleted, FALSE) = FALSE)
    WITH CHECK (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_groups_delete ON sim.custom_field_groups;
CREATE POLICY sim_custom_field_groups_delete ON sim.custom_field_groups
    FOR DELETE TO authenticated
    USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

-- Group fields (junction)
DROP POLICY IF EXISTS sim_custom_field_group_fields_select ON sim.custom_field_group_fields;
CREATE POLICY sim_custom_field_group_fields_select ON sim.custom_field_group_fields
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.user_has_access_to_account(g.account_id)
              AND COALESCE(g.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_fields_insert ON sim.custom_field_group_fields;
CREATE POLICY sim_custom_field_group_fields_insert ON sim.custom_field_group_fields
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_fields_update ON sim.custom_field_group_fields;
CREATE POLICY sim_custom_field_group_fields_update ON sim.custom_field_group_fields
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_fields_delete ON sim.custom_field_group_fields;
CREATE POLICY sim_custom_field_group_fields_delete ON sim.custom_field_group_fields
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

-- Options
DROP POLICY IF EXISTS sim_custom_field_options_select ON sim.custom_field_options;
CREATE POLICY sim_custom_field_options_select ON sim.custom_field_options
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.user_has_access_to_account(d.account_id)
              AND COALESCE(d.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS sim_custom_field_options_mutate ON sim.custom_field_options;
DROP POLICY IF EXISTS sim_custom_field_options_insert ON sim.custom_field_options;
CREATE POLICY sim_custom_field_options_insert ON sim.custom_field_options
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_options_update ON sim.custom_field_options;
CREATE POLICY sim_custom_field_options_update ON sim.custom_field_options
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_options_delete ON sim.custom_field_options;
CREATE POLICY sim_custom_field_options_delete ON sim.custom_field_options
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

-- Screen maps
DROP POLICY IF EXISTS sim_custom_field_screen_map_select ON sim.custom_field_screen_map;
CREATE POLICY sim_custom_field_screen_map_select ON sim.custom_field_screen_map
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.user_has_access_to_account(d.account_id)
              AND COALESCE(d.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS sim_custom_field_screen_map_insert ON sim.custom_field_screen_map;
CREATE POLICY sim_custom_field_screen_map_insert ON sim.custom_field_screen_map
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_screen_map_update ON sim.custom_field_screen_map;
CREATE POLICY sim_custom_field_screen_map_update ON sim.custom_field_screen_map
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_screen_map_delete ON sim.custom_field_screen_map;
CREATE POLICY sim_custom_field_screen_map_delete ON sim.custom_field_screen_map
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

-- Group screen maps
DROP POLICY IF EXISTS sim_custom_field_group_screen_map_select ON sim.custom_field_group_screen_map;
CREATE POLICY sim_custom_field_group_screen_map_select ON sim.custom_field_group_screen_map
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.user_has_access_to_account(g.account_id)
              AND COALESCE(g.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_screen_map_insert ON sim.custom_field_group_screen_map;
CREATE POLICY sim_custom_field_group_screen_map_insert ON sim.custom_field_group_screen_map
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_screen_map_update ON sim.custom_field_group_screen_map;
CREATE POLICY sim_custom_field_group_screen_map_update ON sim.custom_field_group_screen_map
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_screen_map_delete ON sim.custom_field_group_screen_map;
CREATE POLICY sim_custom_field_group_screen_map_delete ON sim.custom_field_group_screen_map
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

-- Permissions matrix
DROP POLICY IF EXISTS sim_custom_field_permissions_select ON sim.custom_field_permissions;
CREATE POLICY sim_custom_field_permissions_select ON sim.custom_field_permissions
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_permissions_insert ON sim.custom_field_permissions;
CREATE POLICY sim_custom_field_permissions_insert ON sim.custom_field_permissions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_permissions_update ON sim.custom_field_permissions;
CREATE POLICY sim_custom_field_permissions_update ON sim.custom_field_permissions
    FOR UPDATE TO authenticated
    USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id))
    WITH CHECK (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_permissions_delete ON sim.custom_field_permissions;
CREATE POLICY sim_custom_field_permissions_delete ON sim.custom_field_permissions
    FOR DELETE TO authenticated
    USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

-- Scalar values (practice projects)
DROP POLICY IF EXISTS sim_custom_field_values_select ON sim.custom_field_values;
CREATE POLICY sim_custom_field_values_select ON sim.custom_field_values
    FOR SELECT TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    );

DROP POLICY IF EXISTS sim_custom_field_values_insert ON sim.custom_field_values;
CREATE POLICY sim_custom_field_values_insert ON sim.custom_field_values
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    );

DROP POLICY IF EXISTS sim_custom_field_values_update ON sim.custom_field_values;
CREATE POLICY sim_custom_field_values_update ON sim.custom_field_values
    FOR UPDATE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    );

DROP POLICY IF EXISTS sim_custom_field_values_delete ON sim.custom_field_values;
CREATE POLICY sim_custom_field_values_delete ON sim.custom_field_values
    FOR DELETE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR sim.auth_user_can_access_practice_project(practice_project_id)
        )
    );

-- Group instances
DROP POLICY IF EXISTS sim_custom_field_group_instances_select ON sim.custom_field_group_instances;
CREATE POLICY sim_custom_field_group_instances_select ON sim.custom_field_group_instances
    FOR SELECT TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    );

DROP POLICY IF EXISTS sim_custom_field_group_instances_insert ON sim.custom_field_group_instances;
CREATE POLICY sim_custom_field_group_instances_insert ON sim.custom_field_group_instances
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    );

DROP POLICY IF EXISTS sim_custom_field_group_instances_update ON sim.custom_field_group_instances;
CREATE POLICY sim_custom_field_group_instances_update ON sim.custom_field_group_instances
    FOR UPDATE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND sim.auth_user_can_access_practice_project(practice_project_id)
    );

DROP POLICY IF EXISTS sim_custom_field_group_instances_delete ON sim.custom_field_group_instances;
CREATE POLICY sim_custom_field_group_instances_delete ON sim.custom_field_group_instances
    FOR DELETE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR sim.auth_user_can_access_practice_project(practice_project_id)
        )
    );

-- Group cell values
DROP POLICY IF EXISTS sim_custom_field_group_values_select ON sim.custom_field_group_values;
CREATE POLICY sim_custom_field_group_values_select ON sim.custom_field_group_values
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND sim.auth_user_can_access_practice_project(i.practice_project_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_values_insert ON sim.custom_field_group_values;
CREATE POLICY sim_custom_field_group_values_insert ON sim.custom_field_group_values
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND sim.auth_user_can_access_practice_project(i.practice_project_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_values_update ON sim.custom_field_group_values;
CREATE POLICY sim_custom_field_group_values_update ON sim.custom_field_group_values
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND sim.auth_user_can_access_practice_project(i.practice_project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND sim.auth_user_can_access_practice_project(i.practice_project_id)
        )
    );

DROP POLICY IF EXISTS sim_custom_field_group_values_delete ON sim.custom_field_group_values;
CREATE POLICY sim_custom_field_group_values_delete ON sim.custom_field_group_values
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND (
                  public.is_pmo_admin_user()
                  OR sim.auth_user_can_access_practice_project(i.practice_project_id)
              )
        )
    );

-- Audit
DROP POLICY IF EXISTS sim_custom_field_audit_select ON sim.custom_field_audit_log;
CREATE POLICY sim_custom_field_audit_select ON sim.custom_field_audit_log
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_custom_field_audit_insert ON sim.custom_field_audit_log;
CREATE POLICY sim_custom_field_audit_insert ON sim.custom_field_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_access_to_account(account_id));
