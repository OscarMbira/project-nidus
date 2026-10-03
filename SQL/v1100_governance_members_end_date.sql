-- =============================================================================
-- v1100: project_governance_members.end_date (optional term end)
-- Prerequisites: v1020
-- =============================================================================

ALTER TABLE public.project_governance_members
  ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN public.project_governance_members.end_date IS
  'v1100: Optional date the member''s term / appointment on this body ends.';

DO $$
BEGIN
  RAISE NOTICE 'v1100: project_governance_members.end_date added';
END $$;
