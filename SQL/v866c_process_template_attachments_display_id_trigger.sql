-- =============================================================================
-- v866c: process_template_attachments.display_id via Admin ID Generation
-- Plan: projectplan/v867_process_template_document_attachments_plan.md
-- Prerequisites: v756_id_generation_migration_helpers.sql, v866 (this table),
--                Admin v203_process_template_attachments_id_generation_seed.sql
--
-- Same pattern as v864: trg_apply_admin_display_id only fires when the target
-- column is blank at insert time, so the app layer (processTemplateAttachmentService.js)
-- copies display_id forward on replace/restore inserts and leaves it blank only
-- for a brand-new logical attachment's first version.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_process_template_attachments_admin_display_id ON public.process_template_attachments;
CREATE TRIGGER trg_process_template_attachments_admin_display_id
    AFTER INSERT ON public.process_template_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.process_template_attachments', 'display_id');

DROP TRIGGER IF EXISTS trg_sim_process_template_attachments_admin_display_id ON sim.process_template_attachments;
CREATE TRIGGER trg_sim_process_template_attachments_admin_display_id
    AFTER INSERT ON sim.process_template_attachments
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.process_template_attachments', 'display_id');

COMMENT ON COLUMN public.process_template_attachments.display_id IS
    'Human-readable attachment code (e.g. DAT-0001) via admin.id_generation_rules (preferred abbrev DAT; see Admin SQL v203). Assigned once on the first version (version_number=1, blank at insert); later versions copy it forward at the app layer.';
COMMENT ON COLUMN sim.process_template_attachments.display_id IS
    'Human-readable attachment code (e.g. SDAT-0001) via admin.id_generation_rules (preferred abbrev SDAT; see Admin SQL v203). Assigned once on the first version (version_number=1, blank at insert); later versions copy it forward at the app layer.';

DO $$
BEGIN
  RAISE NOTICE 'v866c_process_template_attachments_display_id_trigger.sql applied';
END $$;
