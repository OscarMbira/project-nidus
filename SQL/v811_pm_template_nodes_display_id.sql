-- =============================================================================
-- v811: pm_template_nodes display IDs (Organisational Template URLs)
-- Plan: projectplan/v808_form_template_org_required_field_override_plan.md (Phase 9)
-- CLAUDE.md rule 16.1 (Display ID in URLs) — closes an implementation gap on
-- pm_template_nodes specifically; no new rule needed.
-- Prerequisites: v756_id_generation_migration_helpers.sql (trg_apply_admin_display_id),
--                Admin repo's vNNN_pm_template_nodes_id_generation_seed.sql (TPL/STPL rules)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) display column
-- -----------------------------------------------------------------------------
ALTER TABLE public.pm_template_nodes
    ADD COLUMN IF NOT EXISTS template_reference VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pm_template_nodes_template_reference
    ON public.pm_template_nodes (template_reference)
    WHERE template_reference IS NOT NULL;

COMMENT ON COLUMN public.pm_template_nodes.template_reference IS
    'Human-readable ID from admin.id_generation_rules (abbrev TPL, sequential) — used in URLs instead of the raw UUID (CLAUDE.md rule 16.1).';

ALTER TABLE sim.pm_template_nodes
    ADD COLUMN IF NOT EXISTS template_reference VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_pm_template_nodes_template_reference
    ON sim.pm_template_nodes (template_reference)
    WHERE template_reference IS NOT NULL;

COMMENT ON COLUMN sim.pm_template_nodes.template_reference IS
    'Human-readable ID from admin.id_generation_rules (abbrev STPL, sequential) — used in URLs instead of the raw UUID (CLAUDE.md rule 16.1).';

-- -----------------------------------------------------------------------------
-- 2) AFTER INSERT triggers — reuse the existing generic helper functions as-is,
-- no new trigger code needed (v756_id_generation_migration_helpers.sql).
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pm_template_nodes_admin_display_id ON public.pm_template_nodes;
CREATE TRIGGER trg_pm_template_nodes_admin_display_id
    AFTER INSERT ON public.pm_template_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.pm_template_nodes', 'template_reference');

DROP TRIGGER IF EXISTS trg_sim_pm_template_nodes_admin_display_id ON sim.pm_template_nodes;
CREATE TRIGGER trg_sim_pm_template_nodes_admin_display_id
    AFTER INSERT ON sim.pm_template_nodes
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.pm_template_nodes', 'template_reference');

-- -----------------------------------------------------------------------------
-- 3) Backfill existing rows — idempotent (WHERE template_reference IS NULL), safe to re-run.
-- Quietly no-ops until the Admin repo's companion rule-seed file has been applied
-- (admin.generate_display_id raises if no active rule exists for the target table).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_row RECORD;
    v_display TEXT;
    v_n INTEGER := 0;
    v_rule_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM admin.id_generation_rules r
        WHERE admin.normalize_id_generation_target_table(r.target_table)
            = admin.normalize_id_generation_target_table('public.pm_template_nodes')
          AND COALESCE(r.is_active, TRUE) = TRUE
    ) INTO v_rule_exists;

    IF NOT v_rule_exists THEN
        RAISE NOTICE 'v811: no active id_generation_rule for public.pm_template_nodes yet — skipping backfill (apply the Admin repo seed first)';
    ELSE
        FOR v_row IN
            SELECT id FROM public.pm_template_nodes WHERE template_reference IS NULL ORDER BY created_at NULLS LAST, id
        LOOP
            v_display := admin.generate_display_id('public.pm_template_nodes', v_row.id);
            UPDATE public.pm_template_nodes SET template_reference = v_display WHERE id = v_row.id AND template_reference IS NULL;
            v_n := v_n + 1;
        END LOOP;
        RAISE NOTICE 'v811: backfilled % public.pm_template_nodes template_reference value(s)', v_n;
    END IF;
END $$;

DO $$
DECLARE
    v_row RECORD;
    v_display TEXT;
    v_n INTEGER := 0;
    v_rule_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM admin.id_generation_rules r
        WHERE admin.normalize_id_generation_target_table(r.target_table)
            = admin.normalize_id_generation_target_table('sim.pm_template_nodes')
          AND COALESCE(r.is_active, TRUE) = TRUE
    ) INTO v_rule_exists;

    IF NOT v_rule_exists THEN
        RAISE NOTICE 'v811: no active id_generation_rule for sim.pm_template_nodes yet — skipping backfill (apply the Admin repo seed first)';
    ELSE
        FOR v_row IN
            SELECT id FROM sim.pm_template_nodes WHERE template_reference IS NULL ORDER BY created_at NULLS LAST, id
        LOOP
            v_display := admin.generate_display_id('sim.pm_template_nodes', v_row.id);
            UPDATE sim.pm_template_nodes SET template_reference = v_display WHERE id = v_row.id AND template_reference IS NULL;
            v_n := v_n + 1;
        END LOOP;
        RAISE NOTICE 'v811: backfilled % sim.pm_template_nodes template_reference value(s)', v_n;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) database_tables registry refresh (pm_template_nodes was already registered at
-- v764 creation time — this just refreshes the description, per the standing rule).
-- -----------------------------------------------------------------------------
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('pm_template_nodes', 'PM template hierarchy backbone nodes — now with admin-engine display IDs (template_reference) for use in URLs.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v811_pm_template_nodes_display_id.sql applied';
END $$;
