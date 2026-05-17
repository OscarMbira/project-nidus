-- =============================================================================
-- v532_invitation_message_templates_sidebar.sql
-- Phase 13 — menu_items + role_menu_items for Invitation Templates
-- =============================================================================

DO $$
DECLARE
  v_projects_id UUID;
  v_menu_id UUID;
BEGIN
  SELECT id INTO v_projects_id
  FROM public.menu_items
  WHERE menu_code = 'projects'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_projects_id IS NULL THEN
    RAISE NOTICE 'menu_items.projects not found — skip invitation templates menu';
    RETURN;
  END IF;

  UPDATE public.menu_items
  SET sort_order = sort_order + 1,
      updated_at = NOW()
  WHERE parent_menu_id = v_projects_id
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND sort_order >= 7;

  INSERT INTO public.menu_items (
    menu_code,
    menu_label,
    menu_description,
    parent_menu_id,
    menu_level,
    sort_order,
    route_path,
    menu_icon,
    is_visible,
    is_active
  )
  VALUES (
    'projects_invitation_templates',
    'Invitation Templates',
    'Default invitation messages per project role',
    v_projects_id,
    2,
    7,
    '/app/settings/invitation-templates',
    'mail',
    TRUE,
    TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_menu_id
  FROM public.menu_items
  WHERE menu_code = 'projects_invitation_templates'
  LIMIT 1;

  IF v_menu_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, v_menu_id, TRUE, TRUE, TRUE, FALSE
  FROM public.roles r
  WHERE LOWER(TRIM(r.role_name)) IN (
    'pmo_admin',
    'system_admin',
    'super_admin',
    'org_admin',
    'programme_manager',
    'project_manager'
  )
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();
END $$;

DO $$ BEGIN RAISE NOTICE 'v532_invitation_message_templates_sidebar.sql applied'; END $$;
