-- ============================================================================
-- v1274: Ask Nidus data catalogue — tables, curated views, catalogue readers
-- PRD D5, D9, D16; plan SQL #3.
--
--   * public|sim.ai_catalogue_entities / ai_catalogue_fields — what Ask Nidus may query, with
--     friendly names, descriptions, flags and links. Read by the query runner through SECURITY
--     DEFINER readers; edited only by Admin RPCs (Admin SQL v237). No client write policies.
--   * public|sim.ai_v_* — one curated view per catalogued register, WITH (security_invoker = true)
--     so the caller's RLS on the underlying tables still applies (rule 42). Column names are the
--     same in both schemas, so one catalogue definition fits Platform and Simulator.
--     History rows (moved_to_history_at) and soft-deleted rows are excluded.
--   * public|sim.ai_catalogue_for_session() — catalogue for the caller's edition (D16), used to
--     build the agent's system prompt.
--   * public.ai_catalogue_entity(schema, entity) — internal reader for the query runner.
--
-- Parity note: the Simulator has no project resource register, so sim gets task assignments
-- (from sim.tasks.assigned_to_user_id) but no resource-assignment view.
-- Prerequisites: v1272. Idempotent. Run v1275 (catalogue rows) next.
-- ============================================================================

-- ── 1. Catalogue tables ─────────────────────────────────────────────────────
DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$I.ai_catalogue_entities (
        entity_key        TEXT PRIMARY KEY CHECK (entity_key ~ '^[a-z][a-z0-9_]*$'),
        view_name         TEXT NOT NULL CHECK (view_name ~ '^ai_v_[a-z0-9_]+$'),
        label             TEXT NOT NULL,
        label_singular    TEXT NOT NULL,
        description       TEXT NOT NULL,
        display_field     TEXT NOT NULL,
        display_id_field  TEXT,
        route_template    TEXT,         -- e.g. /risks/{id}; {id} = row id
        editions          TEXT[] NOT NULL DEFAULT ARRAY['platform'],
        is_active         BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order        INTEGER NOT NULL DEFAULT 100,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by_admin  UUID
      )$f$, s);
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$I.ai_catalogue_fields (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_key       TEXT NOT NULL REFERENCES %1$I.ai_catalogue_entities(entity_key) ON DELETE CASCADE ON UPDATE CASCADE,
        field_key        TEXT NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
        label            TEXT NOT NULL,
        description      TEXT,
        data_type        TEXT NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'datetime', 'boolean', 'uuid')),
        is_filterable    BOOLEAN NOT NULL DEFAULT TRUE,
        is_groupable     BOOLEAN NOT NULL DEFAULT FALSE,
        is_summable      BOOLEAN NOT NULL DEFAULT FALSE,
        is_default       BOOLEAN NOT NULL DEFAULT FALSE,
        allowed_values   TEXT[],
        link_entity_key  TEXT REFERENCES %1$I.ai_catalogue_entities(entity_key) ON DELETE SET NULL ON UPDATE CASCADE,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order       INTEGER NOT NULL DEFAULT 100,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by_admin UUID,
        UNIQUE (entity_key, field_key)
      )$f$, s);
    EXECUTE format('ALTER TABLE %1$I.ai_catalogue_entities ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('ALTER TABLE %1$I.ai_catalogue_fields ENABLE ROW LEVEL SECURITY', s);
    EXECUTE format('DROP POLICY IF EXISTS ai_catalogue_entities_read ON %1$I.ai_catalogue_entities', s);
    EXECUTE format('CREATE POLICY ai_catalogue_entities_read ON %1$I.ai_catalogue_entities FOR SELECT TO authenticated USING (TRUE)', s);
    EXECUTE format('DROP POLICY IF EXISTS ai_catalogue_fields_read ON %1$I.ai_catalogue_fields', s);
    EXECUTE format('CREATE POLICY ai_catalogue_fields_read ON %1$I.ai_catalogue_fields FOR SELECT TO authenticated USING (TRUE)', s);
    EXECUTE format('GRANT SELECT ON %1$I.ai_catalogue_entities, %1$I.ai_catalogue_fields TO authenticated', s);
    EXECUTE format('GRANT ALL ON %1$I.ai_catalogue_entities, %1$I.ai_catalogue_fields TO service_role', s);
  END LOOP;
END $$;

-- ── 2. Curated views — public (Platform + Planner) ──────────────────────────
-- Person names: ids in this schema are users.id in most tables; a few store auth ids. The joins
-- below accept either so a name is shown whenever the caller may read that user row.

CREATE OR REPLACE VIEW public.ai_v_projects WITH (security_invoker = true) AS
SELECT p.id, p.id AS project_id, p.account_id,
       p.project_code AS display_id, p.project_name,
       ps.status_name AS status, p.health_status, p.priority, p.delivery_methodology AS methodology,
       p.planned_start_date, p.planned_end_date, p.actual_start_date, p.actual_end_date,
       p.percentage_complete, p.budget_amount, p.actual_cost, p.budget_currency,
       COALESCE(pm.full_name, pm.display_name) AS project_manager,
       COALESCE(p.is_archived, FALSE) AS is_archived, p.created_at, p.updated_at
  FROM public.projects p
  LEFT JOIN public.project_statuses ps ON ps.id = p.status_id
  LEFT JOIN public.users pm ON pm.id = p.project_manager_user_id OR pm.auth_user_id = p.project_manager_user_id
 WHERE COALESCE(p.is_deleted, FALSE) = FALSE AND p.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW public.ai_v_tasks WITH (security_invoker = true) AS
SELECT t.id, t.project_id, p.account_id, p.project_name,
       t.task_code AS display_id, t.task_name, t.wbs_code, ts.status_name AS status, t.priority,
       t.planned_start_date, t.planned_end_date, t.actual_start_date, t.actual_end_date, t.due_date,
       t.baseline_start_date, t.baseline_end_date,
       (t.planned_end_date - t.baseline_end_date) AS finish_variance_days,
       COALESCE(t.percentage_complete, 0) AS percentage_complete,
       t.estimated_hours, t.actual_hours,
       COALESCE(t.is_milestone, FALSE) AS is_milestone,
       COALESCE(t.is_critical_path, FALSE) AS is_critical,
       COALESCE(t.is_blocked, FALSE) AS is_blocked, t.slack_days,
       EXISTS (SELECT 1 FROM public.tasks c WHERE c.parent_task_id = t.id AND COALESCE(c.is_deleted, FALSE) = FALSE) AS is_summary,
       (t.planned_end_date < CURRENT_DATE AND COALESCE(t.percentage_complete, 0) < 100) AS is_late,
       COALESCE(u.full_name, u.display_name) AS assigned_to,
       t.task_description AS description, t.created_at, t.updated_at
  FROM public.tasks t
  JOIN public.projects p ON p.id = t.project_id
  LEFT JOIN public.task_statuses ts ON ts.id = t.status_id
  LEFT JOIN public.users u ON u.id = t.assigned_to_user_id OR u.auth_user_id = t.assigned_to_user_id
 WHERE COALESCE(t.is_deleted, FALSE) = FALSE AND t.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW public.ai_v_milestones WITH (security_invoker = true) AS
SELECT m.id, m.project_id, p.account_id, p.project_name,
       NULL::text AS display_id, m.milestone_name, m.status,
       m.target_date, m.forecast_date, m.actual_date,
       (COALESCE(m.forecast_date, m.actual_date) - m.target_date) AS slip_days,
       COALESCE(u.full_name, u.display_name) AS owner, m.description, m.created_at
  FROM public.milestones m
  JOIN public.projects p ON p.id = m.project_id
  LEFT JOIN public.users u ON u.id = m.owner_user_id OR u.auth_user_id = m.owner_user_id
 WHERE COALESCE(m.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.ai_v_risks WITH (security_invoker = true) AS
SELECT r.id, r.project_id, p.account_id, p.project_name,
       COALESCE(r.risk_identifier, r.risk_code) AS display_id, r.risk_title AS title,
       COALESCE(r.status_enum::text, r.status) AS status, r.risk_level AS level, r.risk_category AS category,
       r.probability, r.impact, r.risk_score,
       COALESCE(r.risk_owner_name, ou.full_name, ou.display_name) AS owner,
       COALESCE(r.response_category::text, r.response_strategy) AS response,
       r.identified_date, r.target_mitigation_date, r.next_review_date, r.proximity_date, COALESCE(r.closure_date, r.closed_date) AS closed_date,
       COALESCE(r.is_escalated, FALSE) AS is_escalated,
       r.risk_description AS description, r.cause_description, r.effect_description, r.created_at, r.updated_at
  FROM public.risks r
  JOIN public.projects p ON p.id = r.project_id
  LEFT JOIN public.users ou ON ou.id = COALESCE(r.risk_owner_id, r.risk_owner_user_id) OR ou.auth_user_id = COALESCE(r.risk_owner_id, r.risk_owner_user_id)
 WHERE COALESCE(r.is_deleted, FALSE) = FALSE AND r.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW public.ai_v_issues WITH (security_invoker = true) AS
SELECT i.id, i.project_id, p.account_id, p.project_name,
       COALESCE(i.issue_identifier, i.issue_code) AS display_id, i.issue_title AS title,
       i.status, i.issue_type, i.issue_category AS category, i.priority, i.severity,
       COALESCE(i.owner_name, ou.full_name, ou.display_name) AS owner,
       COALESCE(i.date_raised, i.created_at::date) AS date_raised, i.due_date,
       COALESCE(i.closure_date, i.resolution_date, i.closed_at::date) AS closed_date,
       i.cost_impact, i.schedule_impact_days, COALESCE(i.is_escalated, FALSE) AS is_escalated,
       i.issue_description AS description, i.created_at, i.updated_at
  FROM public.issues i
  JOIN public.projects p ON p.id = i.project_id
  LEFT JOIN public.users ou ON ou.id = COALESCE(i.owner_id, i.assigned_to_user_id) OR ou.auth_user_id = COALESCE(i.owner_id, i.assigned_to_user_id)
 WHERE COALESCE(i.is_deleted, FALSE) = FALSE AND i.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW public.ai_v_change_requests WITH (security_invoker = true) AS
SELECT c.id, c.project_id, p.account_id, p.project_name,
       c.change_reference AS display_id, c.change_title AS title, c.status, c.change_type, c.change_category AS category,
       c.priority, c.urgency, c.requestor_name, c.submission_date, c.approval_required_by_date,
       c.impact_summary, c.change_description AS description, c.created_at, c.updated_at
  FROM public.change_requests c
  JOIN public.projects p ON p.id = c.project_id
 WHERE COALESCE(c.is_deleted, FALSE) = FALSE AND c.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW public.ai_v_actions WITH (security_invoker = true) AS
SELECT e.id, d.project_id, p.account_id, p.project_name,
       e.entry_code AS display_id, LEFT(e.description, 200) AS title, e.status, e.priority,
       e.person_responsible_name AS owner, e.entry_date, e.target_date, e.completed_at,
       (e.target_date < CURRENT_DATE AND e.completed_at IS NULL AND COALESCE(lower(e.status), '') NOT IN ('closed', 'completed', 'done')) AS is_overdue,
       e.description, e.results, e.created_at
  FROM public.daily_log_entries e
  JOIN public.daily_logs d ON d.id = e.daily_log_id
  JOIN public.projects p ON p.id = d.project_id
 WHERE lower(e.entry_type) = 'action' AND COALESCE(e.is_deleted, FALSE) = FALSE AND COALESCE(e.is_private, FALSE) = FALSE
   AND COALESCE(d.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.ai_v_decisions WITH (security_invoker = true) AS
SELECT dc.id, dc.project_id, p.account_id, p.project_name,
       dc.decision_reference AS display_id, dc.decision_title AS title, dc.status, dc.category, dc.priority,
       dc.decision_date, dc.decided_by_name AS decided_by, dc.review_date,
       dc.rationale, dc.impact, dc.description, dc.created_at
  FROM public.project_decisions dc
  JOIN public.projects p ON p.id = dc.project_id
 WHERE COALESCE(dc.is_deleted, FALSE) = FALSE AND dc.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW public.ai_v_lessons WITH (security_invoker = true) AS
SELECT l.id, l.project_id, p.account_id, p.project_name,
       l.lesson_reference AS display_id, l.lesson_title AS title, l.status::text AS status, l.priority::text AS priority,
       l.lesson_category AS category, l.lesson_type, l.effect_type::text AS effect, l.impact_level,
       COALESCE(l.project_stage, l.project_phase) AS stage, l.lesson_date,
       COALESCE(l.is_corporate_lesson, FALSE) AS is_corporate,
       COALESCE(l.what_happened, l.event_description, l.situation_description) AS description,
       l.recommendations AS recommendation, l.created_at
  FROM public.lessons_learned l
  LEFT JOIN public.projects p ON p.id = l.project_id
 WHERE COALESCE(l.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.ai_v_stakeholders WITH (security_invoker = true) AS
SELECT s.id, s.project_id, COALESCE(s.account_id, p.account_id) AS account_id, p.project_name,
       s.stakeholder_reference AS display_id, s.stakeholder_name AS name, s.stakeholder_title AS job_title,
       s.stakeholder_organization AS organisation, s.stakeholder_type AS stakeholder_type,
       s.stakeholder_category AS category, s.stakeholder_role AS role, s.interest_level,
       COALESCE(s.is_decision_maker, FALSE) AS is_decision_maker, COALESCE(s.is_influencer, FALSE) AS is_influencer,
       COALESCE(s.is_powerful, FALSE) AS is_powerful, s.stakeholder_status AS status, s.expectations, s.created_at
  FROM public.stakeholders s
  LEFT JOIN public.projects p ON p.id = s.project_id
 WHERE COALESCE(s.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.ai_v_budget_summary WITH (security_invoker = true) AS
SELECT p.id, p.id AS project_id, p.account_id, p.project_name,
       p.project_code AS display_id, p.budget_currency AS currency,
       p.budget_amount, b.planned_total, b.committed_total, b.forecast_total,
       COALESCE(a.actuals_total, p.actual_cost) AS actual_cost,
       (p.budget_amount - COALESCE(a.actuals_total, p.actual_cost)) AS remaining_budget,
       CASE WHEN COALESCE(p.budget_amount, 0) > 0
            THEN ROUND(COALESCE(a.actuals_total, p.actual_cost, 0) * 100 / p.budget_amount, 1) END AS percent_spent,
       (COALESCE(b.forecast_total, 0) - COALESCE(p.budget_amount, 0)) AS forecast_variance
  FROM public.projects p
  LEFT JOIN LATERAL (SELECT SUM(pb.planned_amount) AS planned_total, SUM(pb.committed_amount) AS committed_total,
                            SUM(pb.forecast_amount) AS forecast_total
                       FROM public.project_budgets pb WHERE pb.project_id = p.id) b ON TRUE
  LEFT JOIN LATERAL (SELECT SUM(ca.amount) AS actuals_total
                       FROM public.cost_actuals ca WHERE ca.project_id = p.id AND COALESCE(ca.is_deleted, FALSE) = FALSE) a ON TRUE
 WHERE COALESCE(p.is_deleted, FALSE) = FALSE AND p.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW public.ai_v_resource_assignments WITH (security_invoker = true) AS
SELECT ra.id, COALESCE(tp.id, pp.id) AS project_id, COALESCE(r.organization_id, tp.account_id, pp.account_id) AS account_id,
       COALESCE(tp.project_name, pp.project_name) AS project_name,
       r.resource_code AS display_id, r.resource_name, r.resource_type, r.resource_category,
       t.task_name, ra.assignment_type, ra.role_in_assignment AS role,
       ra.assignment_start_date AS start_date, ra.assignment_end_date AS end_date,
       ra.allocation_percentage, ra.allocated_hours_per_day, ra.total_allocated_hours, ra.actual_hours_worked,
       ra.assignment_status AS status, r.default_capacity_hours_per_day AS capacity_hours_per_day, ra.created_at
  FROM public.resource_assignments ra
  JOIN public.resources r ON r.id = ra.resource_id
  LEFT JOIN public.tasks t ON ra.assignment_type = 'task' AND t.id = ra.assignment_target_id
  LEFT JOIN public.projects tp ON tp.id = t.project_id
  LEFT JOIN public.projects pp ON ra.assignment_type = 'project' AND pp.id = ra.assignment_target_id
 WHERE COALESCE(ra.is_deleted, FALSE) = FALSE AND COALESCE(r.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.ai_v_task_assignments WITH (security_invoker = true) AS
SELECT x.id, t.project_id, p.account_id, p.project_name,
       t.task_code AS display_id, t.task_name, COALESCE(u.full_name, u.display_name, u.email) AS person,
       t.planned_start_date, t.planned_end_date, COALESCE(t.percentage_complete, 0) AS percentage_complete,
       t.estimated_hours, (t.planned_end_date < CURRENT_DATE AND COALESCE(t.percentage_complete, 0) < 100) AS is_late
  FROM (
    SELECT ta.id, ta.task_id, ta.user_id FROM public.task_assignments ta
     WHERE COALESCE(ta.is_deleted, FALSE) = FALSE AND COALESCE(ta.is_active, TRUE)
    UNION ALL
    SELECT t2.id, t2.id, t2.assigned_to_user_id FROM public.tasks t2
     WHERE t2.assigned_to_user_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.task_assignments ta2 WHERE ta2.task_id = t2.id AND ta2.user_id = t2.assigned_to_user_id
                         AND COALESCE(ta2.is_deleted, FALSE) = FALSE)
  ) x
  JOIN public.tasks t ON t.id = x.task_id AND COALESCE(t.is_deleted, FALSE) = FALSE AND t.moved_to_history_at IS NULL
  JOIN public.projects p ON p.id = t.project_id
  LEFT JOIN public.users u ON u.id = x.user_id OR u.auth_user_id = x.user_id;

CREATE OR REPLACE VIEW public.ai_v_task_dependencies WITH (security_invoker = true) AS
SELECT d.id, s.project_id, p.account_id, p.project_name,
       NULL::text AS display_id,
       pr.task_name AS predecessor_task, s.task_name AS successor_task,
       COALESCE(d.dependency_type, 'FS') AS dependency_type, COALESCE(d.lag_days, 0) AS lag_days,
       COALESCE(d.is_critical, FALSE) AS is_critical, d.predecessor_task_id, d.successor_task_id
  FROM public.task_dependencies d
  JOIN public.tasks pr ON pr.id = d.predecessor_task_id
  JOIN public.tasks s  ON s.id = d.successor_task_id
  JOIN public.projects p ON p.id = s.project_id
 WHERE COALESCE(d.is_deleted, FALSE) = FALSE AND COALESCE(d.is_active, TRUE);

CREATE OR REPLACE VIEW public.ai_v_baselines WITH (security_invoker = true) AS
SELECT b.id, b.project_id, p.account_id, p.project_name,
       ('BL' || COALESCE(b.baseline_number::text, '?')) AS display_id, b.baseline_name, b.baseline_number,
       b.baseline_type, b.baseline_date, COALESCE(b.is_active_baseline, FALSE) AS is_active_baseline,
       (b.approved_by IS NOT NULL) AS is_approved, b.approval_date, b.reason, b.change_request_ref, b.created_at
  FROM public.project_baselines b
  JOIN public.projects p ON p.id = b.project_id
 WHERE COALESCE(b.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.ai_v_delays WITH (security_invoker = true) AS
SELECT dl.id, dl.project_id, COALESCE(dl.organisation_id, p.account_id) AS account_id, p.project_name,
       dl.delay_reference AS display_id, dl.title, dl.status, dl.severity, dl.delay_category AS category,
       dl.delay_cause AS cause, dl.responsible_party, dl.impact_schedule_days, dl.impact_cost,
       dl.identified_date, dl.revised_forecast_date, dl.resolution_target_date, dl.resolved_date,
       dl.description, dl.resolution_plan, dl.created_at
  FROM public.project_delays dl
  JOIN public.projects p ON p.id = dl.project_id
 WHERE COALESCE(dl.is_deleted, FALSE) = FALSE AND NOT COALESCE(dl.is_draft, FALSE);

-- ── 3. Curated views — sim (Simulator practice data) ────────────────────────
CREATE OR REPLACE VIEW sim.ai_v_projects WITH (security_invoker = true) AS
SELECT p.id, p.id AS project_id, NULL::uuid AS account_id,
       COALESCE(p.project_code, p.practice_code) AS display_id, p.project_name,
       COALESCE(pps.status_name, p.project_status) AS status, p.health_status, p.priority,
       p.delivery_methodology_track AS methodology,
       COALESCE(p.planned_start_date, p.start_date) AS planned_start_date, p.planned_end_date, p.actual_start_date, p.actual_end_date,
       p.percentage_complete, p.budget_amount, p.actual_cost, p.budget_currency,
       COALESCE(pm.full_name, pm.display_name) AS project_manager,
       COALESCE(p.is_archived, FALSE) AS is_archived, p.created_at, p.updated_at
  FROM sim.practice_projects p
  LEFT JOIN sim.practice_project_statuses pps ON pps.id = p.status_id
  LEFT JOIN public.users pm ON pm.id = p.project_manager_user_id OR pm.auth_user_id = p.project_manager_user_id
 WHERE COALESCE(p.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_tasks WITH (security_invoker = true) AS
SELECT t.id, t.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       t.task_code AS display_id, t.task_name, t.wbs_code, ts.status_name AS status, t.priority,
       t.planned_start_date, t.planned_end_date, t.actual_start_date, t.actual_end_date, t.due_date,
       t.baseline_start_date, t.baseline_end_date,
       (t.planned_end_date - t.baseline_end_date) AS finish_variance_days,
       COALESCE(t.percentage_complete, 0) AS percentage_complete,
       t.estimated_hours, t.actual_hours,
       COALESCE(t.is_milestone, FALSE) AS is_milestone,
       COALESCE(t.is_critical_path, FALSE) AS is_critical,
       COALESCE(t.is_blocked, FALSE) AS is_blocked, t.slack_days,
       EXISTS (SELECT 1 FROM sim.tasks c WHERE c.parent_task_id = t.id AND COALESCE(c.is_deleted, FALSE) = FALSE) AS is_summary,
       (t.planned_end_date < CURRENT_DATE AND COALESCE(t.percentage_complete, 0) < 100) AS is_late,
       COALESCE(u.full_name, u.display_name) AS assigned_to,
       t.task_description AS description, t.created_at, t.updated_at
  FROM sim.tasks t
  JOIN sim.practice_projects p ON p.id = t.practice_project_id
  LEFT JOIN public.task_statuses ts ON ts.id = t.status_id
  LEFT JOIN public.users u ON u.id = t.assigned_to_user_id OR u.auth_user_id = t.assigned_to_user_id
 WHERE COALESCE(t.is_deleted, FALSE) = FALSE AND t.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW sim.ai_v_milestones WITH (security_invoker = true) AS
SELECT m.id, m.project_id, NULL::uuid AS account_id, p.project_name,
       NULL::text AS display_id, m.milestone_name, m.status,
       m.target_date, m.forecast_date, m.actual_date,
       (COALESCE(m.forecast_date, m.actual_date) - m.target_date) AS slip_days,
       COALESCE(u.full_name, u.display_name) AS owner, m.description, m.created_at
  FROM sim.milestones m
  JOIN sim.practice_projects p ON p.id = m.project_id
  LEFT JOIN public.users u ON u.id = m.owner_user_id OR u.auth_user_id = m.owner_user_id
 WHERE COALESCE(m.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_risks WITH (security_invoker = true) AS
SELECT r.id, r.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       r.risk_code AS display_id, r.risk_title AS title, r.status, r.risk_level AS level, r.risk_category AS category,
       r.probability, r.impact, r.risk_score,
       COALESCE(ou.full_name, ou.display_name) AS owner, r.response_strategy AS response,
       r.identified_date, r.target_mitigation_date, r.next_review_date, NULL::date AS proximity_date, r.closed_date,
       FALSE AS is_escalated,
       r.risk_description AS description, NULL::text AS cause_description, NULL::text AS effect_description, r.created_at, r.updated_at
  FROM sim.practice_risks r
  JOIN sim.practice_projects p ON p.id = r.practice_project_id
  LEFT JOIN public.users ou ON ou.id = r.risk_owner_user_id OR ou.auth_user_id = r.risk_owner_user_id
 WHERE COALESCE(r.is_deleted, FALSE) = FALSE AND r.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW sim.ai_v_issues WITH (security_invoker = true) AS
SELECT i.id, i.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       COALESCE(i.issue_identifier, i.issue_code) AS display_id, i.issue_title AS title,
       i.status, i.issue_type, i.issue_category AS category, i.priority, i.severity,
       COALESCE(ou.full_name, ou.display_name) AS owner,
       i.created_at::date AS date_raised, i.due_date,
       COALESCE(i.closure_date, i.closed_at::date) AS closed_date,
       i.cost_impact, i.schedule_impact_days, FALSE AS is_escalated,
       i.issue_description AS description, i.created_at, i.updated_at
  FROM sim.practice_issues i
  JOIN sim.practice_projects p ON p.id = i.practice_project_id
  LEFT JOIN public.users ou ON ou.id = i.assigned_to_user_id OR ou.auth_user_id = i.assigned_to_user_id
 WHERE COALESCE(i.is_deleted, FALSE) = FALSE AND i.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW sim.ai_v_change_requests WITH (security_invoker = true) AS
SELECT c.id, c.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       c.change_reference AS display_id, c.change_title AS title, c.status, c.change_type, c.change_category AS category,
       c.priority, c.urgency, c.requestor_name, c.submission_date, c.approval_required_by_date,
       c.impact_summary, c.change_description AS description, c.created_at, c.updated_at
  FROM sim.practice_change_requests c
  JOIN sim.practice_projects p ON p.id = c.practice_project_id
 WHERE COALESCE(c.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_actions WITH (security_invoker = true) AS
SELECT e.id, d.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       NULL::text AS display_id, LEFT(e.description, 200) AS title, e.status, e.priority,
       e.person_responsible_name AS owner, e.entry_date, e.target_date, NULL::timestamptz AS completed_at,
       (e.target_date < CURRENT_DATE AND COALESCE(lower(e.status), '') NOT IN ('closed', 'completed', 'done')) AS is_overdue,
       e.description, e.results, e.created_at
  FROM sim.practice_daily_log_entries e
  JOIN sim.practice_daily_logs d ON d.id = e.practice_daily_log_id
  JOIN sim.practice_projects p ON p.id = d.practice_project_id
 WHERE lower(e.entry_type) = 'action' AND COALESCE(d.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_decisions WITH (security_invoker = true) AS
SELECT dc.id, dc.project_id, NULL::uuid AS account_id, p.project_name,
       dc.decision_reference AS display_id, dc.decision_title AS title, dc.status, dc.category, dc.priority,
       dc.decision_date, dc.decided_by_name AS decided_by, dc.review_date,
       dc.rationale, dc.impact, dc.description, dc.created_at
  FROM sim.project_decisions dc
  JOIN sim.practice_projects p ON p.id = dc.project_id
 WHERE COALESCE(dc.is_deleted, FALSE) = FALSE AND dc.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW sim.ai_v_lessons WITH (security_invoker = true) AS
SELECT l.id, lg.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       l.lesson_reference AS display_id, l.lesson_title AS title, l.status, l.priority,
       l.lesson_category AS category, NULL::text AS lesson_type, l.effect_type AS effect, NULL::text AS impact_level,
       NULL::text AS stage, l.identified_date AS lesson_date, (l.lesson_scope = 'corporate') AS is_corporate,
       l.lesson_description AS description, NULL::text AS recommendation, l.created_at
  FROM sim.practice_lesson_entries l
  JOIN sim.practice_lessons_log lg ON lg.id = l.practice_lessons_log_id
  LEFT JOIN sim.practice_projects p ON p.id = lg.practice_project_id
 WHERE COALESCE(lg.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_stakeholders WITH (security_invoker = true) AS
SELECT s.id, s.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       s.stakeholder_reference AS display_id, s.stakeholder_name AS name, s.stakeholder_title AS job_title,
       s.stakeholder_organization AS organisation, s.stakeholder_type AS stakeholder_type,
       s.stakeholder_category AS category, s.stakeholder_role AS role, s.interest_level,
       COALESCE(s.is_decision_maker, FALSE) AS is_decision_maker, COALESCE(s.is_influencer, FALSE) AS is_influencer,
       COALESCE(s.is_powerful, FALSE) AS is_powerful, s.stakeholder_status AS status, s.expectations, s.created_at
  FROM sim.practice_stakeholder_register s
  LEFT JOIN sim.practice_projects p ON p.id = s.practice_project_id
 WHERE COALESCE(s.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_budget_summary WITH (security_invoker = true) AS
SELECT p.id, p.id AS project_id, NULL::uuid AS account_id, p.project_name,
       COALESCE(p.project_code, p.practice_code) AS display_id, p.budget_currency AS currency,
       p.budget_amount, NULL::numeric AS planned_total, NULL::numeric AS committed_total, NULL::numeric AS forecast_total,
       COALESCE(a.actuals_total, p.actual_cost) AS actual_cost,
       (p.budget_amount - COALESCE(a.actuals_total, p.actual_cost)) AS remaining_budget,
       CASE WHEN COALESCE(p.budget_amount, 0) > 0
            THEN ROUND(COALESCE(a.actuals_total, p.actual_cost, 0) * 100 / p.budget_amount, 1) END AS percent_spent,
       NULL::numeric AS forecast_variance
  FROM sim.practice_projects p
  LEFT JOIN LATERAL (SELECT SUM(ca.amount) AS actuals_total
                       FROM sim.cost_actuals ca WHERE ca.project_id = p.id AND COALESCE(ca.is_deleted, FALSE) = FALSE) a ON TRUE
 WHERE COALESCE(p.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_task_assignments WITH (security_invoker = true) AS
SELECT t.id, t.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       t.task_code AS display_id, t.task_name, COALESCE(u.full_name, u.display_name, u.email) AS person,
       t.planned_start_date, t.planned_end_date, COALESCE(t.percentage_complete, 0) AS percentage_complete,
       t.estimated_hours, (t.planned_end_date < CURRENT_DATE AND COALESCE(t.percentage_complete, 0) < 100) AS is_late
  FROM sim.tasks t
  JOIN sim.practice_projects p ON p.id = t.practice_project_id
  LEFT JOIN public.users u ON u.id = t.assigned_to_user_id OR u.auth_user_id = t.assigned_to_user_id
 WHERE t.assigned_to_user_id IS NOT NULL AND COALESCE(t.is_deleted, FALSE) = FALSE AND t.moved_to_history_at IS NULL;

CREATE OR REPLACE VIEW sim.ai_v_task_dependencies WITH (security_invoker = true) AS
SELECT d.id, s.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       NULL::text AS display_id,
       pr.task_name AS predecessor_task, s.task_name AS successor_task,
       COALESCE(d.dependency_type, 'FS') AS dependency_type, COALESCE(d.lag_days, 0) AS lag_days,
       COALESCE(d.is_critical, FALSE) AS is_critical, d.predecessor_task_id, d.successor_task_id
  FROM sim.task_dependencies d
  JOIN sim.tasks pr ON pr.id = d.predecessor_task_id
  JOIN sim.tasks s  ON s.id = d.successor_task_id
  JOIN sim.practice_projects p ON p.id = s.practice_project_id
 WHERE COALESCE(d.is_deleted, FALSE) = FALSE AND COALESCE(d.is_active, TRUE);

CREATE OR REPLACE VIEW sim.ai_v_baselines WITH (security_invoker = true) AS
SELECT b.id, b.practice_project_id AS project_id, NULL::uuid AS account_id, p.project_name,
       ('BL' || COALESCE(b.baseline_number::text, '?')) AS display_id, b.baseline_name, b.baseline_number,
       b.baseline_type, b.baseline_date, COALESCE(b.is_active_baseline, FALSE) AS is_active_baseline,
       (b.approved_by IS NOT NULL) AS is_approved, b.approval_date, b.reason, b.change_request_ref, b.created_at
  FROM sim.project_baselines b
  JOIN sim.practice_projects p ON p.id = b.practice_project_id
 WHERE COALESCE(b.is_deleted, FALSE) = FALSE;

CREATE OR REPLACE VIEW sim.ai_v_delays WITH (security_invoker = true) AS
SELECT dl.id, dl.practice_project_id AS project_id, dl.organisation_id AS account_id, p.project_name,
       dl.delay_reference AS display_id, dl.title, dl.status, dl.severity, dl.delay_category AS category,
       dl.delay_cause AS cause, dl.responsible_party, dl.impact_schedule_days, dl.impact_cost,
       dl.identified_date, dl.revised_forecast_date, dl.resolution_target_date, dl.resolved_date,
       dl.description, dl.resolution_plan, dl.created_at
  FROM sim.project_delays dl
  JOIN sim.practice_projects p ON p.id = dl.practice_project_id
 WHERE COALESCE(dl.is_deleted, FALSE) = FALSE AND NOT COALESCE(dl.is_draft, FALSE);

DO $$
DECLARE v TEXT;
BEGIN
  FOR v IN SELECT n.nspname || '.' || c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'v' AND n.nspname IN ('public', 'sim') AND c.relname LIKE 'ai\_v\_%' LOOP
    EXECUTE format('GRANT SELECT ON %s TO authenticated, service_role', v);
  END LOOP;
END $$;

-- ── 4. Catalogue readers ────────────────────────────────────────────────────
-- Internal: one entity with its active fields, for the query runner. SECURITY DEFINER so the
-- planner wall and RLS on the catalogue tables never hide the catalogue from the runner.
CREATE OR REPLACE FUNCTION public.ai_catalogue_entity(p_schema TEXT, p_entity TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE v JSONB;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'AIQ: unknown schema'; END IF;
  EXECUTE format($q$
    SELECT to_jsonb(e) || jsonb_build_object('fields', COALESCE((
             SELECT jsonb_agg(to_jsonb(f) ORDER BY f.sort_order, f.field_key)
               FROM %1$I.ai_catalogue_fields f WHERE f.entity_key = e.entity_key AND f.is_active), '[]'::jsonb))
      FROM %1$I.ai_catalogue_entities e WHERE e.entity_key = $1 AND e.is_active
  $q$, p_schema) INTO v USING p_entity;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.ai_catalogue_entity(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_catalogue_entity(TEXT, TEXT) TO authenticated, service_role;

-- Catalogue for the caller's edition (D16): planner accounts only see planner entities.
CREATE OR REPLACE FUNCTION public.ai_catalogue_for(p_schema TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_edition TEXT := COALESCE(public.auth_user_account_edition(), 'platform');
  v JSONB;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'AIQ: unknown schema'; END IF;
  IF p_schema = 'sim' THEN v_edition := 'platform'; END IF;
  EXECUTE format($q$
    SELECT COALESCE(jsonb_agg(
             jsonb_build_object('entity', e.entity_key, 'label', e.label, 'description', e.description,
                                'display_field', e.display_field, 'display_id_field', e.display_id_field,
                                'route_template', e.route_template,
                                'fields', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                                             'field', f.field_key, 'label', f.label, 'type', f.data_type,
                                             'description', f.description, 'filter', f.is_filterable,
                                             'group', f.is_groupable, 'sum', f.is_summable, 'default', f.is_default,
                                             'values', f.allowed_values, 'link', f.link_entity_key)
                                           ORDER BY f.sort_order, f.field_key)
                                      FROM %1$I.ai_catalogue_fields f WHERE f.entity_key = e.entity_key AND f.is_active), '[]'::jsonb))
             ORDER BY e.sort_order, e.entity_key), '[]'::jsonb)
      FROM %1$I.ai_catalogue_entities e
     WHERE e.is_active AND $1 = ANY (e.editions)
  $q$, p_schema) INTO v USING v_edition;
  RETURN jsonb_build_object('edition', v_edition, 'schema', p_schema, 'entities', v);
END;
$$;
REVOKE ALL ON FUNCTION public.ai_catalogue_for(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_catalogue_for(TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ai_catalogue_for_session() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT public.ai_catalogue_for('public'); $$;
CREATE OR REPLACE FUNCTION sim.ai_catalogue_for_session() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = sim, public AS $$ SELECT public.ai_catalogue_for('sim'); $$;
GRANT EXECUTE ON FUNCTION public.ai_catalogue_for_session() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.ai_catalogue_for_session() TO authenticated, service_role;

-- ── 5. Register tables ──────────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('ai_catalogue_entities',     'Ask Nidus data catalogue: queryable registers and their curated views (v1274)', true, true),
  ('ai_catalogue_fields',       'Ask Nidus data catalogue: fields per register with filter/group/sum flags (v1274)', true, true),
  ('sim.ai_catalogue_entities', 'Simulator Ask Nidus data catalogue: queryable registers (v1274)', true, true),
  ('sim.ai_catalogue_fields',   'Simulator Ask Nidus data catalogue: fields per register (v1274)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1274_ai_catalogue.sql completed — run v1275_ai_catalogue_seed.sql next'; END $$;
