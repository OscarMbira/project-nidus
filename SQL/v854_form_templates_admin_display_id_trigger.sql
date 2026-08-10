-- =============================================================================
-- v854: form_templates.template_code via Admin ID Generation (no backfill)
-- Plan: projectplan/v852_pm_local_forms_plan.md (Phase 2.2–2.3)
-- Prerequisites: v756_id_generation_migration_helpers.sql,
--                Admin v201_form_templates_id_generation_seed.sql (FRM/SFRM)
--
-- Existing F0xx rows are left untouched (PRD O4). Trigger only fires on INSERT
-- and trg_apply_admin_display_id skips when template_code is already non-empty.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_form_templates_admin_display_id ON public.form_templates;
CREATE TRIGGER trg_form_templates_admin_display_id
    AFTER INSERT ON public.form_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.form_templates', 'template_code');

DROP TRIGGER IF EXISTS trg_sim_form_templates_admin_display_id ON sim.form_templates;
CREATE TRIGGER trg_sim_form_templates_admin_display_id
    AFTER INSERT ON sim.form_templates
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.form_templates', 'template_code');

COMMENT ON COLUMN public.form_templates.template_code IS
    'Human-readable form template code. New rows: admin.id_generation_rules (FRM) via v854 trigger when inserted blank. Legacy F0xx codes retained.';

-- form_templates already registered at v502 — refresh description only.
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_templates', 'Dynamic form templates — template_code from Admin ID Generation (FRM) for new rows (v854).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v854_form_templates_admin_display_id_trigger.sql applied';
END $$;
