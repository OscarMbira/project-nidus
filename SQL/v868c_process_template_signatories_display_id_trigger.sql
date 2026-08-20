-- =============================================================================
-- v868c: process_template_document_signatories.display_id via Admin ID Generation
-- Plan: projectplan/v868_process_template_document_signatories_plan.md
-- Prerequisites: v756_id_generation_migration_helpers.sql, v868 (this table),
--                Admin v204_process_template_signatories_id_generation_seed.sql
--
-- Same pattern as v864/v866c: trg_apply_admin_display_id only fires when the
-- target column is blank at insert, so a fresh signing-round row (a new
-- logical signature event, not a "version" of an old one) always gets its own
-- new display_id — unlike attachments, there is no "copy display_id forward"
-- concept here since each round's rows are independent signing events, not
-- versions of the same logical attachment.
--
-- process_template_signatory_requirements (PMO Admin config) and
-- user_signature_images (personal asset) deliberately do NOT get display IDs
-- — see PRD v868 §d for why.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_process_template_document_signatories_admin_display_id ON public.process_template_document_signatories;
CREATE TRIGGER trg_process_template_document_signatories_admin_display_id
    AFTER INSERT ON public.process_template_document_signatories
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.process_template_document_signatories', 'display_id');

DROP TRIGGER IF EXISTS trg_sim_process_template_document_signatories_admin_display_id ON sim.process_template_document_signatories;
CREATE TRIGGER trg_sim_process_template_document_signatories_admin_display_id
    AFTER INSERT ON sim.process_template_document_signatories
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.process_template_document_signatories', 'display_id');

COMMENT ON COLUMN public.process_template_document_signatories.display_id IS
    'Human-readable signatory-slot code (e.g. SIG-0001) via admin.id_generation_rules (see Admin SQL v204). Assigned once per row at insert.';
COMMENT ON COLUMN sim.process_template_document_signatories.display_id IS
    'Human-readable signatory-slot code (e.g. SSIG-0001) via admin.id_generation_rules (see Admin SQL v204). Assigned once per row at insert.';

DO $$
BEGIN
  RAISE NOTICE 'v868c_process_template_signatories_display_id_trigger.sql applied';
END $$;
