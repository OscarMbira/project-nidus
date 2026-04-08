-- =============================================================================
-- v318: Stakeholder Identification Source & Date (Platform + Simulator)
-- Purpose: Add identification_source and identification_date to stakeholder register.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- Platform: public.stakeholders
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS identification_source TEXT CHECK (
    identification_source IS NULL OR identification_source IN (
      'project-charter', 'procurement-docs', 'interview', 'workshop',
      'previous-project', 'referral', 'other'
    )
  ),
  ADD COLUMN IF NOT EXISTS identification_date DATE;

COMMENT ON COLUMN public.stakeholders.identification_source IS 'How the stakeholder was identified (project-charter, procurement-docs, interview, workshop, previous-project, referral, other).';
COMMENT ON COLUMN public.stakeholders.identification_date IS 'Date when the stakeholder was identified.';

-- Simulator: sim.practice_stakeholder_register
ALTER TABLE sim.practice_stakeholder_register
  ADD COLUMN IF NOT EXISTS identification_source TEXT CHECK (
    identification_source IS NULL OR identification_source IN (
      'project-charter', 'procurement-docs', 'interview', 'workshop',
      'previous-project', 'referral', 'other'
    )
  ),
  ADD COLUMN IF NOT EXISTS identification_date DATE;

COMMENT ON COLUMN sim.practice_stakeholder_register.identification_source IS 'How the stakeholder was identified (simulator).';
COMMENT ON COLUMN sim.practice_stakeholder_register.identification_date IS 'Date when the stakeholder was identified (simulator).';
