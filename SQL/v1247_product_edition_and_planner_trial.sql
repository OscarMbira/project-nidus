-- ============================================================================
-- v1247: Product edition + Planner trial, limits and sign-up — v1239 Slice 6.1
-- Plan: projectplan/v1239_dual_mode_planning_product_plan.md (D4, D5, D12, D14)
--
--   1. accounts.product_edition ('platform' default | 'planner').
--   2. 'planner' added to platform_subscriptions.plan_type and user_platform_access.platform
--      checks (rebuilt from the live constraint, so values added since v82/v90 are kept).
--   3. public.planner_plan_limits — trial/paid limits as data (rule 25.1). Values: v1248 seed.
--   4. Helpers (SECURITY DEFINER, row_security off — see memory "RLS row_security=off pattern"):
--        account_planner_status(account)      → jsonb: edition, trial, days left, read-only, limits
--        auth_user_account_edition()          → edition of the caller's current account
--        auth_user_account_can_write(account) → FALSE only for a planner account whose trial
--                                               ended with no paid subscription (read-only)
--   5. Limit triggers (planner accounts only): projects per account, tasks per project,
--      members per account. Platform-edition accounts are never limited here.
--   6. apply_account_edition (internal, audited; service_role + Admin wrapper only) and
--      change_account_edition (API): service role (payment webhook) any change; an account
--      owner may only downgrade platform → planner.
--   7. planner_create_account(name, full_name): the Planner sign-up (D4). Creates the users row,
--      a renameable organisation with product_edition = 'planner', the account_owner role, the
--      14-day trial subscription and the user_platform_access row, then syncs global templates.
--      Fail-closed behind admin.feature_flags 'planner_public_signup' (D18 kill switch).
-- Documented exception to CLAUDE.md conventions 31–35 (org-first, per-project trial) for the
-- Planner edition only (D4). Platform accounts are unchanged: the column defaults to 'platform'.
-- Idempotent.
-- ============================================================================

-- ── 1. Edition column ───────────────────────────────────────────────────────
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS product_edition TEXT NOT NULL DEFAULT 'platform';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_product_edition_check') THEN
    ALTER TABLE public.accounts ADD CONSTRAINT accounts_product_edition_check CHECK (product_edition IN ('platform', 'planner'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_accounts_product_edition ON public.accounts(product_edition) WHERE product_edition <> 'platform';
COMMENT ON COLUMN public.accounts.product_edition IS 'v1239: platform = full PMIS; planner = Project Planner edition (planning screens only).';

-- ── 2. Add 'planner' to existing CHECK lists (rebuilt from the live definition) ──
CREATE OR REPLACE FUNCTION pg_temp.add_check_value(p_table TEXT, p_column TEXT, p_value TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_name TEXT;
  v_def TEXT;
  v_values TEXT[];
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid) INTO v_name, v_def
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
   WHERE c.conrelid = p_table::regclass AND c.contype = 'c' AND a.attname = p_column
   LIMIT 1;
  IF v_def IS NULL THEN
    RAISE NOTICE '% has no CHECK on % — nothing to extend', p_table, p_column;
    RETURN;
  END IF;
  IF v_def LIKE '%''' || p_value || '''%' THEN RETURN; END IF;
  SELECT array_agg(DISTINCT m[1]) INTO v_values FROM regexp_matches(v_def, '''([^'']+)''', 'g') AS m;
  v_values := array_append(v_values, p_value);
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', p_table, v_name);
  EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I CHECK (%I = ANY (%L::text[]))', p_table, v_name, p_column, v_values);
END $$;

SELECT pg_temp.add_check_value('public.platform_subscriptions', 'plan_type', 'planner');
SELECT pg_temp.add_check_value('public.user_platform_access', 'platform', 'planner');

-- ── 3. Limits as data ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planner_plan_limits (
  plan_code              TEXT PRIMARY KEY CHECK (plan_code IN ('trial', 'paid')),
  trial_days             INTEGER,
  max_projects           INTEGER,          -- NULL = unlimited
  max_members            INTEGER,          -- paid: per-seat count comes from the subscription
  max_tasks_per_project  INTEGER,
  max_ai_drafts          INTEGER,          -- NULL = fair use
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.planner_plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planner_plan_limits_read ON public.planner_plan_limits;
CREATE POLICY planner_plan_limits_read ON public.planner_plan_limits FOR SELECT TO anon, authenticated USING (is_active);
-- RLS decides which rows; the table itself still needs a privilege grant (it is read on the public pricing page).
GRANT SELECT ON public.planner_plan_limits TO anon, authenticated;
GRANT ALL ON public.planner_plan_limits TO service_role;
-- No write policies: limits change through SQL seeds / Admin only.

-- ── 4. Status helpers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.account_planner_status(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_edition TEXT;
  v_sub RECORD;
  v_limits RECORD;
  v_paid BOOLEAN := FALSE;
  v_trial BOOLEAN := FALSE;
  v_days INTEGER;
  v_read_only BOOLEAN := FALSE;
BEGIN
  SELECT product_edition INTO v_edition FROM public.accounts WHERE id = p_account_id;
  IF v_edition IS NULL THEN RETURN NULL; END IF;
  IF v_edition <> 'planner' THEN
    RETURN jsonb_build_object('edition', v_edition, 'read_only', FALSE);
  END IF;

  SELECT * INTO v_sub FROM public.platform_subscriptions
   WHERE account_id = p_account_id AND plan_type = 'planner'
   ORDER BY (status = 'active' AND NOT COALESCE(is_trial, FALSE)) DESC, created_at DESC
   LIMIT 1;

  IF FOUND THEN
    v_paid := v_sub.status = 'active' AND NOT COALESCE(v_sub.is_trial, FALSE)
              AND (v_sub.expires_at IS NULL OR v_sub.expires_at > NOW() OR COALESCE(v_sub.is_in_grace_period, FALSE));
    v_trial := COALESCE(v_sub.is_trial, FALSE) AND NOT v_paid;
    IF v_trial THEN
      v_days := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_sub.trial_end - NOW())) / 86400)::INT);
      v_read_only := v_sub.trial_end IS NOT NULL AND v_sub.trial_end <= NOW();
    END IF;
  ELSE
    v_read_only := TRUE; -- a planner account with no subscription row cannot write
  END IF;

  SELECT * INTO v_limits FROM public.planner_plan_limits
   WHERE plan_code = CASE WHEN v_paid THEN 'paid' ELSE 'trial' END AND is_active;

  RETURN jsonb_build_object(
    'edition', 'planner',
    'is_paid', v_paid,
    'is_trial', v_trial,
    'trial_end', CASE WHEN v_trial THEN v_sub.trial_end END,
    'days_left', v_days,
    'read_only', v_read_only,
    'limits', jsonb_build_object(
      'max_projects', v_limits.max_projects,
      'max_members', COALESCE(CASE WHEN v_paid THEN v_sub.max_team_members END, v_limits.max_members),
      'max_tasks_per_project', v_limits.max_tasks_per_project,
      'max_ai_drafts', v_limits.max_ai_drafts
    )
  );
END;
$$;

-- The caller's current account: last active, else owned (same order as accountResolution.js).
CREATE OR REPLACE FUNCTION public.auth_user_current_account_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT u.last_active_account_id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1),
    (SELECT a.id FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
      WHERE u.auth_user_id = auth.uid() AND COALESCE(a.is_deleted, FALSE) = FALSE
      ORDER BY a.created_at LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_account_edition()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT product_edition FROM public.accounts WHERE id = public.auth_user_current_account_id();
$$;

CREATE OR REPLACE FUNCTION public.auth_user_account_can_write(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT CASE
    WHEN p_account_id IS NULL THEN TRUE
    ELSE NOT COALESCE((public.account_planner_status(p_account_id) ->> 'read_only')::boolean, FALSE)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.account_planner_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_current_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_account_edition() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_account_can_write(UUID) TO authenticated;

-- ── 5. Limit triggers (planner accounts only) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.planner_limit_value(p_account_id UUID, p_key TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT NULLIF(public.account_planner_status(p_account_id) -> 'limits' ->> p_key, '')::int
   WHERE (SELECT product_edition FROM public.accounts WHERE id = p_account_id) = 'planner';
$$;

CREATE OR REPLACE FUNCTION public.trg_planner_limit_projects()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE v_max INT; v_count INT;
BEGIN
  v_max := public.planner_limit_value(NEW.account_id, 'max_projects');
  IF v_max IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.projects
     WHERE account_id = NEW.account_id AND COALESCE(is_deleted, FALSE) = FALSE AND id <> NEW.id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'PLANNER_LIMIT: your plan allows % project(s). Upgrade to add more.', v_max USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_planner_limit_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE v_account UUID; v_max INT; v_count INT;
BEGIN
  SELECT account_id INTO v_account FROM public.projects WHERE id = NEW.project_id;
  v_max := public.planner_limit_value(v_account, 'max_tasks_per_project');
  IF v_max IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.tasks
     WHERE project_id = NEW.project_id AND COALESCE(is_deleted, FALSE) = FALSE AND id <> NEW.id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'PLANNER_LIMIT: your plan allows % tasks per project. Upgrade to add more.', v_max USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_planner_limit_members()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE v_account UUID; v_max INT; v_count INT;
BEGIN
  IF COALESCE(NEW.is_active, TRUE) = FALSE THEN RETURN NEW; END IF;
  SELECT account_id INTO v_account FROM public.projects WHERE id = NEW.project_id;
  v_max := public.planner_limit_value(v_account, 'max_members');
  IF v_max IS NOT NULL THEN
    SELECT COUNT(DISTINCT m.user_id) INTO v_count
      FROM public.project_memberships m JOIN public.projects p ON p.id = m.project_id
     WHERE p.account_id = v_account AND m.is_active AND m.user_id <> NEW.user_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'PLANNER_LIMIT: your plan allows % member(s). Add seats to invite more.', v_max USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_limit_projects ON public.projects;
CREATE TRIGGER trg_planner_limit_projects BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_planner_limit_projects();
DROP TRIGGER IF EXISTS trg_planner_limit_tasks ON public.tasks;
CREATE TRIGGER trg_planner_limit_tasks BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_planner_limit_tasks();
DROP TRIGGER IF EXISTS trg_planner_limit_members ON public.project_memberships;
CREATE TRIGGER trg_planner_limit_members BEFORE INSERT OR UPDATE OF is_active ON public.project_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trg_planner_limit_members();

-- ── 6. Edition change (upgrade / downgrade) ─────────────────────────────────
-- apply_account_edition: the one place an edition changes (audited). No client can call it:
-- EXECUTE is granted to service_role only; the Admin wrapper (Admin SQL v227, owned by postgres)
-- calls it after its own permission check.
CREATE OR REPLACE FUNCTION public.apply_account_edition(p_account_id UUID, p_edition TEXT, p_reason TEXT, p_via TEXT, p_actor UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_old TEXT;
BEGIN
  IF p_edition NOT IN ('platform', 'planner') THEN RAISE EXCEPTION 'Unknown edition %', p_edition; END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required to change the edition'; END IF;
  SELECT product_edition INTO v_old FROM public.accounts WHERE id = p_account_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF v_old = p_edition THEN
    RETURN jsonb_build_object('account_id', p_account_id, 'edition', p_edition, 'changed', FALSE);
  END IF;
  UPDATE public.accounts SET product_edition = p_edition, updated_at = NOW() WHERE id = p_account_id;
  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('accounts', p_account_id, 'edition_changed',
          jsonb_build_object('from', v_old, 'to', p_edition, 'reason', p_reason, 'via', p_via), p_actor);
  RETURN jsonb_build_object('account_id', p_account_id, 'edition', p_edition, 'changed', TRUE, 'from', v_old);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_account_edition(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_account_edition(UUID, TEXT, TEXT, TEXT, UUID) TO service_role;

-- change_account_edition: callable through the API.
--   service_role (the Paynow webhook, after hash + ownership + amount checks) → any change;
--   an account owner → downgrade only (platform → planner, D14 / 8.3).
-- auth.role() is the JWT role of the API request; inside SECURITY DEFINER current_user is the
-- function owner, so it must not be used for this check.
CREATE OR REPLACE FUNCTION public.change_account_edition(p_account_id UUID, p_edition TEXT, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_role TEXT := auth.role();
  v_actor UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_old TEXT := (SELECT product_edition FROM public.accounts WHERE id = p_account_id);
BEGIN
  IF v_role = 'service_role' THEN
    RETURN public.apply_account_edition(p_account_id, p_edition, p_reason, 'payment_webhook', NULL);
  END IF;
  IF v_actor IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = p_account_id AND a.owner_user_id = v_actor)
     AND v_old = 'platform' AND p_edition = 'planner' THEN
    RETURN public.apply_account_edition(p_account_id, p_edition, p_reason, 'owner_downgrade', v_actor);
  END IF;
  RAISE EXCEPTION 'Not allowed to change this account''s edition' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.change_account_edition(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_account_edition(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ── 7. Planner sign-up ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.planner_create_account(p_account_name TEXT DEFAULT NULL, p_full_name TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_auth UUID := auth.uid();
  v_email TEXT;
  v_user UUID;
  v_account UUID;
  v_existing UUID;
  v_name TEXT;
  v_code TEXT;
  v_limits RECORD;
  v_owner_role UUID;
  v_open BOOLEAN;
BEGIN
  IF v_auth IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501'; END IF;

  -- Kill switch (D18): closed unless the Admin flag exists and is on.
  BEGIN
    EXECUTE 'SELECT is_enabled FROM admin.feature_flags WHERE flag_key = ''planner_public_signup'' LIMIT 1' INTO v_open;
  EXCEPTION WHEN undefined_table OR invalid_schema_name THEN v_open := NULL;
  END;
  IF NOT COALESCE(v_open, FALSE) THEN
    RAISE EXCEPTION 'PLANNER_SIGNUP_CLOSED: Project Planner sign-up is not open yet.' USING ERRCODE = 'P0001';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_auth;
  SELECT id INTO v_user FROM public.users WHERE auth_user_id = v_auth LIMIT 1;
  IF v_user IS NULL THEN
    -- v626 signature: (p_auth_user_id, p_email, p_full_name, p_first_name, p_last_name, p_is_verified)
    SELECT u.user_id INTO v_user
      FROM public.get_or_create_user(p_auth_user_id => v_auth, p_email => v_email,
                                     p_full_name => NULLIF(btrim(p_full_name), ''), p_is_verified => TRUE) u
     LIMIT 1;
  END IF;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Could not create your user record'; END IF;
  IF NULLIF(btrim(p_full_name), '') IS NOT NULL THEN
    UPDATE public.users SET full_name = btrim(p_full_name) WHERE id = v_user AND COALESCE(full_name, '') IN ('', split_part(v_email, '@', 1));
  END IF;

  -- One organisation per owner (convention 31): reuse an existing one.
  SELECT id INTO v_existing FROM public.accounts WHERE owner_user_id = v_user AND COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('account_id', v_existing, 'created', FALSE,
                              'edition', (SELECT product_edition FROM public.accounts WHERE id = v_existing));
  END IF;

  v_name := COALESCE(NULLIF(btrim(p_account_name), ''), COALESCE(NULLIF(btrim(p_full_name), ''), split_part(v_email, '@', 1)) || '''s workspace');
  v_code := upper(substr(regexp_replace(v_name, '[^A-Za-z]', '', 'g') || 'PLAN', 1, 4)) || (1000 + floor(random() * 9000))::int;

  INSERT INTO public.accounts (owner_user_id, account_name, account_code, account_type, primary_email, billing_email,
                               is_active, organisation_verified, product_edition, created_by, metadata)
  VALUES (v_user, v_name, v_code, 'individual', v_email, v_email, TRUE, TRUE, 'planner', v_user,
          jsonb_build_object('source', 'planner_signup'))
  RETURNING id INTO v_account;

  UPDATE public.users SET last_active_account_id = v_account WHERE id = v_user;

  SELECT id INTO v_owner_role FROM public.roles WHERE role_name = 'account_owner' AND is_active LIMIT 1;
  IF v_owner_role IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role_id = v_owner_role AND is_active AND project_id IS NULL
  ) THEN
    INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active) VALUES (v_user, v_owner_role, v_user, TRUE);
  END IF;

  SELECT * INTO v_limits FROM public.planner_plan_limits WHERE plan_code = 'trial' AND is_active;
  INSERT INTO public.platform_subscriptions (user_id, account_id, plan_type, status, started_at, is_trial, trial_start, trial_end,
                                             expires_at, max_projects, max_team_members, metadata, created_by)
  VALUES (v_auth, v_account, 'planner', 'trialing', NOW(), TRUE, NOW(), NOW() + make_interval(days => COALESCE(v_limits.trial_days, 14)),
          NOW() + make_interval(days => COALESCE(v_limits.trial_days, 14)), v_limits.max_projects, v_limits.max_members,
          jsonb_build_object('source', 'planner_signup'), v_user);

  INSERT INTO public.user_platform_access (user_id, platform, has_registered, registration_date, is_primary_platform)
  VALUES (v_auth, 'planner', TRUE, NOW(), TRUE)
  ON CONFLICT (user_id, platform) DO UPDATE SET has_registered = TRUE, updated_at = NOW();

  BEGIN
    PERFORM public.sync_global_templates_to_account(v_account);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Global template sync skipped for %: %', v_account, SQLERRM; -- best effort, as in createOrganisation()
  END;

  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('accounts', v_account, 'planner_signup', jsonb_build_object('trial_days', COALESCE(v_limits.trial_days, 14)), v_user);

  RETURN jsonb_build_object('account_id', v_account, 'created', TRUE, 'edition', 'planner');
END;
$$;
REVOKE ALL ON FUNCTION public.planner_create_account(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_create_account(TEXT, TEXT) TO authenticated;

-- Is sign-up open? (read by the planner landing page; no admin table access from the client)
CREATE OR REPLACE FUNCTION public.planner_signup_open()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_open BOOLEAN;
BEGIN
  BEGIN
    EXECUTE 'SELECT is_enabled FROM admin.feature_flags WHERE flag_key = ''planner_public_signup'' LIMIT 1' INTO v_open;
  EXCEPTION WHEN undefined_table OR invalid_schema_name THEN v_open := NULL;
  END;
  RETURN COALESCE(v_open, FALSE);
END;
$$;
GRANT EXECUTE ON FUNCTION public.planner_signup_open() TO anon, authenticated;

-- ── Registry ────────────────────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('planner_plan_limits', 'Project Planner trial and paid plan limits (projects, members, tasks per project, AI drafts)', true, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1247 applied: product edition, planner limits, sign-up and edition RPCs'; END $$;
