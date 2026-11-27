-- ============================================================================
-- v1585 — Public API foundations (v1356 slice 1)
-- Service accounts, hashed organisation API credentials, request audit, rate counters.
-- Retires unused v42 api_keys scaffolding after a row check.
-- Admin SQL v260 seeds ID generation for api_credentials.
-- Idempotent. Owner runs this file.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Service accounts ─────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_service_account BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.is_service_account IS
  'Non-login member used by organisation API keys (v1356 D3). No interactive sign-in.';

CREATE INDEX IF NOT EXISTS idx_users_service_account
  ON public.users (is_service_account)
  WHERE is_service_account = TRUE AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 2. api_credentials ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  credential_reference TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  service_account_user_id UUID NOT NULL REFERENCES public.users(id),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  rotated_from UUID REFERENCES public.api_credentials(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT api_credentials_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT api_credentials_prefix_len CHECK (char_length(key_prefix) BETWEEN 8 AND 32),
  CONSTRAINT api_credentials_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_credentials_prefix
  ON public.api_credentials (key_prefix);

CREATE INDEX IF NOT EXISTS idx_api_credentials_account
  ON public.api_credentials (account_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_api_credentials_service
  ON public.api_credentials (service_account_user_id);

DROP TRIGGER IF EXISTS trg_api_credentials_display_id ON public.api_credentials;
CREATE TRIGGER trg_api_credentials_display_id
  AFTER INSERT ON public.api_credentials
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.api_credentials', 'credential_reference');

COMMENT ON TABLE public.api_credentials IS
  'Organisation API keys: hash + prefix only; plain key shown once (v1356 D3).';

-- ── 3. api_request_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES public.api_credentials(id) ON DELETE SET NULL,
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER,
  ip TEXT,
  user_agent TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_request_log_account_created
  ON public.api_request_log (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_log_credential
  ON public.api_request_log (credential_id, created_at DESC);

COMMENT ON TABLE public.api_request_log IS
  'One row per public API / SCIM call (v1356 D2). Retention via v1352 catalogue.';

-- ── 4. api_rate_counters ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_rate_counters (
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  bucket_kind TEXT NOT NULL CHECK (bucket_kind IN ('minute', 'day', 'scim_minute')),
  bucket_key TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, bucket_kind, bucket_key)
);

COMMENT ON TABLE public.api_rate_counters IS
  'Per-organisation minute / day counters for the public API and SCIM (v1356 D6).';

-- ── 5. Plan limits on subscription_plans ────────────────────────────────────
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scim_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS api_rate_per_minute INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS api_rate_per_day INTEGER NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS scim_rate_per_minute INTEGER NOT NULL DEFAULT 60;

COMMENT ON COLUMN public.subscription_plans.api_enabled IS 'v1356 D6 — Admin enables the public API on this plan.';
COMMENT ON COLUMN public.subscription_plans.scim_enabled IS 'v1356 D6 — Admin enables SCIM on this plan.';

-- ── 6. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_credentials_select ON public.api_credentials;
CREATE POLICY api_credentials_select ON public.api_credentials
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_account(account_id));

DROP POLICY IF EXISTS api_credentials_write ON public.api_credentials;
CREATE POLICY api_credentials_write ON public.api_credentials
  FOR ALL TO authenticated
  USING (
    public.auth_user_can_access_account(account_id)
    AND (public.is_user_pmo_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.owner_user_id IN (
        SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
      )
    ))
  )
  WITH CHECK (
    public.auth_user_can_access_account(account_id)
    AND (public.is_user_pmo_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.owner_user_id IN (
        SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
      )
    ))
  );

DROP POLICY IF EXISTS api_request_log_select ON public.api_request_log;
CREATE POLICY api_request_log_select ON public.api_request_log
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_account(account_id));

-- Counters and inserts are gateway / SECURITY DEFINER only
REVOKE ALL ON public.api_rate_counters FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_rate_counters TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.api_request_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.api_request_log TO authenticated;
GRANT ALL ON public.api_request_log TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.api_credentials TO authenticated;
GRANT ALL ON public.api_credentials TO service_role;

-- ── 7. RPCs: create / rotate / revoke credential ────────────────────────────
CREATE OR REPLACE FUNCTION public.api_hash_key(p_plain TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(p_plain, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.create_api_credential(
  p_account_id UUID,
  p_name TEXT,
  p_service_account_user_id UUID,
  p_scopes TEXT[],
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_plain_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  credential_reference TEXT,
  key_prefix TEXT,
  plain_key TEXT,
  scopes TEXT[],
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user UUID;
  v_plain TEXT;
  v_prefix TEXT;
  v_id UUID;
  v_ref TEXT;
BEGIN
  IF NOT public.auth_user_can_access_account(p_account_id) THEN
    RAISE EXCEPTION 'API_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_user_pmo_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.accounts a
    JOIN public.users u ON u.id = a.owner_user_id
    WHERE a.id = p_account_id AND u.auth_user_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'API_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_service_account_user_id
      AND u.is_service_account = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'API_BAD_SERVICE_ACCOUNT' USING ERRCODE = '22023';
  END IF;

  IF p_expires_at IS NOT NULL AND p_expires_at > NOW() + INTERVAL '365 days' THEN
    RAISE EXCEPTION 'API_EXPIRY_TOO_LONG' USING ERRCODE = '22023';
  END IF;

  SELECT u.id INTO v_user FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1;

  v_plain := COALESCE(NULLIF(p_plain_key, ''), 'nds_live_' || encode(gen_random_bytes(32), 'hex'));
  v_prefix := left(v_plain, 16);

  INSERT INTO public.api_credentials (
    account_id, credential_reference, name, key_prefix, key_hash,
    service_account_user_id, scopes, expires_at, created_by
  ) VALUES (
    p_account_id, '', p_name, v_prefix, public.api_hash_key(v_plain),
    p_service_account_user_id, COALESCE(p_scopes, '{}'), p_expires_at, v_user
  )
  RETURNING api_credentials.id, api_credentials.credential_reference
  INTO v_id, v_ref;

  RETURN QUERY SELECT v_id, COALESCE(NULLIF(v_ref, ''), v_id::text), v_prefix, v_plain, COALESCE(p_scopes, '{}'::text[]), p_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_api_credential(p_credential_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_account UUID;
BEGIN
  SELECT account_id INTO v_account FROM public.api_credentials WHERE id = p_credential_id;
  IF v_account IS NULL THEN
    RAISE EXCEPTION 'API_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.auth_user_can_access_account(v_account) THEN
    RAISE EXCEPTION 'API_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  UPDATE public.api_credentials
  SET revoked_at = NOW(), updated_at = NOW()
  WHERE id = p_credential_id AND revoked_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_api_credential(
  p_credential_id UUID,
  p_plain_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  credential_reference TEXT,
  key_prefix TEXT,
  plain_key TEXT,
  scopes TEXT[],
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_old public.api_credentials%ROWTYPE;
  v_new_id UUID;
  v_ref TEXT;
  v_prefix TEXT;
  v_plain TEXT;
BEGIN
  SELECT * INTO v_old FROM public.api_credentials WHERE api_credentials.id = p_credential_id AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'API_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  -- Overlap: old key stays until revoked or expired; new key shares service account + scopes.
  SELECT c.id, c.credential_reference, c.key_prefix, c.plain_key
  INTO v_new_id, v_ref, v_prefix, v_plain
  FROM public.create_api_credential(
    v_old.account_id,
    v_old.name || ' (rotated)',
    v_old.service_account_user_id,
    v_old.scopes,
    v_old.expires_at,
    p_plain_key
  ) c;

  UPDATE public.api_credentials
  SET rotated_from = p_credential_id, updated_at = NOW()
  WHERE api_credentials.id = v_new_id;

  RETURN QUERY SELECT v_new_id, v_ref, v_prefix, v_plain, v_old.scopes, v_old.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_api_credential(p_plain_key TEXT)
RETURNS TABLE (
  credential_id UUID,
  account_id UUID,
  service_account_user_id UUID,
  auth_user_id UUID,
  scopes TEXT[],
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_prefix TEXT;
  v_hash TEXT;
BEGIN
  IF p_plain_key IS NULL OR char_length(p_plain_key) < 16 THEN
    RETURN;
  END IF;
  v_prefix := left(p_plain_key, 16);
  v_hash := public.api_hash_key(p_plain_key);

  RETURN QUERY
  SELECT
    c.id,
    c.account_id,
    c.service_account_user_id,
    u.auth_user_id,
    c.scopes,
    u.email
  FROM public.api_credentials c
  JOIN public.users u ON u.id = c.service_account_user_id
  WHERE c.key_prefix = v_prefix
    AND c.key_hash = v_hash
    AND c.revoked_at IS NULL
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND COALESCE(u.is_deleted, FALSE) = FALSE
    AND u.is_service_account = TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_api_rate(
  p_account_id UUID,
  p_kind TEXT,
  p_bucket_key TEXT,
  p_limit INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.api_rate_counters (account_id, bucket_kind, bucket_key, hit_count, updated_at)
  VALUES (p_account_id, p_kind, p_bucket_key, 1, NOW())
  ON CONFLICT (account_id, bucket_kind, bucket_key)
  DO UPDATE SET hit_count = public.api_rate_counters.hit_count + 1, updated_at = NOW()
  RETURNING hit_count INTO v_count;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_api_request(
  p_account_id UUID,
  p_credential_id UUID,
  p_request_id TEXT,
  p_method TEXT,
  p_path TEXT,
  p_status INTEGER,
  p_duration_ms INTEGER,
  p_ip TEXT,
  p_user_agent TEXT,
  p_error_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.api_request_log (
    account_id, credential_id, request_id, method, path, status_code,
    duration_ms, ip, user_agent, error_code
  ) VALUES (
    p_account_id, p_credential_id, p_request_id, p_method, p_path, p_status,
    p_duration_ms, p_ip, p_user_agent, p_error_code
  );
  IF p_credential_id IS NOT NULL THEN
    UPDATE public.api_credentials SET last_used_at = NOW() WHERE id = p_credential_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_service_account_user(
  p_account_id UUID,
  p_name TEXT,
  p_auth_user_id UUID,
  p_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.auth_user_can_access_account(p_account_id) THEN
    RAISE EXCEPTION 'API_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_id FROM public.users WHERE auth_user_id = p_auth_user_id LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.users
    SET is_service_account = TRUE,
        full_name = COALESCE(NULLIF(p_name, ''), full_name),
        email = COALESCE(NULLIF(p_email, ''), email),
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.users (
    id, auth_user_id, email, full_name, is_service_account, is_active, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_auth_user_id, p_email, p_name, TRUE, TRUE, NOW(), NOW()
  )
  RETURNING id INTO v_id;

  -- Give the service account a role on the organisation when user_roles supports it.
  BEGIN
    INSERT INTO public.user_roles (id, user_id, role_id, account_id, is_active, created_at, updated_at)
    SELECT gen_random_uuid(), v_id, r.id, p_account_id, TRUE, NOW(), NOW()
    FROM public.roles r
    WHERE r.role_name = 'project_manager' AND r.account_id IS NULL
    LIMIT 1
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_api_credential FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_api_credential FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_api_credential FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lookup_api_credential FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_api_rate FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_api_request FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_service_account_user FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.api_hash_key FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_api_credential TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_api_credential TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_api_credential TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_account_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_api_credential TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_api_rate TO service_role;
GRANT EXECUTE ON FUNCTION public.log_api_request TO service_role;
GRANT EXECUTE ON FUNCTION public.api_hash_key TO service_role;

-- ── 8. Retire v42 scaffolding when empty (best-effort; see SQL/v1590) ────────
DO $$
DECLARE
  v_keys BIGINT := 0;
  v_logs BIGINT := 0;
  v_rel TEXT;
BEGIN
  IF to_regclass('public.api_keys') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.api_keys' INTO v_keys;
  END IF;
  IF to_regclass('public.api_logs') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.api_logs' INTO v_logs;
  END IF;
  IF v_keys <> 0 OR v_logs <> 0 THEN
    RAISE NOTICE 'v1585: kept v42 api_keys — % keys, % logs still present', v_keys, v_logs;
    RETURN;
  END IF;

  PERFORM set_config('lock_timeout', '3s', true);
  FOREACH v_rel IN ARRAY ARRAY['api_rate_limits', 'api_logs', 'api_keys', 'api_scopes']
  LOOP
    IF to_regclass('public.' || v_rel) IS NULL THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_rel);
      RAISE NOTICE 'v1585: dropped public.%', v_rel;
    EXCEPTION
      WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
        RAISE NOTICE 'v1585: skipped drop of public.% (busy) — run SQL/v1590 when idle', v_rel;
    END;
  END LOOP;
END $$;

-- ── 9. Registry + Planner wall ──────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('api_credentials', 'Organisation public API keys (hashed; v1356)', FALSE, TRUE),
  ('api_request_log', 'Public API and SCIM request audit (v1356)', TRUE, TRUE),
  ('api_rate_counters', 'Per-organisation API rate buckets (v1356)', TRUE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('api_credentials'), ('api_request_log'), ('api_rate_counters')
ON CONFLICT (table_name) DO NOTHING;

-- ── 10. Reminder catalogue: API key expiry ──────────────────────────────────
INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body)
VALUES (
  'api_credential_expiry',
  'API key expiring',
  'The API key “{{title}}” expires on {{due_date}}.',
  'API key expired',
  'The API key “{{title}}” expired on {{due_date}}. Rotate or revoke it.'
)
ON CONFLICT (message_key) DO NOTHING;

INSERT INTO public.reminder_record_types (
  schema_name, record_type, label, description, table_name, id_column, date_column,
  due_offset_days, title_column, project_column, account_column, owner_columns, owner_id_kind, status_filter,
  recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order
) VALUES (
  'public', 'api_credential_expiry', 'API key expiry',
  'Warn organisation admins before an API key expires (v1356).',
  'api_credentials', 'id', 'expires_at', 0, 'name', NULL, 'account_id', ARRAY[]::TEXT[], 'user',
  'r.revoked_at IS NULL AND r.expires_at IS NOT NULL',
  'org_admins', 14, 7, 'api_credential_expiry', ARRAY['api_credentials'], 90
)
ON CONFLICT (schema_name, record_type) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  status_filter = EXCLUDED.status_filter,
  is_active = TRUE,
  updated_at = NOW();

-- ── 11. Field help ──────────────────────────────────────────────────────────
INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.api_credentials.name', 'Key name', 'A short label so you can tell this key apart from others.', '- BI warehouse sync', NULL, NULL, 'api'),
  ('public.api_credentials.scopes', 'Scopes', 'What this key may do. It can never do more than the service account’s role allows.', '- projects:read', NULL, NULL, 'api'),
  ('public.api_credentials.expires_at', 'Expires', 'The last day this key works. Maximum one year from creation.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'api'),
  ('public.api_credentials.service_account_user_id', 'Service account', 'The non-login member this key acts as. Project access and roles come from that member.', '- API Warehouse', NULL, NULL, 'api'),
  ('public.users.full_name', 'Service account name', 'A label for the non-login member that API keys use.', '- API Warehouse', NULL, NULL, 'api')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

-- ── 12. Menus: Organisation Settings › Integrations & Security ──────────────
INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at)
SELECT gen_random_uuid(), v.code, v.label, v.description, v.route, 3, v.sort_order, 'universal', 'shield', TRUE, TRUE, 'project_setup', NOW(), NOW()
FROM (VALUES
  ('plat_org_integrations', 'Integrations & Security', 'API keys, webhooks, SCIM and SSO for this organisation (v1356).', '/platform/organisation/integrations', 70),
  ('plat_org_api_keys', 'API keys', 'Organisation API keys and service accounts (v1356).', '/platform/organisation/integrations/api-keys', 71),
  ('plat_org_api_docs', 'API reference', 'OpenAPI reference for the public API (v1356).', '/platform/organisation/integrations/api-docs', 72)
) AS v(code, label, description, route, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = v.code);

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, sort_order)
SELECT mi.id, v.placement_key, 'project_setup', mi.sort_order
FROM public.menu_items mi
CROSS JOIN (VALUES ('pm'), ('pmo_oversight')) AS v(placement_key)
WHERE mi.menu_code IN ('plat_org_integrations', 'plat_org_api_keys', 'plat_org_api_docs')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code IN ('plat_org_integrations', 'plat_org_api_keys', 'plat_org_api_docs')
WHERE r.role_name IN ('pmo_admin', 'account_owner') AND r.account_id IS NULL AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
