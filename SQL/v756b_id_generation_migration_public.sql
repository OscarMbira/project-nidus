-- ============================================================================
-- v756b: ID Generation Migration — public schema triggers (Phases 0–7)
-- Plan: projectplan/v755_system_wide_id_generation_migration_plan.md
-- Prerequisites: v756 helpers + admin v156 rules seed
-- ============================================================================

CREATE OR REPLACE FUNCTION public._v756_swap_display_id_trigger(
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

    v_sql := format(
        'CREATE TRIGGER %I AFTER INSERT ON %s FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id(%L, %L)',
        p_new_trigger_name,
        p_qualified_table,
        p_admin_target_table,
        p_column_name
    );
    EXECUTE v_sql;
END;
$$;

-- ---------------------------------------------------------------------------
-- Split combined BEFORE triggers that also set integer counters
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_issues_before_insert_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_issue_number INTEGER;
BEGIN
    IF NEW.issue_register_id IS NOT NULL THEN
        SELECT COALESCE(MAX(issue_number), 0) + 1 INTO v_issue_number
        FROM public.issues
        WHERE issue_register_id = NEW.issue_register_id
          AND is_deleted = FALSE;

        NEW.issue_number := v_issue_number;
    END IF;

    IF NEW.date_raised IS NULL THEN
        NEW.date_raised := CURRENT_DATE;
    END IF;

    IF NEW.raised_by_id IS NULL AND NEW.reported_by_user_id IS NOT NULL THEN
        NEW.raised_by_id := NEW.reported_by_user_id;
    END IF;

    IF NEW.owner_id IS NULL AND NEW.assigned_to_user_id IS NOT NULL THEN
        NEW.owner_id := NEW.assigned_to_user_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_issues_before_insert_identifier ON public.issues;
DROP FUNCTION IF EXISTS public.trg_issues_generate_identifier() CASCADE;

DROP TRIGGER IF EXISTS trg_issues_before_insert_defaults ON public.issues;
CREATE TRIGGER trg_issues_before_insert_defaults
    BEFORE INSERT ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_issues_before_insert_defaults();

CREATE OR REPLACE FUNCTION public.trg_lessons_learned_before_insert_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_lesson_number INTEGER;
BEGIN
    IF NEW.lessons_log_id IS NOT NULL AND NEW.lesson_number IS NULL THEN
        SELECT COALESCE(MAX(lesson_number), 0) + 1 INTO v_lesson_number
        FROM public.lessons_learned
        WHERE lessons_log_id = NEW.lessons_log_id
          AND is_deleted = FALSE;
        NEW.lesson_number := v_lesson_number;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lessons_learned_before_insert_reference ON public.lessons_learned;
DROP TRIGGER IF EXISTS trg_lessons_learned_before_insert_number ON public.lessons_learned;
DROP FUNCTION IF EXISTS public.trg_lessons_learned_generate_reference() CASCADE;
DROP FUNCTION IF EXISTS public.trg_lessons_learned_generate_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_lesson_reference() CASCADE;
DROP FUNCTION IF EXISTS public.generate_lesson_number(UUID) CASCADE;

CREATE TRIGGER trg_lessons_learned_before_insert_number
    BEFORE INSERT ON public.lessons_learned
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_lessons_learned_before_insert_number();

-- ---------------------------------------------------------------------------
-- Phase 0 — Risk
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.risk_registers', 'register_reference', 'public.risk_registers',
    'trg_risk_registers_admin_display_id',
    ARRAY['trg_risk_registers_before_insert_reference'],
    ARRAY['public.trg_risk_registers_generate_reference()', 'public.generate_risk_register_reference()']
);

DROP TRIGGER IF EXISTS trg_risks_before_insert_identifier ON public.risks;
DROP FUNCTION IF EXISTS public.trg_risks_generate_identifier() CASCADE;
DROP FUNCTION IF EXISTS public.generate_risk_identifier(UUID) CASCADE;

CREATE TRIGGER trg_risks_admin_display_id
    AFTER INSERT ON public.risks
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.risks', 'risk_identifier');

-- risk_number trigger retained (integer counter, not display ID)

-- ---------------------------------------------------------------------------
-- Phase 1 — Issue family
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.issue_registers', 'register_reference', 'public.issue_registers',
    'trg_issue_registers_admin_display_id',
    ARRAY['trg_issue_registers_before_insert_reference'],
    ARRAY['public.trg_issue_registers_generate_reference()', 'public.generate_issue_register_reference()']
);

CREATE TRIGGER trg_issues_admin_display_id
    AFTER INSERT ON public.issues
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.issues', 'issue_identifier');

DROP FUNCTION IF EXISTS public.generate_issue_identifier(UUID) CASCADE;

SELECT public._v756_swap_display_id_trigger(
    'public.issue_reports', 'report_reference', 'public.issue_reports',
    'trg_issue_reports_admin_display_id',
    ARRAY['trg_issue_reports_auto_generate_reference'],
    ARRAY['public.trg_issue_reports_auto_generate_reference()', 'public.generate_issue_report_reference(UUID)']
);

-- ---------------------------------------------------------------------------
-- Phase 2 — Reports
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.checkpoint_reports', 'document_ref', 'public.checkpoint_reports',
    'trg_checkpoint_reports_admin_display_id',
    ARRAY['trg_checkpoint_reports_generate_ref'],
    ARRAY['public.generate_checkpoint_report_ref(UUID, UUID)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.highlight_reports', 'report_reference', 'public.highlight_reports',
    'trg_highlight_reports_admin_display_id',
    ARRAY['trg_highlight_reports_set_reference'],
    ARRAY['public.trg_highlight_report_set_reference()', 'public.generate_highlight_report_reference(UUID, UUID, DATE)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.exception_reports', 'document_ref', 'public.exception_reports',
    'trg_exception_reports_admin_display_id',
    ARRAY['trg_exception_reports_generate_ref'],
    ARRAY['public.generate_exception_report_ref(UUID)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.end_stage_reports', 'report_reference', 'public.end_stage_reports',
    'trg_end_stage_reports_admin_display_id',
    ARRAY['trg_end_stage_reports_generate_ref'],
    ARRAY['public.generate_end_stage_report_reference(UUID, INTEGER)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.end_project_reports', 'document_ref', 'public.end_project_reports',
    'trg_end_project_reports_admin_display_id',
    ARRAY['trg_end_project_reports_generate_ref'],
    ARRAY['public.generate_end_project_report_ref(UUID)']
);

-- ---------------------------------------------------------------------------
-- Phase 3 — Strategy documents
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.risk_management_strategies', 'rms_reference', 'public.risk_management_strategies',
    'trg_risk_management_strategies_admin_display_id',
    ARRAY['trg_risk_management_strategies_generate_reference'],
    ARRAY['public.trg_rms_generate_reference()', 'public.generate_rms_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.configuration_management_strategies', 'cms_reference', 'public.configuration_management_strategies',
    'trg_configuration_management_strategies_admin_display_id',
    ARRAY['trg_cfg_ms_reference'],
    ARRAY['public.trg_generate_cfg_ms_reference()', 'public.generate_cfg_ms_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.communication_management_strategies', 'cms_reference', 'public.communication_management_strategies',
    'trg_communication_management_strategies_admin_display_id',
    ARRAY['trg_cms_reference'],
    ARRAY['public.trg_generate_cms_reference()', 'public.generate_cms_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.quality_management_strategies', 'qms_reference', 'public.quality_management_strategies',
    'trg_quality_management_strategies_admin_display_id',
    ARRAY['trg_quality_management_strategies_generate_reference'],
    ARRAY['public.trg_qms_generate_reference()', 'public.generate_qms_reference()']
);

-- ---------------------------------------------------------------------------
-- Phase 4 — Product documents
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.product_descriptions', 'pd_reference', 'public.product_descriptions',
    'trg_product_descriptions_admin_display_id',
    ARRAY['trigger_product_descriptions_generate_reference'],
    ARRAY['public.trigger_generate_pd_reference()', 'public.generate_pd_reference(UUID)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.product_status_accounts', 'psa_reference', 'public.product_status_accounts',
    'trg_product_status_accounts_admin_display_id',
    ARRAY['trg_product_status_accounts_before_insert'],
    ARRAY['public.trigger_generate_psa_reference()', 'public.generate_psa_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.project_product_descriptions', 'ppd_reference', 'public.project_product_descriptions',
    'trg_project_product_descriptions_admin_display_id',
    ARRAY['trg_project_product_descriptions_generate_reference'],
    ARRAY['public.trg_ppd_generate_reference()', 'public.generate_ppd_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.configuration_items', 'configuration_item_identifier', 'public.configuration_items',
    'trg_configuration_items_admin_display_id',
    ARRAY['trg_ci_identifier'],
    ARRAY['public.trg_generate_ci_identifier()', 'public.generate_ci_identifier(UUID, VARCHAR)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.pd_acceptance_criteria', 'criteria_reference', 'public.pd_acceptance_criteria',
    'trg_pd_acceptance_criteria_admin_display_id',
    ARRAY['trigger_pd_acceptance_criteria_generate_reference'],
    ARRAY['public.generate_pd_criteria_reference(UUID)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.ppd_acceptance_criteria', 'criteria_reference', 'public.ppd_acceptance_criteria',
    'trg_ppd_acceptance_criteria_admin_display_id',
    ARRAY['trg_ppd_acceptance_criteria_generate_reference'],
    ARRAY['public.trg_ppd_criteria_generate_reference()', 'public.generate_criteria_reference(UUID)']
);

-- ---------------------------------------------------------------------------
-- Phase 5 — Planning documents
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.project_initiation_documents', 'pid_reference', 'public.project_initiation_documents',
    'trg_project_initiation_documents_admin_display_id',
    ARRAY['trg_project_initiation_documents_generate_reference'],
    ARRAY['public.trg_pid_generate_reference()', 'public.generate_pid_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.pid_objectives', 'objective_reference', 'public.pid_objectives',
    'trg_pid_objectives_admin_display_id',
    ARRAY['trg_pid_objectives_generate_reference'],
    ARRAY['public.trg_pid_objective_generate_reference()', 'public.generate_objective_reference(UUID)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.project_plans', 'plan_reference', 'public.project_plans',
    'trg_project_plans_admin_display_id',
    ARRAY['trg_project_plans_auto_generate_reference'],
    ARRAY['public.generate_project_plan_reference(UUID)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.stage_plans', 'plan_reference', 'public.stage_plans',
    'trg_stage_plans_admin_display_id',
    ARRAY['trg_stage_plans_auto_generate_reference'],
    ARRAY['public.generate_stage_plan_reference(UUID, INTEGER)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.work_packages', 'wp_reference', 'public.work_packages',
    'trg_work_packages_admin_display_id',
    ARRAY['trg_work_packages_generate_reference'],
    ARRAY['public.generate_wp_reference()', 'public.trigger_generate_wp_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.wp_quality_criteria', 'criteria_reference', 'public.wp_quality_criteria',
    'trg_wp_quality_criteria_admin_display_id',
    ARRAY['trg_wp_quality_criteria_generate_reference'],
    ARRAY['public.generate_qc_reference(UUID)', 'public.trigger_generate_qc_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.wp_acceptance_criteria', 'criteria_reference', 'public.wp_acceptance_criteria',
    'trg_wp_acceptance_criteria_admin_display_id',
    ARRAY['trg_wp_acceptance_criteria_generate_reference'],
    ARRAY['public.generate_ac_reference(UUID)', 'public.trigger_generate_ac_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.project_mandates', 'mandate_reference', 'public.project_mandates',
    'trg_project_mandates_admin_display_id',
    ARRAY['trg_project_mandates_generate_reference'],
    ARRAY['public.generate_mandate_reference_trigger()', 'public.generate_mandate_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.project_briefs', 'brief_reference', 'public.project_briefs',
    'trg_project_briefs_admin_display_id',
    ARRAY['trg_project_briefs_generate_reference_trigger'],
    ARRAY['public.generate_brief_reference()']
);

-- ---------------------------------------------------------------------------
-- Phase 6 — Logs & lessons
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.daily_logs', 'log_reference', 'public.daily_logs',
    'trg_daily_logs_admin_display_id',
    ARRAY['trg_daily_logs_before_insert_reference'],
    ARRAY['public.generate_log_reference()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.lessons_logs', 'log_reference', 'public.lessons_logs',
    'trg_lessons_logs_admin_display_id',
    ARRAY['trg_lessons_logs_before_insert_reference'],
    ARRAY['public.generate_lessons_log_reference()']
);

CREATE TRIGGER trg_lessons_learned_admin_display_id
    AFTER INSERT ON public.lessons_learned
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.lessons_learned', 'lesson_reference');

SELECT public._v756_swap_display_id_trigger(
    'public.lessons_reports', 'report_reference', 'public.lessons_reports',
    'trg_lessons_reports_admin_display_id',
    ARRAY['trg_lessons_reports_auto_generate_reference'],
    ARRAY['public.generate_lessons_report_reference(UUID, UUID, VARCHAR)']
);

SELECT public._v756_swap_display_id_trigger(
    'public.quality_reviews', 'activity_identifier', 'public.quality_reviews',
    'trg_quality_reviews_admin_display_id',
    ARRAY['trg_quality_reviews_identifier'],
    ARRAY['public.trg_quality_reviews_generate_identifier()']
);

SELECT public._v756_swap_display_id_trigger(
    'public.quality_inspections', 'activity_identifier', 'public.quality_inspections',
    'trg_quality_inspections_admin_display_id',
    ARRAY['trg_quality_inspections_identifier'],
    ARRAY['public.trg_quality_inspections_generate_identifier()']
);

-- Shared pool function removed after both child triggers migrated
DROP FUNCTION IF EXISTS public.generate_quality_activity_identifier() CASCADE;

-- ---------------------------------------------------------------------------
-- Phase 7 — Remaining
-- ---------------------------------------------------------------------------
SELECT public._v756_swap_display_id_trigger(
    'public.business_cases', 'case_reference', 'public.business_cases',
    'trg_business_cases_admin_display_id',
    ARRAY['trg_business_cases_generate_reference'],
    ARRAY['public.generate_business_case_reference()']
);

DROP TRIGGER IF EXISTS trg_portfolios_code ON public.portfolios;
DROP TRIGGER IF EXISTS trg_portfolios_set_phase12_code ON public.portfolios;
DROP FUNCTION IF EXISTS public.trg_portfolios_set_phase12_code() CASCADE;
DROP FUNCTION IF EXISTS public.generate_portfolio_code_trigger() CASCADE;

CREATE TRIGGER trg_portfolios_admin_display_id
    AFTER INSERT ON public.portfolios
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.portfolios', 'portfolio_code');

-- RPC preview for PortfolioForm.jsx (does not insert a row)
CREATE OR REPLACE FUNCTION public.generate_portfolio_code()
RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(portfolio_code FROM 6) AS INTEGER)), 0) + 1
    INTO v_next
    FROM public.portfolios
    WHERE portfolio_code ~ '^PORT-[0-9]+$'
      AND is_deleted = FALSE;

    RETURN 'PORT-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_before_insert ON public.support_tickets;

CREATE TRIGGER trg_support_tickets_admin_display_id
    AFTER INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_apply_admin_display_id('public.support_tickets', 'ticket_number');

DROP FUNCTION IF EXISTS public.generate_ticket_number() CASCADE;

SELECT public._v756_swap_display_id_trigger(
    'public.accounts', 'account_code', 'public.accounts',
    'trg_accounts_admin_display_id',
    ARRAY['trg_accounts_set_code_before_insert'],
    ARRAY['public.trg_accounts_set_code()', 'public.generate_account_code(VARCHAR)']
);

DROP FUNCTION IF EXISTS public._v756_swap_display_id_trigger(
    TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[]
) CASCADE;

DO $$
BEGIN
    RAISE NOTICE 'v756b_id_generation_migration_public.sql applied';
END $$;
