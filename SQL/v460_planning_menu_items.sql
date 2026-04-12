-- =============================================================================
-- v460_planning_menu_items.sql
-- Planning Intelligence Module — Permissions + Menu Items + Role Assignments
-- Platform: public schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Insert Permissions
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.permissions (permission_code, permission_name, permission_description, permission_module, is_active)
VALUES
  ('planning.view',                  'View Planning Module',           'Access all planning intelligence features',                    'planning', TRUE),
  ('planning.intelligence.manage',   'Manage Intelligence Rules',      'Configure and manage plan quality rules (PMO/Admin)',           'planning', TRUE),
  ('planning.scenario.create',       'Create Scenarios',               'Create new what-if planning scenarios',                        'planning', TRUE),
  ('planning.scenario.promote',      'Promote Scenario to Baseline',   'Promote a scenario to the approved schedule baseline',         'planning', TRUE),
  ('planning.pbs.edit',              'Edit Product Breakdown',         'Create and edit PBS nodes and product flow diagram',           'planning', TRUE),
  ('planning.health.view',           'View Health Scores',             'View schedule health scores and trend charts',                 'planning', TRUE),
  ('planning.ai.use',                'Use AI Plan Generator',          'Use the AI wizard to generate project plans',                  'planning', TRUE),
  ('planning.executive.view',        'Executive Decision Mode',        'Access the executive summary view for planning',               'planning', TRUE),
  ('planning.collision.view',        'View Portfolio Collisions',      'View cross-project resource and milestone conflicts',           'planning', TRUE),
  ('planning.recovery.manage',       'Manage Recovery Options',        'Create and approve recovery strategies for delayed projects',  'planning', TRUE),
  ('planning.governance.config',     'Configure Governance Rules',     'Set up governance gate rules by project type',                 'planning', TRUE),
  ('planning.confidence.edit',       'Set Confidence Values',          'Set confidence percentages and uncertainty bands on tasks',    'planning', TRUE),
  ('planning.microplan.view',        'View Micro Plans',               'View all team micro-plans in a project',                      'planning', TRUE),
  ('planning.microplan.create',      'Create Micro Plans',             'Create a new team micro-plan',                                'planning', TRUE),
  ('planning.microplan.edit',        'Edit Own Micro Plans',           'Edit micro-plans owned by the current user',                  'planning', TRUE),
  ('planning.microplan.edit_any',    'Edit Any Micro Plan',            'Edit any micro-plan in a project (PM/Admin)',                  'planning', TRUE),
  ('planning.microplan.delete',      'Delete Micro Plans',             'Archive or delete own micro-plans',                           'planning', TRUE),
  ('planning.microplan.approve',     'Approve Micro Plans',            'Approve and version-stamp micro-plans',                       'planning', TRUE)
ON CONFLICT (permission_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Menu Items — PM Dashboard (Planning sub-menu)
--    Resolves parent_menu_id by looking up menu_code = 'planning'
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Upsert the parent "Planning" section
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('planning', 'Planning', 'Project planning and scheduling tools', NULL, 1, 70, NULL, 'LayoutDashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    menu_icon       = EXCLUDED.menu_icon,
    is_active       = EXCLUDED.is_active,
    updated_at      = NOW();

  SELECT id INTO v_parent_id FROM public.menu_items WHERE menu_code = 'planning' LIMIT 1;

  -- Insert PM child menu items
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('planning_hub',          'Planning Hub',        'Main planning dashboard',                        v_parent_id, 2, 10,  '/pm/planning',                   'LayoutDashboard', TRUE, TRUE),
    ('planning_intelligence', 'Plan Intelligence',   'Automated plan quality analysis',                v_parent_id, 2, 20,  '/pm/planning/intelligence',      'SearchCode',      TRUE, TRUE),
    ('planning_scenarios',    'Scenarios',           'What-if planning scenarios',                     v_parent_id, 2, 30,  '/pm/planning/scenarios',         'GitBranch',       TRUE, TRUE),
    ('planning_pbs',          'Product Plan (PBS)',  'Product breakdown structure and flow diagram',   v_parent_id, 2, 40,  '/pm/planning/pbs',               'PackageOpen',     TRUE, TRUE),
    ('planning_health',       'Plan Health Score',   'Schedule health scores and trend charts',        v_parent_id, 2, 50,  '/pm/planning/health',            'HeartPulse',      TRUE, TRUE),
    ('planning_ai',           'AI Plan Generator',   'AI wizard to generate project plans',            v_parent_id, 2, 60,  '/pm/planning/ai',                'Sparkles',        TRUE, TRUE),
    ('planning_executive',    'Executive View',      'Executive summary view for planning',            v_parent_id, 2, 70,  '/pm/planning/executive',         'Presentation',    TRUE, TRUE),
    ('planning_recovery',     'Recovery Planning',   'Recovery strategies for delayed projects',       v_parent_id, 2, 80,  '/pm/planning/recovery',          'RefreshCcw',      TRUE, TRUE),
    ('planning_confidence',   'Confidence Forecast', 'Confidence percentages and uncertainty bands',   v_parent_id, 2, 90,  '/pm/planning/confidence',        'TrendingUp',      TRUE, TRUE),
    ('planning_governance',   'Governance Gates',    'Governance gate checkpoints',                    v_parent_id, 2, 100, '/pm/planning/governance',        'ShieldCheck',     TRUE, TRUE),
    ('planning_microplans',   'Team Micro Plans',    'All team micro-plans in a project',              v_parent_id, 2, 110, '/pm/planning/microplans',        'ClipboardList',   TRUE, TRUE),
    ('planning_draft_queue',  'My Draft Plans',      'Saved draft micro-plans queue',                  v_parent_id, 2, 120, '/pm/planning/microplans/drafts', 'FileClock',       TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label     = EXCLUDED.menu_label,
    route_path     = EXCLUDED.route_path,
    menu_icon      = EXCLUDED.menu_icon,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level     = EXCLUDED.menu_level,
    sort_order     = EXCLUDED.sort_order,
    updated_at     = NOW();

  RAISE NOTICE 'PM Planning menu items inserted under parent id %', v_parent_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Menu Items — PMO Dashboard (Portfolio collision + governance config)
--    Resolves parent_menu_id by looking up menu_code = 'pmo_planning'
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Upsert the parent "PMO Planning" section
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_planning', 'PMO Planning', 'Portfolio-level planning and governance', NULL, 1, 30, NULL, 'LayoutDashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label  = EXCLUDED.menu_label,
    menu_icon   = EXCLUDED.menu_icon,
    is_active   = EXCLUDED.is_active,
    updated_at  = NOW();

  SELECT id INTO v_parent_id FROM public.menu_items WHERE menu_code = 'pmo_planning' LIMIT 1;

  -- Insert PMO child menu items
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pmo_planning_hub',         'Planning Hub',            'PMO planning overview',                    v_parent_id, 2, 10, '/pmo/planning',                   'LayoutDashboard', TRUE, TRUE),
    ('pmo_portfolio_collisions', 'Portfolio Collisions',    'Cross-project resource and milestone conflicts', v_parent_id, 2, 20, '/pmo/planning/collisions',   'AlertTriangle',   TRUE, TRUE),
    ('pmo_intel_rules',          'Intelligence Rules',      'Configure plan quality rules',             v_parent_id, 2, 30, '/pmo/planning/intelligence',      'SearchCode',      TRUE, TRUE),
    ('pmo_governance_config',    'Governance Rules Config', 'Set up governance gate rules by project type', v_parent_id, 2, 40, '/pmo/planning/governance-config', 'ShieldCheck',  TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label     = EXCLUDED.menu_label,
    route_path     = EXCLUDED.route_path,
    menu_icon      = EXCLUDED.menu_icon,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level     = EXCLUDED.menu_level,
    sort_order     = EXCLUDED.sort_order,
    updated_at     = NOW();

  RAISE NOTICE 'PMO Planning menu items inserted under parent id %', v_parent_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Assign menu items to roles via role_menu_items
-- ─────────────────────────────────────────────────────────────────────────────
-- PM menu items — broad access
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('System Admin', 'PMO Admin', 'Portfolio Manager', 'Programme Manager', 'Project Manager', 'Team Manager', 'Team Lead', 'Project Assurance', 'Quality Assurance', 'Risk Manager', 'Team Member')
  AND m.menu_code IN ('planning', 'planning_hub', 'planning_health', 'planning_executive', 'planning_governance', 'planning_microplans', 'planning_draft_queue')
  AND m.is_active = TRUE AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- PM menu items — restricted to PM/Admin only
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('System Admin', 'PMO Admin', 'Project Manager')
  AND m.menu_code IN ('planning_intelligence', 'planning_scenarios', 'planning_pbs', 'planning_ai', 'planning_recovery', 'planning_confidence')
  AND m.is_active = TRUE AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- PMO menu items
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('System Admin', 'PMO Admin', 'Portfolio Manager', 'Programme Manager')
  AND m.menu_code IN ('pmo_planning', 'pmo_planning_hub', 'pmo_portfolio_collisions')
  AND m.is_active = TRUE AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- PMO admin-only items
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('System Admin', 'PMO Admin')
  AND m.menu_code IN ('pmo_intel_rules', 'pmo_governance_config')
  AND m.is_active = TRUE AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Assign permissions to roles (role_permissions)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_pairs TEXT[][] := ARRAY[
    -- [permission_code, role_name]
    ARRAY['planning.view',                'System Admin'],
    ARRAY['planning.view',                'PMO Admin'],
    ARRAY['planning.view',                'Portfolio Manager'],
    ARRAY['planning.view',                'Programme Manager'],
    ARRAY['planning.view',                'Project Manager'],
    ARRAY['planning.view',                'Team Manager'],
    ARRAY['planning.view',                'Team Lead'],
    ARRAY['planning.view',                'Project Assurance'],
    ARRAY['planning.view',                'Quality Assurance'],
    ARRAY['planning.view',                'Risk Manager'],
    ARRAY['planning.view',                'Team Member'],

    ARRAY['planning.intelligence.manage', 'System Admin'],
    ARRAY['planning.intelligence.manage', 'PMO Admin'],

    ARRAY['planning.scenario.create',     'System Admin'],
    ARRAY['planning.scenario.create',     'PMO Admin'],
    ARRAY['planning.scenario.create',     'Project Manager'],

    ARRAY['planning.scenario.promote',    'System Admin'],
    ARRAY['planning.scenario.promote',    'PMO Admin'],
    ARRAY['planning.scenario.promote',    'Project Manager'],

    ARRAY['planning.pbs.edit',            'System Admin'],
    ARRAY['planning.pbs.edit',            'PMO Admin'],
    ARRAY['planning.pbs.edit',            'Project Manager'],
    ARRAY['planning.pbs.edit',            'Team Manager'],
    ARRAY['planning.pbs.edit',            'Team Lead'],

    ARRAY['planning.health.view',         'System Admin'],
    ARRAY['planning.health.view',         'PMO Admin'],
    ARRAY['planning.health.view',         'Portfolio Manager'],
    ARRAY['planning.health.view',         'Programme Manager'],
    ARRAY['planning.health.view',         'Project Manager'],
    ARRAY['planning.health.view',         'Team Manager'],
    ARRAY['planning.health.view',         'Project Assurance'],
    ARRAY['planning.health.view',         'Quality Assurance'],

    ARRAY['planning.ai.use',              'System Admin'],
    ARRAY['planning.ai.use',              'PMO Admin'],
    ARRAY['planning.ai.use',              'Project Manager'],

    ARRAY['planning.executive.view',      'System Admin'],
    ARRAY['planning.executive.view',      'PMO Admin'],
    ARRAY['planning.executive.view',      'Portfolio Manager'],
    ARRAY['planning.executive.view',      'Programme Manager'],
    ARRAY['planning.executive.view',      'Project Manager'],
    ARRAY['planning.executive.view',      'Stakeholder'],

    ARRAY['planning.collision.view',      'System Admin'],
    ARRAY['planning.collision.view',      'PMO Admin'],
    ARRAY['planning.collision.view',      'Portfolio Manager'],
    ARRAY['planning.collision.view',      'Programme Manager'],

    ARRAY['planning.recovery.manage',     'System Admin'],
    ARRAY['planning.recovery.manage',     'PMO Admin'],
    ARRAY['planning.recovery.manage',     'Project Manager'],

    ARRAY['planning.governance.config',   'System Admin'],
    ARRAY['planning.governance.config',   'PMO Admin'],

    ARRAY['planning.confidence.edit',     'System Admin'],
    ARRAY['planning.confidence.edit',     'PMO Admin'],
    ARRAY['planning.confidence.edit',     'Project Manager'],
    ARRAY['planning.confidence.edit',     'Team Manager'],
    ARRAY['planning.confidence.edit',     'Team Lead'],

    ARRAY['planning.microplan.view',      'System Admin'],
    ARRAY['planning.microplan.view',      'PMO Admin'],
    ARRAY['planning.microplan.view',      'Portfolio Manager'],
    ARRAY['planning.microplan.view',      'Programme Manager'],
    ARRAY['planning.microplan.view',      'Project Manager'],
    ARRAY['planning.microplan.view',      'Team Manager'],
    ARRAY['planning.microplan.view',      'Team Lead'],
    ARRAY['planning.microplan.view',      'Project Assurance'],
    ARRAY['planning.microplan.view',      'Quality Assurance'],
    ARRAY['planning.microplan.view',      'Risk Manager'],
    ARRAY['planning.microplan.view',      'Team Member'],

    ARRAY['planning.microplan.create',    'System Admin'],
    ARRAY['planning.microplan.create',    'PMO Admin'],
    ARRAY['planning.microplan.create',    'Project Manager'],
    ARRAY['planning.microplan.create',    'Team Manager'],
    ARRAY['planning.microplan.create',    'Team Lead'],
    ARRAY['planning.microplan.create',    'Quality Assurance'],
    ARRAY['planning.microplan.create',    'Risk Manager'],
    ARRAY['planning.microplan.create',    'Team Member'],

    ARRAY['planning.microplan.edit',      'System Admin'],
    ARRAY['planning.microplan.edit',      'PMO Admin'],
    ARRAY['planning.microplan.edit',      'Project Manager'],
    ARRAY['planning.microplan.edit',      'Team Manager'],
    ARRAY['planning.microplan.edit',      'Team Lead'],
    ARRAY['planning.microplan.edit',      'Quality Assurance'],
    ARRAY['planning.microplan.edit',      'Risk Manager'],
    ARRAY['planning.microplan.edit',      'Team Member'],

    ARRAY['planning.microplan.edit_any',  'System Admin'],
    ARRAY['planning.microplan.edit_any',  'PMO Admin'],
    ARRAY['planning.microplan.edit_any',  'Project Manager'],

    ARRAY['planning.microplan.delete',    'System Admin'],
    ARRAY['planning.microplan.delete',    'PMO Admin'],
    ARRAY['planning.microplan.delete',    'Project Manager'],
    ARRAY['planning.microplan.delete',    'Team Manager'],
    ARRAY['planning.microplan.delete',    'Team Lead'],

    ARRAY['planning.microplan.approve',   'System Admin'],
    ARRAY['planning.microplan.approve',   'PMO Admin'],
    ARRAY['planning.microplan.approve',   'Project Manager']
  ];
  v_pair    TEXT[];
  v_perm_id UUID;
  v_role_id UUID;
BEGIN
  FOREACH v_pair SLICE 1 IN ARRAY v_pairs LOOP
    SELECT id INTO v_perm_id FROM public.permissions  WHERE permission_code = v_pair[1];
    SELECT id INTO v_role_id FROM public.roles         WHERE role_name       = v_pair[2] LIMIT 1;

    IF v_perm_id IS NOT NULL AND v_role_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Planning role_permissions assignments complete';
END;
$$;
