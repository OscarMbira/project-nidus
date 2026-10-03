-- ============================================================================
-- v966z: Core PM Menu Rationalisation — Phase 12: Governance Action Register (Platform view)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 12.
-- projectprd/v966_core_pm_menu_rationalisation_PRD.md decision 5: build a real unified
-- Governance Action Register capability, not deferred to a separate PRD.
--
-- Today, action items are scattered per-domain with no cross-cutting register: Quality actions
-- (quality_activity_actions, /platform/my-quality-actions), Issue actions (issue_actions,
-- /platform/issues/my-actions), and Lesson actions (lesson_actions, /platform/lessons/my-actions)
-- are three separate, differently-shaped tables with no shared view (confirmed by two prior
-- audits). Per this file's own investigation (mirroring SQL/v964a_unified_approvals_view.sql's
-- precedent exactly), a read-time UNION ALL view was chosen over a synced polymorphic table +
-- triggers for the same reasons v964a gives: the three source shapes differ enough (a polymorphic
-- activity_type/activity_id link for quality vs. direct FKs for issue/lesson) that trigger-sync
-- logic would be nontrivial and duplicated per source; a view can never drift stale relative to
-- its sources; RLS is inherited automatically from each source table when queried by the
-- requesting role (standard Postgres view behaviour, no new RLS policies needed on top).
--
-- This is a READ-ONLY rollup. Create/update/complete an action stays on each entity's own
-- existing page (MyQualityActions.jsx, MyIssueActions.jsx / issue_actions service, MyLessonActions
-- .jsx / lesson_actions service) — see apps/platform/src/services/governanceActionService.js
-- buildActionViewPath() for the "View" link back to each entity's own page.
--
-- `status` below is a normalised pending/resolved/cancelled bucket for filtering; `raw_status`
-- preserves the source table's own literal status value.
--
-- Known gap (documented, not fixed here): quality_activity_actions.activity_id is a polymorphic
-- link (activity_type IN ('review','inspection','audit','test')) but only 'review'
-- (quality_reviews) and 'inspection' (quality_inspections) have real linked tables with a
-- project_id to resolve against — 'audit'/'test' rows have no backing table in this codebase
-- today, so their project_id/parent title resolve to NULL. This does not hide those rows (they
-- still appear in the rollup with a NULL project), it just means the "View" link and project
-- filter can't resolve for that subset. Flagged rather than silently worked around.
-- ============================================================================

CREATE OR REPLACE VIEW public.unified_governance_actions_v AS
SELECT
  'quality'::text AS action_type,
  qaa.id AS action_id,
  qaa.activity_id AS parent_id,
  COALESCE(qr.project_id, qi.project_id) AS project_id,
  COALESCE(NULLIF(qr.review_title, ''), NULLIF(qi.inspection_title, ''), 'Quality Activity') || ' — ' || qaa.action_description AS record_label,
  CASE
    WHEN qaa.status IN ('open', 'in_progress') THEN 'pending'
    WHEN qaa.status IN ('completed', 'verified', 'closed') THEN 'resolved'
    ELSE 'cancelled'
  END AS status,
  qaa.status AS raw_status,
  qaa.priority AS priority,
  qaa.assigned_to_id AS assigned_to,
  qaa.due_date AS due_date,
  qaa.created_at::timestamptz AS created_at,
  qaa.created_by AS created_by
FROM public.quality_activity_actions qaa
LEFT JOIN public.quality_reviews qr ON qaa.activity_type = 'review' AND qr.id = qaa.activity_id
LEFT JOIN public.quality_inspections qi ON qaa.activity_type = 'inspection' AND qi.id = qaa.activity_id
WHERE COALESCE(qaa.is_deleted, FALSE) = FALSE

UNION ALL

SELECT
  'issue'::text AS action_type,
  ia.id AS action_id,
  ia.issue_id AS parent_id,
  i.project_id AS project_id,
  COALESCE(NULLIF(i.issue_title, ''), 'Issue') || ' — ' || ia.action_description AS record_label,
  CASE
    WHEN ia.status IN ('planned', 'in_progress', 'blocked') THEN 'pending'
    WHEN ia.status = 'completed' THEN 'resolved'
    ELSE 'cancelled'
  END AS status,
  ia.status AS raw_status,
  NULL::text AS priority,
  ia.assigned_to_id AS assigned_to,
  ia.target_date AS due_date,
  ia.created_at::timestamptz AS created_at,
  ia.created_by AS created_by
FROM public.issue_actions ia
JOIN public.issues i ON i.id = ia.issue_id
WHERE COALESCE(i.is_deleted, FALSE) = FALSE

UNION ALL

SELECT
  'lesson'::text AS action_type,
  la.id AS action_id,
  la.lesson_id AS parent_id,
  ll.project_id AS project_id,
  COALESCE(NULLIF(l.title, ''), 'Lesson') || ' — ' || la.action_description AS record_label,
  CASE
    WHEN la.status IN ('pending', 'in_progress') THEN 'pending'
    WHEN la.status = 'completed' THEN 'resolved'
    ELSE 'cancelled'
  END AS status,
  la.status::text AS raw_status,
  NULL::text AS priority,
  la.assigned_to_id AS assigned_to,
  la.target_date AS due_date,
  la.created_at::timestamptz AS created_at,
  NULL::uuid AS created_by
FROM public.lesson_actions la
JOIN public.lessons l ON l.id = la.lesson_id
JOIN public.lessons_logs ll ON ll.id = l.lessons_log_id
WHERE COALESCE(la.is_deleted, FALSE) = FALSE;

GRANT SELECT ON public.unified_governance_actions_v TO authenticated;

COMMENT ON VIEW public.unified_governance_actions_v IS
  'Phase 12 (v966z) — read-only cross-domain governance action rollup for Quality, Issue, and '
  'Lesson actions. UNION ALL of live source tables (see file header for why a view was chosen '
  'over a synced polymorphic table). Not used for writes — complete/cancel stays on each '
  'entity''s own existing page.';

DO $$
BEGIN
  RAISE NOTICE 'v966z: public.unified_governance_actions_v created (Quality + Issue + Lesson actions)';
END $$;
