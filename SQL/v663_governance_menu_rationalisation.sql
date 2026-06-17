-- v663: Governance & Standards menu rationalisation
-- Source: projectplan/v663_Governance_Standards_Menu_Rationalisation_Plan.md
-- Note: menu_items has no category column — hierarchy uses parent_menu_id only.

DO $$
DECLARE
  v_gov UUID;
  v_admin UUID;
  v_proc UUID;
  v_comms UUID;
BEGIN
  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'pmo_section_governance' LIMIT 1;
  SELECT id INTO v_admin FROM public.menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;
  SELECT id INTO v_proc FROM public.menu_items WHERE menu_code IN ('pmo_section_procurement_mgmt', 'pmo_section_procurement') ORDER BY CASE menu_code WHEN 'pmo_section_procurement_mgmt' THEN 0 ELSE 1 END LIMIT 1;
  SELECT id INTO v_comms FROM public.menu_items WHERE menu_code = 'pmo_comms_section' LIMIT 1;

  -- ── Reparent platform-config gap items → PMO Administration ───────────────
  IF v_admin IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_admin, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN (
      'pmo_section_platform_config',
      'pmo_admin_automations', 'pmo_automations_rules', 'pmo_automations_templates',
      'pmo_admin_custom_fields', 'pmo_custom_fields',
      'pmo_admin_intake_forms', 'pmo_intake_forms',
      'pmo_admin_client_portals', 'pmo_client_portals',
      'pmo_guest_access', 'pmo_project_clone'
    )
      AND COALESCE(is_deleted, FALSE) = FALSE;

    UPDATE public.menu_items SET parent_menu_id = v_admin, menu_level = 2, updated_at = NOW()
    WHERE parent_menu_id = v_gov
      AND route_path ~ '^/pmo/admin/'
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- ── Reparent procurement gap items → procurement section (Financial bucket) ─
  IF v_proc IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_proc, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN (
      'pmo_section_procurement', 'pmo_procurement_vendors', 'pmo_procurement_requests',
      'pmo_procurement_orders', 'pmo_procurement_contracts', 'pmo_procurement_invoices',
      'pmo_vendor_register', 'pmo_purchase_requests', 'pmo_purchase_orders',
      'pmo_contracts', 'pmo_invoice_tracking'
    )
      AND COALESCE(is_deleted, FALSE) = FALSE;

    UPDATE public.menu_items SET parent_menu_id = v_proc, menu_level = 2, updated_at = NOW()
    WHERE parent_menu_id = v_gov
      AND route_path ~ '^/pmo/procurement/'
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- ── Notification preferences → Email & Notifications ────────────────────────
  IF v_comms IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_comms, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('pmo_notification_prefs', 'pmo_notification_preferences')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  ELSE
    UPDATE public.menu_items SET parent_menu_id = NULL, menu_level = 1, updated_at = NOW()
    WHERE menu_code IN ('pmo_notification_prefs', 'pmo_notification_preferences')
      AND parent_menu_id = v_gov
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- ── Remove stale / duplicate governance rows ────────────────────────────────
  UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_code IN ('org_knowledge_eef_bulk', 'pmo_gov_mandate')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_code IN ('governance', 'platform_governance_admin')
    AND parent_menu_id = v_gov
    AND route_path IS NULL
    AND COALESCE(is_deleted, FALSE) = FALSE;

  UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_label = 'Governance'
    AND route_path IS NULL
    AND parent_menu_id = v_gov
    AND COALESCE(is_deleted, FALSE) = FALSE;

  RAISE NOTICE 'v663_governance_menu_rationalisation.sql completed';
END $$;
