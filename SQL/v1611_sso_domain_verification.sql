-- =============================================================================
-- v1611 — v1359 Slice 2 (gap A14, security): real DNS verification of SSO email domains
-- Plan: projectplan/v1359_v1353_to_v1356_gap_closure_plan.md · fixes SQL v1588 (v1356, PRD D10)
-- =============================================================================
-- Found in the v1359 audit: the browser marked an SSO domain "verified" the moment a connection was saved
-- (domain_verified_at = now), and the weekly re-check only touched updated_at. No DNS check existed. An organisation
-- admin could therefore claim any email domain — including another customer's — turn on "SSO required", and:
--   • every person on the platform with an email on that domain, in ANY organisation, was refused password sign-in
--     by the sign-in pages (sso_password_allowed), apart from the claimer's own owner / break-glass user;
--   • their sign-ins were routed to the claimer's identity provider (sso_resolve_login_domain).
-- This file:
--   1. clears every verification made so far (none came from DNS) and switches "SSO required" off;
--   2. guards sso_connections: from the app (PostgREST, any role but the service role) domain_verified_at and the
--      DNS token can never be set; changing the domains clears the verification; "SSO required" needs a verified
--      domain; domains are stored lower-case. The service role and the SQL editor are trusted;
--   3. sso_request_domain_verification(connection) — organisation admins ask for a check; the worker job
--      sso.domain_verify looks up the TXT record over DNS-over-HTTPS and reports through sso_domain_verify_result;
--   4. a domain can be verified by one organisation only;
--   5. sso_domain_recheck (weekly, existing job) now queues a real re-check of every verified connection; a failed
--      re-check tells the Account Owner and does NOT switch SSO off by itself (D10).
-- The TXT record to publish on each domain:  nidus-verify=<token shown in Integrations & Security › SSO>
-- Run after v1588 and v1609. Then redeploy background-job-worker (new handler sso.domain_verify).
-- =============================================================================

-- ── 1. Columns; clear self-made verifications ────────────────────────────────
ALTER TABLE public.sso_connections
  ADD COLUMN IF NOT EXISTS verification_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_detail     TEXT;
COMMENT ON COLUMN public.sso_connections.domain_verified_at IS
  'v1611: set only by sso_domain_verify_result after the DNS TXT record nidus-verify=<domain_txt_token> was found on every domain. Never set from the app.';

UPDATE public.sso_connections
   SET domain_verified_at = NULL, sso_required = FALSE,
       verification_detail = 'Verification reset by v1611: domains must now pass a DNS TXT check.', updated_at = NOW()
 WHERE domain_verified_at IS NOT NULL OR sso_required;

-- ── 2. Guard ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sso_connections_guard()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_trusted BOOLEAN := COALESCE(auth.role(), '') = 'service_role'
                       OR COALESCE(current_setting('request.jwt.claims', true), '') = '';
BEGIN
  NEW.verified_domains := ARRAY(SELECT DISTINCT lower(btrim(d)) FROM unnest(COALESCE(NEW.verified_domains, '{}')) d WHERE btrim(d) <> '');
  IF NOT v_trusted THEN
    IF TG_OP = 'INSERT' THEN
      NEW.domain_verified_at := NULL;
      NEW.domain_txt_token := encode(gen_random_bytes(16), 'hex');
      NEW.verification_checked_at := NULL;
      NEW.verification_detail := NULL;
    ELSE
      NEW.domain_verified_at := OLD.domain_verified_at;
      NEW.domain_txt_token := OLD.domain_txt_token;
      NEW.verification_checked_at := OLD.verification_checked_at;
      NEW.verification_detail := OLD.verification_detail;
      IF NEW.verified_domains IS DISTINCT FROM OLD.verified_domains THEN
        NEW.domain_verified_at := NULL;
        NEW.verification_detail := 'The domains changed; verify them again.';
      END IF;
    END IF;
  END IF;
  IF NEW.domain_txt_token IS NULL OR NEW.domain_txt_token = '' THEN
    NEW.domain_txt_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  IF NEW.sso_required AND NEW.domain_verified_at IS NULL THEN
    IF v_trusted THEN
      NEW.sso_required := FALSE;
    ELSE
      RAISE EXCEPTION 'Verify the email domains before requiring single sign-on' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sso_connections_guard ON public.sso_connections;
CREATE TRIGGER trg_sso_connections_guard
  BEFORE INSERT OR UPDATE ON public.sso_connections
  FOR EACH ROW EXECUTE FUNCTION public.sso_connections_guard();

-- Domains another organisation has already verified.
CREATE OR REPLACE FUNCTION public.sso_domains_claimed_elsewhere(p_connection_id UUID)
RETURNS TEXT[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(array_agg(DISTINCT d ORDER BY d), ARRAY[]::TEXT[])
    FROM public.sso_connections me, unnest(me.verified_domains) d
   WHERE me.id = p_connection_id
     AND EXISTS (SELECT 1 FROM public.sso_connections o
                  WHERE o.id <> me.id AND o.account_id <> me.account_id AND o.is_active
                    AND o.domain_verified_at IS NOT NULL AND d = ANY (o.verified_domains));
$$;

-- ── 3. Ask for a check (organisation admins) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.sso_request_domain_verification(p_connection_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  c         public.sso_connections;
  v_claimed TEXT[];
BEGIN
  c := (SELECT x FROM public.sso_connections x WHERE x.id = p_connection_id);
  IF c.id IS NULL OR NOT public.auth_user_is_account_admin(c.account_id) THEN
    RAISE EXCEPTION 'SSO connection not found' USING ERRCODE = '42501';
  END IF;
  IF cardinality(c.verified_domains) = 0 THEN
    RAISE EXCEPTION 'Add at least one email domain first' USING ERRCODE = 'P0001';
  END IF;
  v_claimed := public.sso_domains_claimed_elsewhere(c.id);
  IF cardinality(v_claimed) > 0 THEN
    RAISE EXCEPTION 'Another organisation has already verified %', array_to_string(v_claimed, ', ') USING ERRCODE = 'P0001';
  END IF;
  PERFORM public.enqueue_background_job('sso.domain_verify', jsonb_build_object('connection_id', c.id, 'mode', 'verify'),
            NULL, 'ssoverify:' || c.id::TEXT || ':' || extract(epoch FROM clock_timestamp())::TEXT, c.account_id);
  RETURN jsonb_build_object('connection_id', c.id, 'domains', to_jsonb(c.verified_domains),
                            'txt_record', 'nidus-verify=' || c.domain_txt_token, 'queued', TRUE);
END;
$$;

-- ── 4. Worker side ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sso_domain_verify_context(p_connection_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object('connection_id', c.id, 'account_id', c.account_id, 'name', c.name,
                              'domains', to_jsonb(c.verified_domains), 'expected', 'nidus-verify=' || c.domain_txt_token,
                              'verified', c.domain_verified_at IS NOT NULL, 'active', c.is_active)
      FROM public.sso_connections c WHERE c.id = p_connection_id), jsonb_build_object('skip', 'connection not found'));
$$;

-- p_ok: the TXT record was found on every domain. A first check sets or leaves the verification; a re-check that
-- fails keeps SSO working (D10) and tells the Account Owner.
CREATE OR REPLACE FUNCTION public.sso_domain_verify_result(p_connection_id UUID, p_ok BOOLEAN, p_detail TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  c         public.sso_connections;
  v_claimed TEXT[];
  v_owner   UUID;
BEGIN
  c := (SELECT x FROM public.sso_connections x WHERE x.id = p_connection_id);
  IF c.id IS NULL THEN RETURN jsonb_build_object('skip', 'connection not found'); END IF;
  v_claimed := public.sso_domains_claimed_elsewhere(c.id);
  IF p_ok AND cardinality(v_claimed) > 0 THEN
    p_ok := FALSE;
    p_detail := 'Another organisation has already verified ' || array_to_string(v_claimed, ', ');
  END IF;
  IF p_ok THEN
    UPDATE public.sso_connections
       SET domain_verified_at = COALESCE(domain_verified_at, NOW()), verification_checked_at = NOW(),
           verification_detail = left(COALESCE(p_detail, 'Verified'), 500), updated_at = NOW()
     WHERE id = c.id;
    RETURN jsonb_build_object('verified', TRUE);
  END IF;
  UPDATE public.sso_connections
     SET verification_checked_at = NOW(), verification_detail = left(COALESCE(p_detail, 'Not verified'), 500), updated_at = NOW()
   WHERE id = c.id;
  IF c.domain_verified_at IS NOT NULL THEN
    v_owner := (SELECT a.owner_user_id FROM public.accounts a WHERE a.id = c.account_id);
    PERFORM public.bj_notice(v_owner, 'sso_domain_check_failed',
              jsonb_build_object('name', c.name, 'domains', array_to_string(c.verified_domains, ', '), 'detail', COALESCE(p_detail, '')),
              'system', 'warning', TRUE, 'sso-recheck:' || c.id::TEXT || ':' || to_char(NOW(), 'IYYY-IW'),
              c.account_id, 'public', 'sso_connection', c.id);
  END IF;
  RETURN jsonb_build_object('verified', c.domain_verified_at IS NOT NULL, 'failed', TRUE);
END;
$$;

-- ── 5. Weekly re-check (existing job sso.domain_recheck) now checks DNS ──────
-- v1588 returned VOID; a new return type needs a drop first.
DROP FUNCTION IF EXISTS public.sso_domain_recheck();
CREATE OR REPLACE FUNCTION public.sso_domain_recheck()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r     RECORD;
  v_n   INTEGER := 0;
BEGIN
  FOR r IN SELECT c.id, c.account_id FROM public.sso_connections c WHERE c.is_active AND c.domain_verified_at IS NOT NULL LOOP
    PERFORM public.enqueue_background_job('sso.domain_verify', jsonb_build_object('connection_id', r.id, 'mode', 'recheck'),
              NULL, 'ssorecheck:' || r.id::TEXT || ':' || to_char(NOW(), 'IYYY-IW'), r.account_id);
    v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('processed', v_n);
END;
$$;

INSERT INTO public.background_job_messages (message_key, title, body, description) VALUES
  ('sso_domain_check_failed', 'Single sign-on: the domain check failed for {name}',
   'The weekly check could not find the TXT record for {domains}: {detail}. Single sign-on still works. Put the record back (Integrations & Security › Single sign-on) so the next check passes.',
   'v1611: sent to the Account Owner when the weekly DNS re-check of a verified SSO domain fails.')
ON CONFLICT (message_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, description = EXCLUDED.description, updated_at = NOW();

SELECT public.background_job_register(
  p_code => 'sso.domain_verify',
  p_name => 'SSO domain DNS check',
  p_kind => 'handler',
  p_description => 'v1611: looks up the nidus-verify TXT record of each SSO email domain (DNS over HTTPS) and records the result; queued by an admin request and by the weekly re-check.',
  p_owner_system => 'platform',
  p_timeout_seconds => 60,
  p_max_attempts => 3,
  p_backoff_schedule => ARRAY[300, 1800],
  p_item_ttl_seconds => 86400,
  p_batch_size => 5
);

SELECT public.background_job_register(
  p_code => 'sso.domain_recheck',
  p_name => 'SSO domain re-check',
  p_kind => 'sql',
  p_description => 'v1356 / v1611: weekly DNS re-check of every verified SSO domain (queues sso.domain_verify); a failure tells the Account Owner and does not lock anyone out.',
  p_owner_system => 'platform',
  p_sql_function => 'public.sso_domain_recheck',
  p_cron => '0 4 * * 1',
  p_time_basis => 'utc',
  p_timeout_seconds => 300
);

-- ── Grants ───────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.sso_connections_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sso_domains_claimed_elsewhere(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sso_domains_claimed_elsewhere(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.sso_request_domain_verification(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sso_request_domain_verification(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sso_domain_verify_context(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sso_domain_verify_result(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sso_domain_verify_context(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sso_domain_verify_result(UUID, BOOLEAN, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.sso_domain_recheck() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sso_domain_recheck() TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── Check (read-only) ────────────────────────────────────────────────────────
SELECT c.connection_reference, c.name, c.verified_domains, c.domain_verified_at, c.sso_required, c.verification_detail
  FROM public.sso_connections c
 ORDER BY c.created_at;
