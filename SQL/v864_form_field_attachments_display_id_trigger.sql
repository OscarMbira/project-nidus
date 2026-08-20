-- =============================================================================
-- v864: form_field_attachments.display_id via Admin ID Generation
-- Plan: projectplan/v863_form_field_attachments_plan.md
-- Prerequisites: v756_id_generation_migration_helpers.sql,
--                v861/v862 (this table), Admin v202_form_field_attachments_id_generation_seed.sql
--
-- trg_apply_admin_display_id already only fires generation when the target
-- column is blank (see v756). That means no special "version_number = 1"
-- WHEN-clause is needed here: the app layer (formFieldAttachmentService.js)
-- populates display_id explicitly (copied from the current version) whenever
-- it inserts a replace/restore version row, so the trigger naturally no-ops
-- on those inserts and only ever generates a fresh code for a brand-new
-- logical attachment's first version (blank display_id at insert time).
-- =============================================================================

DROP TRIGGER IF EXISTS trg_form_field_attachments_admin_display_id ON public.form_field_attachments;
CREATE TRIGGER trg_form_field_attachments_admin_display_id
    AFTER INSERT ON public.form_field_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.form_field_attachments', 'display_id');

DROP TRIGGER IF EXISTS trg_sim_form_field_attachments_admin_display_id ON sim.form_field_attachments;
CREATE TRIGGER trg_sim_form_field_attachments_admin_display_id
    AFTER INSERT ON sim.form_field_attachments
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.form_field_attachments', 'display_id');

COMMENT ON COLUMN public.form_field_attachments.display_id IS
    'Human-readable attachment code (e.g. IMG-0001) via admin.id_generation_rules (IMG). Assigned once on the first version (version_number=1, blank at insert); later versions copy it forward at the app layer.';
COMMENT ON COLUMN sim.form_field_attachments.display_id IS
    'Human-readable attachment code (e.g. SIMG-0001) via admin.id_generation_rules (SIMG). Assigned once on the first version (version_number=1, blank at insert); later versions copy it forward at the app layer.';

DO $$
BEGIN
  RAISE NOTICE 'v864_form_field_attachments_display_id_trigger.sql applied';
END $$;
