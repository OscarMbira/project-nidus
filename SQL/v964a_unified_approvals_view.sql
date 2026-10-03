-- ============================================================================
-- v964a — Unified Approvals register (Phase 5 of v963 plan) — Platform (public schema)
-- ============================================================================
-- Investigation summary (see projectplan/v963_pmis_core_gap_closure_plan.md Phase 5 and
-- projectprd/v963_pmis_core_gap_closure_PRD.md):
--
--   Mandate approvals (mandate_approvals + project_mandates.document_status), Change Request
--   approvals (change_requests.status — a single column, no separate approval-request table),
--   and Benefits Review Plan approvals (benefits_review_plan_approvals + benefits_review_plans
--   .status) are THREE separate, differently-shaped business workflows with their own tables
--   and status vocabularies. They are NOT already unified by the generic Record Lifecycle /
--   Authorisation system (record_authorisation_requests, see
--   apps/platform/src/services/recordLifecycleService.js and
--   apps/platform/src/modules/record-lifecycle/). That system is a different, orthogonal
--   mechanism — it governs whether a FIELD-LEVEL EDIT to an already-existing record needs
--   sign-off before it takes effect (submission batches / "unauthorised" record status), not
--   the underlying business decision of approving a Mandate, Change Request, or Benefits
--   Review Plan itself. Its LIFECYCLE_TABLE_REGISTRY happens to list project_mandates,
--   change_requests, and benefits_review_plans as tables that COULD opt into that separate
--   edit-governance layer, but none of the three real approval workflows here are built on it.
--
--   Design decision: a read-time UNION ALL view (this file) was chosen over a synced
--   polymorphic table + triggers because (a) the three source shapes are different enough
--   (per-approver decision rows for two of them vs. a single status column for the third)
--   that trigger-sync logic would be nontrivial and duplicated per source, (b) a view can
--   never drift stale relative to its sources — no backfill, no missed trigger, (c) it
--   automatically inherits each source table's own RLS policies when queried by the
--   requesting role (standard Postgres behaviour for a plain, non-SECURITY-DEFINER view —
--   no new RLS policies are required on top of this view).
--
--   This is a READ-ONLY rollup. Approve/Reject actions are NOT exposed here and stay on each
--   entity's own existing page (MandateApprovalDashboard, the Change Request register,
--   BenefitsReviewPlanApprovals) — see apps/platform/src/services/unifiedApprovalsService.js
--   buildApprovalViewPath() for the "View" link back to each entity's own page.
--
--   `status` below is a normalised 3-way bucket (pending/approved/rejected) for filtering;
--   `raw_status` preserves the source table's own literal status value.
-- ============================================================================

CREATE OR REPLACE VIEW public.unified_approvals_v AS
SELECT
  'mandate'::text AS entity_type,
  ma.id AS entity_id,
  pm.id AS record_id,
  COALESCE(NULLIF(pm.mandate_reference, '') || ' — ', '') || pm.mandate_title AS record_label,
  pm.project_id AS project_id,
  CASE ma.approval_status
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'pending'
  END AS status,
  ma.approval_status AS raw_status,
  ma.created_by AS requested_by,
  ma.created_at::timestamptz AS requested_at,
  CASE WHEN ma.approval_status IN ('approved', 'rejected') THEN ma.updated_by ELSE NULL END AS decided_by,
  CASE WHEN ma.approval_status IN ('approved', 'rejected')
       THEN COALESCE(ma.approval_at, ma.updated_at)::timestamptz
       ELSE NULL END AS decided_at,
  ma.approval_comments AS comments
FROM public.mandate_approvals ma
JOIN public.project_mandates pm ON pm.id = ma.mandate_id
WHERE COALESCE(pm.is_deleted, FALSE) = FALSE
  AND COALESCE(pm.is_active, TRUE) = TRUE

UNION ALL

SELECT
  'change_request'::text AS entity_type,
  cr.id AS entity_id,
  cr.id AS record_id,
  COALESCE(NULLIF(cr.change_reference, '') || ' — ', '') || cr.change_title AS record_label,
  cr.project_id AS project_id,
  CASE
    WHEN cr.status = 'approved' THEN 'approved'
    WHEN cr.status IN ('rejected', 'cancelled') THEN 'rejected'
    ELSE 'pending' -- submitted / under-assessment / pending-approval / deferred / implemented
  END AS status,
  cr.status AS raw_status,
  cr.submitted_by AS requested_by,
  cr.created_at::timestamptz AS requested_at,
  CASE WHEN cr.status IN ('approved', 'rejected', 'cancelled') THEN cr.updated_by ELSE NULL END AS decided_by,
  CASE WHEN cr.status IN ('approved', 'rejected', 'cancelled') THEN cr.updated_at::timestamptz ELSE NULL END AS decided_at,
  cr.status_reason AS comments
FROM public.change_requests cr
WHERE COALESCE(cr.is_deleted, FALSE) = FALSE

UNION ALL

SELECT
  'benefits_review_plan'::text AS entity_type,
  bpa.id AS entity_id,
  brp.id AS record_id,
  brp.plan_title AS record_label,
  brp.project_id AS project_id,
  CASE bpa.approval_status
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'pending' -- covers 'pending' and 'requested_changes'
  END AS status,
  bpa.approval_status AS raw_status,
  bpa.created_by AS requested_by,
  bpa.created_at::timestamptz AS requested_at,
  CASE WHEN bpa.approval_status IN ('approved', 'rejected') THEN bpa.updated_by ELSE NULL END AS decided_by,
  CASE WHEN bpa.approval_status IN ('approved', 'rejected')
       THEN COALESCE(bpa.approval_date::timestamptz, bpa.updated_at::timestamptz)
       ELSE NULL END AS decided_at,
  bpa.comments AS comments
FROM public.benefits_review_plan_approvals bpa
JOIN public.benefits_review_plans brp ON brp.id = bpa.review_plan_id
WHERE COALESCE(brp.is_deleted, FALSE) = FALSE;

GRANT SELECT ON public.unified_approvals_v TO authenticated;

COMMENT ON VIEW public.unified_approvals_v IS
  'Phase 5 (v963/v964) — read-only cross-entity approvals rollup for Mandates, Change Requests, '
  'and Benefits Review Plans. UNION ALL of live source tables (see file header for why a view '
  'was chosen over a synced polymorphic table). Not used for writes — approve/reject stays on '
  'each entity''s own existing page.';

DO $$
BEGIN
  RAISE NOTICE 'v964a: public.unified_approvals_v created (Mandates + Change Requests + Benefits Review Plans)';
END $$;
