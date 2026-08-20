-- =============================================================================
-- v856: Allow blank-origin local forms as root pm_template_nodes
--
-- Symptom: Create Blank Form fails with:
--   new row for relation "pm_template_nodes" violates check constraint
--   "chk_pm_template_nodes_root_synced"
--
-- Cause: v764 required root rows (parent_node_id IS NULL) to be either
--   is_system_synced (Global) or tier = 'pmo'. Blank local forms are
--   intentionally parent_node_id NULL + is_system_synced FALSE at project /
--   portfolio / programme tier (PRD v852 D1).
--
-- Fix: extend the CHECK to also allow non-synced form_template roots.
--   Copy-origin rows still use parent_node_id NOT NULL (unchanged).
-- Apply after: v764 / v764c, v853b, v855.
-- Idempotent: DROP + ADD.
-- =============================================================================

ALTER TABLE public.pm_template_nodes
    DROP CONSTRAINT IF EXISTS chk_pm_template_nodes_root_synced;

ALTER TABLE public.pm_template_nodes
    ADD CONSTRAINT chk_pm_template_nodes_root_synced CHECK (
        parent_node_id IS NOT NULL
        OR is_system_synced = TRUE
        OR tier = 'pmo'
        OR (
            domain = 'form_template'
            AND COALESCE(is_system_synced, FALSE) = FALSE
        )
    );

COMMENT ON CONSTRAINT chk_pm_template_nodes_root_synced ON public.pm_template_nodes IS
    'Roots must be Global (system-synced), PMO-tier customisations, or blank-origin local form_template rows (v856 / v852).';

ALTER TABLE sim.pm_template_nodes
    DROP CONSTRAINT IF EXISTS chk_sim_pm_template_nodes_root_synced;

ALTER TABLE sim.pm_template_nodes
    ADD CONSTRAINT chk_sim_pm_template_nodes_root_synced CHECK (
        parent_node_id IS NOT NULL
        OR is_system_synced = TRUE
        OR tier = 'pmo'
        OR (
            domain = 'form_template'
            AND COALESCE(is_system_synced, FALSE) = FALSE
        )
    );

COMMENT ON CONSTRAINT chk_sim_pm_template_nodes_root_synced ON sim.pm_template_nodes IS
    'Sim mirror of chk_pm_template_nodes_root_synced — blank local form_template roots allowed (v856).';

DO $$
BEGIN
  RAISE NOTICE 'v856_pm_template_nodes_allow_blank_local_form_roots.sql applied';
END $$;
