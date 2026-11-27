-- =============================================================================
-- v1609 — v1359 Slice 1 (gaps A9, A10, A11): integration settings for organisation admins only, and webhook
--         delivery through worker functions
-- Plan: projectplan/v1359_v1353_to_v1356_gap_closure_plan.md · fixes SQL v1586 / v1587 / v1588 (v1356)
-- =============================================================================
-- A10 / A11: webhook endpoints (with their signing secret), deliveries, outbox, SCIM settings, SCIM group
--   mappings, SCIM identities and SSO connections were open to EVERY member of the organisation (any project role),
--   for reading and, except identities / deliveries / outbox, for writing. A member could read the webhook signing
--   secrets, turn on "SSO required" or change the break-glass user, or map SCIM groups to roles. They now follow the
--   API-key rule (v1585): the Account Owner or a PMO Admin of the organisation. Members never needed these tables:
--   sign-in, invitations and the profile lock use SECURITY DEFINER functions (sso_password_allowed,
--   sso_resolve_login_domain, scim_blocks_manual_invite, scim_manages_profile); the gateway and the worker use the
--   service role.
-- A9: the webhooks.deliver handler read and wrote tables through ctx.admin, which the worker adapter does not have,
--   so every delivery failed. It now calls webhook_delivery_context / webhook_delivery_result (service role only).
-- Run after v1585–v1590. Idempotent.
-- =============================================================================

-- ── 1. Who may manage integrations ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auth_user_is_account_admin(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT public.auth_user_can_access_account(p_account_id)
     AND (public.is_user_pmo_admin(auth.uid())
          OR EXISTS (SELECT 1 FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
                      WHERE a.id = p_account_id AND u.auth_user_id = auth.uid()));
$$;
COMMENT ON FUNCTION public.auth_user_is_account_admin(UUID) IS
  'v1609: TRUE for the Account Owner or a PMO Admin who can access the organisation (same rule as API keys, v1585). Used by integration settings policies.';
REVOKE ALL ON FUNCTION public.auth_user_is_account_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_is_account_admin(UUID) TO authenticated, service_role;

-- ── 2. Policies ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS webhook_endpoints_all ON public.webhook_endpoints;
CREATE POLICY webhook_endpoints_all ON public.webhook_endpoints
  FOR ALL TO authenticated
  USING (public.auth_user_is_account_admin(account_id))
  WITH CHECK (public.auth_user_is_account_admin(account_id));

DROP POLICY IF EXISTS webhook_deliveries_select ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_select ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.webhook_endpoints e
                  WHERE e.id = endpoint_id AND public.auth_user_is_account_admin(e.account_id)));

DROP POLICY IF EXISTS webhook_outbox_select ON public.webhook_outbox;
CREATE POLICY webhook_outbox_select ON public.webhook_outbox
  FOR SELECT TO authenticated
  USING (public.auth_user_is_account_admin(account_id));

DROP POLICY IF EXISTS scim_settings_all ON public.scim_settings;
CREATE POLICY scim_settings_all ON public.scim_settings FOR ALL TO authenticated
  USING (public.auth_user_is_account_admin(account_id))
  WITH CHECK (public.auth_user_is_account_admin(account_id));

DROP POLICY IF EXISTS scim_group_mappings_all ON public.scim_group_mappings;
CREATE POLICY scim_group_mappings_all ON public.scim_group_mappings FOR ALL TO authenticated
  USING (public.auth_user_is_account_admin(account_id))
  WITH CHECK (public.auth_user_is_account_admin(account_id));

DROP POLICY IF EXISTS scim_identities_select ON public.scim_identities;
CREATE POLICY scim_identities_select ON public.scim_identities FOR SELECT TO authenticated
  USING (public.auth_user_is_account_admin(account_id));

DROP POLICY IF EXISTS sso_connections_all ON public.sso_connections;
CREATE POLICY sso_connections_all ON public.sso_connections
  FOR ALL TO authenticated
  USING (public.auth_user_is_account_admin(account_id))
  WITH CHECK (public.auth_user_is_account_admin(account_id));

-- ── 3. Webhook delivery for the worker (A9) ──────────────────────────────────
-- What to send. A delivery whose endpoint is gone or switched off is marked dead and skipped.
CREATE OR REPLACE FUNCTION public.webhook_delivery_context(p_delivery_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  d public.webhook_deliveries;
  e public.webhook_endpoints;
  o public.webhook_outbox;
BEGIN
  d := (SELECT x FROM public.webhook_deliveries x WHERE x.id = p_delivery_id);
  IF d.id IS NULL THEN RETURN jsonb_build_object('skip', 'delivery not found'); END IF;
  IF d.status = 'delivered' THEN RETURN jsonb_build_object('skip', 'already delivered'); END IF;
  e := (SELECT x FROM public.webhook_endpoints x WHERE x.id = d.endpoint_id);
  IF e.id IS NULL OR e.status <> 'active' THEN
    UPDATE public.webhook_deliveries SET status = 'dead' WHERE id = d.id;
    RETURN jsonb_build_object('skip', 'endpoint is not active');
  END IF;
  o := (SELECT x FROM public.webhook_outbox x WHERE x.id = d.outbox_id);
  RETURN jsonb_build_object(
    'delivery_id', d.id,
    'endpoint_id', e.id,
    'account_id', e.account_id,
    'target_url', e.target_url,
    'secret', e.secret_encrypted,
    'event_type', d.event_type,
    'event', jsonb_build_object(
      'id', COALESCE(o.id, d.id),
      'type', d.event_type,
      'created_at', COALESCE(o.created_at, d.created_at),
      'data', jsonb_build_object('resource_type', o.resource_type, 'resource_id', o.resource_id) || COALESCE(o.payload, '{}'::jsonb)));
END;
$$;

-- The result of one attempt. Ten failures in a row switch the endpoint off.
CREATE OR REPLACE FUNCTION public.webhook_delivery_result(p_delivery_id UUID, p_ok BOOLEAN, p_status INTEGER, p_body TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  d          public.webhook_deliveries;
  v_failures INTEGER;
BEGIN
  d := (SELECT x FROM public.webhook_deliveries x WHERE x.id = p_delivery_id);
  IF d.id IS NULL THEN RETURN jsonb_build_object('skip', 'delivery not found'); END IF;
  IF p_ok THEN
    UPDATE public.webhook_deliveries
       SET status = 'delivered', response_status = p_status, response_body = left(p_body, 2000), delivered_at = NOW()
     WHERE id = d.id;
    UPDATE public.webhook_endpoints SET failure_count = 0, last_success_at = NOW(), updated_at = NOW() WHERE id = d.endpoint_id;
    UPDATE public.webhook_outbox SET processed_at = NOW() WHERE id = d.outbox_id AND processed_at IS NULL;
    RETURN jsonb_build_object('delivered', TRUE);
  END IF;
  UPDATE public.webhook_deliveries
     SET status = 'failed', response_status = NULLIF(p_status, 0), response_body = left(p_body, 2000),
         attempt_number = attempt_number + 1
   WHERE id = d.id;
  UPDATE public.webhook_endpoints
     SET failure_count = failure_count + 1, last_failure_at = NOW(),
         status = CASE WHEN failure_count + 1 >= 10 THEN 'disabled' ELSE status END, updated_at = NOW()
   WHERE id = d.endpoint_id;
  v_failures := (SELECT e.failure_count FROM public.webhook_endpoints e WHERE e.id = d.endpoint_id);
  RETURN jsonb_build_object('delivered', FALSE, 'failures', v_failures, 'disabled', v_failures >= 10);
END;
$$;

REVOKE ALL ON FUNCTION public.webhook_delivery_context(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.webhook_delivery_result(UUID, BOOLEAN, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.webhook_delivery_context(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.webhook_delivery_result(UUID, BOOLEAN, INTEGER, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── Check (read-only) ────────────────────────────────────────────────────────
SELECT tablename, policyname, qual
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('webhook_endpoints', 'webhook_deliveries', 'webhook_outbox', 'scim_settings',
                     'scim_group_mappings', 'scim_identities', 'sso_connections')
 ORDER BY tablename, policyname;
