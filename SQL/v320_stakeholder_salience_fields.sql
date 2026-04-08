-- =============================================================================
-- v320: Stakeholder Salience Model Fields (Platform + Simulator)
-- Purpose: Add legitimacy_level, urgency_level, salience_class for Mitchell et al. salience model.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- Platform: public.stakeholder_analysis
ALTER TABLE public.stakeholder_analysis
  ADD COLUMN IF NOT EXISTS legitimacy_level SMALLINT CHECK (legitimacy_level IS NULL OR (legitimacy_level >= 1 AND legitimacy_level <= 5)),
  ADD COLUMN IF NOT EXISTS urgency_level SMALLINT CHECK (urgency_level IS NULL OR (urgency_level >= 1 AND urgency_level <= 5)),
  ADD COLUMN IF NOT EXISTS salience_class TEXT CHECK (salience_class IS NULL OR salience_class IN (
    'dormant', 'discretionary', 'demanding', 'dominant', 'dangerous', 'dependent', 'definitive', 'latent'
  ));

COMMENT ON COLUMN public.stakeholder_analysis.legitimacy_level IS 'Stakeholder perceived legitimacy 1-5 (Mitchell et al. salience).';
COMMENT ON COLUMN public.stakeholder_analysis.urgency_level IS 'Time-sensitivity of stakeholder claims 1-5.';
COMMENT ON COLUMN public.stakeholder_analysis.salience_class IS 'Computed salience class: dormant/discretionary/demanding/dominant/dangerous/dependent/definitive/latent.';

-- Simulator: sim.practice_stakeholder_analysis
ALTER TABLE sim.practice_stakeholder_analysis
  ADD COLUMN IF NOT EXISTS legitimacy_level SMALLINT CHECK (legitimacy_level IS NULL OR (legitimacy_level >= 1 AND legitimacy_level <= 5)),
  ADD COLUMN IF NOT EXISTS urgency_level SMALLINT CHECK (urgency_level IS NULL OR (urgency_level >= 1 AND urgency_level <= 5)),
  ADD COLUMN IF NOT EXISTS salience_class TEXT CHECK (salience_class IS NULL OR salience_class IN (
    'dormant', 'discretionary', 'demanding', 'dominant', 'dangerous', 'dependent', 'definitive', 'latent'
  ));

COMMENT ON COLUMN sim.practice_stakeholder_analysis.legitimacy_level IS 'Legitimacy 1-5 (simulator).';
COMMENT ON COLUMN sim.practice_stakeholder_analysis.urgency_level IS 'Urgency 1-5 (simulator).';
COMMENT ON COLUMN sim.practice_stakeholder_analysis.salience_class IS 'Salience class (simulator).';
