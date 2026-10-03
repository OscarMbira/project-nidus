-- ============================================================================
-- v964b — Unified Approvals register (Phase 5 of v963 plan) — Simulator (sim schema)
-- ============================================================================
-- Investigation summary (mirrors v964a's rationale — read that file's header first):
--
--   The Simulator does NOT have a live-routed equivalent of Platform's mandate_approvals /
--   change_requests / benefits_review_plan_approvals pages. Specifically:
--     - sim.mandate_approvals does not exist at all (sim.project_mandates does, from v80, but
--       nothing in apps/simulator/src/routes/simulatorRoutes.jsx ever renders
--       MandateApprovalDashboard, ProjectMandateCreate/View/Edit — those imports are dead).
--     - sim.change_requests / sim.benefits_review_plans do not exist either.
--   These are pre-existing, separate gaps in the "Simulator route/schema mirror" systemic
--   issue this PRD's own audit already flagged (see PRD §a.3) — NOT something this phase
--   builds out, per CLAUDE.md rule 64's own precedent: where Simulator's equivalent lives on a
--   genuinely different, already-real data model (not a mirror of the Platform file), use that
--   real model rather than force-fitting parity by inventing a duplicate mirror schema.
--
--   The Simulator DOES have a real, live-routed, richer "Practice" module covering the same
--   three business concepts under different table names:
--     - sim.practice_project_briefs (mandate/brief equivalent — simple is_approved boolean,
--       live at /simulator/practice-briefs/:id)
--     - sim.practice_change_requests + sim.practice_change_approvals (live at
--       /simulator/pmo/registers/changes, via apps/simulator/src/services/
--       changeManagementService.js, which already scopes to sim.practice_change_* — see that
--       file's own header comment)
--     - sim.practice_benefits_review_plans (status column directly on the plan; live at
--       /simulator/practice-benefits-review-plans/:id)
--   This view rolls up those three real, reachable tables instead.
--
--   Note: sim.practice_project_briefs.is_approved is a boolean (no explicit "rejected" state
--   modelled in that table), and sim.practice_benefits_review_plans.status has no 'rejected'
--   value either (draft/pending_approval/approved/archived) — narrower than the Platform
--   source tables. This view maps what exists; it does not invent a rejected state where the
--   underlying practice schema has none.
--
--   READ-ONLY rollup — approve/reject stays on each entity's own existing practice page.
-- ============================================================================

CREATE OR REPLACE VIEW sim.unified_approvals_v AS
SELECT
  'mandate'::text AS entity_type,
  pb.id AS entity_id,
  pb.id AS record_id,
  pb.brief_title AS record_label,
  pb.practice_project_id AS project_id,
  CASE WHEN pb.is_approved THEN 'approved' ELSE 'pending' END AS status,
  CASE WHEN pb.is_approved THEN 'approved' ELSE 'pending' END AS raw_status,
  pb.created_by AS requested_by,
  pb.created_at::timestamptz AS requested_at,
  CASE WHEN pb.is_approved THEN pb.approved_by ELSE NULL END AS decided_by,
  CASE WHEN pb.is_approved THEN pb.approved_at ELSE NULL END AS decided_at,
  NULL::text AS comments
FROM sim.practice_project_briefs pb
WHERE COALESCE(pb.is_deleted, FALSE) = FALSE

UNION ALL

SELECT
  'change_request'::text AS entity_type,
  ca.id AS entity_id,
  cr.id AS record_id,
  COALESCE(NULLIF(cr.change_reference, '') || ' — ', '') || cr.change_title AS record_label,
  cr.practice_project_id AS project_id,
  CASE
    WHEN ca.decision = 'approved' THEN 'approved'
    WHEN ca.decision = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END AS status,
  ca.decision AS raw_status,
  cr.submitted_by AS requested_by,
  cr.created_at::timestamptz AS requested_at,
  CASE WHEN ca.decision IN ('approved', 'rejected') THEN ca.approver_user_id ELSE NULL END AS decided_by,
  CASE WHEN ca.decision IN ('approved', 'rejected') THEN ca.decision_date::timestamptz ELSE NULL END AS decided_at,
  ca.decision_rationale AS comments
FROM sim.practice_change_approvals ca
JOIN sim.practice_change_requests cr ON cr.id = ca.change_request_id
WHERE COALESCE(ca.is_deleted, FALSE) = FALSE
  AND COALESCE(cr.is_deleted, FALSE) = FALSE

UNION ALL

SELECT
  'benefits_review_plan'::text AS entity_type,
  brp.id AS entity_id,
  brp.id AS record_id,
  brp.plan_title AS record_label,
  brp.practice_project_id AS project_id,
  CASE brp.status
    WHEN 'approved' THEN 'approved'
    WHEN 'archived' THEN 'approved'
    ELSE 'pending' -- 'draft' / 'pending_approval'
  END AS status,
  brp.status AS raw_status,
  brp.created_by AS requested_by,
  brp.created_at::timestamptz AS requested_at,
  NULL::uuid AS decided_by,
  NULL::timestamptz AS decided_at,
  NULL::text AS comments
FROM sim.practice_benefits_review_plans brp
WHERE COALESCE(brp.is_deleted, FALSE) = FALSE;

GRANT SELECT ON sim.unified_approvals_v TO authenticated;

COMMENT ON VIEW sim.unified_approvals_v IS
  'Phase 5 (v963/v964) — read-only cross-entity approvals rollup for the Simulator''s Practice '
  'module (practice_project_briefs + practice_change_requests/practice_change_approvals + '
  'practice_benefits_review_plans). See file header for why these tables (not sim.mandate_'
  'approvals/sim.change_requests/sim.benefits_review_plans, which do not exist) are the source.';

DO $$
BEGIN
  RAISE NOTICE 'v964b: sim.unified_approvals_v created (Practice Briefs + Change Requests + Benefits Review Plans)';
END $$;
