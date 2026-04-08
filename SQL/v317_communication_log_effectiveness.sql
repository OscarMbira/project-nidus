-- =============================================================================
-- v317: Communication Log Effectiveness Fields (Platform + Simulator)
-- Purpose: Add response_notes, effectiveness_rating (1-5), next_action,
--          next_action_due_date for communication log entries.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- Platform: public.stakeholder_communications
-- (response_received already exists in v35)
ALTER TABLE public.stakeholder_communications
  ADD COLUMN IF NOT EXISTS response_notes TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_rating SMALLINT CHECK (effectiveness_rating IS NULL OR (effectiveness_rating >= 1 AND effectiveness_rating <= 5)),
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_due_date DATE;

COMMENT ON COLUMN public.stakeholder_communications.response_notes IS 'Notes on the response received for this communication.';
COMMENT ON COLUMN public.stakeholder_communications.effectiveness_rating IS 'User rating 1-5 for communication effectiveness.';
COMMENT ON COLUMN public.stakeholder_communications.next_action IS 'Planned next action following this communication.';
COMMENT ON COLUMN public.stakeholder_communications.next_action_due_date IS 'Due date for the next action.';

-- Simulator: sim.practice_communication_log
ALTER TABLE sim.practice_communication_log
  ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS response_notes TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_rating SMALLINT CHECK (effectiveness_rating IS NULL OR (effectiveness_rating >= 1 AND effectiveness_rating <= 5)),
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_due_date DATE;

COMMENT ON COLUMN sim.practice_communication_log.response_notes IS 'Notes on the response received.';
COMMENT ON COLUMN sim.practice_communication_log.effectiveness_rating IS 'Rating 1-5 for effectiveness.';
COMMENT ON COLUMN sim.practice_communication_log.next_action IS 'Planned next action.';
COMMENT ON COLUMN sim.practice_communication_log.next_action_due_date IS 'Due date for next action.';
