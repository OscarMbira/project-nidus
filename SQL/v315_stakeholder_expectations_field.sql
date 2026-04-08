-- ============================================================================
-- v315: Stakeholder expectations field (Platform + Simulator)
-- Purpose: Add explicit expectations field to Stakeholder Register
--          for PMBOK compliance (separate from requirements/notes).
-- Schemas: public.stakeholders, sim.practice_stakeholder_register
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS
-- ============================================================================

-- Platform stakeholders: add expectations field
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS expectations TEXT;

COMMENT ON COLUMN public.stakeholders.expectations IS
  'List of stakeholder expectations (separate from requirements and notes).';

-- Simulator practice stakeholder register: add expectations field
ALTER TABLE sim.practice_stakeholder_register
  ADD COLUMN IF NOT EXISTS expectations TEXT;

COMMENT ON COLUMN sim.practice_stakeholder_register.expectations IS
  'List of stakeholder expectations (separate from requirements and notes) for simulator practice scenarios.';

