-- =============================================================================
-- v558: Sidebar — Email Settings under PMO Admin (menu_items + role_menu_items)
--       Complements SMTP RLS v407/v406 — v407 alone does not register menu rows.
-- =============================================================================

DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id
  FROM public.menu_items
  WHERE menu_code = 'pmo_admin_section'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'v558: pmo_admin_section missing — skipping Email Settings menu insert';
    RETURN;
  END IF;

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
    'pmo_admin_email_settings',
    'Email Settings',
    'SMTP configuration for transactional email (invitations)',
    v_parent_id,
    2,
    3,
    '/platform/admin/email-settings',
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

  INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
  FROM public.roles r
  CROSS JOIN public.menu_items m
  WHERE m.menu_code = 'pmo_admin_email_settings'
    AND COALESCE(m.is_active, TRUE) = TRUE
    AND COALESCE(m.is_deleted, FALSE) = FALSE
    AND LOWER(TRIM(r.role_name)) IN (
      'pmo_admin',
      'system_admin',
      'super_admin',
      'org_admin'
    )
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v558_pmo_admin_email_settings_sidebar.sql applied';
END $$;
