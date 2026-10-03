-- =============================================================================
-- v1094: team_charters.accountability — agreed consequences / escalation
-- Prerequisites: v628c (team_charters), v1086 (RLS)
-- =============================================================================

ALTER TABLE public.team_charters
  ADD COLUMN IF NOT EXISTS accountability TEXT;

COMMENT ON COLUMN public.team_charters.accountability IS
  'v1094: Agreed accountability items when charter norms/values are not followed (newline-joined list).';

ALTER TABLE sim.team_charters
  ADD COLUMN IF NOT EXISTS accountability TEXT;

COMMENT ON COLUMN sim.team_charters.accountability IS
  'v1094: Agreed accountability items when charter norms/values are not followed (newline-joined list).';

DO $$
BEGIN
  RAISE NOTICE 'v1094: team_charters.accountability added (public + sim)';
END $$;
