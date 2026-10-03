-- =============================================================================
-- v1152: Fields required on a communications plan
--        Who needs the information, when it is sent, who sends it,
--        assumptions, constraints, and a glossary.
--        Method uses primary_channels. Message content uses key_messages.
--        Language, format, and level of detail use tone_and_style.
-- Platform: public.communication_plans
-- Simulator practice: sim.practice_communication_plans
-- =============================================================================

ALTER TABLE public.communication_plans
  ADD COLUMN IF NOT EXISTS stakeholder_communication_requirements TEXT,
  ADD COLUMN IF NOT EXISTS communication_timeframe TEXT,
  ADD COLUMN IF NOT EXISTS communication_senders TEXT,
  ADD COLUMN IF NOT EXISTS communication_assumptions TEXT,
  ADD COLUMN IF NOT EXISTS communication_constraints TEXT,
  ADD COLUMN IF NOT EXISTS glossary TEXT;

COMMENT ON COLUMN public.communication_plans.stakeholder_communication_requirements IS
  'People or groups who need project information, and what they need. One requirement per line.';
COMMENT ON COLUMN public.communication_plans.communication_timeframe IS
  'How often information is provided, and under what circumstances. One timing per line.';
COMMENT ON COLUMN public.communication_plans.communication_senders IS
  'Person or group who provides the information. One sender per line.';
COMMENT ON COLUMN public.communication_plans.communication_assumptions IS
  'Assumptions about how communication will work. One assumption per line.';
COMMENT ON COLUMN public.communication_plans.communication_constraints IS
  'Limits on communication, including sensitive, proprietary, or confidential information. One constraint per line.';
COMMENT ON COLUMN public.communication_plans.glossary IS
  'Terms or acronyms used in a particular way on this project. One term per line.';

ALTER TABLE sim.practice_communication_plans
  ADD COLUMN IF NOT EXISTS stakeholder_communication_requirements TEXT,
  ADD COLUMN IF NOT EXISTS communication_timeframe TEXT,
  ADD COLUMN IF NOT EXISTS communication_senders TEXT,
  ADD COLUMN IF NOT EXISTS communication_assumptions TEXT,
  ADD COLUMN IF NOT EXISTS communication_constraints TEXT,
  ADD COLUMN IF NOT EXISTS glossary TEXT;

COMMENT ON COLUMN sim.practice_communication_plans.stakeholder_communication_requirements IS
  'People or groups who need project information, and what they need. One requirement per line.';
COMMENT ON COLUMN sim.practice_communication_plans.communication_timeframe IS
  'How often information is provided, and under what circumstances. One timing per line.';
COMMENT ON COLUMN sim.practice_communication_plans.communication_senders IS
  'Person or group who provides the information. One sender per line.';
COMMENT ON COLUMN sim.practice_communication_plans.communication_assumptions IS
  'Assumptions about how communication will work. One assumption per line.';
COMMENT ON COLUMN sim.practice_communication_plans.communication_constraints IS
  'Limits on communication, including sensitive, proprietary, or confidential information. One constraint per line.';
COMMENT ON COLUMN sim.practice_communication_plans.glossary IS
  'Terms or acronyms used in a particular way on this project. One term per line.';
