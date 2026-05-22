-- ============================================================================
-- v629 — Tasks seed data
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================
-- Purpose:
--   Seeds realistic task data across projects so the /platform/tasks page
--   shows a meaningful list of tasks in all statuses, priorities, and types.
--   Also ensures task_statuses are seeded if missing.
--
-- Idempotent:
--   Deletes prior rows tagged task_code LIKE 'SEED-v629-%' then re-inserts.
--
-- Prerequisites:
--   v06_task_management_tables.sql (task_statuses, tasks tables)
--   At least one row in public.projects and public.users
-- ============================================================================

-- ── 1. Seed task_statuses if not already present ─────────────────────────────

INSERT INTO public.task_statuses (
  status_code, status_name, status_description,
  status_color, status_icon, status_order,
  is_initial_status, is_final_status, is_active_status, is_system_status,
  is_active, is_deleted
)
VALUES
  ('todo',        'To Do',        'Task not yet started',
   '#6B7280', 'circle',          1, TRUE,  FALSE, FALSE, TRUE,  TRUE, FALSE),
  ('in_progress', 'In Progress',  'Task is actively being worked on',
   '#3B82F6', 'loader',          2, FALSE, FALSE, TRUE,  TRUE,  TRUE, FALSE),
  ('in_review',   'In Review',    'Task is awaiting review or approval',
   '#F59E0B', 'eye',             3, FALSE, FALSE, FALSE, TRUE,  TRUE, FALSE),
  ('blocked',     'Blocked',      'Task is blocked and cannot proceed',
   '#EF4444', 'alert-octagon',   4, FALSE, FALSE, FALSE, TRUE,  TRUE, FALSE),
  ('completed',   'Completed',    'Task has been completed successfully',
   '#10B981', 'check-circle',    5, FALSE, TRUE,  FALSE, TRUE,  TRUE, FALSE),
  ('cancelled',   'Cancelled',    'Task has been cancelled',
   '#DC2626', 'x-circle',        6, FALSE, TRUE,  FALSE, TRUE,  TRUE, FALSE)
ON CONFLICT (status_code) DO UPDATE SET
  status_name        = EXCLUDED.status_name,
  status_color       = EXCLUDED.status_color,
  status_order       = EXCLUDED.status_order,
  is_initial_status  = EXCLUDED.is_initial_status,
  is_final_status    = EXCLUDED.is_final_status,
  is_active_status   = EXCLUDED.is_active_status,
  updated_at         = NOW();

-- ── 2. Remove prior seed rows ─────────────────────────────────────────────────

DELETE FROM public.tasks WHERE task_code LIKE 'SEED-v629-%';

-- ── 3. Helper: resolve first available project and user ───────────────────────
-- All INSERTs below use subqueries so they work regardless of specific IDs.
-- Tasks are spread across up to 5 projects in round-robin style.

-- ── 4. Seed tasks ─────────────────────────────────────────────────────────────
-- 30 realistic tasks covering all statuses, priorities, and task types.

-- Status IDs resolved via status_code for portability.
-- project_id and assigned_to_user_id resolved dynamically.

WITH
  projects_list AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
    FROM public.projects
    WHERE is_deleted = FALSE
    LIMIT 5
  ),
  default_user AS (
    SELECT id FROM public.users WHERE is_deleted = FALSE ORDER BY created_at LIMIT 1
  ),
  p1 AS (SELECT id FROM projects_list WHERE rn = 1),
  p2 AS (SELECT COALESCE((SELECT id FROM projects_list WHERE rn = 2), (SELECT id FROM p1)) AS id),
  p3 AS (SELECT COALESCE((SELECT id FROM projects_list WHERE rn = 3), (SELECT id FROM p1)) AS id),
  p4 AS (SELECT COALESCE((SELECT id FROM projects_list WHERE rn = 4), (SELECT id FROM p1)) AS id),
  p5 AS (SELECT COALESCE((SELECT id FROM projects_list WHERE rn = 5), (SELECT id FROM p1)) AS id),
  todo_id        AS (SELECT id FROM public.task_statuses WHERE status_code = 'todo'        AND is_deleted = FALSE LIMIT 1),
  in_progress_id AS (SELECT id FROM public.task_statuses WHERE status_code = 'in_progress' AND is_deleted = FALSE LIMIT 1),
  in_review_id   AS (SELECT id FROM public.task_statuses WHERE status_code = 'in_review'   AND is_deleted = FALSE LIMIT 1),
  blocked_id     AS (SELECT id FROM public.task_statuses WHERE status_code = 'blocked'     AND is_deleted = FALSE LIMIT 1),
  completed_id   AS (SELECT id FROM public.task_statuses WHERE status_code = 'completed'   AND is_deleted = FALSE LIMIT 1),
  cancelled_id   AS (SELECT id FROM public.task_statuses WHERE status_code = 'cancelled'   AND is_deleted = FALSE LIMIT 1)

INSERT INTO public.tasks (
  task_code, task_name, task_description,
  project_id, task_type, priority, status_id,
  assigned_to_user_id, assigned_by_user_id,
  planned_start_date, planned_end_date, due_date,
  estimated_hours, actual_hours, percentage_complete,
  is_milestone, is_blocked, is_active, is_deleted,
  created_by
)
SELECT
  task_code, task_name, task_description,
  project_id, task_type, priority, status_id,
  uid, uid,
  planned_start, planned_end, due_date,
  est_hours, act_hours, pct,
  is_milestone, is_blocked, TRUE, FALSE,
  uid
FROM (
  VALUES
  -- ── TO DO ──────────────────────────────────────────────────────────────────
  ('SEED-v629-001',
   'Draft project kick-off agenda',
   'Prepare agenda for the project kick-off meeting including all stakeholder introductions and objective setting.',
   (SELECT id FROM p1),
   'task', 'high', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE, CURRENT_DATE + 5, CURRENT_DATE + 5,
   4.0, 0.0, 0,
   FALSE, FALSE),

  ('SEED-v629-002',
   'Define project scope statement',
   'Document the project scope, deliverables, exclusions, constraints, and assumptions.',
   (SELECT id FROM p1),
   'task', 'high', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE + 1, CURRENT_DATE + 7, CURRENT_DATE + 7,
   8.0, 0.0, 0,
   FALSE, FALSE),

  ('SEED-v629-003',
   'Identify and register project risks',
   'Conduct a risk identification workshop and populate the risk register.',
   (SELECT id FROM p2),
   'task', 'medium', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE + 2, CURRENT_DATE + 9, CURRENT_DATE + 9,
   6.0, 0.0, 0,
   FALSE, FALSE),

  ('SEED-v629-004',
   'Set up project collaboration workspace',
   'Configure shared folders, team chat channels, and document templates.',
   (SELECT id FROM p2),
   'task', 'low', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE, CURRENT_DATE + 3, CURRENT_DATE + 3,
   2.0, 0.0, 0,
   FALSE, FALSE),

  ('SEED-v629-005',
   'Prepare stakeholder engagement plan',
   'Map stakeholder interests and define engagement and communication approach.',
   (SELECT id FROM p3),
   'task', 'medium', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE + 3, CURRENT_DATE + 10, CURRENT_DATE + 10,
   5.0, 0.0, 0,
   FALSE, FALSE),

  ('SEED-v629-006',
   'Project kick-off milestone',
   'Formal project start — all pre-conditions met and team assembled.',
   (SELECT id FROM p1),
   'milestone', 'critical', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE + 7, CURRENT_DATE + 7, CURRENT_DATE + 7,
   0.0, 0.0, 0,
   TRUE, FALSE),

  -- ── IN PROGRESS ────────────────────────────────────────────────────────────
  ('SEED-v629-007',
   'Develop work breakdown structure',
   'Decompose project deliverables into manageable work packages and assign owners.',
   (SELECT id FROM p1),
   'task', 'high', (SELECT id FROM in_progress_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 3, CURRENT_DATE + 4, CURRENT_DATE + 4,
   12.0, 6.0, 50,
   FALSE, FALSE),

  ('SEED-v629-008',
   'Conduct requirements gathering sessions',
   'Run structured workshops with key stakeholders to elicit and document requirements.',
   (SELECT id FROM p2),
   'task', 'high', (SELECT id FROM in_progress_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 5, CURRENT_DATE + 2, CURRENT_DATE + 2,
   16.0, 10.0, 60,
   FALSE, FALSE),

  ('SEED-v629-009',
   'Build project schedule baseline',
   'Create detailed schedule in the planning tool, sequence tasks, assign resources.',
   (SELECT id FROM p1),
   'task', 'critical', (SELECT id FROM in_progress_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 2, CURRENT_DATE + 5, CURRENT_DATE + 5,
   20.0, 8.0, 40,
   FALSE, FALSE),

  ('SEED-v629-010',
   'Write functional specification',
   'Translate business requirements into detailed functional specifications.',
   (SELECT id FROM p3),
   'task', 'high', (SELECT id FROM in_progress_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 4, CURRENT_DATE + 6, CURRENT_DATE + 6,
   24.0, 14.0, 58,
   FALSE, FALSE),

  ('SEED-v629-011',
   'Procure cloud infrastructure',
   'Raise purchase order and provision cloud environment for development and UAT.',
   (SELECT id FROM p4),
   'task', 'medium', (SELECT id FROM in_progress_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 1, CURRENT_DATE + 3, CURRENT_DATE + 3,
   8.0, 3.0, 35,
   FALSE, FALSE),

  ('SEED-v629-012',
   'Design system architecture',
   'Produce high-level and low-level architecture diagrams and obtain sign-off.',
   (SELECT id FROM p2),
   'task', 'high', (SELECT id FROM in_progress_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 6, CURRENT_DATE + 1, CURRENT_DATE + 1,
   16.0, 12.0, 75,
   FALSE, FALSE),

  -- ── IN REVIEW ──────────────────────────────────────────────────────────────
  ('SEED-v629-013',
   'Review and approve business case',
   'Sponsor and steering committee review of the business case document.',
   (SELECT id FROM p1),
   'task', 'high', (SELECT id FROM in_review_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 8, CURRENT_DATE - 1, CURRENT_DATE - 1,
   6.0, 5.5, 90,
   FALSE, FALSE),

  ('SEED-v629-014',
   'Validate project charter draft',
   'PMO review of the project charter against governance standards.',
   (SELECT id FROM p2),
   'task', 'medium', (SELECT id FROM in_review_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 5, CURRENT_DATE, CURRENT_DATE,
   4.0, 3.8, 90,
   FALSE, FALSE),

  ('SEED-v629-015',
   'QA review of requirements document',
   'Quality assurance check of requirements document for completeness and consistency.',
   (SELECT id FROM p3),
   'task', 'medium', (SELECT id FROM in_review_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 3, CURRENT_DATE, CURRENT_DATE,
   8.0, 7.5, 95,
   FALSE, FALSE),

  ('SEED-v629-016',
   'Security review of data design',
   'Information security team review of proposed data model and access controls.',
   (SELECT id FROM p4),
   'task', 'high', (SELECT id FROM in_review_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 2, CURRENT_DATE + 1, CURRENT_DATE + 1,
   6.0, 4.0, 80,
   FALSE, FALSE),

  -- ── BLOCKED ────────────────────────────────────────────────────────────────
  ('SEED-v629-017',
   'Integrate with legacy payroll system',
   'Develop API integration layer between new platform and legacy payroll system.',
   (SELECT id FROM p3),
   'task', 'critical', (SELECT id FROM blocked_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 10, CURRENT_DATE - 2, CURRENT_DATE - 2,
   40.0, 15.0, 35,
   FALSE, TRUE),

  ('SEED-v629-018',
   'Obtain legal sign-off on data processing agreement',
   'Legal team must review and countersign data processing agreement before go-live.',
   (SELECT id FROM p1),
   'task', 'high', (SELECT id FROM blocked_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 7, CURRENT_DATE - 1, CURRENT_DATE - 1,
   4.0, 1.0, 20,
   FALSE, TRUE),

  ('SEED-v629-019',
   'Deploy UAT environment',
   'Blocked pending cloud infrastructure procurement.',
   (SELECT id FROM p2),
   'task', 'high', (SELECT id FROM blocked_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 4, CURRENT_DATE, CURRENT_DATE,
   8.0, 2.0, 20,
   FALSE, TRUE),

  -- ── COMPLETED ──────────────────────────────────────────────────────────────
  ('SEED-v629-020',
   'Complete project initiation documentation',
   'All initiation documents signed and filed: project brief, mandate, and terms of reference.',
   (SELECT id FROM p1),
   'task', 'high', (SELECT id FROM completed_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 20, CURRENT_DATE - 10, CURRENT_DATE - 10,
   12.0, 11.5, 100,
   FALSE, FALSE),

  ('SEED-v629-021',
   'Conduct lessons learned review — Phase 1',
   'Facilitated retrospective with the project team covering Phase 1 delivery.',
   (SELECT id FROM p2),
   'task', 'medium', (SELECT id FROM completed_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 15, CURRENT_DATE - 8, CURRENT_DATE - 8,
   4.0, 4.0, 100,
   FALSE, FALSE),

  ('SEED-v629-022',
   'Onboard project team members',
   'Induction sessions and system access provisioned for all team members.',
   (SELECT id FROM p1),
   'task', 'high', (SELECT id FROM completed_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 25, CURRENT_DATE - 15, CURRENT_DATE - 15,
   16.0, 15.0, 100,
   FALSE, FALSE),

  ('SEED-v629-023',
   'Stakeholder analysis completed',
   'Power/interest grid populated and engagement levels agreed with project sponsor.',
   (SELECT id FROM p3),
   'task', 'medium', (SELECT id FROM completed_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 18, CURRENT_DATE - 12, CURRENT_DATE - 12,
   6.0, 5.5, 100,
   FALSE, FALSE),

  ('SEED-v629-024',
   'Vendor selection complete',
   'Shortlisting, evaluation, and award of contract to preferred vendor.',
   (SELECT id FROM p4),
   'task', 'critical', (SELECT id FROM completed_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 30, CURRENT_DATE - 14, CURRENT_DATE - 14,
   20.0, 22.0, 100,
   FALSE, FALSE),

  ('SEED-v629-025',
   'Risk register baseline approved',
   'Initial risk register reviewed and accepted by the risk management committee.',
   (SELECT id FROM p2),
   'task', 'medium', (SELECT id FROM completed_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 22, CURRENT_DATE - 16, CURRENT_DATE - 16,
   4.0, 3.5, 100,
   FALSE, FALSE),

  ('SEED-v629-026',
   'Design phase sign-off milestone',
   'All design artefacts approved. Gate review passed.',
   (SELECT id FROM p3),
   'milestone', 'high', (SELECT id FROM completed_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 14, CURRENT_DATE - 14, CURRENT_DATE - 14,
   0.0, 0.0, 100,
   TRUE, FALSE),

  -- ── CANCELLED ──────────────────────────────────────────────────────────────
  ('SEED-v629-027',
   'Build custom reporting module (in-house)',
   'Cancelled — decision made to use third-party BI tool instead.',
   (SELECT id FROM p4),
   'task', 'medium', (SELECT id FROM cancelled_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 30, CURRENT_DATE - 20, CURRENT_DATE - 20,
   80.0, 10.0, 10,
   FALSE, FALSE),

  ('SEED-v629-028',
   'Pilot paper-based process documentation',
   'Cancelled — scope removed; digital process documentation selected.',
   (SELECT id FROM p5),
   'task', 'low', (SELECT id FROM cancelled_id),
   (SELECT id FROM default_user),
   CURRENT_DATE - 14, CURRENT_DATE - 9, CURRENT_DATE - 9,
   12.0, 0.0, 0,
   FALSE, FALSE),

  -- ── ADDITIONAL HIGH-PRIORITY TODO ──────────────────────────────────────────
  ('SEED-v629-029',
   'Prepare change management strategy',
   'Develop communication and training plan to support organisational change.',
   (SELECT id FROM p5),
   'task', 'high', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE + 1, CURRENT_DATE + 12, CURRENT_DATE + 12,
   10.0, 0.0, 0,
   FALSE, FALSE),

  ('SEED-v629-030',
   'Configure automated test suite',
   'Set up CI/CD pipeline with automated regression tests for all critical paths.',
   (SELECT id FROM p5),
   'task', 'medium', (SELECT id FROM todo_id),
   (SELECT id FROM default_user),
   CURRENT_DATE + 5, CURRENT_DATE + 18, CURRENT_DATE + 18,
   16.0, 0.0, 0,
   FALSE, FALSE)

) AS t(
  task_code, task_name, task_description,
  project_id, task_type, priority, status_id,
  uid,
  planned_start, planned_end, due_date,
  est_hours, act_hours, pct,
  is_milestone, is_blocked
);

-- ── 5. Verification ───────────────────────────────────────────────────────────

SELECT
  ts.status_name,
  COUNT(*) AS task_count
FROM public.tasks t
JOIN public.task_statuses ts ON ts.id = t.status_id
WHERE t.task_code LIKE 'SEED-v629-%'
  AND t.is_deleted = FALSE
GROUP BY ts.status_name, ts.status_order
ORDER BY ts.status_order;
