-- =============================================================================
-- v1139: Stakeholder interest level (High / Medium / Low)
-- Purpose: Capture how interested a stakeholder is in the project
-- Schemas: public.stakeholders, sim.practice_stakeholder_register
-- =============================================================================

ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS interest_level VARCHAR(10);

ALTER TABLE public.stakeholders
  DROP CONSTRAINT IF EXISTS stakeholders_interest_level_check;

ALTER TABLE public.stakeholders
  ADD CONSTRAINT stakeholders_interest_level_check
  CHECK (interest_level IS NULL OR interest_level IN ('high', 'medium', 'low'));

COMMENT ON COLUMN public.stakeholders.interest_level IS
  'How interested this stakeholder is in the project: high, medium, or low';

ALTER TABLE sim.practice_stakeholder_register
  ADD COLUMN IF NOT EXISTS interest_level VARCHAR(10);

ALTER TABLE sim.practice_stakeholder_register
  DROP CONSTRAINT IF EXISTS practice_stakeholder_register_interest_level_check;

ALTER TABLE sim.practice_stakeholder_register
  ADD CONSTRAINT practice_stakeholder_register_interest_level_check
  CHECK (interest_level IS NULL OR interest_level IN ('high', 'medium', 'low'));

COMMENT ON COLUMN sim.practice_stakeholder_register.interest_level IS
  'How interested this stakeholder is in the project: high, medium, or low';
