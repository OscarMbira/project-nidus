-- ============================================================================
-- v1575 — Menus for cross-project levelling and portfolio scoring / scenarios
-- Project levelling itself is a schedule view (Level resources), not a new sidebar row.
-- These rows hang off the Resources and Portfolio items, with no placement of their
-- own, so they appear inside those menus. Idempotent.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_res_levelling', 'Level resources',
  'Propose a schedule across projects so shared people stay within their hours (v1354).',
  '/platform/resources/levelling',
  p.id, 4, 80, 'universal', 'users', TRUE, TRUE, 'money_resources', NOW(), NOW()
FROM public.menu_items p
WHERE p.menu_code = 'plat_pm_resources' AND COALESCE(p.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_res_levelling')
LIMIT 1;

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim_res_levelling', 'Level resources',
  'Propose a practice schedule across projects so shared people stay within their hours (v1354).',
  '/simulator/resources/levelling',
  p.id, 4, 80, 'universal', 'users', TRUE, TRUE, 'money_resources', NOW(), NOW()
FROM public.menu_items p
WHERE p.menu_code IN ('sim_pm_resources', 'sim_pm_planning_section') AND COALESCE(p.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_res_levelling')
ORDER BY CASE p.menu_code WHEN 'sim_pm_resources' THEN 0 ELSE 1 END
LIMIT 1;

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at
)
SELECT gen_random_uuid(), v.code, v.label, v.description, v.route, p.id, 4, v.sort_order,
  'universal', 'target', TRUE, TRUE, 'readiness_close', NOW(), NOW()
FROM (VALUES
  ('plat_portfolio_scoring', 'Scoring', 'Score candidate projects against weighted criteria (v1354).', '/platform/portfolio/scoring', 40),
  ('plat_portfolio_scenarios', 'Scenarios', 'Choose a set of projects within budget and capacity (v1354).', '/platform/portfolio/scenarios', 50)
) AS v(code, label, description, route, sort_order)
JOIN public.menu_items p ON p.route_path = '/platform/portfolio' AND COALESCE(p.is_deleted, FALSE) = FALSE
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = v.code);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at
)
SELECT gen_random_uuid(), v.code, v.label, v.description, v.route, p.id, 4, v.sort_order,
  'universal', 'target', TRUE, TRUE, 'readiness_close', NOW(), NOW()
FROM (VALUES
  ('sim_portfolio_scoring', 'Scoring', 'Score practice projects against weighted criteria (v1354).', '/simulator/practice-portfolio/scoring', 40),
  ('sim_portfolio_scenarios', 'Scenarios', 'Choose a set of practice projects within budget and capacity (v1354).', '/simulator/practice-portfolio/scenarios', 50)
) AS v(code, label, description, route, sort_order)
JOIN public.menu_items p ON p.route_path = '/simulator/practice-portfolio' AND COALESCE(p.is_deleted, FALSE) = FALSE
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = v.code);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_resources'
JOIN public.menu_items dst ON dst.menu_code = 'plat_res_levelling'
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code IN ('sim_pm_resources', 'sim_pm_planning_section')
JOIN public.menu_items dst ON dst.menu_code = 'sim_res_levelling'
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.route_path = '/platform/portfolio'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_portfolio_scoring', 'plat_portfolio_scenarios')
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.route_path = '/simulator/practice-portfolio'
JOIN public.menu_items dst ON dst.menu_code IN ('sim_portfolio_scoring', 'sim_portfolio_scenarios')
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
