-- =============================================================================
-- v672: Align projects.delivery_methodology with methodology track ids
-- Extends v153 — safe default hybrid for existing rows
-- =============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS delivery_methodology_track TEXT;

COMMENT ON COLUMN public.projects.delivery_methodology_track IS
  'Normalised track: structured | pmbok | agile | hybrid (sidebar filter)';

-- Backfill track from legacy delivery_methodology text
UPDATE public.projects
SET delivery_methodology_track = CASE
  WHEN delivery_methodology IS NULL OR BTRIM(delivery_methodology) = '' THEN 'hybrid'
  WHEN LOWER(delivery_methodology) IN ('hybrid', 'prince2 + agile') THEN 'hybrid'
  WHEN LOWER(delivery_methodology) IN ('structured', 'prince2', 'waterfall', 'structured_pm') THEN 'structured'
  WHEN LOWER(delivery_methodology) LIKE '%pmbok%' THEN 'pmbok'
  WHEN LOWER(delivery_methodology) IN ('agile', 'scrum', 'kanban') THEN 'agile'
  ELSE 'hybrid'
END,
updated_at = NOW()
WHERE delivery_methodology_track IS NULL
  AND COALESCE(is_deleted, FALSE) = FALSE;

ALTER TABLE public.projects
  ALTER COLUMN delivery_methodology_track SET DEFAULT 'hybrid';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_projects_delivery_methodology_track'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT chk_projects_delivery_methodology_track
      CHECK (
        delivery_methodology_track IS NULL
        OR delivery_methodology_track IN ('structured', 'pmbok', 'agile', 'hybrid')
      );
  END IF;
END $$;

-- Simulator practice projects parity (column is methodology_id, not methodology)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_projects'
  ) THEN
    ALTER TABLE sim.practice_projects
      ADD COLUMN IF NOT EXISTS delivery_methodology_track TEXT DEFAULT 'hybrid';

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'sim'
        AND table_name = 'practice_projects'
        AND column_name = 'methodology_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'methodologies'
    ) THEN
      UPDATE sim.practice_projects pp
      SET delivery_methodology_track = CASE
        WHEN LOWER(COALESCE(m.methodology_code, '')) IN (
          'structured_pm', 'prince2', 'waterfall', 'structured', 'traditional'
        ) THEN 'structured'
        WHEN LOWER(COALESCE(m.methodology_code, '')) LIKE '%pmbok%'
          OR LOWER(COALESCE(m.methodology_category, '')) LIKE '%pmbok%' THEN 'pmbok'
        WHEN LOWER(COALESCE(m.methodology_code, '')) IN ('agile', 'scrum', 'kanban')
          OR LOWER(COALESCE(m.methodology_category, '')) = 'agile' THEN 'agile'
        WHEN LOWER(COALESCE(m.methodology_category, '')) IN ('traditional', 'hybrid') THEN 'hybrid'
        ELSE 'hybrid'
      END,
      updated_at = NOW()
      FROM public.methodologies m
      WHERE pp.methodology_id = m.id
        AND COALESCE(m.is_deleted, FALSE) = FALSE
        AND pp.delivery_methodology_track IS NULL;
    END IF;

    UPDATE sim.practice_projects
    SET delivery_methodology_track = 'hybrid',
        updated_at = NOW()
    WHERE delivery_methodology_track IS NULL;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_practice_projects_delivery_methodology_track'
    ) THEN
      ALTER TABLE sim.practice_projects
        ADD CONSTRAINT chk_practice_projects_delivery_methodology_track
        CHECK (
          delivery_methodology_track IS NULL
          OR delivery_methodology_track IN ('structured', 'pmbok', 'agile', 'hybrid')
        );
    END IF;
  END IF;
END $$;

-- simulation_runs methodology alignment (learner runs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'simulation_runs'
  ) THEN
    ALTER TABLE sim.simulation_runs
      ADD COLUMN IF NOT EXISTS delivery_methodology_track TEXT;

    UPDATE sim.simulation_runs
    SET delivery_methodology_track = CASE
      WHEN LOWER(COALESCE(methodology, '')) IN ('traditional', 'structured') THEN 'structured'
      WHEN LOWER(COALESCE(methodology, '')) LIKE '%pmbok%' THEN 'pmbok'
      WHEN LOWER(COALESCE(methodology, '')) IN ('agile', 'scrum') THEN 'agile'
      WHEN LOWER(COALESCE(methodology, '')) = 'hybrid' THEN 'hybrid'
      ELSE 'hybrid'
    END
    WHERE delivery_methodology_track IS NULL;
  END IF;
END $$;
