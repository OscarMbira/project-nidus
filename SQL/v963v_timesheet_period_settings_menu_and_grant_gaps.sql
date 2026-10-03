-- =============================================================================
-- v963v_timesheet_period_settings_menu_and_grant_gaps.sql
-- v963 PMIS Core Gap Closure — Phase 19 (GAP-13) sidebar wiring for the two
-- surfaces that had no menu_items row yet:
--   1. Weekly timesheet submission page (Platform). The Simulator TM
--      equivalent (`sim_tm_timesheet_submit` -> /simulator/tm/timesheets/submit)
--      already exists and is already granted (v649/v650) — this file only adds
--      the Platform-side counterpart under the existing `tm_section_timesheets`
--      parent (v681_menu_revamp_platform_hierarchy.sql).
--   2. Timesheet approval settings page (approver role / escalation days /
--      auto-approve), Platform + PMO + Simulator PMO — reuses the existing
--      *_timesheet_approvals menu item's parent so it sits next to the
--      approver queue it configures.
--
-- Also closes a pre-existing grant gap found while wiring Phase 19/20/21:
-- v648_pmis_gap_menu_registry_roles.sql granted `platform_timesheet_approvals`
-- to Team Lead but never granted the sibling `platform_scheduled_reports` /
-- `platform_integrations_hub` menu items (v647) to any Platform-tree role, so
-- those two menu items were unreachable from the sidebar despite existing.
-- Judgment call: grant scheduled reports to Team Lead + Executive + Sponsor
-- (reporting visibility, consistent with their existing platform_s_curve
-- grant) and the integrations hub to Team Lead only (parity with the
-- timesheet-approvals admin-ish surface Team Lead already has).
-- =============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_role_id UUID;
BEGIN
  -- ── 1. Weekly timesheet submission (Platform) ───────────────────────────
  SELECT id INTO v_parent_id FROM public.menu_items WHERE menu_code = 'tm_section_timesheets' LIMIT 1;
  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level,
      sort_order, route_path, menu_icon, is_visible, is_active
    ) VALUES (
      'tm_timesheet_period_submit', 'Submit Week for Approval',
      'Submit your aggregated weekly timesheet for approval',
      v_parent_id, 2, 40, '/platform/timesheets/weekly', 'send', TRUE, TRUE
    )
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path,
      is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  END IF;

  -- ── 2. Timesheet approval settings — PM / PMO / Platform / Simulator PMO ─
  SELECT parent_menu_id INTO v_parent_id FROM public.menu_items WHERE menu_code = 'pmo_timesheet_approvals' LIMIT 1;
  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
    VALUES ('pmo_timesheet_approval_settings', 'Timesheet Approval Settings',
      'Approver role, escalation days, and auto-approve rules for weekly timesheets',
      v_parent_id, 2, 6, '/pmo/settings/timesheet-approvals', 'settings', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path,
      is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  END IF;

  SELECT parent_menu_id INTO v_parent_id FROM public.menu_items WHERE menu_code = 'platform_timesheet_approvals' LIMIT 1;
  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
    VALUES ('platform_timesheet_approval_settings', 'Timesheet Approval Settings',
      'Approver role, escalation days, and auto-approve rules for weekly timesheets',
      v_parent_id, 2, 4, '/platform/timesheets/settings', 'settings', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path,
      is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  END IF;

  SELECT parent_menu_id INTO v_parent_id FROM public.menu_items WHERE menu_code = 'sim_pmo_timesheet_approvals' LIMIT 1;
  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
    VALUES ('sim_pmo_timesheet_approval_settings', 'Timesheet Approval Settings',
      'Approver role, escalation days, and auto-approve rules for weekly timesheets',
      v_parent_id, 2, 5, '/simulator/pmo/settings/timesheet-approvals', 'settings', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path,
      is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  END IF;

  -- ── Role grants ──────────────────────────────────────────────────────────

  -- Weekly submission: Team Member + Team Lead/Team Manager (own-timesheet submitters)
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('team_member', 'Team Member', 'team_lead', 'team_manager', 'Team Lead', 'Team Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi WHERE mi.menu_code = 'tm_timesheet_period_submit' AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Settings: PM / PMO Admin / System Admin
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager', 'programme_manager', 'portfolio_manager',
      'pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN ('pmo_timesheet_approval_settings', 'platform_timesheet_approval_settings', 'sim_pmo_timesheet_approval_settings')
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Grant-gap fill: platform_scheduled_reports / platform_integrations_hub ─
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('team_lead', 'team_manager', 'Team Lead', 'Team Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN ('platform_scheduled_reports', 'platform_integrations_hub')
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('executive', 'project_executive', 'Project Executive', 'Executive',
      'project_sponsor', 'sponsor', 'Sponsor', 'Project Sponsor')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = 'platform_scheduled_reports' AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v963v_timesheet_period_settings_menu_and_grant_gaps.sql completed';
END $$;
