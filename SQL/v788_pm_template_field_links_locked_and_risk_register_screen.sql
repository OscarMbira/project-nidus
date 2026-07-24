-- =============================================================================
-- v788: Mandatory field lock + Risk Register screen_code (public + sim)
-- Plan: projectplan/v785_native_register_methodology_awareness_plan.md
-- Gaps 3 + 5
-- Prerequisites: v764 / v764c (pm_template_field_links), v517 / v519 (system_screens)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Gap 3: locked flag on field links (descendants cannot disable)
-- -----------------------------------------------------------------------------
ALTER TABLE public.pm_template_field_links
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.pm_template_field_links.locked IS
  'When true, descendant tiers cannot disable this field (mandatory capture). The locking tier may unlock on its own node.';

ALTER TABLE sim.pm_template_field_links
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN sim.pm_template_field_links.locked IS
  'When true, descendant tiers cannot disable this field (mandatory capture). The locking tier may unlock on its own node.';

-- -----------------------------------------------------------------------------
-- Gap 5: risk_register screen (separate from risk_detail entry screen)
-- -----------------------------------------------------------------------------
INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('risk', 'risk_register', 'Risk register (tier fields)', 'risk', '/platform/projects/:projectId/risk-register', 2)
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
    ('risk', 'risk_register', 'Risk register (tier fields)', 'risk', '/simulator/practice-risk-register', 2)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();
