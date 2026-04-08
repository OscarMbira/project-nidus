-- =============================================================================
-- v304: Stakeholder multiple contact entries (emails, phones, mobiles)
-- Purpose: Allow stakeholders to have multiple email, phone, and mobile values
-- =============================================================================

-- Platform: public.stakeholders
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS emails TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phones TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mobiles TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.stakeholders.emails IS 'Array of email addresses for the stakeholder';
COMMENT ON COLUMN public.stakeholders.phones IS 'Array of phone numbers for the stakeholder';
COMMENT ON COLUMN public.stakeholders.mobiles IS 'Array of mobile numbers for the stakeholder';

-- Simulator: sim.practice_stakeholder_register (parity)
ALTER TABLE sim.practice_stakeholder_register
  ADD COLUMN IF NOT EXISTS emails TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phones TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mobiles TEXT[] DEFAULT NULL;

COMMENT ON COLUMN sim.practice_stakeholder_register.emails IS 'Array of email addresses for the stakeholder';
COMMENT ON COLUMN sim.practice_stakeholder_register.phones IS 'Array of phone numbers for the stakeholder';
COMMENT ON COLUMN sim.practice_stakeholder_register.mobiles IS 'Array of mobile numbers for the stakeholder';
