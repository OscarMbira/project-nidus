-- =============================================================================
-- v726: Remove duplicate Email & Notifications menu rows
-- Keeps v671 canonical pmo-email-*, pmo-comms-*, pmo-notification-preferences
-- =============================================================================

UPDATE public.menu_items
SET is_visible = FALSE,
    is_deleted = TRUE,
    updated_at = NOW()
WHERE menu_code IN (
  'plat_email_settings',
  'plat_email_senders',
  'plat_email_inv_templates',
  'plat_email_inv_expiry',
  'plat_email_messages',
  'plat_email_direct_msgs',
  'plat_email_meetings',
  'plat_email_ai_reviews',
  'plat_notif_prefs',
  'plat_notif_prefs_shared',
  'pmo_email_settings',
  'pmo_email_sender_profiles',
  'pmo_email_invitation_templates',
  'pmo_email_invitation_expiry',
  'pmo_admin_email_settings',
  'pmo_comms_messages',
  'pmo_comms_direct',
  'pmo_comms_meetings',
  'pmo_comms_pending_ai',
  'projects_invitation_templates',
  'pmo_notification_preferences',
  'pmo_notification_prefs'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_items (
  id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp,
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-email-notifications' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('pmo-email-settings',             'Email Settings',           '/platform/admin/email-settings',        10, 'mail'),
  ('pmo-email-sender-profiles',      'Sender Profiles',          '/platform/admin/email-sender-profiles', 20, 'at-sign'),
  ('pmo-email-invitation-templates', 'Invitation Templates',     '/app/settings/invitation-templates',    30, 'file-text'),
  ('pmo-email-invitation-expiry',    'Invitation Expiry',        '/platform/admin/invitation-settings',   40, 'clock'),
  ('pmo-comms-messages',             'Messages',                 '/platform/comms/messages',                50, 'mail'),
  ('pmo-comms-direct',               'Direct Messages',          '/platform/comms/direct',                  60, 'mail'),
  ('pmo-comms-meetings',             'Meetings',                 '/platform/comms/meetings',                70, 'clipboard-list'),
  ('pmo-comms-pending-ai',           'Pending AI Reviews',       '/platform/comms/pending-review',          80, 'sparkles'),
  ('pmo-notification-preferences',   'Notification Preferences', '/platform/settings/notifications',      90, 'bell')
) AS v(mc, ml, rp, so, ic)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
  AND mi.menu_code IN (
    'pmo-email-settings', 'pmo-email-sender-profiles', 'pmo-email-invitation-templates', 'pmo-email-invitation-expiry',
    'pmo-comms-messages', 'pmo-comms-direct', 'pmo-comms-meetings', 'pmo-comms-pending-ai',
    'pmo-notification-preferences'
  )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v726_dedupe_email_notifications_menus.sql applied'; END $$;
