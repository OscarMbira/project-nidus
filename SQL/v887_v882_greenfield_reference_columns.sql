-- ============================================================================
-- v887: v882 Phase 2 — reference columns + Admin ID Generation triggers for the
-- 4 "greenfield" friendly-URL families (agile_releases, requirements_register,
-- activity_list, project_opa_customisations).
-- Plan: projectplan/v882_friendly_urls_systemwide_plan.md (Phase 2)
-- Prerequisites: SQL/v756_id_generation_migration_helpers.sql (public schema trigger
--   helper), project-nidus-admin SQL/v206_id_generation_v882_greenfield_rules_seed.sql
--   (creates the admin.id_generation_rules rows this trigger reads).
-- Scope: public schema only — requirements_register/activity_list/agile_releases/
--   project_opa_customisations under sim schema belong to the separate Simulator
--   "Practice" mode (practice_project_id-scoped) and are out of scope here; the
--   Simulator app's main workspace reuses these same public.* tables (confirmed via
--   apps/simulator/src/services/{agileReleaseService,requirementsRegisterService,
--   activityListService,projectOPATailoringService}.js, all platformDb-backed).
--
-- Defensive: each table's block is guarded with to_regclass(...) IS NOT NULL so a
-- table whose own migration (v434/v357/v365/v572) hasn't been applied yet in this
-- environment is skipped with a NOTICE instead of failing the whole script.
-- Safe to re-run once the missing table's migration is applied.
-- ============================================================================

DO $$
BEGIN
    ------------------------------------------------------------------------
    -- agile_releases
    ------------------------------------------------------------------------
    IF to_regclass('public.agile_releases') IS NOT NULL THEN
        ALTER TABLE public.agile_releases ADD COLUMN IF NOT EXISTS release_reference TEXT;
        COMMENT ON COLUMN public.agile_releases.release_reference IS
            'Admin ID Generation display ID (e.g. REL-001) — assigned by trg_agile_releases_admin_display_id on insert when blank';

        DROP TRIGGER IF EXISTS trg_agile_releases_admin_display_id ON public.agile_releases;
        CREATE TRIGGER trg_agile_releases_admin_display_id
            AFTER INSERT ON public.agile_releases
            FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.agile_releases', 'release_reference');
    ELSE
        RAISE NOTICE 'v887: skipping public.agile_releases — table does not exist yet (apply SQL/v434 first)';
    END IF;

    ------------------------------------------------------------------------
    -- requirements_register (requirement_code column already exists)
    ------------------------------------------------------------------------
    IF to_regclass('public.requirements_register') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_requirements_register_admin_display_id ON public.requirements_register;
        CREATE TRIGGER trg_requirements_register_admin_display_id
            AFTER INSERT ON public.requirements_register
            FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.requirements_register', 'requirement_code');
    ELSE
        RAISE NOTICE 'v887: skipping public.requirements_register — table does not exist yet (apply SQL/v357 first)';
    END IF;

    ------------------------------------------------------------------------
    -- activity_list (activity_code column already exists)
    ------------------------------------------------------------------------
    IF to_regclass('public.activity_list') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_activity_list_admin_display_id ON public.activity_list;
        CREATE TRIGGER trg_activity_list_admin_display_id
            AFTER INSERT ON public.activity_list
            FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.activity_list', 'activity_code');
    ELSE
        RAISE NOTICE 'v887: skipping public.activity_list — table does not exist yet (apply SQL/v365 first)';
    END IF;

    ------------------------------------------------------------------------
    -- project_opa_customisations
    ------------------------------------------------------------------------
    IF to_regclass('public.project_opa_customisations') IS NOT NULL THEN
        ALTER TABLE public.project_opa_customisations ADD COLUMN IF NOT EXISTS opa_reference TEXT;
        COMMENT ON COLUMN public.project_opa_customisations.opa_reference IS
            'Admin ID Generation display ID (e.g. OPA-001) — assigned by trg_project_opa_customisations_admin_display_id on insert when blank';

        DROP TRIGGER IF EXISTS trg_project_opa_customisations_admin_display_id ON public.project_opa_customisations;
        CREATE TRIGGER trg_project_opa_customisations_admin_display_id
            AFTER INSERT ON public.project_opa_customisations
            FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.project_opa_customisations', 'opa_reference');
    ELSE
        RAISE NOTICE 'v887: skipping public.project_opa_customisations — table does not exist yet (apply SQL/v572 first)';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill existing rows whose reference column is still blank (AFTER INSERT
-- triggers don't apply retroactively). No-op if no such rows exist, or if the
-- admin.id_generation_rules row for that table isn't seeded yet (v206) —
-- generate_display_id would error, so each table is also guarded on that.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    r RECORD;
BEGIN
    IF to_regclass('public.agile_releases') IS NOT NULL
       AND EXISTS (SELECT 1 FROM admin.id_generation_rules WHERE target_table = 'public.agile_releases') THEN
        FOR r IN SELECT id FROM public.agile_releases WHERE release_reference IS NULL OR btrim(release_reference) = '' LOOP
            UPDATE public.agile_releases SET release_reference = admin.generate_display_id('public.agile_releases', r.id) WHERE id = r.id;
        END LOOP;
    END IF;

    IF to_regclass('public.requirements_register') IS NOT NULL
       AND EXISTS (SELECT 1 FROM admin.id_generation_rules WHERE target_table = 'public.requirements_register') THEN
        FOR r IN SELECT id FROM public.requirements_register WHERE requirement_code IS NULL OR btrim(requirement_code) = '' LOOP
            UPDATE public.requirements_register SET requirement_code = admin.generate_display_id('public.requirements_register', r.id) WHERE id = r.id;
        END LOOP;
    END IF;

    IF to_regclass('public.activity_list') IS NOT NULL
       AND EXISTS (SELECT 1 FROM admin.id_generation_rules WHERE target_table = 'public.activity_list') THEN
        FOR r IN SELECT id FROM public.activity_list WHERE activity_code IS NULL OR btrim(activity_code) = '' LOOP
            UPDATE public.activity_list SET activity_code = admin.generate_display_id('public.activity_list', r.id) WHERE id = r.id;
        END LOOP;
    END IF;

    IF to_regclass('public.project_opa_customisations') IS NOT NULL
       AND EXISTS (SELECT 1 FROM admin.id_generation_rules WHERE target_table = 'public.project_opa_customisations') THEN
        FOR r IN SELECT id FROM public.project_opa_customisations WHERE opa_reference IS NULL OR btrim(opa_reference) = '' LOOP
            UPDATE public.project_opa_customisations SET opa_reference = admin.generate_display_id('public.project_opa_customisations', r.id) WHERE id = r.id;
        END LOOP;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'v887_v882_greenfield_reference_columns.sql applied';
END $$;
