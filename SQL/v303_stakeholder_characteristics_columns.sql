-- =============================================================================
-- v303: Stakeholder characteristics – Powerful, Negatively/Positively affected
-- Purpose: Add is_powerful; split is_affected_by_project into is_negatively_affected, is_positively_affected
-- =============================================================================

-- Platform: public.stakeholders
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS is_powerful BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_negatively_affected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_positively_affected BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.stakeholders.is_powerful IS 'Stakeholder has significant power over project outcomes';
COMMENT ON COLUMN public.stakeholders.is_negatively_affected IS 'Stakeholder is negatively affected by the project';
COMMENT ON COLUMN public.stakeholders.is_positively_affected IS 'Stakeholder is positively affected by the project';

-- Simulator: sim.practice_stakeholder_register (parity)
ALTER TABLE sim.practice_stakeholder_register
  ADD COLUMN IF NOT EXISTS is_powerful BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_negatively_affected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_positively_affected BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN sim.practice_stakeholder_register.is_powerful IS 'Stakeholder has significant power over project outcomes';
COMMENT ON COLUMN sim.practice_stakeholder_register.is_negatively_affected IS 'Stakeholder is negatively affected by the project';
COMMENT ON COLUMN sim.practice_stakeholder_register.is_positively_affected IS 'Stakeholder is positively affected by the project';
