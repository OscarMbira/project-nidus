-- =============================================================================
-- v799: delivery_methodology_track on Portfolio / Programme (+ sim mirrors)
-- Plan: projectplan/v798_template_library_menu_rationalisation_and_copy_plan.md
-- Same allowed values as projects (v672 / v798): structured | standards_based | agile | hybrid
-- NULL = not flagged → inherit from nearest ancestor / org default
-- =============================================================================

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS delivery_methodology_track TEXT;

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS delivery_methodology_track TEXT;

ALTER TABLE sim.practice_portfolios
  ADD COLUMN IF NOT EXISTS delivery_methodology_track TEXT;

ALTER TABLE sim.practice_programmes
  ADD COLUMN IF NOT EXISTS delivery_methodology_track TEXT;

ALTER TABLE public.portfolios DROP CONSTRAINT IF EXISTS chk_portfolios_delivery_methodology_track;
ALTER TABLE public.portfolios
  ADD CONSTRAINT chk_portfolios_delivery_methodology_track CHECK (
    delivery_methodology_track IS NULL
    OR delivery_methodology_track IN ('structured', 'standards_based', 'agile', 'hybrid')
  );

ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS chk_programmes_delivery_methodology_track;
ALTER TABLE public.programmes
  ADD CONSTRAINT chk_programmes_delivery_methodology_track CHECK (
    delivery_methodology_track IS NULL
    OR delivery_methodology_track IN ('structured', 'standards_based', 'agile', 'hybrid')
  );

ALTER TABLE sim.practice_portfolios DROP CONSTRAINT IF EXISTS chk_practice_portfolios_delivery_methodology_track;
ALTER TABLE sim.practice_portfolios
  ADD CONSTRAINT chk_practice_portfolios_delivery_methodology_track CHECK (
    delivery_methodology_track IS NULL
    OR delivery_methodology_track IN ('structured', 'standards_based', 'agile', 'hybrid')
  );

ALTER TABLE sim.practice_programmes DROP CONSTRAINT IF EXISTS chk_practice_programmes_delivery_methodology_track;
ALTER TABLE sim.practice_programmes
  ADD CONSTRAINT chk_practice_programmes_delivery_methodology_track CHECK (
    delivery_methodology_track IS NULL
    OR delivery_methodology_track IN ('structured', 'standards_based', 'agile', 'hybrid')
  );

COMMENT ON COLUMN public.portfolios.delivery_methodology_track IS
  'Delivery-level methodology flag (nullable = inherit). structured | standards_based | agile | hybrid';
COMMENT ON COLUMN public.programmes.delivery_methodology_track IS
  'Delivery-level methodology flag (nullable = inherit). structured | standards_based | agile | hybrid';
COMMENT ON COLUMN sim.practice_portfolios.delivery_methodology_track IS
  'Simulator mirror of portfolios.delivery_methodology_track';
COMMENT ON COLUMN sim.practice_programmes.delivery_methodology_track IS
  'Simulator mirror of programmes.delivery_methodology_track';

DO $$
BEGIN
  RAISE NOTICE 'v799_portfolio_programme_delivery_methodology.sql applied';
END $$;
