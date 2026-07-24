-- =============================================================================
-- v774: Allow multiple current document masters per account/tier/scope
-- Plan follow-up: Admin v167 bulk industry_plan publish hit
--   uq_pm_template_nodes_current_scope (one industry_plan node per account)
-- Fix: include domain_ref_id in the uniqueness key.
--   - fields: domain_ref_id is NULL → still one current node per scope
--   - industry_plan / opa / form_template / process_template: one current node
--     per catalog document (domain_ref_id) at that scope
-- Prerequisites: v764 / v764c
-- =============================================================================

-- public
DROP INDEX IF EXISTS public.uq_pm_template_nodes_current_scope;

CREATE UNIQUE INDEX uq_pm_template_nodes_current_scope
    ON public.pm_template_nodes (
        account_id,
        tier,
        domain,
        COALESCE(scope_entity_type, ''),
        COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(domain_ref_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE is_current = TRUE;

COMMENT ON INDEX public.uq_pm_template_nodes_current_scope IS
    'One current node per account/tier/domain/scope/domain_ref. domain_ref NULL coalesces to zero UUID (fields).';

-- sim
DROP INDEX IF EXISTS sim.uq_sim_pm_template_nodes_current_scope;

CREATE UNIQUE INDEX uq_sim_pm_template_nodes_current_scope
    ON sim.pm_template_nodes (
        account_id,
        tier,
        domain,
        COALESCE(scope_entity_type, ''),
        COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(domain_ref_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE is_current = TRUE;

COMMENT ON INDEX sim.uq_sim_pm_template_nodes_current_scope IS
    'Sim mirror of public.uq_pm_template_nodes_current_scope (v774 multi-document masters).';

DO $$
BEGIN
    RAISE NOTICE 'v774_pm_template_nodes_multi_document_current_scope.sql applied';
END $$;
