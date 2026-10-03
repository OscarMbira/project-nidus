-- =============================================================================
-- v1138: Change requests — business rationale (multi-value text)
-- Platform public.change_requests and Simulator sim.practice_change_requests
-- Values are stored as a newline-joined list. Run after v1137.
-- =============================================================================

ALTER TABLE public.change_requests
  ADD COLUMN IF NOT EXISTS business_rationale TEXT;

COMMENT ON COLUMN public.change_requests.business_rationale IS
  'v1138: business reasons that justify this change. One rationale per line.';

ALTER TABLE sim.practice_change_requests
  ADD COLUMN IF NOT EXISTS business_rationale TEXT;

COMMENT ON COLUMN sim.practice_change_requests.business_rationale IS
  'v1138: business reasons that justify this change. One rationale per line.';
