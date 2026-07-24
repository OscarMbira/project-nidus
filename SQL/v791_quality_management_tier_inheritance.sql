-- =============================================================================
-- v791: Quality Management tier-inheritance — sim parity + screen_codes
-- Plan: projectplan/v790_quality_management_tier_inheritance_plan.md
-- Prerequisites: v234 (sim.practice_quality_register), v299 (reviews/inspections),
--                v517 (system_modules quality), v788/v789 (system_screens pattern)
-- Note: SQL version is v791 because v790_list_risk_category_options.sql already exists.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sim parity: URL columns on practice_quality_register (public has these since v32)
-- -----------------------------------------------------------------------------
ALTER TABLE sim.practice_quality_register
  ADD COLUMN IF NOT EXISTS product_document_url TEXT,
  ADD COLUMN IF NOT EXISTS quality_plan_url TEXT,
  ADD COLUMN IF NOT EXISTS quality_report_url TEXT;

COMMENT ON COLUMN sim.practice_quality_register.product_document_url IS
  'Parity with public.quality_register.product_document_url';
COMMENT ON COLUMN sim.practice_quality_register.quality_plan_url IS
  'Parity with public.quality_register.quality_plan_url';
COMMENT ON COLUMN sim.practice_quality_register.quality_report_url IS
  'Parity with public.quality_register.quality_report_url';

-- -----------------------------------------------------------------------------
-- Sim parity: v184-equivalent columns on practice_quality_reviews
-- (UUID FKs kept soft where sim counterparts for QMS methods/activities may be absent)
-- -----------------------------------------------------------------------------
ALTER TABLE sim.practice_quality_reviews
  ADD COLUMN IF NOT EXISTS activity_identifier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS programme_id UUID,
  ADD COLUMN IF NOT EXISTS forecast_date DATE,
  ADD COLUMN IF NOT EXISTS sign_off_planned_date DATE,
  ADD COLUMN IF NOT EXISTS sign_off_forecast_date DATE,
  ADD COLUMN IF NOT EXISTS quality_records_refs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_review_id UUID,
  ADD COLUMN IF NOT EXISTS is_reassessment BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reassessment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qms_id UUID,
  ADD COLUMN IF NOT EXISTS qms_method_id UUID,
  ADD COLUMN IF NOT EXISTS qms_scheduled_activity_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'practice_quality_reviews_parent_review_id_fkey'
  ) THEN
    ALTER TABLE sim.practice_quality_reviews
      ADD CONSTRAINT practice_quality_reviews_parent_review_id_fkey
      FOREIGN KEY (parent_review_id) REFERENCES sim.practice_quality_reviews(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_quality_management_strategies'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'practice_quality_reviews_qms_id_fkey'
  ) THEN
    ALTER TABLE sim.practice_quality_reviews
      ADD CONSTRAINT practice_quality_reviews_qms_id_fkey
      FOREIGN KEY (qms_id) REFERENCES sim.practice_quality_management_strategies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_practice_quality_reviews_activity_identifier_unique
  ON sim.practice_quality_reviews(activity_identifier)
  WHERE is_deleted = FALSE AND activity_identifier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practice_quality_reviews_parent_review_id
  ON sim.practice_quality_reviews(parent_review_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_practice_quality_reviews_is_reassessment
  ON sim.practice_quality_reviews(is_reassessment) WHERE is_reassessment = TRUE;

-- -----------------------------------------------------------------------------
-- Sim parity: v184-equivalent columns on practice_quality_inspections
-- -----------------------------------------------------------------------------
ALTER TABLE sim.practice_quality_inspections
  ADD COLUMN IF NOT EXISTS activity_identifier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS programme_id UUID,
  ADD COLUMN IF NOT EXISTS forecast_date DATE,
  ADD COLUMN IF NOT EXISTS sign_off_planned_date DATE,
  ADD COLUMN IF NOT EXISTS sign_off_forecast_date DATE,
  ADD COLUMN IF NOT EXISTS sign_off_actual_date DATE,
  ADD COLUMN IF NOT EXISTS quality_records_refs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_inspection_id UUID,
  ADD COLUMN IF NOT EXISTS is_reassessment BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reassessment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qms_id UUID,
  ADD COLUMN IF NOT EXISTS qms_method_id UUID,
  ADD COLUMN IF NOT EXISTS qms_scheduled_activity_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'practice_quality_inspections_parent_inspection_id_fkey'
  ) THEN
    ALTER TABLE sim.practice_quality_inspections
      ADD CONSTRAINT practice_quality_inspections_parent_inspection_id_fkey
      FOREIGN KEY (parent_inspection_id) REFERENCES sim.practice_quality_inspections(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_quality_management_strategies'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'practice_quality_inspections_qms_id_fkey'
  ) THEN
    ALTER TABLE sim.practice_quality_inspections
      ADD CONSTRAINT practice_quality_inspections_qms_id_fkey
      FOREIGN KEY (qms_id) REFERENCES sim.practice_quality_management_strategies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_practice_quality_inspections_activity_identifier_unique
  ON sim.practice_quality_inspections(activity_identifier)
  WHERE is_deleted = FALSE AND activity_identifier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practice_quality_inspections_parent_inspection_id
  ON sim.practice_quality_inspections(parent_inspection_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_practice_quality_inspections_is_reassessment
  ON sim.practice_quality_inspections(is_reassessment) WHERE is_reassessment = TRUE;

-- -----------------------------------------------------------------------------
-- Screen identity: quality_register / quality_review / quality_inspection
-- -----------------------------------------------------------------------------
INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('quality', 'quality_register', 'Quality register (tier fields)', 'quality_register', '/platform/quality', 1),
    ('quality', 'quality_review', 'Quality review (tier fields)', 'quality_review', '/platform/quality/reviews', 2),
    ('quality', 'quality_inspection', 'Quality inspection (tier fields)', 'quality_inspection', '/platform/quality/inspections', 3)
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
    ('quality', 'quality_register', 'Quality register (tier fields)', 'quality_register', '/simulator/quality', 1),
    ('quality', 'quality_review', 'Quality review (tier fields)', 'quality_review', '/simulator/quality/reviews', 2),
    ('quality', 'quality_inspection', 'Quality inspection (tier fields)', 'quality_inspection', '/simulator/quality/inspections', 3)
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
  RAISE NOTICE 'v791_quality_management_tier_inheritance.sql applied';
END $$;
