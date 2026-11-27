-- ============================================================================
-- v1588 — Per-organisation SSO (v1356 slice 5)
-- SAML / OIDC connections, verified domains, SSO required + break-glass.
-- Retires empty v51 sso_* scaffolding after a row check.
-- Idempotent. Owner runs after v1587.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sso_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  connection_reference TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('saml', 'oidc')),
  provider_id TEXT,
  metadata_url TEXT,
  client_id TEXT,
  client_secret_hash TEXT,
  verified_domains TEXT[] NOT NULL DEFAULT '{}',
  sso_required BOOLEAN NOT NULL DEFAULT FALSE,
  break_glass_user_id UUID REFERENCES public.users(id),
  certificate_expires_at TIMESTAMPTZ,
  domain_verified_at TIMESTAMPTZ,
  domain_txt_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_sso_connections_display_id ON public.sso_connections;
CREATE TRIGGER trg_sso_connections_display_id
  AFTER INSERT ON public.sso_connections
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.sso_connections', 'connection_reference');

CREATE INDEX IF NOT EXISTS idx_sso_connections_account
  ON public.sso_connections (account_id)
  WHERE is_active = TRUE;

ALTER TABLE public.sso_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sso_connections_all ON public.sso_connections;
CREATE POLICY sso_connections_all ON public.sso_connections
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_account(account_id))
  WITH CHECK (public.auth_user_can_access_account(account_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sso_connections TO authenticated;
GRANT ALL ON public.sso_connections TO service_role;

CREATE OR REPLACE FUNCTION public.sso_resolve_login_domain(p_email TEXT)
RETURNS TABLE (
  account_id UUID,
  connection_id UUID,
  protocol TEXT,
  provider_id TEXT,
  sso_required BOOLEAN,
  break_glass_user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_domain TEXT;
BEGIN
  v_domain := lower(split_part(p_email, '@', 2));
  IF v_domain IS NULL OR v_domain = '' THEN RETURN; END IF;

  RETURN QUERY
  SELECT c.account_id, c.id, c.protocol, c.provider_id, c.sso_required, c.break_glass_user_id
  FROM public.sso_connections c
  WHERE c.is_active = TRUE
    AND c.domain_verified_at IS NOT NULL
    AND v_domain = ANY (SELECT lower(unnest(c.verified_domains)));
END;
$$;

CREATE OR REPLACE FUNCTION public.sso_password_allowed(p_email TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT * INTO v_row FROM public.sso_resolve_login_domain(p_email) LIMIT 1;
  IF NOT FOUND OR NOT v_row.sso_required THEN
    RETURN TRUE;
  END IF;
  IF p_user_id IS NOT NULL AND v_row.break_glass_user_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  -- Also allow the account owner as break-glass when no explicit user set
  IF p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = v_row.account_id AND a.owner_user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sso_domain_recheck()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Weekly job: mark connections that need a DNS re-check alert.
  -- Does not lock anyone out (D10 / plan risk mitigation).
  UPDATE public.sso_connections
  SET updated_at = NOW()
  WHERE is_active = TRUE
    AND domain_verified_at IS NOT NULL
    AND domain_verified_at < NOW() - INTERVAL '90 days';
END;
$$;

REVOKE ALL ON FUNCTION public.sso_resolve_login_domain FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sso_resolve_login_domain TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sso_password_allowed TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sso_domain_recheck FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sso_domain_recheck TO service_role;

SELECT public.background_job_register(
  p_code => 'sso.domain_recheck',
  p_name => 'SSO domain re-check',
  p_kind => 'sql',
  p_description => 'Flags SSO connections whose domain verification is stale; does not lock users out (v1356).',
  p_owner_system => 'platform',
  p_sql_function => 'public.sso_domain_recheck',
  p_cron => '0 4 * * 1',
  p_time_basis => 'utc',
  p_timeout_seconds => 300
);

INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body)
VALUES (
  'sso_certificate_expiry',
  'SSO certificate expiring',
  'The SAML certificate for “{{title}}” expires on {{due_date}}.',
  'SSO certificate expired',
  'The SAML certificate for “{{title}}” expired on {{due_date}}. Renew it in Integrations & Security.'
)
ON CONFLICT (message_key) DO NOTHING;

INSERT INTO public.reminder_record_types (
  schema_name, record_type, label, description, table_name, id_column, date_column,
  due_offset_days, title_column, project_column, account_column, owner_columns, owner_id_kind, status_filter,
  recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order
) VALUES (
  'public', 'sso_certificate_expiry', 'SSO certificate expiry',
  'Warn organisation admins before a SAML certificate expires (v1356).',
  'sso_connections', 'id', 'certificate_expires_at', 0, 'name', NULL, 'account_id', ARRAY[]::TEXT[], 'user',
  'r.is_active = TRUE AND r.certificate_expires_at IS NOT NULL',
  'org_admins', 30, 14, 'sso_certificate_expiry', ARRAY['sso_connections'], 92
)
ON CONFLICT (schema_name, record_type) DO UPDATE SET is_active = TRUE, updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('sso_connections', 'Per-organisation SAML / OIDC SSO connections (v1356)', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES ('sso_connections')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.sso_connections.name', 'Connection name', 'A label for this SSO connection.', '- Example Freight SSO', NULL, NULL, 'api'),
  ('public.sso_connections.protocol', 'Protocol', 'SAML 2.0 or OpenID Connect.', '- saml', NULL, NULL, 'api'),
  ('public.sso_connections.verified_domains', 'Email domains', 'Login emails on these domains use this SSO connection after DNS verification.', '- client.example', NULL, NULL, 'api'),
  ('public.sso_connections.sso_required', 'SSO required', 'When on, password login is blocked for those domains except the break-glass owner.', '- On', NULL, NULL, 'api'),
  ('public.sso_connections.break_glass_user_id', 'Break-glass user', 'The person who may still use a password if SSO is required.', '- Account Owner', NULL, NULL, 'api'),
  ('public.sso_connections.metadata_url', 'Metadata URL', 'IdP metadata URL for SAML, or discovery URL for OIDC.', '- https://idp.client.example/metadata', NULL, NULL, 'api')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples, is_active = TRUE, updated_at = NOW();

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_org_sso', 'Single sign-on', 'SAML / OIDC for verified email domains (v1356).', '/platform/organisation/integrations/sso', 3, 75, 'universal', 'key', TRUE, TRUE, 'project_setup', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_org_sso');

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, sort_order)
SELECT mi.id, v.placement_key, 'project_setup', mi.sort_order
FROM public.menu_items mi
CROSS JOIN (VALUES ('pm'), ('pmo_oversight')) AS v(placement_key)
WHERE mi.menu_code = 'plat_org_sso'
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code = 'plat_org_sso'
WHERE r.role_name IN ('pmo_admin', 'account_owner') AND r.account_id IS NULL
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Retire v51 when empty (best-effort: never fail the migration on lock contention /
-- deadlock with PostgREST or another SQL tab). Re-run SQL/v1590_* if drops skip.
DO $$
DECLARE
  v_prov BIGINT := 0;
  v_sess BIGINT := 0;
  v_rel TEXT;
BEGIN
  IF to_regclass('public.sso_providers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.sso_providers' INTO v_prov;
  END IF;
  IF to_regclass('public.sso_sessions') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.sso_sessions' INTO v_sess;
  END IF;

  IF v_prov <> 0 OR v_sess <> 0 THEN
    RAISE NOTICE 'v1588: kept v51 SSO tables — % providers, % sessions', v_prov, v_sess;
    RETURN;
  END IF;

  PERFORM set_config('lock_timeout', '3s', true);
  FOREACH v_rel IN ARRAY ARRAY[
    'sso_login_logs',
    'sso_sessions',
    'user_identity_mappings',
    'sso_providers'
  ]
  LOOP
    IF to_regclass('public.' || v_rel) IS NULL THEN
      CONTINUE;
    END IF;
    BEGIN
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_rel);
      RAISE NOTICE 'v1588: dropped public.%', v_rel;
    EXCEPTION
      WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
        RAISE NOTICE 'v1588: skipped drop of public.% (busy) — run SQL/v1590 when idle', v_rel;
    END;
  END LOOP;
END $$;
