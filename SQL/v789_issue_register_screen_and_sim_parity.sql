-- =============================================================================
-- v789: Issue Register screen_code + Simulator parity (closure_date)
-- Plan: projectplan/v787_issue_register_tier_inheritance_plan.md
-- Prerequisites: v764/v764c (pm_template hierarchy), v788 (system_screens pattern),
--                v174 (public.issues.closure_date), v233 (sim.practice_issues)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sim parity: public.issues already has closure_date (v174); sim.practice_issues does not
-- -----------------------------------------------------------------------------
ALTER TABLE sim.practice_issues
  ADD COLUMN IF NOT EXISTS closure_date DATE;

COMMENT ON COLUMN sim.practice_issues.closure_date IS
  'Parity with public.issues.closure_date (v174) — date the issue was formally closed.';

-- -----------------------------------------------------------------------------
-- issue_register screen (mirrors v788's risk_register pattern)
-- -----------------------------------------------------------------------------
INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('issues', 'issue_register', 'Issue register (tier fields)', 'issue', '/platform/projects/:projectId/issue-register', 2)
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
    ('issues', 'issue_register', 'Issue register (tier fields)', 'issue', '/simulator/practice-issue-register', 2)
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
  RAISE NOTICE 'v789_issue_register_screen_and_sim_parity.sql applied';
END $$;
