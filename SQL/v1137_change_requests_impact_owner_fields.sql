-- ============================================================================
-- v1137: Change Requests — add impact_summary + owner_user_id
-- ============================================================================
-- Synchronises change_requests / sim.practice_change_requests with the must-have field set:
-- Request ID (change_reference, exists), Description (change_description, exists), Reason
-- (reason_for_change, exists), Impact (NEW — impact_summary), Alternatives
-- (alternative_solutions, exists), Decision (status + status_reason, exist but never exposed in
-- the UI until this change), Approver (current_approver_user_id, exists but never exposed in the
-- UI until this change), Assessment (change_assessments / sim.practice_change_assessments already
-- exist as a full workflow — surfaced as a derived summary in the UI, not duplicated here), Owner
-- (NEW — owner_user_id, distinct from both submitted_by and current_approver_user_id).
--
-- Only two genuinely new columns are needed; everything else already existed in the schema and
-- only needed UI surfacing (done in the application code alongside this migration).
-- ============================================================================

ALTER TABLE public.change_requests
  ADD COLUMN IF NOT EXISTS impact_summary TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_change_requests_owner ON public.change_requests(owner_user_id) WHERE is_deleted = FALSE;

COMMENT ON COLUMN public.change_requests.impact_summary IS
  'v1137: lightweight, requester-provided impact note captured at submission — distinct from change_assessments.impact_summary''s detailed, assessor-driven multi-dimensional analysis.';
COMMENT ON COLUMN public.change_requests.owner_user_id IS
  'v1137: who is accountable for driving this change request through to resolution — distinct from submitted_by (who raised it) and current_approver_user_id (who authorises it). Defaults to the submitter at creation; independently reassignable.';

ALTER TABLE sim.practice_change_requests
  ADD COLUMN IF NOT EXISTS impact_summary TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sim_practice_change_requests_owner ON sim.practice_change_requests(owner_user_id) WHERE is_deleted = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v1137_change_requests_impact_owner_fields.sql applied successfully';
END $$;
