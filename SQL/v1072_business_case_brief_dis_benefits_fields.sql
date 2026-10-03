-- ============================================================================
-- v1072: Optional dis-benefits capture on Business Case + Project Brief (Charter alias)
-- ============================================================================
-- Organisation may choose to capture dis-benefits; default included = true.
-- Multiline list values stored as newline-joined text (same pattern as BRP).
-- ============================================================================

ALTER TABLE public.business_cases
  ADD COLUMN IF NOT EXISTS dis_benefits_included BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dis_benefits_description TEXT;

COMMENT ON COLUMN public.business_cases.dis_benefits_included IS
  'When true, organisation is capturing dis-benefits for this business case (default true).';
COMMENT ON COLUMN public.business_cases.dis_benefits_description IS
  'Newline-joined list of dis-benefits / negative consequences (optional).';

ALTER TABLE public.project_briefs
  ADD COLUMN IF NOT EXISTS dis_benefits_included BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dis_benefits_description TEXT;

COMMENT ON COLUMN public.project_briefs.dis_benefits_included IS
  'When true, organisation is capturing dis-benefits on the outline business case (default true).';
COMMENT ON COLUMN public.project_briefs.dis_benefits_description IS
  'Newline-joined list of dis-benefits for the outline business case (optional).';

-- Simulator practice mirrors (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_business_cases'
  ) THEN
    ALTER TABLE sim.practice_business_cases
      ADD COLUMN IF NOT EXISTS dis_benefits_included BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS dis_benefits_description TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_project_briefs'
  ) THEN
    ALTER TABLE sim.practice_project_briefs
      ADD COLUMN IF NOT EXISTS dis_benefits_included BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS dis_benefits_description TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'business_cases'
  ) THEN
    ALTER TABLE sim.business_cases
      ADD COLUMN IF NOT EXISTS dis_benefits_included BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS dis_benefits_description TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'project_briefs'
  ) THEN
    ALTER TABLE sim.project_briefs
      ADD COLUMN IF NOT EXISTS dis_benefits_included BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS dis_benefits_description TEXT;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v1072: dis_benefits_included + dis_benefits_description on business_cases and project_briefs';
END $$;
