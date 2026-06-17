-- v661: Align PMIS gap + record lifecycle menu_items with registry routes (PmisGapRoutes.jsx)
-- Fixes client-side virtual fallbacks when v647 used legacy paths/codes.
-- Idempotent ON CONFLICT (menu_code).

DO $$
DECLARE
  v_auth UUID;
  v_proc UUID;
  v_dash UUID;
  v_coll UUID;
  v_role_id UUID;
  v_pmo_auth_codes TEXT[] := ARRAY[
    'pmo_section_authorisation',
    'pmo_auth_queue', 'pmo_auth_dashboard', 'pmo_auth_configure',
    'pmo_auth_chains', 'pmo_auth_archive_retention', 'pmo_auth_archive_vault'
  ];
BEGIN
  -- ── Route alignment (legacy v647 → current app routes) ─────────────────────
  UPDATE public.menu_items SET route_path = '/pmo/collaboration/whiteboard', updated_at = NOW()
  WHERE menu_code IN ('pmo_whiteboards', 'pmo_whiteboard') AND route_path IS DISTINCT FROM '/pmo/collaboration/whiteboard';

  UPDATE public.menu_items SET route_path = '/pmo/planning/planning-poker', updated_at = NOW()
  WHERE menu_code = 'pmo_planning_poker' AND route_path IS DISTINCT FROM '/pmo/planning/planning-poker';

  UPDATE public.menu_items SET route_path = '/pmo/planning/s-curve', updated_at = NOW()
  WHERE menu_code IN ('pmo_s_curve', 'pmo_planning_s_curve') AND route_path IS DISTINCT FROM '/pmo/planning/s-curve';

  UPDATE public.menu_items SET route_path = '/pmo/settings/notifications', updated_at = NOW()
  WHERE menu_code IN ('pmo_notification_preferences', 'pmo_notification_prefs')
    AND route_path IS DISTINCT FROM '/pmo/settings/notifications';

  UPDATE public.menu_items SET route_path = '/pm/settings/notifications', updated_at = NOW()
  WHERE menu_code IN ('pm_notification_preferences', 'pm_notification_prefs')
    AND route_path IS DISTINCT FROM '/pm/settings/notifications';

  UPDATE public.menu_items SET route_path = '/pmo/procurement/vendors', updated_at = NOW()
  WHERE menu_code IN ('pmo_vendor_register', 'pmo_procurement_vendors')
    AND route_path IS DISTINCT FROM '/pmo/procurement/vendors';

  UPDATE public.menu_items SET route_path = '/pmo/procurement/requests', updated_at = NOW()
  WHERE menu_code IN ('pmo_purchase_requests', 'pmo_procurement_requests')
    AND route_path IS DISTINCT FROM '/pmo/procurement/requests';

  UPDATE public.menu_items SET route_path = '/pmo/procurement/orders', updated_at = NOW()
  WHERE menu_code IN ('pmo_purchase_orders', 'pmo_procurement_orders')
    AND route_path IS DISTINCT FROM '/pmo/procurement/orders';

  UPDATE public.menu_items SET route_path = '/pmo/procurement/contracts', updated_at = NOW()
  WHERE menu_code IN ('pmo_contracts', 'pmo_procurement_contracts')
    AND route_path IS DISTINCT FROM '/pmo/procurement/contracts';

  UPDATE public.menu_items SET route_path = '/pmo/procurement/invoices', updated_at = NOW()
  WHERE menu_code IN ('pmo_invoice_tracking', 'pmo_procurement_invoices')
    AND route_path IS DISTINCT FROM '/pmo/procurement/invoices';

  UPDATE public.menu_items SET route_path = '/pmo/strategy/portfolio-map', updated_at = NOW()
  WHERE menu_code = 'pmo_portfolio_map' AND route_path IS DISTINCT FROM '/pmo/strategy/portfolio-map';

  -- ── Registry-aligned aliases (same routes, canonical menu_code from menuRegistry.js) ──
  SELECT id INTO v_proc FROM public.menu_items WHERE menu_code = 'pmo_section_procurement_mgmt' LIMIT 1;
  IF v_proc IS NULL THEN
    SELECT id INTO v_proc FROM public.menu_items WHERE menu_code = 'pmo_section_procurement' LIMIT 1;
  END IF;

  IF v_proc IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
      ('pmo_procurement_vendors',   'Vendor Register',    v_proc, 2, 1, '/pmo/procurement/vendors',   'building-2', TRUE, TRUE),
      ('pmo_procurement_requests',  'Purchase Requests',  v_proc, 2, 2, '/pmo/procurement/requests', 'file-text', TRUE, TRUE),
      ('pmo_procurement_orders',    'Purchase Orders',    v_proc, 2, 3, '/pmo/procurement/orders',   'receipt', TRUE, TRUE),
      ('pmo_procurement_contracts', 'Contracts',          v_proc, 2, 4, '/pmo/procurement/contracts','file-signature', TRUE, TRUE),
      ('pmo_procurement_invoices',  'Invoice Tracking',   v_proc, 2, 5, '/pmo/procurement/invoices', 'banknote', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      sort_order = EXCLUDED.sort_order,
      menu_icon = EXCLUDED.menu_icon,
      is_visible = TRUE,
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  SELECT id INTO v_dash FROM public.menu_items WHERE menu_code = 'pmo_section_dashboards_analytics' LIMIT 1;
  IF v_dash IS NULL THEN
    SELECT id INTO v_dash FROM public.menu_items WHERE menu_code = 'pmo_section_dashboards' LIMIT 1;
  END IF;

  IF v_dash IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
      ('pmo_planning_s_curve',   'S-Curve & Baselines', v_dash, 2, 2, '/pmo/planning/s-curve',      'line-chart', TRUE, TRUE),
      ('pmo_whiteboard',         'Whiteboard',          v_dash, 2, 6, '/pmo/collaboration/whiteboard', 'pen-tool', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      is_visible = TRUE,
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_notification_prefs', 'Notification Preferences', NULL, 1, 160, '/pmo/settings/notifications', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    route_path = EXCLUDED.route_path,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- ── Record lifecycle (v639) ───────────────────────────────────────────────
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_section_authorisation', 'Authorisation & Lifecycle', NULL, 1, 5, NULL, 'shield-check', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_auth FROM public.menu_items WHERE menu_code = 'pmo_section_authorisation' LIMIT 1;

  IF v_auth IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
      ('pmo_auth_queue',              'Authorisation Queue',        v_auth, 2, 1, '/pmo/authorisation/queue',             'inbox', TRUE, TRUE),
      ('pmo_auth_dashboard',          'Lifecycle Dashboard',        v_auth, 2, 2, '/pmo/authorisation/dashboard',         'bar-chart-2', TRUE, TRUE),
      ('pmo_auth_configure',          'Configure Lifecycle Rules',  v_auth, 2, 3, '/pmo/authorisation/configure',         'settings', TRUE, TRUE),
      ('pmo_auth_chains',             'Approval Chains',            v_auth, 2, 4, '/pmo/authorisation/chains',            'git-branch', TRUE, TRUE),
      ('pmo_auth_archive_retention',  'Archive Retention Rules',    v_auth, 2, 5, '/pmo/authorisation/archive-retention', 'archive', TRUE, TRUE),
      ('pmo_auth_archive_vault',      'Archive Vault',              v_auth, 2, 6, '/pmo/authorisation/archive',           'database', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      sort_order = EXCLUDED.sort_order,
      menu_icon = EXCLUDED.menu_icon,
      is_visible = TRUE,
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  -- ── Role seeds (PMO Admin / System Admin) ─────────────────────────────────
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pmo_auth_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;

    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'pmo_procurement_contracts', 'pmo_procurement_invoices', 'pmo_notification_prefs',
      'pmo_planning_s_curve', 'pmo_whiteboard'
    )
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v661_menu_registry_route_alignment.sql completed';
END $$;
