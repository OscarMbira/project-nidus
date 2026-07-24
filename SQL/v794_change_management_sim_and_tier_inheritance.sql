-- =============================================================================
-- v794: Change Management — Simulator schema port + tier-inheritance screen
-- Plan: projectplan/v792_change_management_tier_inheritance_plan.md
-- Prerequisites: v31 (public change_*), v229-style practice_projects, v517 (module change),
--                v788/v789 (system_screens pattern)
-- Finding: Simulator ChangeManagement.jsx was a public-schema clone (dead/unrouted).
-- Note: SQL version is v794 (v792 = business case SQL; v793 reserved for work package plan).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) practice_change_board
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_change_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  organization_id UUID,
  board_name VARCHAR(200) NOT NULL,
  board_description TEXT,
  board_level VARCHAR(50) DEFAULT 'project',
  meeting_frequency VARCHAR(50),
  quorum_required INTEGER DEFAULT 3,
  approval_threshold_percentage DECIMAL(5,2) DEFAULT 50.00,
  cost_threshold_low DECIMAL(15,2),
  cost_threshold_high DECIMAL(15,2),
  schedule_threshold_days INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  established_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  -- user_id = sim.users.id (via sim.get_current_user_id()), not auth.uid()
  user_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_change_board_project
  ON sim.practice_change_board(practice_project_id) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 2) practice_change_board_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_change_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES sim.practice_change_board(id) ON DELETE CASCADE,
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role VARCHAR(100),
  authority_level VARCHAR(50) DEFAULT 'member',
  can_approve_changes BOOLEAN DEFAULT TRUE,
  approval_limit_amount DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'active',
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  removal_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL,
  CONSTRAINT practice_change_board_members_unique UNIQUE (board_id, member_user_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_change_board_members_board
  ON sim.practice_change_board_members(board_id) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 3) practice_change_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  change_board_id UUID REFERENCES sim.practice_change_board(id) ON DELETE SET NULL,
  change_reference VARCHAR(100),
  change_title VARCHAR(200) NOT NULL,
  change_description TEXT NOT NULL,
  change_category VARCHAR(100),
  change_type VARCHAR(50),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requestor_name VARCHAR(200),
  requestor_organization VARCHAR(200),
  reason_for_change TEXT NOT NULL,
  current_situation TEXT,
  proposed_solution TEXT NOT NULL,
  alternative_solutions TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  urgency VARCHAR(50),
  business_criticality VARCHAR(50),
  status VARCHAR(50) DEFAULT 'submitted',
  status_reason TEXT,
  current_approver_user_id UUID REFERENCES auth.users(id),
  approval_required_by_date DATE,
  related_task_ids UUID[],
  related_risk_ids UUID[],
  related_issue_ids UUID[],
  related_change_ids UUID[],
  attachment_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_practice_change_requests_reference_unique
  ON sim.practice_change_requests(change_reference)
  WHERE is_deleted = FALSE AND change_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practice_change_requests_project
  ON sim.practice_change_requests(practice_project_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_practice_change_requests_status
  ON sim.practice_change_requests(status) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 4) practice_change_assessments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_change_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES sim.practice_change_requests(id) ON DELETE CASCADE,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  assessment_reference VARCHAR(100),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assessed_by UUID REFERENCES auth.users(id),
  impact_summary TEXT,
  impact_level VARCHAR(50) DEFAULT 'medium',
  schedule_impact_description TEXT,
  schedule_impact_days INTEGER DEFAULT 0,
  schedule_impact_level VARCHAR(50),
  affected_milestones TEXT[],
  new_completion_date DATE,
  cost_impact_description TEXT,
  cost_impact_amount DECIMAL(15,2) DEFAULT 0,
  cost_impact_level VARCHAR(50),
  cost_breakdown TEXT,
  funding_source VARCHAR(200),
  scope_impact_description TEXT,
  scope_impact_level VARCHAR(50),
  scope_baseline_affected BOOLEAN DEFAULT FALSE,
  new_deliverables TEXT[],
  removed_deliverables TEXT[],
  quality_impact_description TEXT,
  quality_impact_level VARCHAR(50),
  quality_criteria_affected TEXT[],
  resource_impact_description TEXT,
  resource_impact_level VARCHAR(50),
  additional_resources_required TEXT,
  resource_hours_required DECIMAL(10,2),
  risk_impact_description TEXT,
  new_risks_introduced TEXT[],
  existing_risks_affected TEXT[],
  risk_mitigation_required BOOLEAN DEFAULT FALSE,
  benefits_impact_description TEXT,
  benefits_impact_level VARCHAR(50),
  benefits_affected TEXT,
  stakeholder_impact_description TEXT,
  affected_stakeholders TEXT[],
  stakeholder_communication_required BOOLEAN DEFAULT FALSE,
  technical_impact_description TEXT,
  technical_complexity VARCHAR(50),
  technical_risks TEXT,
  dependencies_affected TEXT[],
  feasibility_assessment TEXT,
  feasibility_rating VARCHAR(50),
  constraints TEXT,
  recommendation VARCHAR(50),
  recommendation_rationale TEXT,
  conditions TEXT,
  estimated_effort_hours DECIMAL(10,2),
  estimated_duration_days INTEGER,
  implementation_complexity VARCHAR(50),
  assessment_document_url TEXT,
  supporting_documents_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_change_assessments_request
  ON sim.practice_change_assessments(change_request_id) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 5) practice_change_approvals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_change_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES sim.practice_change_requests(id) ON DELETE CASCADE,
  change_assessment_id UUID REFERENCES sim.practice_change_assessments(id) ON DELETE SET NULL,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  approval_reference VARCHAR(100),
  approval_level VARCHAR(50),
  approval_type VARCHAR(50),
  approver_user_id UUID REFERENCES auth.users(id),
  approver_role VARCHAR(100),
  delegated_from_user_id UUID REFERENCES auth.users(id),
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  decision VARCHAR(50) DEFAULT 'pending',
  decision_date DATE,
  decision_rationale TEXT,
  conditions TEXT,
  escalated BOOLEAN DEFAULT FALSE,
  escalated_to_user_id UUID REFERENCES auth.users(id),
  escalation_reason TEXT,
  requires_voting BOOLEAN DEFAULT FALSE,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  can_be_delegated BOOLEAN DEFAULT TRUE,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_date TIMESTAMPTZ,
  reminder_sent_count INTEGER DEFAULT 0,
  approval_document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_change_approvals_request
  ON sim.practice_change_approvals(change_request_id) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 6) practice_change_implementations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_change_implementations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES sim.practice_change_requests(id) ON DELETE CASCADE,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  implementation_reference VARCHAR(100),
  implementation_plan TEXT,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  implementation_owner_user_id UUID REFERENCES auth.users(id),
  team_members UUID[],
  status VARCHAR(50) DEFAULT 'planned',
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  verification_required BOOLEAN DEFAULT TRUE,
  verification_criteria TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verification_date DATE,
  verification_notes TEXT,
  rollback_plan TEXT,
  rollback_required BOOLEAN DEFAULT FALSE,
  rollback_executed BOOLEAN DEFAULT FALSE,
  rollback_date DATE,
  rollback_notes TEXT,
  lessons_learned TEXT,
  challenges_encountered TEXT,
  success_factors TEXT,
  implementation_document_url TEXT,
  test_results_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_change_implementations_request
  ON sim.practice_change_implementations(change_request_id) WHERE is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- 7) practice_change_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES sim.practice_change_requests(id) ON DELETE CASCADE,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  log_date TIMESTAMPTZ DEFAULT NOW(),
  log_type VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_role VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  comments TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  user_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_change_log_request
  ON sim.practice_change_log(change_request_id);

-- -----------------------------------------------------------------------------
-- RLS (owner-scoped, matches practice_quality_reviews pattern)
-- -----------------------------------------------------------------------------
ALTER TABLE sim.practice_change_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_change_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_change_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_change_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_change_implementations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_change_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'practice_change_board',
    'practice_change_board_members',
    'practice_change_requests',
    'practice_change_assessments',
    'practice_change_approvals',
    'practice_change_implementations',
    'practice_change_log'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_user_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR ALL TO authenticated
         USING (user_id = sim.get_current_user_id())
         WITH CHECK (user_id = sim.get_current_user_id())',
      t || '_user_access', t
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Registry
-- -----------------------------------------------------------------------------
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.practice_change_board', 'Simulator practice change boards', false, true),
  ('sim.practice_change_board_members', 'Simulator practice change board members', false, true),
  ('sim.practice_change_requests', 'Simulator practice change requests', false, true),
  ('sim.practice_change_assessments', 'Simulator practice change assessments', false, true),
  ('sim.practice_change_approvals', 'Simulator practice change approvals', false, true),
  ('sim.practice_change_implementations', 'Simulator practice change implementations', false, true),
  ('sim.practice_change_log', 'Simulator practice change audit log', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Screen identity: change_request (tier fields) — public + sim
-- -----------------------------------------------------------------------------
INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('change', 'change_request', 'Change request (tier fields)', 'change_request', '/platform/projects/:projectId/change-management', 2)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO sim.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM sim.system_modules m
JOIN (
  VALUES
    ('change', 'change_request', 'Change request (tier fields)', 'change_request', '/simulator/projects/:projectId/change-management', 2)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v794_change_management_sim_and_tier_inheritance.sql applied';
END $$;
