-- ============================================================================
-- v966aa: Core PM Menu Rationalisation — Phase 12: Governance Action Register (Simulator view)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 12.
-- Mirrors SQL/v966z_phase12_governance_actions_view.sql's rationale — read that file's header
-- first. Follows the same investigate-before-mirror discipline SQL/v964b used for the Simulator
-- unified_approvals_v: rather than force-fit a mirror of Platform's exact 3 source tables (which
-- do not exist unmodified in the sim schema), this queries the sim schema's own REAL, live
-- action-shaped tables.
--
-- Investigation summary:
--   - Issue actions: sim.practice_issue_actions (SQL/v233_sim_issue_management.sql) is a real,
--     directly-comparable action table (action_title/action_description/status/assigned_to_
--     user_id/due_date) — used as-is.
--   - Quality actions: NO equivalent exists. sim.practice_quality_activities
--     (SQL/v234_sim_quality_management.sql) models the quality ACTIVITY itself (a review/
--     inspection/testing/approval/audit event with a planned_date/status/result), not a
--     corrective/preventive ACTION arising from one — there is no sim-side sub-table shaped like
--     Platform's quality_activity_actions. Per CLAUDE.md rule 64's "do not force-fit parity
--     across a genuinely different data model" precedent (the same call v964b made for Simulator
--     approvals), this domain is simply OMITTED from the sim view rather than mapping activities
--     that were never actions in the first place. Flagged as a real content gap, not silently
--     worked around.
--   - Lesson actions: NO dedicated action sub-table exists either (no sim.practice_lesson_
--     actions). sim.practice_lesson_entries (SQL/v235_sim_daily_log_lessons.sql) DOES carry a
--     status value that models the same underlying concept at a coarser grain — 'action_required'
--     / 'action_taken' are real states on the lesson entry itself. This view treats a lesson
--     entry in either of those two states as an action row (the lesson IS the action, one row
--     per lesson rather than a separate action sub-record) — an honest, coarser mapping, not
--     invented data. There is no assignee field to draw from at this grain, so assigned_to is
--     NULL for every lesson-sourced row (not guessed at from identified_by_user_id, which is a
--     different concept — who logged the lesson, not who owns its action).
--
-- READ-ONLY rollup — resolve/cancel stays on each entity's own existing practice page.
-- ============================================================================

CREATE OR REPLACE VIEW sim.unified_governance_actions_v AS
SELECT
  'issue'::text AS action_type,
  ia.id AS action_id,
  ia.practice_issue_id AS parent_id,
  pi.practice_project_id AS project_id,
  COALESCE(NULLIF(pi.issue_title, ''), 'Issue') || ' — ' || ia.action_title AS record_label,
  CASE
    WHEN ia.status IN ('pending', 'in_progress') THEN 'pending'
    WHEN ia.status = 'completed' THEN 'resolved'
    ELSE 'cancelled'
  END AS status,
  ia.status AS raw_status,
  NULL::text AS priority,
  ia.assigned_to_user_id AS assigned_to,
  ia.due_date AS due_date,
  ia.created_at::timestamptz AS created_at,
  ia.created_by AS created_by
FROM sim.practice_issue_actions ia
JOIN sim.practice_issues pi ON pi.id = ia.practice_issue_id

UNION ALL

SELECT
  'lesson'::text AS action_type,
  le.id AS action_id,
  le.id AS parent_id,
  pll.practice_project_id AS project_id,
  le.lesson_title AS record_label,
  CASE WHEN le.status = 'action_taken' THEN 'resolved' ELSE 'pending' END AS status,
  le.status::text AS raw_status,
  le.priority AS priority,
  NULL::uuid AS assigned_to,
  NULL::date AS due_date,
  le.created_at::timestamptz AS created_at,
  le.created_by AS created_by
FROM sim.practice_lesson_entries le
JOIN sim.practice_lessons_log pll ON pll.id = le.practice_lessons_log_id
WHERE le.status IN ('action_required', 'action_taken');

GRANT SELECT ON sim.unified_governance_actions_v TO authenticated;

COMMENT ON VIEW sim.unified_governance_actions_v IS
  'Phase 12 (v966aa) — read-only cross-domain governance action rollup for the Simulator''s '
  'Practice module (practice_issue_actions + practice_lesson_entries in action_required/'
  'action_taken states). Quality is omitted — no sim-side action sub-table exists for it '
  '(sim.practice_quality_activities models the activity itself, not a corrective action arising '
  'from one). See file header for the full investigation.';

DO $$
BEGIN
  RAISE NOTICE 'v966aa: sim.unified_governance_actions_v created (Issue actions + Lesson entries in an action state)';
END $$;
