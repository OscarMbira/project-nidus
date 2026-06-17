-- =============================================================================
-- v665: Platform email notification menu leaves (DB-only sidebar)
-- Replaces former JS virtual fillers in useMenu.js ensureEmailNotificationsItem
-- Prerequisites: v659 (pmo_section_email), v558 (email settings), v532 (invitation templates)
-- =============================================================================

DO $$
DECLARE
  v_email UUID;
BEGIN
  SELECT id INTO v_email FROM public.menu_items WHERE menu_code = 'pmo_section_email' LIMIT 1;

  IF v_email IS NULL THEN
    RAISE NOTICE 'v665: pmo_section_email missing — skipping email notification leaves';
    RETURN;
  END IF;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_email_settings', 'Email Settings', 'SMTP configuration for transactional email', v_email, 2, 1, '/platform/admin/email-settings', 'mail', TRUE, TRUE),
    ('pmo_email_sender_profiles', 'Sender Profiles', 'Email sender profiles by project type', v_email, 2, 2, '/platform/admin/email-sender-profiles', 'at-sign', TRUE, TRUE),
    ('pmo_email_invitation_templates', 'Invitation Templates', 'Customise project invitation messages', v_email, 2, 3, '/app/settings/invitation-templates', 'file-text', TRUE, TRUE),
    ('pmo_email_invitation_expiry', 'Invitation Expiry', 'Default invitation expiry settings', v_email, 2, 4, '/platform/admin/invitation-settings', 'clock', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Align legacy row if present
  UPDATE public.menu_items SET
    parent_menu_id = v_email,
    menu_level = 2,
    sort_order = 1,
    updated_at = NOW()
  WHERE menu_code = 'pmo_admin_email_settings'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, mi.id, TRUE, TRUE, TRUE, FALSE
  FROM public.roles r
  CROSS JOIN public.menu_items mi
  WHERE mi.menu_code IN (
    'pmo_email_settings', 'pmo_email_sender_profiles',
    'pmo_email_invitation_templates', 'pmo_email_invitation_expiry',
    'pmo_admin_email_settings'
  )
    AND COALESCE(mi.is_active, TRUE) = TRUE
    AND r.role_name IN (
      'system_admin', 'System Admin', 'super_admin',
      'pmo_admin', 'PMO Admin', 'org_admin'
    )
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  RAISE NOTICE 'v665_platform_email_notification_menu.sql applied';
END $$;
