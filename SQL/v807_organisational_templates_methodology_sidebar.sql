-- =============================================================================
-- v807: Methodology-grouped sidebar for Organisational Templates (Platform + Simulator)
-- Plan: projectplan/v807_organisational_template_methodology_sidebar_and_downstream_inheritance_plan.md
-- Depends on: v805 (plat_tpl_organisational / sim_tpl_organisational must already exist)
--
-- Adds, under the existing "Organisational Templates" leaf, 3 tier-group header
-- rows (Portfolio / Programme / Project — non-navigable, route_path NULL) each
-- with 3 methodology leaves (Structured / Standards-Based / Agile) — mirrors
-- the Admin app's Global Templates nav grouping (defaultAdminNav.js).
--
-- CORRECTION (from an earlier draft of this file): leaf route query params use
-- methodology=standards_based, NOT methodology=pmbok. SQL/v785 originally
-- constrained pm_template_nodes.methodology to 'pmbok'|'structured'|'agile',
-- and SQL/v797 renamed only the *display label* to "Standards-Based" — but
-- SQL/v798 (found after an earlier draft of this file was tested against a
-- live DB and hit "Invalid methodology: pmbok") later renamed the STORED
-- identifier itself, updating both the CHECK constraints and
-- sync_global_template_node's own validation to require 'standards_based'.
-- 'pmbok' is rejected outright by the live function today.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Platform: 3 tier-group headers under plat_tpl_organisational
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT v.menu_code, v.menu_label, v.menu_description, par.id,
       COALESCE(par.menu_level, 2) + 1, v.sort_order, NULL, v.menu_icon, 'universal', TRUE, TRUE
FROM public.menu_items par
CROSS JOIN (VALUES
  ('plat_tpl_org_portfolio', 'Portfolio', 'Organisational Portfolio templates', 10, 'briefcase'),
  ('plat_tpl_org_programme', 'Programme', 'Organisational Programme templates', 20, 'network'),
  ('plat_tpl_org_project',   'Project',   'Organisational Project templates',   30, 'folder-kanban')
) AS v(menu_code, menu_label, menu_description, sort_order, menu_icon)
WHERE par.menu_code = 'plat_tpl_organisational'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Platform: 9 methodology leaves (3 per tier group)
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT v.menu_code, v.menu_label, v.menu_description, par.id,
       COALESCE(par.menu_level, 3) + 1, v.sort_order, v.route_path, v.menu_icon, v.track, TRUE, TRUE
FROM public.menu_items par
JOIN (VALUES
  ('plat_tpl_org_portfolio', 'plat_tpl_org_portfolio_structured',      'Structured',      'Organisational Portfolio templates — Structured',      10, '/app/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=structured',      'shield',      'structured'),
  ('plat_tpl_org_portfolio', 'plat_tpl_org_portfolio_standards_based', 'Standards-Based', 'Organisational Portfolio templates — Standards-Based',  20, '/app/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=standards_based', 'settings-2',  'standards_based'),
  ('plat_tpl_org_portfolio', 'plat_tpl_org_portfolio_agile',           'Agile',           'Organisational Portfolio templates — Agile',            30, '/app/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=agile',           'zap',         'agile'),

  ('plat_tpl_org_programme', 'plat_tpl_org_programme_structured',      'Structured',      'Organisational Programme templates — Structured',       10, '/app/pmo/organisational-templates?tier=programme&domain=programme_template&methodology=structured',      'shield',      'structured'),
  ('plat_tpl_org_programme', 'plat_tpl_org_programme_standards_based', 'Standards-Based', 'Organisational Programme templates — Standards-Based',  20, '/app/pmo/organisational-templates?tier=programme&domain=programme_template&methodology=standards_based', 'settings-2',  'standards_based'),
  ('plat_tpl_org_programme', 'plat_tpl_org_programme_agile',           'Agile',           'Organisational Programme templates — Agile',            30, '/app/pmo/organisational-templates?tier=programme&domain=programme_template&methodology=agile',           'zap',         'agile'),

  ('plat_tpl_org_project',   'plat_tpl_org_project_structured',        'Structured',      'Organisational Project templates — Structured',         10, '/app/pmo/organisational-templates?tier=project&domain=project_template&methodology=structured',           'shield',      'structured'),
  ('plat_tpl_org_project',   'plat_tpl_org_project_standards_based',   'Standards-Based', 'Organisational Project templates — Standards-Based',    20, '/app/pmo/organisational-templates?tier=project&domain=project_template&methodology=standards_based',      'settings-2',  'standards_based'),
  ('plat_tpl_org_project',   'plat_tpl_org_project_agile',             'Agile',           'Organisational Project templates — Agile',              30, '/app/pmo/organisational-templates?tier=project&domain=project_template&methodology=agile',                'zap',         'agile')
) AS v(parent_code, menu_code, menu_label, menu_description, sort_order, route_path, menu_icon, track)
  ON par.menu_code = v.parent_code
WHERE COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Simulator: 3 tier-group headers under sim_tpl_organisational
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT v.menu_code, v.menu_label, v.menu_description, par.id,
       COALESCE(par.menu_level, 2) + 1, v.sort_order, NULL, v.menu_icon, 'universal', TRUE, TRUE
FROM public.menu_items par
CROSS JOIN (VALUES
  ('sim_tpl_org_portfolio', 'Portfolio', 'Organisational Portfolio templates', 10, 'briefcase'),
  ('sim_tpl_org_programme', 'Programme', 'Organisational Programme templates', 20, 'network'),
  ('sim_tpl_org_project',   'Project',   'Organisational Project templates',   30, 'folder-kanban')
) AS v(menu_code, menu_label, menu_description, sort_order, menu_icon)
WHERE par.menu_code = 'sim_tpl_organisational'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Simulator: 9 methodology leaves (3 per tier group)
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT v.menu_code, v.menu_label, v.menu_description, par.id,
       COALESCE(par.menu_level, 3) + 1, v.sort_order, v.route_path, v.menu_icon, v.track, TRUE, TRUE
FROM public.menu_items par
JOIN (VALUES
  ('sim_tpl_org_portfolio', 'sim_tpl_org_portfolio_structured',      'Structured',      'Organisational Portfolio templates — Structured',      10, '/simulator/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=structured',      'shield',      'structured'),
  ('sim_tpl_org_portfolio', 'sim_tpl_org_portfolio_standards_based', 'Standards-Based', 'Organisational Portfolio templates — Standards-Based',  20, '/simulator/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=standards_based', 'settings-2',  'standards_based'),
  ('sim_tpl_org_portfolio', 'sim_tpl_org_portfolio_agile',           'Agile',           'Organisational Portfolio templates — Agile',            30, '/simulator/pmo/organisational-templates?tier=portfolio&domain=portfolio_template&methodology=agile',           'zap',         'agile'),

  ('sim_tpl_org_programme', 'sim_tpl_org_programme_structured',      'Structured',      'Organisational Programme templates — Structured',       10, '/simulator/pmo/organisational-templates?tier=programme&domain=programme_template&methodology=structured',      'shield',      'structured'),
  ('sim_tpl_org_programme', 'sim_tpl_org_programme_standards_based', 'Standards-Based', 'Organisational Programme templates — Standards-Based',  20, '/simulator/pmo/organisational-templates?tier=programme&domain=programme_template&methodology=standards_based', 'settings-2',  'standards_based'),
  ('sim_tpl_org_programme', 'sim_tpl_org_programme_agile',           'Agile',           'Organisational Programme templates — Agile',            30, '/simulator/pmo/organisational-templates?tier=programme&domain=programme_template&methodology=agile',           'zap',         'agile'),

  ('sim_tpl_org_project',   'sim_tpl_org_project_structured',        'Structured',      'Organisational Project templates — Structured',         10, '/simulator/pmo/organisational-templates?tier=project&domain=project_template&methodology=structured',           'shield',      'structured'),
  ('sim_tpl_org_project',   'sim_tpl_org_project_standards_based',   'Standards-Based', 'Organisational Project templates — Standards-Based',    20, '/simulator/pmo/organisational-templates?tier=project&domain=project_template&methodology=standards_based',      'settings-2',  'standards_based'),
  ('sim_tpl_org_project',   'sim_tpl_org_project_agile',             'Agile',           'Organisational Project templates — Agile',              30, '/simulator/pmo/organisational-templates?tier=project&domain=project_template&methodology=agile',                'zap',         'agile')
) AS v(parent_code, menu_code, menu_label, menu_description, sort_order, route_path, menu_icon, track)
  ON par.menu_code = v.parent_code
WHERE COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Role grants — same pattern as v805/v806 (group headers AND leaves both need
-- a grant row, or a role with access to plat_tpl_organisational still won't
-- see the new children — group headers aren't auto-inherited).
-- ---------------------------------------------------------------------------
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN (
  'plat_tpl_org_portfolio', 'plat_tpl_org_programme', 'plat_tpl_org_project',
  'plat_tpl_org_portfolio_structured', 'plat_tpl_org_portfolio_standards_based', 'plat_tpl_org_portfolio_agile',
  'plat_tpl_org_programme_structured', 'plat_tpl_org_programme_standards_based', 'plat_tpl_org_programme_agile',
  'plat_tpl_org_project_structured', 'plat_tpl_org_project_standards_based', 'plat_tpl_org_project_agile',
  'sim_tpl_org_portfolio', 'sim_tpl_org_programme', 'sim_tpl_org_project',
  'sim_tpl_org_portfolio_structured', 'sim_tpl_org_portfolio_standards_based', 'sim_tpl_org_portfolio_agile',
  'sim_tpl_org_programme_structured', 'sim_tpl_org_programme_standards_based', 'sim_tpl_org_programme_agile',
  'sim_tpl_org_project_structured', 'sim_tpl_org_project_standards_based', 'sim_tpl_org_project_agile'
)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'pmo_admin', 'system_admin', 'account_owner',
    'PMO Admin', 'System Admin', 'Superuser'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Smoke test (run after applying) — every row below should show can_view=true /
-- can_use=true / is_active=true / is_deleted=false, and parent_menu_id should
-- resolve to a non-null id in every case (same wrong-parent-guess risk called
-- out in v805/v806 — verify, don't assume).
-- ---------------------------------------------------------------------------
SELECT mi.menu_code, mi.parent_menu_id, par.menu_code AS parent_code, mi.route_path, mi.methodology
FROM public.menu_items mi
LEFT JOIN public.menu_items par ON par.id = mi.parent_menu_id
WHERE mi.menu_code LIKE 'plat_tpl_org_%' OR mi.menu_code LIKE 'sim_tpl_org_%'
ORDER BY mi.menu_code;

DO $$
BEGIN
  RAISE NOTICE 'v807_organisational_templates_methodology_sidebar.sql applied';
END $$;
