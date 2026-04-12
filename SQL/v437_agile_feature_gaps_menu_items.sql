-- ============================================================================
-- v437: Agile feature gaps (v350) — menu_items for project-scoped Agile routes
-- Prerequisites: menu_items, roles, role_menu_items (v14+)
-- Route paths use /projects/:projectId/... (resolved in UI from current project context)
-- ============================================================================

DO $$
DECLARE
  v_parent UUID;
BEGIN
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'agile_delivery_extended',
    'Agile Delivery',
    'Sprint metrics, story map, releases, XP, Lean, SoS',
    NULL,
    1,
    55,
    NULL,
    'bar-chart-4',
    TRUE,
    TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_parent FROM menu_items WHERE menu_code = 'agile_delivery_extended' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES
    ('agile_sprint_metrics', 'Sprint Metrics', 'Velocity, forecast, burndown/burnup', v_parent, 2, 1, '/projects/:projectId/scrum/metrics', 'activity', TRUE, TRUE),
    ('agile_story_map', 'Story Map', 'User story map', v_parent, 2, 2, '/projects/:projectId/scrum/story-map', 'map', TRUE, TRUE),
    ('agile_templates', 'Agile Templates', 'DoD / DoR templates', v_parent, 2, 3, '/projects/:projectId/scrum/templates', 'list-checks', TRUE, TRUE),
    ('agile_releases_menu', 'Releases', 'Agile releases', v_parent, 2, 4, '/projects/:projectId/scrum/releases', 'git-merge', TRUE, TRUE),
    ('agile_roadmap_menu', 'Roadmap', 'Release roadmap', v_parent, 2, 5, '/projects/:projectId/scrum/roadmap', 'compass', TRUE, TRUE),
    ('agile_sos_menu', 'Scrum of Scrums', 'Multi-team coordination', v_parent, 2, 6, '/projects/:projectId/scrum/scrum-of-scrums', 'users', TRUE, TRUE),
    ('agile_xp_dashboard', 'XP Dashboard', 'Pairing, reviews, CI, TDD', v_parent, 2, 7, '/projects/:projectId/xp/dashboard', 'zap', TRUE, TRUE),
    ('agile_lean_vsm', 'Value Stream Map', 'Lean value stream', v_parent, 2, 8, '/projects/:projectId/lean/value-stream-map', 'workflow', TRUE, TRUE),
    ('agile_lean_kaizen', 'Kaizen Board', 'Waste and improvements', v_parent, 2, 9, '/projects/:projectId/lean/kaizen', 'recycle', TRUE, TRUE),
    ('agile_lean_metrics', 'Lean Metrics', 'Flow and takt', v_parent, 2, 10, '/projects/:projectId/lean/metrics', 'gauge', TRUE, TRUE),
    ('agile_metrics_hub', 'Agile Metrics Hub', 'Cross-methodology snapshot', v_parent, 2, 11, '/projects/:projectId/agile/metrics', 'layout-dashboard', TRUE, TRUE),
    ('kanban_metrics_proj', 'Kanban Metrics', 'CFD, lead/cycle, throughput', v_parent, 2, 12, '/projects/:projectId/kanban/metrics', 'line-chart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();
END $$;

-- Grant PM / PMO / Sponsor / Board — adjust role codes to match deployment
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN ('project_manager', 'pmo_admin', 'system_admin', 'pm_programme_manager', 'pm_project_board', 'team_lead')
  AND m.menu_code IN (
    'agile_sprint_metrics', 'agile_story_map', 'agile_templates', 'agile_releases_menu', 'agile_roadmap_menu',
    'agile_sos_menu', 'agile_xp_dashboard', 'agile_lean_vsm', 'agile_lean_kaizen', 'agile_lean_metrics', 'agile_metrics_hub', 'kanban_metrics_proj'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_items x WHERE x.role_id = r.id AND x.menu_item_id = m.id AND COALESCE(x.is_deleted, FALSE) = FALSE
  );
