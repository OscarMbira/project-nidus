-- v1528: System-wide consolidated menu switch (replaces per-organisation activation)
-- Owner decision 2026-11-21: one global flag set by System Admin only; no per-org override.
-- Platform / Simulator read public.system_menu_settings; account_menu_settings is left in place
-- for history but is no longer the live switch.

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_menu_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  consolidated_menu_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID  -- Admin user id when set via Admin RPC
);

COMMENT ON TABLE public.system_menu_settings IS
  'v1528: singleton system settings for menus. consolidated_menu_enabled is system-wide (all organisations).';

ALTER TABLE public.system_menu_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.system_menu_settings TO authenticated;
GRANT ALL ON public.system_menu_settings TO service_role;

DROP POLICY IF EXISTS policy_system_menu_settings_read ON public.system_menu_settings;
CREATE POLICY policy_system_menu_settings_read ON public.system_menu_settings
  FOR SELECT TO authenticated
  USING (true);

-- Seed from existing org rows: on if any organisation already had it on
INSERT INTO public.system_menu_settings (id, consolidated_menu_enabled, updated_at)
SELECT
  1,
  COALESCE((SELECT bool_or(consolidated_menu_enabled) FROM public.account_menu_settings), FALSE),
  NOW()
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'system_menu_settings',
  'Singleton system menu settings including the system-wide consolidated sidebar switch (v1528)',
  true,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- Planner wall: read-only reference table used by Planner sessions too
INSERT INTO public.planner_table_allowlist (table_name)
VALUES ('system_menu_settings')
ON CONFLICT (table_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Admin RPCs (public schema): system-wide switch — replaces per-org activation
-- (Same contracts Admin v249 used; Admin UI calls these names unchanged where possible.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_system_consolidated_menu(p_admin_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, admin
AS $$
DECLARE
  v_row public.system_menu_settings%ROWTYPE;
BEGIN
  PERFORM public.admin_require_public_site_permission('system.menu_placements.view', p_admin_user_id);
  SELECT * INTO v_row FROM public.system_menu_settings WHERE id = 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('enabled', false, 'updated_at', NULL);
  END IF;
  RETURN jsonb_build_object(
    'enabled', v_row.consolidated_menu_enabled,
    'updated_at', v_row.updated_at,
    'updated_by', v_row.updated_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_consolidated_menu_all(
  p_enabled BOOLEAN, p_reason TEXT, p_admin_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, admin
AS $$
DECLARE
  v_admin UUID := public.admin_require_public_site_permission('system.menu_placements.edit', p_admin_user_id);
  v_old BOOLEAN;
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;

  SELECT consolidated_menu_enabled INTO v_old FROM public.system_menu_settings WHERE id = 1;

  INSERT INTO public.system_menu_settings (id, consolidated_menu_enabled, updated_at, updated_by)
  VALUES (1, COALESCE(p_enabled, FALSE), NOW(), v_admin)
  ON CONFLICT (id) DO UPDATE SET
    consolidated_menu_enabled = EXCLUDED.consolidated_menu_enabled,
    updated_at = NOW(),
    updated_by = v_admin;

  -- Keep legacy per-org rows aligned (apps no longer read them)
  INSERT INTO public.account_menu_settings (account_id, consolidated_menu_enabled, updated_at, updated_by)
  SELECT a.id, COALESCE(p_enabled, FALSE), NOW(), v_admin FROM public.accounts a
  ON CONFLICT (account_id) DO UPDATE SET
    consolidated_menu_enabled = EXCLUDED.consolidated_menu_enabled,
    updated_at = NOW(),
    updated_by = v_admin;

  UPDATE public.menu_placement_version SET version = version + 1, updated_at = NOW() WHERE id = 1;

  PERFORM admin.log_admin_action(
    v_admin,
    CASE WHEN p_enabled THEN 'menu.consolidated_on_system' ELSE 'menu.consolidated_off_system' END,
    'system', NULL,
    jsonb_build_object('reason', p_reason, 'scope', 'system_wide'),
    jsonb_build_object('enabled', COALESCE(v_old, FALSE)),
    jsonb_build_object('enabled', p_enabled)
  );

  RETURN jsonb_build_object('enabled', p_enabled, 'scope', 'system_wide', 'organisations', (SELECT count(*) FROM public.accounts));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_consolidated_menu(
  p_account_id UUID, p_enabled BOOLEAN, p_reason TEXT, p_admin_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, admin
AS $$
BEGIN
  PERFORM public.admin_require_public_site_permission('system.menu_placements.edit', p_admin_user_id);
  RAISE EXCEPTION
    'Per-organisation consolidated menu switches are retired. Use Admin › Menu Placements › Turn on/off (system-wide).';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_account_menu_settings(p_admin_user_id UUID DEFAULT NULL)
RETURNS TABLE (account_id UUID, consolidated_menu_enabled BOOLEAN, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, admin
AS $$
BEGIN
  PERFORM public.admin_require_public_site_permission('system.menu_placements.view', p_admin_user_id);
  RETURN QUERY
  SELECT NULL::UUID, s.consolidated_menu_enabled, s.updated_at
  FROM public.system_menu_settings s
  WHERE s.id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_system_consolidated_menu(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_system_consolidated_menu(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
