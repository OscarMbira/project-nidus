-- ============================================================================
-- v1586 — Write API idempotency + webhooks (v1356 slice 3)
-- Retires empty v43 webhook scaffolding after a row check.
-- Idempotent. Owner runs after v1585.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES public.api_credentials(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_api_idempotency UNIQUE (account_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_expires ON public.api_idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  endpoint_reference TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret_hash TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhook_endpoints_https CHECK (target_url ~* '^https://')
);

DROP TRIGGER IF EXISTS trg_webhook_endpoints_display_id ON public.webhook_endpoints;
CREATE TRIGGER trg_webhook_endpoints_display_id
  AFTER INSERT ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.webhook_endpoints', 'endpoint_reference');

CREATE TABLE IF NOT EXISTS public.webhook_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_outbox_pending
  ON public.webhook_outbox (created_at)
  WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  outbox_id UUID REFERENCES public.webhook_outbox(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'dead')),
  response_status INTEGER,
  response_body TEXT,
  next_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint
  ON public.webhook_deliveries (endpoint_id, created_at DESC);

ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_endpoints_all ON public.webhook_endpoints;
CREATE POLICY webhook_endpoints_all ON public.webhook_endpoints
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_account(account_id))
  WITH CHECK (public.auth_user_can_access_account(account_id));

DROP POLICY IF EXISTS webhook_deliveries_select ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_select ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.webhook_endpoints e
    WHERE e.id = endpoint_id AND public.auth_user_can_access_account(e.account_id)
  ));

DROP POLICY IF EXISTS webhook_outbox_select ON public.webhook_outbox;
CREATE POLICY webhook_outbox_select ON public.webhook_outbox
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_account(account_id));

REVOKE ALL ON public.api_idempotency_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.api_idempotency_keys TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT SELECT ON public.webhook_deliveries, public.webhook_outbox TO authenticated;
GRANT ALL ON public.webhook_endpoints, public.webhook_deliveries, public.webhook_outbox TO service_role;

-- Enqueue outbox → background job per active endpoint
CREATE OR REPLACE FUNCTION public.enqueue_webhook_event(
  p_account_id UUID,
  p_event_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_outbox UUID;
  v_ep RECORD;
BEGIN
  INSERT INTO public.webhook_outbox (account_id, event_type, resource_type, resource_id, payload)
  VALUES (p_account_id, p_event_type, p_resource_type, p_resource_id, COALESCE(p_payload, '{}'::JSONB))
  RETURNING id INTO v_outbox;

  FOR v_ep IN
    SELECT id FROM public.webhook_endpoints
    WHERE account_id = p_account_id
      AND status = 'active'
      AND p_event_type = ANY (events)
  LOOP
    INSERT INTO public.webhook_deliveries (endpoint_id, outbox_id, event_type, status, next_attempt_at)
    VALUES (v_ep.id, v_outbox, p_event_type, 'pending', NOW());

    PERFORM public.enqueue_background_job(
      'webhooks.deliver',
      jsonb_build_object('delivery_id', (SELECT id FROM public.webhook_deliveries WHERE endpoint_id = v_ep.id AND outbox_id = v_outbox ORDER BY created_at DESC LIMIT 1)),
      NOW(),
      'webhook:' || v_ep.id::text || ':' || v_outbox::text,
      p_account_id
    );
  END LOOP;

  RETURN v_outbox;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_webhook_event FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_webhook_event TO service_role;

CREATE OR REPLACE FUNCTION public.api_purge_idempotency_and_counters()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  DELETE FROM public.api_idempotency_keys WHERE expires_at < NOW();
  DELETE FROM public.api_rate_counters WHERE updated_at < NOW() - INTERVAL '2 days';
END;
$$;

SELECT public.background_job_register(
  p_code => 'webhooks.deliver',
  p_name => 'Deliver webhooks',
  p_kind => 'handler',
  p_description => 'Signs and posts webhook deliveries with back-off (v1356 D7).',
  p_owner_system => 'platform',
  p_timeout_seconds => 60,
  p_max_attempts => 12,
  p_item_ttl_seconds => 86400,
  p_batch_size => 50,
  p_per_org_batch_cap => 20
);

SELECT public.background_job_register(
  p_code => 'api.purge_idempotency_and_counters',
  p_name => 'Purge API idempotency and rate counters',
  p_kind => 'sql',
  p_description => 'Deletes expired idempotency keys and stale rate buckets (v1356).',
  p_owner_system => 'platform',
  p_sql_function => 'public.api_purge_idempotency_and_counters',
  p_cron => '15 * * * *',
  p_time_basis => 'utc',
  p_timeout_seconds => 300
);

-- Retention targets (create table if v1352 slice 3 has not landed yet)
CREATE TABLE IF NOT EXISTS public.retention_targets (
  table_schema TEXT NOT NULL DEFAULT 'public',
  table_name TEXT NOT NULL,
  date_column TEXT NOT NULL DEFAULT 'created_at',
  retain_days INTEGER NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (table_schema, table_name)
);

INSERT INTO public.retention_targets (table_schema, table_name, date_column, retain_days) VALUES
  ('public', 'api_request_log', 'created_at', 90),
  ('public', 'webhook_deliveries', 'created_at', 90)
ON CONFLICT (table_schema, table_name) DO UPDATE SET retain_days = EXCLUDED.retain_days, is_active = TRUE;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('api_idempotency_keys', 'Idempotent API write responses (v1356)', TRUE, TRUE),
  ('webhook_endpoints', 'Organisation webhook subscriptions (v1356)', FALSE, TRUE),
  ('webhook_outbox', 'Webhook events written with the change (v1356)', TRUE, TRUE),
  ('webhook_deliveries', 'Webhook delivery attempts (v1356)', TRUE, TRUE),
  ('retention_targets', 'Tables the retention job purges by age (v1352/v1356)', TRUE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('api_idempotency_keys'), ('webhook_endpoints'), ('webhook_outbox'), ('webhook_deliveries')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) VALUES
  ('public.webhook_endpoints.name', 'Endpoint name', 'A short label for this webhook subscription.', '- ERP project sync', NULL, NULL, 'api'),
  ('public.webhook_endpoints.target_url', 'HTTPS URL', 'Where Nidus posts signed events. Must be HTTPS.', '- https://hooks.client.example/nidus', 'Must start with https://', NULL, 'api'),
  ('public.webhook_endpoints.events', 'Events', 'Which record events to send.', '- project.updated', NULL, NULL, 'api')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples, is_active = TRUE, updated_at = NOW();

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, default_section_code, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_org_webhooks', 'Webhooks', 'Subscribe to record events (v1356).', '/platform/organisation/integrations/webhooks', 3, 73, 'universal', 'webhook', TRUE, TRUE, 'project_setup', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_org_webhooks');

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, sort_order)
SELECT mi.id, v.placement_key, 'project_setup', mi.sort_order
FROM public.menu_items mi
CROSS JOIN (VALUES ('pm'), ('pmo_oversight')) AS v(placement_key)
WHERE mi.menu_code = 'plat_org_webhooks'
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET section_code = EXCLUDED.section_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code = 'plat_org_webhooks'
WHERE r.role_name IN ('pmo_admin', 'account_owner') AND r.account_id IS NULL
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Retire v43 when empty
DO $$
DECLARE v_hooks BIGINT := 0; v_logs BIGINT := 0;
BEGIN
  IF to_regclass('public.webhooks') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.webhooks' INTO v_hooks; END IF;
  IF to_regclass('public.webhook_logs') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.webhook_logs' INTO v_logs; END IF;
  IF v_hooks <> 0 OR v_logs <> 0 THEN
    RAISE NOTICE 'v1586: kept v43 webhooks — % endpoints, % logs', v_hooks, v_logs;
    RETURN;
  END IF;

  -- Best-effort drops (avoid 40P01 deadlock with concurrent readers); see SQL/v1590.
  PERFORM set_config('lock_timeout', '3s', true);
  BEGIN
    EXECUTE 'DROP TABLE IF EXISTS public.webhook_logs CASCADE';
  EXCEPTION WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
    RAISE NOTICE 'v1586: skipped drop of public.webhook_logs (busy)';
  END;
  BEGIN
    EXECUTE 'DROP TABLE IF EXISTS public.webhooks CASCADE';
  EXCEPTION WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
    RAISE NOTICE 'v1586: skipped drop of public.webhooks (busy)';
  END;
  BEGIN
    EXECUTE 'DROP TABLE IF EXISTS public.webhook_events CASCADE';
  EXCEPTION WHEN deadlock_detected OR lock_not_available OR query_canceled THEN
    RAISE NOTICE 'v1586: skipped drop of public.webhook_events (busy)';
  END;
END $$;
