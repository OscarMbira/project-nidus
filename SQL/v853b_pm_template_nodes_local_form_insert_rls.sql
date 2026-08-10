-- =============================================================================
-- v853b: pm_template_nodes INSERT — blank-origin local forms use can_create_local_form
--
-- Blank-origin form_template rows (parent_node_id IS NULL) must NOT fall through
-- can_manage_pm_template_node (which, since v840, allows any project member).
-- Those inserts are gated only by can_create_local_form (PM role / owner / PMO).
-- Copy-origin inserts (parent_node_id NOT NULL) keep can_manage_pm_template_node.
--
-- Apply after: v853_local_form_permission_function.sql, v764b, v764c, v840.
-- Plan: projectplan/v852_pm_local_forms_plan.md (Phase 1.3)
-- =============================================================================

DROP POLICY IF EXISTS pm_template_nodes_insert ON public.pm_template_nodes;
CREATE POLICY pm_template_nodes_insert
    ON public.pm_template_nodes
    FOR INSERT TO authenticated
    WITH CHECK (
        CASE
            WHEN domain = 'form_template'
                 AND parent_node_id IS NULL
                 AND COALESCE(is_system_synced, FALSE) = FALSE
            THEN public.can_create_local_form(
                account_id, tier, scope_entity_type, scope_entity_id
            )
            ELSE public.can_manage_pm_template_node(
                account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
            )
        END
    );

DROP POLICY IF EXISTS sim_pm_template_nodes_insert ON sim.pm_template_nodes;
CREATE POLICY sim_pm_template_nodes_insert
    ON sim.pm_template_nodes
    FOR INSERT TO authenticated
    WITH CHECK (
        CASE
            WHEN domain = 'form_template'
                 AND parent_node_id IS NULL
                 AND COALESCE(is_system_synced, FALSE) = FALSE
            THEN sim.can_create_local_form(
                account_id, tier, scope_entity_type, scope_entity_id
            )
            ELSE sim.can_manage_pm_template_node(
                account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
            )
        END
    );

DO $$
BEGIN
  RAISE NOTICE 'v853b_pm_template_nodes_local_form_insert_rls.sql applied';
END $$;
