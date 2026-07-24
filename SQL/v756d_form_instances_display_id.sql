-- ============================================================================
-- v756d: form_instances display ID column + triggers (Phase 8)
-- Plan: projectplan/v755_system_wide_id_generation_migration_plan.md
-- Prerequisites: v756 helpers + admin v156 rules (public.form_instances, sim.form_instances)
-- ============================================================================

ALTER TABLE public.form_instances
    ADD COLUMN IF NOT EXISTS instance_reference VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_form_instances_instance_reference
    ON public.form_instances (instance_reference)
    WHERE instance_reference IS NOT NULL;

ALTER TABLE sim.form_instances
    ADD COLUMN IF NOT EXISTS instance_reference VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_form_instances_instance_reference
    ON sim.form_instances (instance_reference)
    WHERE instance_reference IS NOT NULL;

DROP TRIGGER IF EXISTS trg_form_instances_admin_display_id ON public.form_instances;
CREATE TRIGGER trg_form_instances_admin_display_id
    AFTER INSERT ON public.form_instances
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.form_instances', 'instance_reference');

DROP TRIGGER IF EXISTS trg_sim_form_instances_admin_display_id ON sim.form_instances;
CREATE TRIGGER trg_sim_form_instances_admin_display_id
    AFTER INSERT ON sim.form_instances
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.form_instances', 'instance_reference');

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_instances', 'Project form instances with admin-engine display IDs', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'v756d_form_instances_display_id.sql applied';
END $$;
