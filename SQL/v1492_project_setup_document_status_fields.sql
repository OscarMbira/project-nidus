-- v1492: Project Setup document confirmation statuses on projects
-- Adds Brief/Charter, PID, and Benefits Review Plan status metadata to the
-- wizard Documents tab (alongside mandate_status / business_case_status).
-- Extends validate_project_readiness (latest body from v156) with the new checks.
-- Platform: public.projects · Simulator practice: sim.projects when present.

BEGIN;

-- ---------------------------------------------------------------------------
-- public.projects
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS brief_status VARCHAR(50);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pid_status VARCHAR(50);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS benefits_review_plan_status VARCHAR(50);

COMMENT ON COLUMN public.projects.brief_status IS
  'Project Brief / Charter document status: draft, approved, missing (Charter is Brief alias)';
COMMENT ON COLUMN public.projects.pid_status IS
  'Project Initiation Document (PID) status: draft, approved, missing';
COMMENT ON COLUMN public.projects.benefits_review_plan_status IS
  'Benefits Review Plan document status: draft, approved, missing';

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_brief_status;
ALTER TABLE public.projects
  ADD CONSTRAINT chk_projects_brief_status
  CHECK (brief_status IN ('draft', 'approved', 'missing') OR brief_status IS NULL);

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_pid_status;
ALTER TABLE public.projects
  ADD CONSTRAINT chk_projects_pid_status
  CHECK (pid_status IN ('draft', 'approved', 'missing') OR pid_status IS NULL);

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_benefits_review_plan_status;
ALTER TABLE public.projects
  ADD CONSTRAINT chk_projects_benefits_review_plan_status
  CHECK (benefits_review_plan_status IN ('draft', 'approved', 'missing') OR benefits_review_plan_status IS NULL);

-- ---------------------------------------------------------------------------
-- sim.projects (practice parity when table exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('sim.projects') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE sim.projects ADD COLUMN IF NOT EXISTS brief_status VARCHAR(50)';
    EXECUTE 'ALTER TABLE sim.projects ADD COLUMN IF NOT EXISTS pid_status VARCHAR(50)';
    EXECUTE 'ALTER TABLE sim.projects ADD COLUMN IF NOT EXISTS benefits_review_plan_status VARCHAR(50)';
    EXECUTE 'ALTER TABLE sim.projects DROP CONSTRAINT IF EXISTS chk_sim_projects_brief_status';
    EXECUTE $c$ALTER TABLE sim.projects ADD CONSTRAINT chk_sim_projects_brief_status
      CHECK (brief_status IN ('draft', 'approved', 'missing') OR brief_status IS NULL)$c$;
    EXECUTE 'ALTER TABLE sim.projects DROP CONSTRAINT IF EXISTS chk_sim_projects_pid_status';
    EXECUTE $c$ALTER TABLE sim.projects ADD CONSTRAINT chk_sim_projects_pid_status
      CHECK (pid_status IN ('draft', 'approved', 'missing') OR pid_status IS NULL)$c$;
    EXECUTE 'ALTER TABLE sim.projects DROP CONSTRAINT IF EXISTS chk_sim_projects_benefits_review_plan_status';
    EXECUTE $c$ALTER TABLE sim.projects ADD CONSTRAINT chk_sim_projects_benefits_review_plan_status
      CHECK (benefits_review_plan_status IN ('draft', 'approved', 'missing') OR benefits_review_plan_status IS NULL)$c$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Readiness: extend v156 validate_project_readiness with the three new statuses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_project_readiness(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
    v_issues JSONB := '[]'::JSONB;
    v_board_members_count INTEGER;
    v_readiness_status VARCHAR(50);
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    SELECT * INTO v_project
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    IF v_project.executive_user_id IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'executive_user_id', 'message', 'Executive/Sponsor must be assigned');
    END IF;

    IF v_project.business_objective IS NULL OR trim(v_project.business_objective) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'business_objective', 'message', 'Business objective is required');
    END IF;

    IF v_project.strategic_alignment IS NULL OR trim(v_project.strategic_alignment) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'strategic_alignment', 'message', 'Strategic alignment is required');
    END IF;

    IF v_project.expected_benefits_summary IS NULL OR trim(v_project.expected_benefits_summary) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'expected_benefits_summary', 'message', 'Expected benefits summary is required');
    END IF;

    IF v_project.benefit_owner_user_id IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'benefit_owner_user_id', 'message', 'Benefit owner must be assigned');
    END IF;

    IF v_project.delivery_methodology IS NULL OR trim(v_project.delivery_methodology) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'delivery_methodology', 'message', 'Delivery methodology is required');
    END IF;

    IF v_project.lifecycle_template IS NULL OR trim(v_project.lifecycle_template) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'lifecycle_template', 'message', 'Lifecycle template is required');
    END IF;

    IF v_project.stage_model IS NULL OR trim(v_project.stage_model) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'stage_model', 'message', 'Stage model is required');
    END IF;

    IF v_project.tolerance_time_days IS NULL AND v_project.tolerance_cost_percentage IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'tolerances', 'message', 'At least one tolerance (time or cost) must be defined');
    END IF;

    IF v_project.budget_amount IS NULL OR v_project.budget_amount <= 0 THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_amount', 'message', 'Budget amount must be greater than zero');
    END IF;

    IF v_project.budget_type IS NULL OR trim(v_project.budget_type) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_type', 'message', 'Budget type (capex/opex/mixed) is required');
    END IF;

    IF v_project.funding_source IS NULL OR trim(v_project.funding_source) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'funding_source', 'message', 'Funding source is required');
    END IF;

    IF v_project.budget_approval_status IS NULL OR trim(v_project.budget_approval_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_approval_status', 'message', 'Budget approval status is required');
    END IF;

    IF v_project.initial_risk_rating IS NULL OR trim(v_project.initial_risk_rating) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'initial_risk_rating', 'message', 'Initial risk rating is required');
    END IF;

    IF v_project.complexity_rating IS NULL OR trim(v_project.complexity_rating) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'complexity_rating', 'message', 'Complexity rating is required');
    END IF;

    IF v_project.mandate_status IS NULL OR trim(v_project.mandate_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'mandate_status', 'message', 'Mandate status is required');
    END IF;

    IF v_project.business_case_status IS NULL OR trim(v_project.business_case_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'business_case_status', 'message', 'Business case status is required');
    END IF;

    -- v1492: Project Setup initiation pack confirmation
    IF v_project.brief_status IS NULL OR trim(v_project.brief_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'brief_status', 'message', 'Brief / Charter status is required');
    END IF;

    IF v_project.pid_status IS NULL OR trim(v_project.pid_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'pid_status', 'message', 'PID status is required');
    END IF;

    IF v_project.benefits_review_plan_status IS NULL OR trim(v_project.benefits_review_plan_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'benefits_review_plan_status', 'message', 'Benefits Review Plan status is required');
    END IF;

    IF v_project.funding_approval_status IS NULL OR trim(v_project.funding_approval_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'funding_approval_status', 'message', 'Funding approval status is required');
    END IF;

    IF v_project.board_required = TRUE THEN
        SELECT COUNT(*) INTO v_board_members_count
        FROM project_board_members
        WHERE project_id = p_project_id
        AND is_active = TRUE
        AND is_deleted = FALSE;

        IF v_board_members_count = 0 THEN
            v_issues := v_issues || jsonb_build_object('field', 'board_members', 'message', 'Board members are required when board is enabled');
        END IF;
    END IF;

    IF v_project.planned_start_date IS NOT NULL AND v_project.planned_end_date IS NOT NULL THEN
        IF v_project.planned_end_date < v_project.planned_start_date THEN
            v_issues := v_issues || jsonb_build_object('field', 'planned_end_date', 'message', 'End date must be after start date');
        END IF;
    END IF;

    IF jsonb_array_length(v_issues) = 0 THEN
        v_readiness_status := 'pass';
    ELSE
        v_readiness_status := 'fail';
    END IF;

    UPDATE projects
    SET readiness_status = v_readiness_status,
        readiness_issues = v_issues,
        readiness_checked_at = NOW(),
        readiness_checked_by = auth.uid()
    WHERE id = p_project_id;

    PERFORM log_project_action(
        p_project_id,
        'validate_readiness',
        jsonb_build_object(
            'readiness_status', v_readiness_status,
            'issues_count', jsonb_array_length(v_issues),
            'validated_by', v_user_id,
            'project_name', v_project.project_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'readiness_status', v_readiness_status,
        'issues', v_issues,
        'issues_count', jsonb_array_length(v_issues)
    );
END;
$$;

COMMENT ON FUNCTION public.validate_project_readiness(UUID) IS
  'Validates project authorisation readiness (v156 + v1492 Brief/PID/BRP document statuses)';

COMMIT;
