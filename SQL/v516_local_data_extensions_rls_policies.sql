-- =============================================================================
-- v516_local_data_extensions_rls_policies.sql
-- Phase 11 — RLS policies for Local Data Extensions
-- Prerequisites: v515, user_has_access_to_account, auth_user_can_access_project,
--                is_pmo_admin_user
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Registry (global read for authenticated)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS system_modules_read_authenticated ON public.system_modules;
CREATE POLICY system_modules_read_authenticated ON public.system_modules
    FOR SELECT TO authenticated USING (COALESCE(is_active, TRUE));

DROP POLICY IF EXISTS system_screens_read_authenticated ON public.system_screens;
CREATE POLICY system_screens_read_authenticated ON public.system_screens
    FOR SELECT TO authenticated USING (COALESCE(is_active, TRUE));

-- -----------------------------------------------------------------------------
-- Field definitions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_definitions_select ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_select ON public.custom_field_definitions
    FOR SELECT TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND COALESCE(is_deleted, FALSE) = FALSE
    );

DROP POLICY IF EXISTS custom_field_definitions_insert ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_insert ON public.custom_field_definitions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_definitions_update ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_update ON public.custom_field_definitions
    FOR UPDATE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
        AND COALESCE(is_deleted, FALSE) = FALSE
    )
    WITH CHECK (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_definitions_delete ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_delete ON public.custom_field_definitions
    FOR DELETE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_definitions_mutate ON public.custom_field_definitions;

-- -----------------------------------------------------------------------------
-- Field groups
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_groups_select ON public.custom_field_groups;
CREATE POLICY custom_field_groups_select ON public.custom_field_groups
    FOR SELECT TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND COALESCE(is_deleted, FALSE) = FALSE
    );

DROP POLICY IF EXISTS custom_field_groups_insert ON public.custom_field_groups;
CREATE POLICY custom_field_groups_insert ON public.custom_field_groups
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_groups_update ON public.custom_field_groups;
CREATE POLICY custom_field_groups_update ON public.custom_field_groups
    FOR UPDATE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
        AND COALESCE(is_deleted, FALSE) = FALSE
    )
    WITH CHECK (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_groups_delete ON public.custom_field_groups;
CREATE POLICY custom_field_groups_delete ON public.custom_field_groups
    FOR DELETE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_groups_mutate ON public.custom_field_groups;

-- -----------------------------------------------------------------------------
-- Group ↔ field junction (read for account; write PMO)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_group_fields_select ON public.custom_field_group_fields;
CREATE POLICY custom_field_group_fields_select ON public.custom_field_group_fields
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.user_has_access_to_account(g.account_id)
              AND COALESCE(g.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS custom_field_group_fields_insert ON public.custom_field_group_fields;
CREATE POLICY custom_field_group_fields_insert ON public.custom_field_group_fields
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_fields_update ON public.custom_field_group_fields;
CREATE POLICY custom_field_group_fields_update ON public.custom_field_group_fields
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_fields_delete ON public.custom_field_group_fields;
CREATE POLICY custom_field_group_fields_delete ON public.custom_field_group_fields
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_fields.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_fields_all ON public.custom_field_group_fields;

-- -----------------------------------------------------------------------------
-- Options (read via parent definition)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_options_select ON public.custom_field_options;
CREATE POLICY custom_field_options_select ON public.custom_field_options
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.user_has_access_to_account(d.account_id)
              AND COALESCE(d.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS custom_field_options_insert ON public.custom_field_options;
CREATE POLICY custom_field_options_insert ON public.custom_field_options
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_options_update ON public.custom_field_options;
CREATE POLICY custom_field_options_update ON public.custom_field_options
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_options_delete ON public.custom_field_options;
CREATE POLICY custom_field_options_delete ON public.custom_field_options
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_options.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_options_all ON public.custom_field_options;

-- -----------------------------------------------------------------------------
-- Screen maps
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_screen_map_select ON public.custom_field_screen_map;
CREATE POLICY custom_field_screen_map_select ON public.custom_field_screen_map
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.user_has_access_to_account(d.account_id)
              AND COALESCE(d.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS custom_field_screen_map_insert ON public.custom_field_screen_map;
CREATE POLICY custom_field_screen_map_insert ON public.custom_field_screen_map
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_screen_map_update ON public.custom_field_screen_map;
CREATE POLICY custom_field_screen_map_update ON public.custom_field_screen_map
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_screen_map_delete ON public.custom_field_screen_map;
CREATE POLICY custom_field_screen_map_delete ON public.custom_field_screen_map
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_definitions d
            WHERE d.id = custom_field_screen_map.field_definition_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(d.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_screen_map_all ON public.custom_field_screen_map;

DROP POLICY IF EXISTS custom_field_group_screen_map_select ON public.custom_field_group_screen_map;
CREATE POLICY custom_field_group_screen_map_select ON public.custom_field_group_screen_map
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.user_has_access_to_account(g.account_id)
              AND COALESCE(g.is_deleted, FALSE) = FALSE
        )
    );

DROP POLICY IF EXISTS custom_field_group_screen_map_insert ON public.custom_field_group_screen_map;
CREATE POLICY custom_field_group_screen_map_insert ON public.custom_field_group_screen_map
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_screen_map_update ON public.custom_field_group_screen_map;
CREATE POLICY custom_field_group_screen_map_update ON public.custom_field_group_screen_map
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_screen_map_delete ON public.custom_field_group_screen_map;
CREATE POLICY custom_field_group_screen_map_delete ON public.custom_field_group_screen_map
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_groups g
            WHERE g.id = custom_field_group_screen_map.group_id
              AND public.is_pmo_admin_user()
              AND public.user_has_access_to_account(g.account_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_screen_map_all ON public.custom_field_group_screen_map;

-- -----------------------------------------------------------------------------
-- Permissions matrix
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_permissions_select ON public.custom_field_permissions;
CREATE POLICY custom_field_permissions_select ON public.custom_field_permissions
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS custom_field_permissions_insert ON public.custom_field_permissions;
CREATE POLICY custom_field_permissions_insert ON public.custom_field_permissions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_permissions_update ON public.custom_field_permissions;
CREATE POLICY custom_field_permissions_update ON public.custom_field_permissions
    FOR UPDATE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    )
    WITH CHECK (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_permissions_delete ON public.custom_field_permissions;
CREATE POLICY custom_field_permissions_delete ON public.custom_field_permissions
    FOR DELETE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND public.user_has_access_to_account(account_id)
    );

DROP POLICY IF EXISTS custom_field_permissions_mutate ON public.custom_field_permissions;

-- -----------------------------------------------------------------------------
-- Scalar values
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_values_select ON public.custom_field_values;
CREATE POLICY custom_field_values_select ON public.custom_field_values
    FOR SELECT TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS custom_field_values_insert ON public.custom_field_values;
CREATE POLICY custom_field_values_insert ON public.custom_field_values
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS custom_field_values_update ON public.custom_field_values;
CREATE POLICY custom_field_values_update ON public.custom_field_values
    FOR UPDATE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS custom_field_values_delete ON public.custom_field_values;
CREATE POLICY custom_field_values_delete ON public.custom_field_values
    FOR DELETE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR public.auth_user_can_access_project(project_id)
        )
    );

DROP POLICY IF EXISTS custom_field_values_write ON public.custom_field_values;

-- -----------------------------------------------------------------------------
-- Group instances & cell values
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_group_instances_select ON public.custom_field_group_instances;
CREATE POLICY custom_field_group_instances_select ON public.custom_field_group_instances
    FOR SELECT TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS custom_field_group_instances_insert ON public.custom_field_group_instances;
CREATE POLICY custom_field_group_instances_insert ON public.custom_field_group_instances
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS custom_field_group_instances_update ON public.custom_field_group_instances;
CREATE POLICY custom_field_group_instances_update ON public.custom_field_group_instances
    FOR UPDATE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND public.auth_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS custom_field_group_instances_delete ON public.custom_field_group_instances;
CREATE POLICY custom_field_group_instances_delete ON public.custom_field_group_instances
    FOR DELETE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR public.auth_user_can_access_project(project_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_values_select ON public.custom_field_group_values;
CREATE POLICY custom_field_group_values_select ON public.custom_field_group_values
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND public.auth_user_can_access_project(i.project_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_values_insert ON public.custom_field_group_values;
CREATE POLICY custom_field_group_values_insert ON public.custom_field_group_values
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND public.auth_user_can_access_project(i.project_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_values_update ON public.custom_field_group_values;
CREATE POLICY custom_field_group_values_update ON public.custom_field_group_values
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND public.auth_user_can_access_project(i.project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND public.auth_user_can_access_project(i.project_id)
        )
    );

DROP POLICY IF EXISTS custom_field_group_values_delete ON public.custom_field_group_values;
CREATE POLICY custom_field_group_values_delete ON public.custom_field_group_values
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.custom_field_group_instances i
            WHERE i.id = custom_field_group_values.group_instance_id
              AND public.user_has_access_to_account(i.account_id)
              AND (
                  public.is_pmo_admin_user()
                  OR public.auth_user_can_access_project(i.project_id)
              )
        )
    );

-- -----------------------------------------------------------------------------
-- Audit log
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_audit_select ON public.custom_field_audit_log;
CREATE POLICY custom_field_audit_select ON public.custom_field_audit_log
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS custom_field_audit_insert ON public.custom_field_audit_log;
CREATE POLICY custom_field_audit_insert ON public.custom_field_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (public.user_has_access_to_account(account_id));
