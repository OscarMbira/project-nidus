-- =============================================================================
-- v792: Business Case tier-inheritance — sim parity + screen_code
-- Plan: projectplan/v791_business_case_tier_inheritance_plan.md
-- Prerequisites: v229 (sim.practice_business_cases), v260 (public.business_cases),
--                v517 (system_modules), v653/v656 (record lifecycle already on both),
--                v788/v789 (system_screens pattern)
-- Note: SQL version is v792 because v791_quality_management_tier_inheritance.sql exists.
--       Public governance/tailoring (v244) columns are NOT added — public.business_cases
--       already has rule-53 Record Lifecycle columns via v653.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sim → Platform column parity (additive only)
-- Skip generated total_investment_cost: sim cost columns differ (estimated_cost vs
-- development/ongoing).
-- -----------------------------------------------------------------------------
ALTER TABLE sim.practice_business_cases
  ADD COLUMN IF NOT EXISTS programme_id UUID,
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS funding_source TEXT,
  ADD COLUMN IF NOT EXISTS cost_assumptions TEXT,
  ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS investment_appraisal_notes TEXT,
  ADD COLUMN IF NOT EXISTS major_risks TEXT,
  ADD COLUMN IF NOT EXISTS overall_risk_rating VARCHAR(50),
  ADD COLUMN IF NOT EXISTS strategic_alignment TEXT,
  ADD COLUMN IF NOT EXISTS timescale_description TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS key_milestones TEXT;

COMMENT ON COLUMN sim.practice_business_cases.document_status IS
  'Parity with public.business_cases.document_status (draft/submitted/approved/rejected, etc.)';
COMMENT ON COLUMN sim.practice_business_cases.strategic_alignment IS
  'Parity with public.business_cases.strategic_alignment';
COMMENT ON COLUMN sim.practice_business_cases.programme_id IS
  'Optional programme context (soft UUID; may point at public or sim programme rows depending on host)';

CREATE INDEX IF NOT EXISTS idx_practice_business_cases_document_status
  ON sim.practice_business_cases(document_status) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_practice_business_cases_programme_id
  ON sim.practice_business_cases(programme_id) WHERE is_deleted = FALSE AND programme_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Screen identity: business_case (under projects module — no dedicated BC module in v517)
-- -----------------------------------------------------------------------------
INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('projects', 'business_case', 'Business case (tier fields)', 'business_case', '/platform/initiation/business-case', 20)
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
    ('projects', 'business_case', 'Business case (tier fields)', 'business_case', '/simulator/initiation/business-case', 20)
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
  RAISE NOTICE 'v792_business_case_tier_inheritance.sql applied (public governance columns skipped — lifecycle already present)';
END $$;
