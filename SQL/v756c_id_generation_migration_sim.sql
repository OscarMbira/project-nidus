-- ============================================================================
-- v756c: ID Generation Migration — sim schema triggers + missing columns
-- Plan: projectplan/v755_system_wide_id_generation_migration_plan.md
-- Prerequisites: v756 helpers + admin v156 rules seed
-- Skips tables that are not yet deployed (e.g. sim.practice_stage_plans from v574).
-- ============================================================================

CREATE OR REPLACE FUNCTION sim._v756_swap_display_id_trigger(
    p_qualified_table TEXT,
    p_column_name TEXT,
    p_admin_target_table TEXT,
    p_new_trigger_name TEXT,
    p_drop_trigger_names TEXT[],
    p_drop_function_names TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trigger TEXT;
    v_function TEXT;
    v_sql TEXT;
BEGIN
    IF to_regclass(p_qualified_table) IS NULL THEN
        RAISE NOTICE 'v756c: skip trigger % — table % does not exist', p_new_trigger_name, p_qualified_table;
        RETURN;
    END IF;

    IF p_drop_trigger_names IS NOT NULL THEN
        FOREACH v_trigger IN ARRAY p_drop_trigger_names LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', v_trigger, p_qualified_table);
        END LOOP;
    END IF;

    IF p_drop_function_names IS NOT NULL THEN
        FOREACH v_function IN ARRAY p_drop_function_names LOOP
            EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', v_function);
        END LOOP;
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', p_new_trigger_name, p_qualified_table);

    v_sql := format(
        'CREATE TRIGGER %I AFTER INSERT ON %s FOR EACH ROW EXECUTE FUNCTION sim.trg_apply_admin_display_id(%L, %L)',
        p_new_trigger_name,
        p_qualified_table,
        p_admin_target_table,
        p_column_name
    );
    EXECUTE v_sql;
END;
$$;

CREATE OR REPLACE FUNCTION sim._v756_add_column_if_table_exists(
    p_qualified_table TEXT,
    p_column_name TEXT,
    p_column_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF to_regclass(p_qualified_table) IS NULL THEN
        RAISE NOTICE 'v756c: skip column % on % — table does not exist', p_column_name, p_qualified_table;
        RETURN;
    END IF;

    EXECUTE format(
        'ALTER TABLE %s ADD COLUMN IF NOT EXISTS %I %s',
        p_qualified_table,
        p_column_name,
        p_column_type
    );
END;
$$;

-- Optional identifier columns on sim practice mirrors
SELECT sim._v756_add_column_if_table_exists('sim.practice_checkpoint_reports', 'document_ref', 'VARCHAR(100)');
SELECT sim._v756_add_column_if_table_exists('sim.practice_project_initiation_documents', 'pid_reference', 'VARCHAR(100)');
SELECT sim._v756_add_column_if_table_exists('sim.practice_project_briefs', 'brief_reference', 'VARCHAR(100)');
SELECT sim._v756_add_column_if_table_exists('sim.practice_risk_management_strategies', 'rms_reference', 'VARCHAR(100)');
SELECT sim._v756_add_column_if_table_exists('sim.practice_quality_management_strategies', 'qms_reference', 'VARCHAR(100)');
SELECT sim._v756_add_column_if_table_exists('sim.practice_lesson_entries', 'lesson_reference', 'VARCHAR(50)');
SELECT sim._v756_add_column_if_table_exists('sim.practice_stage_plans', 'plan_reference', 'VARCHAR(100)');

-- ---------------------------------------------------------------------------
-- Simulator practice tables
-- ---------------------------------------------------------------------------
SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_risk_register', 'register_reference', 'sim.practice_risk_register',
    'trg_sim_practice_risk_register_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_risks', 'risk_code', 'sim.practice_risks',
    'trg_sim_practice_risks_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_issue_register', 'register_reference', 'sim.practice_issue_register',
    'trg_sim_practice_issue_register_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_issues', 'issue_identifier', 'sim.practice_issues',
    'trg_sim_practice_issues_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_issue_reports', 'report_reference', 'sim.practice_issue_reports',
    'trg_sim_practice_issue_reports_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_checkpoint_reports', 'document_ref', 'sim.practice_checkpoint_reports',
    'trg_sim_practice_checkpoint_reports_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_highlight_reports', 'report_reference', 'sim.practice_highlight_reports',
    'trg_sim_practice_highlight_reports_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_exception_reports', 'report_reference', 'sim.practice_exception_reports',
    'trg_sim_practice_exception_reports_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_end_stage_reports', 'report_reference', 'sim.practice_end_stage_reports',
    'trg_sim_practice_end_stage_reports_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_end_project_reports', 'report_reference', 'sim.practice_end_project_reports',
    'trg_sim_practice_end_project_reports_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_risk_management_strategies', 'rms_reference', 'sim.practice_risk_management_strategies',
    'trg_sim_practice_rms_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_configuration_management_strategies', 'cfgms_reference', 'sim.practice_configuration_management_strategies',
    'trg_sim_practice_cfgms_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_communication_management_strategies', 'cms_reference', 'sim.practice_communication_management_strategies',
    'trg_sim_practice_cms_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_quality_management_strategies', 'qms_reference', 'sim.practice_quality_management_strategies',
    'trg_sim_practice_qms_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_product_descriptions', 'pd_reference', 'sim.practice_product_descriptions',
    'trg_sim_practice_pd_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_product_status_accounts', 'psa_reference', 'sim.practice_product_status_accounts',
    'trg_sim_practice_psa_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_project_product_descriptions', 'ppd_reference', 'sim.practice_project_product_descriptions',
    'trg_sim_practice_ppd_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_configuration_item_records', 'item_reference', 'sim.practice_configuration_item_records',
    'trg_sim_practice_ci_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_project_initiation_documents', 'pid_reference', 'sim.practice_project_initiation_documents',
    'trg_sim_practice_pid_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_project_plans', 'plan_reference', 'sim.practice_project_plans',
    'trg_sim_practice_project_plans_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_stage_plans', 'plan_reference', 'sim.practice_stage_plans',
    'trg_sim_practice_stage_plans_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_work_packages', 'work_package_code', 'sim.practice_work_packages',
    'trg_sim_practice_work_packages_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_project_briefs', 'brief_reference', 'sim.practice_project_briefs',
    'trg_sim_practice_project_briefs_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_daily_logs', 'log_reference', 'sim.practice_daily_logs',
    'trg_sim_practice_daily_logs_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_lessons_log', 'log_reference', 'sim.practice_lessons_log',
    'trg_sim_practice_lessons_log_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_lesson_entries', 'lesson_reference', 'sim.practice_lesson_entries',
    'trg_sim_practice_lesson_entries_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_lessons_reports', 'report_reference', 'sim.practice_lessons_reports',
    'trg_sim_practice_lessons_reports_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_quality_activities', 'activity_identifier', 'sim.practice_quality_activities',
    'trg_sim_practice_quality_activities_admin_display_id', ARRAY[]::TEXT[], ARRAY[]::TEXT[]
);

SELECT sim._v756_swap_display_id_trigger(
    'sim.practice_business_cases', 'case_reference', 'sim.practice_business_cases',
    'trg_sim_practice_business_cases_admin_display_id',
    ARRAY['trg_sim_practice_bc_reference'],
    ARRAY['sim.generate_practice_business_case_reference()']
);

-- Retire legacy sim mandate/portfolio generators (when tables exist)
DO $$
BEGIN
    IF to_regclass('sim.project_mandates') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_sim_project_mandates_generate_reference ON sim.project_mandates;
        DROP FUNCTION IF EXISTS sim.generate_sim_mandate_reference_trigger() CASCADE;
        DROP TRIGGER IF EXISTS trg_sim_project_mandates_admin_display_id ON sim.project_mandates;
        CREATE TRIGGER trg_sim_project_mandates_admin_display_id
            AFTER INSERT ON sim.project_mandates
            FOR EACH ROW
            EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.project_mandates', 'mandate_reference');
    ELSE
        RAISE NOTICE 'v756c: skip sim.project_mandates — table does not exist';
    END IF;

    IF to_regclass('sim.practice_portfolios') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_sim_portfolios_code ON sim.practice_portfolios;
        DROP FUNCTION IF EXISTS sim.generate_sim_portfolio_code() CASCADE;
        DROP TRIGGER IF EXISTS trg_sim_practice_portfolios_admin_display_id ON sim.practice_portfolios;
        CREATE TRIGGER trg_sim_practice_portfolios_admin_display_id
            AFTER INSERT ON sim.practice_portfolios
            FOR EACH ROW
            EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.practice_portfolios', 'portfolio_code');
    ELSE
        RAISE NOTICE 'v756c: skip sim.practice_portfolios — table does not exist';
    END IF;
END $$;

DROP FUNCTION IF EXISTS sim._v756_add_column_if_table_exists(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS sim._v756_swap_display_id_trigger(
    TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[]
) CASCADE;

DO $$
BEGIN
    RAISE NOTICE 'v756c_id_generation_migration_sim.sql applied';
END $$;
