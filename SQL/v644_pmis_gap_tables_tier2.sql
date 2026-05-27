-- =============================================================================
-- v644_pmis_gap_tables_tier2.sql
-- PMIS Gap Analysis (v631) — Tier 2 tables: GAP-06 to GAP-15
-- Prerequisites: v643 (set_pmis_updated_at), projects, accounts, v628e timesheet_entries
-- No seed data.
-- =============================================================================

-- ── GAP-06: Public Intake Forms ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  form_name VARCHAR(255) NOT NULL,
  form_code VARCHAR(80) NOT NULL,
  public_token VARCHAR(64) NOT NULL,
  target_entity_type VARCHAR(40) NOT NULL DEFAULT 'issue',
  branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active_from DATE,
  active_to DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_intake_forms_code UNIQUE (account_id, form_code),
  CONSTRAINT uq_intake_forms_token UNIQUE (public_token)
);

CREATE TABLE IF NOT EXISTS public.intake_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  field_key VARCHAR(80) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(40) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  field_options JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_intake_form_fields UNIQUE (form_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.intake_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.intake_forms(id) ON DELETE CASCADE,
  submitter_name VARCHAR(255),
  submitter_email VARCHAR(255),
  submission_status VARCHAR(30) NOT NULL DEFAULT 'received'
    CHECK (submission_status IN ('received', 'processing', 'created', 'rejected', 'spam')),
  created_entity_type VARCHAR(40),
  created_entity_id UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.intake_form_submission_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.intake_form_submissions(id) ON DELETE CASCADE,
  field_id UUID REFERENCES public.intake_form_fields(id) ON DELETE SET NULL,
  field_key VARCHAR(80) NOT NULL,
  field_value TEXT,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GAP-07: Client Portal ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_portal_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  portal_name VARCHAR(255) NOT NULL,
  portal_slug VARCHAR(80) NOT NULL,
  branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_client_portal_slug UNIQUE (portal_slug)
);

CREATE TABLE IF NOT EXISTS public.client_portal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES public.client_portal_configs(id) ON DELETE CASCADE,
  section_key VARCHAR(60) NOT NULL,
  section_label VARCHAR(120) NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_client_portal_sections UNIQUE (portal_id, section_key)
);

CREATE TABLE IF NOT EXISTS public.client_portal_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES public.client_portal_configs(id) ON DELETE CASCADE,
  guest_email VARCHAR(255) NOT NULL,
  guest_name VARCHAR(255),
  access_token_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.client_portal_guests(id) ON DELETE CASCADE,
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_ended_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  pages_viewed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GAP-08: Recurring Tasks ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(40) NOT NULL DEFAULT 'task',
  recurrence_pattern VARCHAR(40) NOT NULL,
  recurrence_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  end_condition VARCHAR(30) NOT NULL DEFAULT 'never'
    CHECK (end_condition IN ('never', 'after_count', 'until_date')),
  max_occurrences INTEGER,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.recurring_task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.recurring_task_templates(id) ON DELETE CASCADE,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  timezone VARCHAR(60) NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recurring_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.recurring_task_templates(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL,
  generated_entity_type VARCHAR(40),
  generated_entity_id UUID,
  instance_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (instance_status IN ('pending', 'created', 'skipped', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── GAP-09: Universal Calendar ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.calendar_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_view VARCHAR(20) NOT NULL DEFAULT 'week' CHECK (default_view IN ('month', 'week', 'day')),
  color_theme VARCHAR(40) DEFAULT 'default',
  filter_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  show_entity_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_calendar_user_settings UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.calendar_event_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  event_title VARCHAR(500) NOT NULL,
  event_description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  color_code VARCHAR(20),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_calendar_event_times CHECK (end_at >= start_at)
);

-- ── GAP-10: RACI Matrix ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.raci_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  matrix_name VARCHAR(255) NOT NULL,
  matrix_version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.raci_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES public.raci_matrices(id) ON DELETE CASCADE,
  deliverable_name VARCHAR(500) NOT NULL,
  linked_entity_type VARCHAR(40),
  linked_entity_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.raci_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id UUID NOT NULL REFERENCES public.raci_rows(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raci_role CHAR(1) NOT NULL CHECK (raci_role IN ('R', 'A', 'C', 'I')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_raci_assignments UNIQUE (row_id, member_user_id, raci_role)
);

-- ── GAP-11: Skills Matrix ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_name VARCHAR(120) NOT NULL,
  category_code VARCHAR(40),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.skill_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.skill_categories(id) ON DELETE SET NULL,
  skill_name VARCHAR(255) NOT NULL,
  skill_code VARCHAR(60),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  competency_level INTEGER NOT NULL DEFAULT 1 CHECK (competency_level BETWEEN 1 AND 5),
  assessed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_member_skills UNIQUE (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skill_catalog(id) ON DELETE CASCADE,
  required_level INTEGER NOT NULL DEFAULT 3 CHECK (required_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_skill_id UUID NOT NULL REFERENCES public.member_skills(id) ON DELETE CASCADE,
  endorser_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endorsement_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_skill_endorsements UNIQUE (member_skill_id, endorser_user_id)
);

-- ── GAP-12: Procurement & Contracts ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_code VARCHAR(60),
  category VARCHAR(80),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(60),
  rating_avg NUMERIC(3,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.procurement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plan_title VARCHAR(255) NOT NULL,
  plan_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  request_reference VARCHAR(80) NOT NULL,
  request_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (request_status IN ('draft', 'submitted', 'approved', 'rejected', 'ordered')),
  total_amount NUMERIC(18,2),
  requested_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  purchase_request_id UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  po_reference VARCHAR(80) NOT NULL,
  po_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  contract_reference VARCHAR(80) NOT NULL,
  contract_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (contract_status IN ('draft', 'active', 'expired', 'terminated')),
  contract_value NUMERIC(18,2),
  start_date DATE,
  end_date DATE,
  renewal_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.contract_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  due_date DATE,
  payment_amount NUMERIC(18,2),
  milestone_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  invoice_reference VARCHAR(80) NOT NULL,
  invoice_amount NUMERIC(18,2) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.vendor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  rating_score INTEGER NOT NULL CHECK (rating_score BETWEEN 1 AND 5),
  rating_notes TEXT,
  rated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GAP-13: Timesheet Approval ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  total_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_timesheets_period UNIQUE (project_id, user_id, week_start_date),
  CONSTRAINT chk_timesheets_week CHECK (week_end_date >= week_start_date)
);

ALTER TABLE public.timesheet_entries
  ADD COLUMN IF NOT EXISTS timesheet_id UUID REFERENCES public.timesheets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet
  ON public.timesheet_entries (timesheet_id) WHERE timesheet_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.timesheet_approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  approver_role VARCHAR(60) NOT NULL DEFAULT 'project_manager',
  escalation_days INTEGER NOT NULL DEFAULT 3,
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.timesheet_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  approver_user_id UUID NOT NULL REFERENCES auth.users(id),
  approval_status VARCHAR(30) NOT NULL
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GAP-14: Baselines & S-Curve ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  baseline_name VARCHAR(255) NOT NULL,
  baseline_type VARCHAR(30) NOT NULL DEFAULT 'integrated'
    CHECK (baseline_type IN ('schedule', 'cost', 'integrated')),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  baseline_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.baseline_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID NOT NULL REFERENCES public.project_baselines(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  planned_cost NUMERIC(18,2),
  earned_value NUMERIC(18,2),
  actual_cost NUMERIC(18,2),
  planned_pct_complete NUMERIC(5,2),
  actual_pct_complete NUMERIC(5,2),
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_baseline_snapshots_date UNIQUE (baseline_id, snapshot_date)
);

-- ── GAP-15: Planning Poker ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.planning_poker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sprint_id UUID,
  session_name VARCHAR(255) NOT NULL,
  card_deck VARCHAR(30) NOT NULL DEFAULT 'fibonacci',
  session_status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (session_status IN ('active', 'completed', 'cancelled')),
  facilitator_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.planning_poker_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.planning_poker_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_planning_poker_participants UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.planning_poker_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.planning_poker_sessions(id) ON DELETE CASCADE,
  story_title VARCHAR(500) NOT NULL,
  backlog_item_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  final_estimate VARCHAR(20),
  estimate_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.planning_poker_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.planning_poker_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_value VARCHAR(20) NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_planning_poker_votes UNIQUE (story_id, user_id)
);

-- ── Triggers ───────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'intake_forms','intake_form_fields','intake_form_submissions','intake_form_submission_data',
    'client_portal_configs','client_portal_sections','client_portal_guests',
    'recurring_task_templates','recurring_task_schedules','recurring_task_instances',
    'calendar_user_settings','calendar_event_overrides',
    'raci_matrices','raci_rows','raci_assignments',
    'skill_categories','skill_catalog','member_skills','skill_requirements',
    'vendors','procurement_plans','purchase_requests','purchase_orders','purchase_order_lines',
    'contracts','contract_milestones','invoices','vendor_ratings',
    'timesheets','timesheet_approval_settings','timesheet_approvals',
    'project_baselines','baseline_snapshots',
    'planning_poker_sessions','planning_poker_stories','planning_poker_votes'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_pmis_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS (project-scoped pattern) ─────────────────────────────────────────────

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'intake_forms','recurring_task_templates','raci_matrices','procurement_plans',
    'purchase_requests','purchase_orders','contracts','project_baselines',
    'planning_poker_sessions','client_portal_configs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS policy_%s_project ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY policy_%s_project ON public.%I FOR ALL TO authenticated '
      || 'USING (EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = %I.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE)) '
      || 'WITH CHECK (EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = %I.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE))',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

ALTER TABLE public.intake_form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_intake_form_fields ON public.intake_form_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.intake_forms f JOIN public.user_projects up ON up.project_id = f.project_id WHERE f.id = intake_form_fields.form_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE AND f.project_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.intake_forms f WHERE f.id = intake_form_fields.form_id AND f.project_id IS NULL AND public.is_user_pmo_admin(auth.uid())));

ALTER TABLE public.calendar_user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_calendar_user_settings ON public.calendar_user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.calendar_event_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_calendar_event_overrides ON public.calendar_event_overrides FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid())) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_timesheets ON public.timesheets FOR ALL TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = timesheets.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE));

ALTER TABLE public.timesheet_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_timesheet_approvals ON public.timesheet_approvals FOR ALL TO authenticated
  USING (approver_user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_skill_categories ON public.skill_categories FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_skill_catalog ON public.skill_catalog FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_vendors ON public.vendors FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));

ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_member_skills ON public.member_skills FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('intake_forms', 'Public intake form definitions (GAP-06)', false, true),
  ('intake_form_fields', 'Fields per intake form (GAP-06)', false, true),
  ('intake_form_submissions', 'External form submissions (GAP-06)', false, true),
  ('intake_form_submission_data', 'Field values per submission (GAP-06)', false, true),
  ('client_portal_configs', 'Per-project client portal settings (GAP-07)', false, true),
  ('client_portal_sections', 'Visible sections per client portal (GAP-07)', false, true),
  ('client_portal_guests', 'Guest access tokens for client portal (GAP-07)', false, true),
  ('client_portal_sessions', 'Client portal access session log (GAP-07)', false, true),
  ('recurring_task_templates', 'Recurring task definitions (GAP-08)', false, true),
  ('recurring_task_schedules', 'Schedule config for recurring tasks (GAP-08)', false, true),
  ('recurring_task_instances', 'Generated recurring task instances (GAP-08)', false, true),
  ('calendar_user_settings', 'User calendar preferences (GAP-09)', false, true),
  ('calendar_event_overrides', 'Manual calendar-only events (GAP-09)', false, true),
  ('raci_matrices', 'RACI matrix per project (GAP-10)', false, true),
  ('raci_rows', 'RACI deliverable rows (GAP-10)', false, true),
  ('raci_assignments', 'RACI R/A/C/I assignments (GAP-10)', false, true),
  ('skill_categories', 'Skill category groupings (GAP-11)', false, true),
  ('skill_catalog', 'Organisation skill catalog (GAP-11)', false, true),
  ('member_skills', 'Member skill competency levels (GAP-11)', false, true),
  ('skill_requirements', 'Required skills per task/role (GAP-11)', false, true),
  ('skill_endorsements', 'Peer skill endorsements (GAP-11)', false, true),
  ('vendors', 'Vendor register (GAP-12)', false, true),
  ('procurement_plans', 'Project procurement plans (GAP-12)', false, true),
  ('purchase_requests', 'Purchase requests (GAP-12)', false, true),
  ('purchase_orders', 'Purchase orders (GAP-12)', false, true),
  ('purchase_order_lines', 'PO line items (GAP-12)', false, true),
  ('contracts', 'Vendor contracts (GAP-12)', false, true),
  ('contract_milestones', 'Contract payment/delivery milestones (GAP-12)', false, true),
  ('invoices', 'Invoice tracking (GAP-12)', false, true),
  ('vendor_ratings', 'Vendor performance ratings (GAP-12)', false, true),
  ('timesheets', 'Weekly timesheet submission periods (GAP-13)', false, true),
  ('timesheet_approval_settings', 'Timesheet approval chain config (GAP-13)', false, true),
  ('timesheet_approvals', 'Timesheet approval decisions (GAP-13)', false, true),
  ('project_baselines', 'Approved project baselines (GAP-14)', false, true),
  ('baseline_snapshots', 'Periodic baseline snapshots for S-curves (GAP-14)', false, true),
  ('planning_poker_sessions', 'Sprint planning poker sessions (GAP-15)', false, true),
  ('planning_poker_stories', 'Stories estimated in poker session (GAP-15)', false, true),
  ('planning_poker_votes', 'Member votes per story (GAP-15)', false, true),
  ('planning_poker_participants', 'Session participants (GAP-15)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v644_pmis_gap_tables_tier2.sql completed'; END $$;
