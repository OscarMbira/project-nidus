-- ============================================================================
-- v1587 — SCIM 2.0 provisioning (v1356 slice 4)
-- Settings, identities, group→role mappings, seat check, deactivate (keep records).
-- Idempotent. Owner runs after v1586.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scim_settings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  token_prefix TEXT,
  token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  welcome_email BOOLEAN NOT NULL DEFAULT FALSE,
  block_manual_invites BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scim_group_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  idp_group_id TEXT NOT NULL,
  idp_group_name TEXT NOT NULL,
  role_name TEXT,
  project_team_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_scim_group UNIQUE (account_id, idp_group_id)
);

CREATE TABLE IF NOT EXISTS public.scim_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_scim_external UNIQUE (account_id, external_id),
  CONSTRAINT uq_scim_user UNIQUE (account_id, user_id)
);

ALTER TABLE public.scim_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_group_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scim_settings_all ON public.scim_settings;
CREATE POLICY scim_settings_all ON public.scim_settings FOR ALL TO authenticated
  USING (public.auth_user_can_access_account(account_id))
  WITH CHECK (public.auth_user_can_access_account(account_id));

DROP POLICY IF EXISTS scim_group_mappings_all ON public.scim_group_mappings;
CREATE POLICY scim_group_mappings_all ON public.scim_group_mappings FOR ALL TO authenticated
  USING (public.auth_user_can_access_account(account_id))
  WITH CHECK (public.auth_user_can_access_account(account_id));

DROP POLICY IF EXISTS scim_identities_select ON public.scim_identities;
CREATE POLICY scim_identities_select ON public.scim_identities FOR SELECT TO authenticated
  USING (public.auth_user_can_access_account(account_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scim_settings, public.scim_group_mappings TO authenticated;
GRANT SELECT ON public.scim_identities TO authenticated;
GRANT ALL ON public.scim_settings, public.scim_group_mappings, public.scim_identities TO service_role;

CREATE OR REPLACE FUNCTION public.scim_seat_available(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT sp.member_limit INTO v_limit
  FROM public.accounts a
  LEFT JOIN public.subscription_plans sp ON sp.id = a.subscription_plan_id
  WHERE a.id = p_account_id;

  IF v_limit IS NULL OR v_limit <= 0 THEN
    RETURN TRUE;
  END IF;

  SELECT count(*)::INTEGER INTO v_used
  FROM public.scim_identities si
  WHERE si.account_id = p_account_id AND si.active = TRUE;

  -- Also count non-service active members loosely via user_roles on account projects
  SELECT GREATEST(v_used, (
    SELECT count(DISTINCT ur.user_id)::INTEGER
    FROM public.user_roles ur
    JOIN public.projects p ON p.id = ur.project_id
    JOIN public.users u ON u.id = ur.user_id
    WHERE p.account_id = p_account_id
      AND ur.is_active = TRUE
      AND COALESCE(u.is_service_account, FALSE) = FALSE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
  )) INTO v_used;

  RETURN v_used < v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.scim_provision_user(
  p_account_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_external_id TEXT,
  p_welcome_email BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user UUID;
BEGIN
  IF NOT public.scim_seat_available(p_account_id) THEN
    RAISE EXCEPTION 'SCIM_SEAT_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_user FROM public.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user IS NULL THEN
    INSERT INTO public.users (id, email, full_name, is_active, is_service_account, created_at, updated_at)
    VALUES (gen_random_uuid(), lower(p_email), p_full_name, TRUE, FALSE, NOW(), NOW())
    RETURNING id INTO v_user;
  END IF;

  INSERT INTO public.scim_identities (account_id, user_id, external_id, active, last_sync_at)
  VALUES (p_account_id, v_user, p_external_id, TRUE, NOW())
  ON CONFLICT (account_id, user_id) DO UPDATE
    SET external_id = EXCLUDED.external_id, active = TRUE, last_sync_at = NOW(), updated_at = NOW();

  -- Optional welcome email is queued by the gateway when p_welcome_email is true.
  PERFORM p_welcome_email;

  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.scim_link_user(
  p_account_id UUID,
  p_user_id UUID,
  p_external_id TEXT,
  p_active BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.scim_identities (account_id, user_id, external_id, active, last_sync_at)
  VALUES (p_account_id, p_user_id, p_external_id, p_active, NOW())
  ON CONFLICT (account_id, user_id) DO UPDATE
    SET external_id = EXCLUDED.external_id, active = EXCLUDED.active, last_sync_at = NOW(), updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.scim_set_active(
  p_account_id UUID,
  p_user_id UUID,
  p_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.scim_identities
  SET active = p_active, last_sync_at = NOW(), updated_at = NOW()
  WHERE account_id = p_account_id AND user_id = p_user_id;

  UPDATE public.users
  SET is_active = p_active, updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT p_active THEN
    UPDATE public.user_roles
    SET is_active = FALSE, updated_at = NOW()
    WHERE user_id = p_user_id
      AND project_id IN (SELECT id FROM public.projects WHERE account_id = p_account_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.scim_apply_group_role(
  p_account_id UUID,
  p_group_mapping_id UUID,
  p_user_external_id TEXT,
  p_add BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_map public.scim_group_mappings%ROWTYPE;
  v_user UUID;
  v_role UUID;
BEGIN
  SELECT * INTO v_map FROM public.scim_group_mappings WHERE id = p_group_mapping_id AND account_id = p_account_id;
  IF NOT FOUND OR v_map.role_name IS NULL THEN RETURN; END IF;

  SELECT user_id INTO v_user FROM public.scim_identities
  WHERE account_id = p_account_id AND (external_id = p_user_external_id OR id::text = p_user_external_id)
  LIMIT 1;
  IF v_user IS NULL THEN RETURN; END IF;

  SELECT id INTO v_role FROM public.roles WHERE role_name = v_map.role_name AND account_id IS NULL LIMIT 1;
  IF v_role IS NULL THEN RETURN; END IF;

  IF p_add THEN
    INSERT INTO public.user_roles (id, user_id, role_id, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user, v_role, TRUE, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.user_roles SET is_active = FALSE, updated_at = NOW()
    WHERE user_id = v_user AND role_id = v_role;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.scim_blocks_manual_invite(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE((SELECT enabled AND block_manual_invites FROM public.scim_settings WHERE account_id = p_account_id), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.scim_manages_profile(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.scim_identities si
    JOIN public.scim_settings ss ON ss.account_id = si.account_id
    WHERE si.user_id = p_user_id AND ss.enabled = TRUE AND si.active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.scim_seat_available, public.scim_provision_user, public.scim_link_user,
  public.scim_set_active, public.scim_apply_group_role FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scim_seat_available, public.scim_provision_user, public.scim_link_user,
  public.scim_set_active, public.scim_apply_group_role TO service_role;
GRANT EXECUTE ON FUNCTION public.scim_blocks_manual_invite, public.scim_manages_profile TO authenticated, service_role;

INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body)
VALUES (
  'scim_token_expiry',
  'SCIM token expiring',
  'The SCIM token for this organisation expires on {{due_date}}.',
  'SCIM token expired',
  'The SCIM token expired on {{due_date}}. Rotate it in Integrations & Security.'
)
ON CONFLICT (message_key) DO NOTHING;

INSERT INTO public.reminder_record_types (
  schema_name, record_type, label, description, table_name, id_column, date_column,
  due_offset_days, title_column, project_column, account_column, owner_columns, owner_id_kind, status_filter,
  recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order
) VALUES (
  'public', 'scim_token_expiry', 'SCIM token expiry',
  'Warn organisation admins before the SCIM token expires (v1356).',
  'scim_settings', 'account_id', 'token_expires_at', 0, 'account_id', NULL, 'account_id', ARRAY[]::TEXT[], 'user',
  'r.enabled = TRUE AND r.token_expires_at IS NOT NULL',
  'org_admins', 14, 7, 'scim_token_expiry', ARRAY['scim_settings'], 91
)
ON CONFLICT (schema_name, record_type) DO UPDATE SET is_active = TRUE, updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('scim_settings', 'Per-organisation SCIM settings and token hash (v1356)', FALSE, TRUE),
  ('scim_group_mappings', 'IdP group to Nidus role mappings (v1356)', FALSE, TRUE),
  ('scim_identities', 'SCIM external id linked to users (v1356)', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('scim_settings'), ('scim_group_mappings'), ('scim_identities')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.scim_settings.enabled', 'SCIM enabled', 'When on, the identity provider manages users and group roles for this organisation.', '- On', NULL, NULL, 'api'),
  ('public.scim_settings.welcome_email', 'Welcome email', 'Send a welcome email when SCIM creates a new person. Off skips invitation email.', '- Off', NULL, NULL, 'api'),
  ('public.scim_settings.block_manual_invites', 'Block manual invites', 'When on, people can only be added through SCIM.', '- On', NULL, NULL, 'api'),
  ('public.scim_group_mappings.idp_group_name', 'IdP group', 'The group name from your identity provider.', '- Project Managers', NULL, NULL, 'api'),
  ('public.scim_group_mappings.role_name', 'Nidus role', 'The Nidus role members of that group receive.', '- project_manager', NULL, NULL, 'api')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples, is_active = TRUE, updated_at = NOW();

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_org_scim', 'SCIM provisioning', 'Connect your identity provider (v1356).', '/platform/organisation/integrations/scim', 3, 74, 'universal', 'users', TRUE, TRUE, 'project_setup', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_org_scim');

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, sort_order)
SELECT mi.id, v.placement_key, 'project_setup', mi.sort_order
FROM public.menu_items mi
CROSS JOIN (VALUES ('pm'), ('pmo_oversight')) AS v(placement_key)
WHERE mi.menu_code = 'plat_org_scim'
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code = 'plat_org_scim'
WHERE r.role_name IN ('pmo_admin', 'account_owner') AND r.account_id IS NULL
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
