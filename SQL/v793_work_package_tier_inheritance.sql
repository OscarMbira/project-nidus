-- =============================================================================
-- v793: Work Package tier-inheritance — sim v216 column parity + screen_code
-- Plan: projectplan/v793_work_package_tier_inheritance_plan.md
-- Prerequisites: v23 (public.work_packages), v216 (public enhancement columns),
--                v231 (sim.practice_work_packages), v517 (system_modules),
--                v788/v789 (system_screens pattern)
-- Non-goal: do not port the 7 missing sim supporting tables (wp_quality_criteria, etc.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sim → Platform column parity (additive only — mirrors v216 on practice_work_packages)
-- -----------------------------------------------------------------------------
ALTER TABLE sim.practice_work_packages
  ADD COLUMN IF NOT EXISTS wp_reference VARCHAR(50),
  ADD COLUMN IF NOT EXISTS version_number VARCHAR(50) DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS release VARCHAR(50),
  ADD COLUMN IF NOT EXISTS document_ref VARCHAR(200),
  ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS team_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS work_description TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS assumptions TEXT,
  ADD COLUMN IF NOT EXISTS constraints TEXT,
  ADD COLUMN IF NOT EXISTS expected_outcomes TEXT,
  ADD COLUMN IF NOT EXISTS quality_methods TEXT,
  ADD COLUMN IF NOT EXISTS quality_responsibilities TEXT,
  ADD COLUMN IF NOT EXISTS forecast_start_date DATE,
  ADD COLUMN IF NOT EXISTS forecast_end_date DATE,
  ADD COLUMN IF NOT EXISTS effort_estimate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS effort_actual DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS resources_required TEXT,
  ADD COLUMN IF NOT EXISTS skills_required TEXT,
  ADD COLUMN IF NOT EXISTS reporting_arrangements TEXT,
  ADD COLUMN IF NOT EXISTS checkpoint_frequency VARCHAR(50),
  ADD COLUMN IF NOT EXISTS report_format VARCHAR(50),
  ADD COLUMN IF NOT EXISTS report_recipients TEXT,
  ADD COLUMN IF NOT EXISTS progress_indicator VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_progress_update DATE,
  ADD COLUMN IF NOT EXISTS authorization_notes TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_notes TEXT,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

COMMENT ON COLUMN sim.practice_work_packages.wp_reference IS
  'Parity with public.work_packages.wp_reference (v216)';
COMMENT ON COLUMN sim.practice_work_packages.work_description IS
  'Parity with public.work_packages.work_description (v216)';
COMMENT ON COLUMN sim.practice_work_packages.progress_indicator IS
  'Parity with public.work_packages.progress_indicator (on_track/at_risk/delayed/ahead_of_schedule)';

-- Soft-unique reference when present (matches public v216 intent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_practice_work_packages_wp_reference
  ON sim.practice_work_packages(wp_reference)
  WHERE wp_reference IS NOT NULL AND is_deleted = FALSE;

-- Optional CHECK for progress_indicator values (skip if already constrained)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_practice_wp_progress_indicator'
      AND conrelid = 'sim.practice_work_packages'::regclass
  ) THEN
    ALTER TABLE sim.practice_work_packages
      ADD CONSTRAINT chk_practice_wp_progress_indicator
      CHECK (
        progress_indicator IS NULL
        OR progress_indicator IN ('on_track', 'at_risk', 'delayed', 'ahead_of_schedule')
      );
  END IF;
END $$;

-- Backfill work_description from description when empty (parity with v216 migrate)
UPDATE sim.practice_work_packages
SET work_description = work_package_description
WHERE work_description IS NULL
  AND work_package_description IS NOT NULL
  AND is_deleted = FALSE;

-- -----------------------------------------------------------------------------
-- Screen identity: work_package (under projects module)
-- -----------------------------------------------------------------------------
INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('projects', 'work_package', 'Work package (tier fields)', 'work_package', '/platform/projects/:projectId/work-packages/:wpId', 21)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO sim.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM sim.system_modules m
JOIN (
  VALUES
    ('projects', 'work_package', 'Work package (tier fields)', 'work_package', '/simulator/practice-work-packages/:id', 21)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v793_work_package_tier_inheritance.sql applied';
END $$;
