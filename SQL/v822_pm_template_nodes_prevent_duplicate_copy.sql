-- =============================================================================
-- v822: Prevent duplicate current copies of the same Global template per
--        account/tier/scope
-- Plan: projectplan/v822_prevent_duplicate_template_copy_plan.md
--
-- Problem: copyTemplateNodeForAccount() duplicates the underlying document row
-- (form_templates / process_template_* / organisational_process_assets) on every
-- "Copy" click, giving each copy a brand-new domain_ref_id. The existing
-- uq_pm_template_nodes_current_scope index (v774) is keyed on domain_ref_id, so
-- it can never catch a re-copy of the SAME source template into the SAME
-- tier/scope — each copy is unique-by-construction. This index instead keys on
-- parent_node_id (the Global source node), which is what actually identifies
-- "a copy of this template" regardless of how many times its document has been
-- re-duplicated.
--
-- This is a backstop (defense-in-depth) alongside the primary JS-side check in
-- copyTemplateNodeForAccount — the application should never actually hit this
-- constraint in normal use; it exists to catch races/other callers.
-- Prerequisites: v764, v774
-- =============================================================================

-- public
CREATE UNIQUE INDEX IF NOT EXISTS uq_pm_template_nodes_one_copy_per_scope
    ON public.pm_template_nodes (
        account_id,
        tier,
        COALESCE(scope_entity_type, ''),
        COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
        parent_node_id
    )
    WHERE is_current = TRUE AND parent_node_id IS NOT NULL;

COMMENT ON INDEX public.uq_pm_template_nodes_one_copy_per_scope IS
    'At most one current copy of a given Global template (parent_node_id) per account/tier/scope. Complements uq_pm_template_nodes_current_scope (v774), which keys on domain_ref_id instead and does not prevent re-copies of the same source.';

-- sim
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_pm_template_nodes_one_copy_per_scope
    ON sim.pm_template_nodes (
        account_id,
        tier,
        COALESCE(scope_entity_type, ''),
        COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
        parent_node_id
    )
    WHERE is_current = TRUE AND parent_node_id IS NOT NULL;

COMMENT ON INDEX sim.uq_sim_pm_template_nodes_one_copy_per_scope IS
    'Sim mirror of public.uq_pm_template_nodes_one_copy_per_scope (v822).';

DO $$
BEGIN
    RAISE NOTICE 'v822_pm_template_nodes_prevent_duplicate_copy.sql applied';
END $$;
