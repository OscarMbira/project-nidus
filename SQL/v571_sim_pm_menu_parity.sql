-- ============================================================================
-- v571: Simulator PM sidebar parity (mirrors v568 structure with sim_ prefix)
-- Prerequisites: v568, v569, v450 (sim pm dashboard base)
-- OPA tailoring sim items: v573 (not duplicated here)
-- ============================================================================

DO $$
DECLARE
  v_s4 UUID; v_s5 UUID; v_s15 UUID;
  v_plans UUID; v_adv UUID;
BEGIN
  -- §4 Planning (sim)
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_planning_section', 'Project Planning', 'Practice project planning', NULL, 1, 130, NULL, 'calendar-range', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s4 FROM menu_items WHERE menu_code = 'sim_pm_planning_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('sim_pm_plans_group', 'Plans & Documents', NULL, v_s4, 2, 10, NULL, 'file-text', TRUE, TRUE),
    ('sim_pm_advanced_planning_group', 'Advanced Planning Tools', NULL, v_s4, 2, 50, NULL, 'sparkles', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s4, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  SELECT id INTO v_plans FROM menu_items WHERE menu_code = 'sim_pm_plans_group' LIMIT 1;
  SELECT id INTO v_adv FROM menu_items WHERE menu_code = 'sim_pm_advanced_planning_group' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('sim_pm_plans_dashboard', 'Plans Dashboard', NULL, v_plans, 3, 1, '/simulator/practice-projects/:id/plans', 'layout-grid', TRUE, TRUE),
    ('sim_pm_project_plan', 'Project Plan', NULL, v_plans, 3, 2, '/simulator/practice-projects/:id/plans/project-plan', 'file-text', TRUE, TRUE),
    ('sim_pm_stage_plan_create', 'Create Stage Plan', NULL, v_plans, 3, 3, '/simulator/practice-projects/:id/plans/stage-plan/create', 'file-plus', TRUE, TRUE),
    ('sim_pm_planning_hub', 'Planning Hub', NULL, v_adv, 3, 1, '/simulator/pm/planning', 'compass', TRUE, TRUE),
    ('sim_pm_planning_ai', 'AI Plan Generator', NULL, v_adv, 3, 2, '/simulator/pm/planning/ai', 'bot', TRUE, TRUE),
    ('sim_pm_planning_scenarios', 'What-If Scenarios', NULL, v_adv, 3, 3, '/simulator/pm/planning/scenarios', 'flask-conical', TRUE, TRUE),
    ('sim_pm_planning_pbs', 'PBS Builder', NULL, v_adv, 3, 4, '/simulator/pm/planning/pbs', 'layers', TRUE, TRUE),
    ('sim_pm_planning_health', 'Plan Health', NULL, v_adv, 3, 5, '/simulator/pm/planning/health', 'activity', TRUE, TRUE),
    ('sim_pm_planning_confidence', 'Confidence Forecast', NULL, v_adv, 3, 6, '/simulator/pm/planning/confidence', 'trending-up', TRUE, TRUE),
    ('sim_pm_planning_recovery', 'Recovery Planning', NULL, v_adv, 3, 7, '/simulator/pm/planning/recovery', 'life-buoy', TRUE, TRUE),
    ('sim_pm_planning_governance', 'Governance Gates', NULL, v_adv, 3, 8, '/simulator/pm/planning/governance', 'shield-check', TRUE, TRUE),
    ('sim_pm_planning_intelligence', 'Planning Analytics', NULL, v_adv, 3, 9, '/simulator/pm/planning/intelligence', 'pie-chart', TRUE, TRUE),
    ('sim_pm_microplans', 'Micro Plans', NULL, v_adv, 3, 10, '/simulator/pm/planning/microplans', 'list', TRUE, TRUE),
    ('sim_pm_microplans_drafts', 'Micro Plan Drafts', NULL, v_adv, 3, 11, '/simulator/pm/planning/microplans/drafts', 'pause', TRUE, TRUE),
    ('sim_pm_resource_capacity', 'Capacity Planning', NULL, v_s4, 2, 41, '/simulator/resources/capacity', 'bar-chart-2', TRUE, TRUE),
    ('sim_pm_resource_conflicts', 'Resource Conflicts', NULL, v_s4, 2, 42, '/simulator/resources/conflicts', 'alert-triangle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §5 Delivery artefacts (sim) — extend sim_pm_delivery from v450
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_delivery_checkpoint_reports', 'Checkpoint Reports', NULL,
    (SELECT id FROM menu_items WHERE menu_code = 'sim_pm_delivery' LIMIT 1), 2, 6,
    '/simulator/pm/reporting/checkpoint-reports', 'flag', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §15 Comms (sim)
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_comms_section', 'Communications & Meetings', 'Practice comms', NULL, 1, 300, NULL, 'message-square', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s15 FROM menu_items WHERE menu_code = 'sim_pm_comms_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('sim_pm_comms_hub', 'Comms Hub', NULL, v_s15, 2, 1, '/simulator/comms', 'message-square', TRUE, TRUE),
    ('sim_pm_comms_schedule_meeting', 'Schedule Meeting', NULL, v_s15, 2, 2, '/simulator/comms/meetings/new', 'calendar-clock', TRUE, TRUE),
    ('sim_pm_comms_meetings', 'My Meetings', NULL, v_s15, 2, 3, '/simulator/comms/meetings', 'video', TRUE, TRUE),
    ('sim_pm_comms_summaries', 'Meeting Summaries', NULL, v_s15, 2, 4, '/simulator/comms/meetings/summaries', 'file-text', TRUE, TRUE),
    ('sim_pm_comms_direct', 'Direct Messages', NULL, v_s15, 2, 5, '/simulator/comms/direct', 'mail', TRUE, TRUE),
    ('sim_pm_comms_channels', 'Channel Messages', NULL, v_s15, 2, 6, '/simulator/comms/messages', 'messages-square', TRUE, TRUE),
    ('sim_pm_comms_pending_review', 'Pending AI Reviews', NULL, v_s15, 2, 7, '/simulator/comms/pending-review', 'bot', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s15, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  RAISE NOTICE 'v571_sim_pm_menu_parity.sql menu_items applied';
END $$;

-- Grant sim PM items to project_manager (full except view-only)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'project_manager'
  AND m.menu_code LIKE 'sim_pm_%'
  AND m.menu_code NOT IN ('sim_pm_resource_conflicts', 'sim_pm_planning_intelligence', 'sim_pm_opa_templates_browse')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, FALSE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'project_manager'
  AND m.menu_code IN ('sim_pm_resource_conflicts', 'sim_pm_planning_intelligence', 'sim_pm_opa_templates_browse')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = FALSE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Keep existing v450 sim_pm_* dashboard grants active; deactivate only if superseded by explicit sim_pm_planning_section parent dupes

DO $$ BEGIN RAISE NOTICE 'v571_sim_pm_menu_parity.sql applied'; END $$;
