-- ============================================================
-- v314: Organisation Settings – Sidebar Menu Section
-- Adds a new top-level "Organisation Settings" parent menu
-- with 4 child items for branding, colours, typography and
-- branding history. Visible to pmo_admin and super_admin only.
-- ============================================================

DO $$
DECLARE
  v_parent_id  UUID;
  v_role_id    UUID;
  v_menu_id    UUID;
BEGIN

  -- ─────────────────────────────────────────────
  -- 1. Insert / upsert the top-level parent item
  -- ─────────────────────────────────────────────
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'organisation_settings',
    'Organisation Settings',
    'Corporate branding, colour themes, typography, and identity configuration',
    NULL,   -- top-level, no parent
    0,
    95,     -- after Stakeholders (sort ~90), before PMO Admin (sort ~100)
    NULL,   -- section header / accordion, no direct route
    'building-2',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    updated_at       = NOW();

  -- Fetch the parent id
  SELECT id INTO v_parent_id
  FROM public.menu_items
  WHERE menu_code = 'organisation_settings'
  LIMIT 1;

  -- ─────────────────────────────────────────────
  -- 2. Insert / upsert the 4 child menu items
  -- ─────────────────────────────────────────────
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    (
      'org_branding',
      'Branding & Identity',
      'Upload logos, set app name and tagline',
      v_parent_id, 1, 1,
      '/platform/organisation/branding',
      'palette',
      true, true
    ),
    (
      'org_colour_themes',
      'Colour Palette',
      'Configure primary, secondary, and UI colours',
      v_parent_id, 1, 2,
      '/platform/organisation/colours',
      'paintbrush',
      true, true
    ),
    (
      'org_typography',
      'Typography',
      'Select the organisation font family',
      v_parent_id, 1, 3,
      '/platform/organisation/typography',
      'type',
      true, true
    ),
    (
      'org_branding_history',
      'Branding History',
      'View and revert previous branding configurations',
      v_parent_id, 1, 4,
      '/platform/organisation/branding-history',
      'history',
      true, true
    )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    route_path       = EXCLUDED.route_path,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    updated_at       = NOW();

  RAISE NOTICE 'Organisation Settings menu items created/updated (parent_id: %)', v_parent_id;

  -- ─────────────────────────────────────────────
  -- 3. Grant access to pmo_admin and super_admin roles only
  -- ─────────────────────────────────────────────
  FOR v_role_id IN
    SELECT r.id
    FROM public.roles r
    WHERE r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
      AND (r.is_deleted = false OR r.is_deleted IS NULL)
  LOOP
    -- Grant access to the parent
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, m.id, true, true, true, false
    FROM public.menu_items m
    WHERE m.menu_code = 'organisation_settings'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view   = true,
      can_use    = true,
      is_active  = true,
      is_deleted = false,
      updated_at = NOW();

    -- Grant access to all 4 children
    FOR v_menu_id IN
      SELECT m.id
      FROM public.menu_items m
      WHERE m.menu_code IN (
        'org_branding',
        'org_colour_themes',
        'org_typography',
        'org_branding_history'
      )
    LOOP
      INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
      VALUES (v_role_id, v_menu_id, true, true, true, false)
      ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
        can_view   = true,
        can_use    = true,
        is_active  = true,
        is_deleted = false,
        updated_at = NOW();
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Role access granted for Organisation Settings to pmo_admin, super_admin, org_admin';

END $$;
