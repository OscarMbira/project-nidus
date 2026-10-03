-- =============================================================================
-- v1153: Separate language, format, and level of detail on a communication plan.
-- Platform: public.communication_plans
-- Simulator practice: sim.practice_communication_plans
-- =============================================================================

ALTER TABLE public.communication_plans
  ADD COLUMN IF NOT EXISTS communication_language TEXT,
  ADD COLUMN IF NOT EXISTS communication_format TEXT,
  ADD COLUMN IF NOT EXISTS communication_detail_level TEXT;

COMMENT ON COLUMN public.communication_plans.communication_language IS
  'Language the information is written in. Stores an active languages.code.';
COMMENT ON COLUMN public.communication_plans.communication_format IS
  'How the information is shaped, such as a brief, report, or presentation.';
COMMENT ON COLUMN public.communication_plans.communication_detail_level IS
  'How much detail the information carries: headline, summary, or detailed.';

ALTER TABLE sim.practice_communication_plans
  ADD COLUMN IF NOT EXISTS communication_language TEXT,
  ADD COLUMN IF NOT EXISTS communication_format TEXT,
  ADD COLUMN IF NOT EXISTS communication_detail_level TEXT;

COMMENT ON COLUMN sim.practice_communication_plans.communication_language IS
  'Language the information is written in. Stores an active languages.code.';
COMMENT ON COLUMN sim.practice_communication_plans.communication_format IS
  'How the information is shaped, such as a brief, report, or presentation.';
COMMENT ON COLUMN sim.practice_communication_plans.communication_detail_level IS
  'How much detail the information carries: headline, summary, or detailed.';
