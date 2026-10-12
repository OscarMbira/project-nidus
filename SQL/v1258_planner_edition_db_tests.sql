-- ============================================================================
-- v1258: Project Planner database tests — v1239 Slice 6.6 / 7.3 (run in the SQL editor)
-- Everything runs in ONE transaction that is ROLLED BACK: no data is left behind.
-- Needs v1247–v1257 applied and at least one public.users row linked to a live auth.users account.
-- Prints PASS lines; stops at the first FAIL with RAISE EXCEPTION.
--
--   1. Trial days remaining on day 0 / 13 / 14 / 15 and read-only at expiry
--   2. Paid subscription lifts read-only and uses seats as the member limit
--   3. Limit trigger: a 4th project on a trial is refused
--   4. Planner session (simulated JWT): a walled Platform table returns nothing and refuses writes;
--      allowed tables still work; an expired trial cannot write to tasks
--   5. Team member on a planner project can update progress on own task only (story 7.3)
-- ============================================================================
BEGIN;

DO $$
DECLARE
  v_owner RECORD;
  v_member RECORD;
  v_acc UUID;
  v_sub UUID;
  s JSONB;
  v_p UUID;
  v_task UUID;
  v_status UUID;
  v_pm_role UUID;
  v_tm_role UUID;
  i INT;
BEGIN
  -- Only users whose sign-in still exists: platform_subscriptions.user_id references auth.users,
  -- and some public.users rows point at deleted auth accounts.
  SELECT u.id, u.auth_user_id INTO v_owner FROM public.users u JOIN auth.users au ON au.id = u.auth_user_id ORDER BY u.created_at LIMIT 1;
  SELECT u.id, u.auth_user_id INTO v_member FROM public.users u JOIN auth.users au ON au.id = u.auth_user_id WHERE u.id <> v_owner.id ORDER BY u.created_at LIMIT 1;
  -- Prerequisite: the wall (v1251) must be in place. Checked here, as the editor's admin role.
  DECLARE
    v_walls INT := (SELECT COUNT(*) FROM pg_policy WHERE polname = 'planner_wall');
    v_guards INT := (SELECT COUNT(*) FROM pg_policy WHERE polname = 'planner_write_wall_ins');
    v_fn BOOLEAN := EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'planner_session_is_planner');
    v_cr TEXT := (SELECT string_agg(polname, ', ') FROM pg_policy WHERE polrelid = 'public.change_requests'::regclass);
  BEGIN
    RAISE NOTICE 'v1258 prerequisites: % planner_wall policies, % write guards, helper function present: %, change_requests policies: %',
      v_walls, v_guards, v_fn, COALESCE(v_cr, '(none)');
    IF v_walls = 0 THEN
      RAISE EXCEPTION 'v1258 cannot run: v1251 has not been applied in this database (0 planner_wall policies; helper function present: %). Run SQL/v1251_planner_table_wall.sql and check it ends with the "v1251: N table(s) walled" notice.', v_fn;
    END IF;
  END;
  IF v_owner.id IS NULL THEN RAISE EXCEPTION 'v1258 needs at least one public.users row linked to a live auth.users account'; END IF;

  INSERT INTO public.accounts (owner_user_id, account_name, account_code, account_type, is_active, organisation_verified, product_edition, created_by)
  VALUES (v_owner.id, 'v1258 test workspace', 'TEST' || (1000 + floor(random() * 9000))::int, 'individual', TRUE, TRUE, 'planner', v_owner.id)
  RETURNING id INTO v_acc;

  -- 1. Trial day counts
  INSERT INTO public.platform_subscriptions (user_id, account_id, plan_type, status, is_trial, trial_start, trial_end)
  VALUES (v_owner.auth_user_id, v_acc, 'planner', 'trialing', TRUE, NOW(), NOW() + INTERVAL '14 days')
  RETURNING id INTO v_sub;
  s := public.account_planner_status(v_acc);
  IF (s ->> 'days_left')::int <> 14 OR (s ->> 'read_only')::boolean THEN RAISE EXCEPTION 'FAIL day 0: %', s; END IF;
  UPDATE public.platform_subscriptions SET trial_start = NOW() - INTERVAL '13 days', trial_end = NOW() + INTERVAL '1 day' - INTERVAL '1 minute' WHERE id = v_sub;
  s := public.account_planner_status(v_acc);
  IF (s ->> 'days_left')::int <> 1 OR (s ->> 'read_only')::boolean THEN RAISE EXCEPTION 'FAIL day 13: %', s; END IF;
  UPDATE public.platform_subscriptions SET trial_end = NOW() - INTERVAL '1 minute' WHERE id = v_sub;
  s := public.account_planner_status(v_acc);
  IF (s ->> 'days_left')::int <> 0 OR NOT (s ->> 'read_only')::boolean THEN RAISE EXCEPTION 'FAIL day 14 (expired): %', s; END IF;
  UPDATE public.platform_subscriptions SET trial_end = NOW() - INTERVAL '1 day' WHERE id = v_sub;
  s := public.account_planner_status(v_acc);
  IF NOT (s ->> 'read_only')::boolean OR public.auth_user_account_can_write(v_acc) THEN RAISE EXCEPTION 'FAIL day 15: %', s; END IF;
  RAISE NOTICE 'PASS 1: trial days 14 / 1 / 0, read-only after expiry';

  -- 2. Paid lifts read-only; seats become the member limit
  INSERT INTO public.platform_subscriptions (user_id, account_id, plan_type, status, is_trial, max_team_members, expires_at)
  VALUES (v_owner.auth_user_id, v_acc, 'planner', 'active', FALSE, 12, NOW() + INTERVAL '30 days');
  s := public.account_planner_status(v_acc);
  IF (s ->> 'read_only')::boolean OR NOT (s ->> 'is_paid')::boolean OR (s #>> '{limits,max_members}')::int <> 12 THEN RAISE EXCEPTION 'FAIL paid: %', s; END IF;
  IF (s #>> '{limits,max_projects}') IS NOT NULL THEN RAISE EXCEPTION 'FAIL paid projects should be unlimited: %', s; END IF;
  RAISE NOTICE 'PASS 2: paid plan writable, 12 seats, unlimited projects';
  DELETE FROM public.platform_subscriptions WHERE account_id = v_acc AND NOT is_trial;
  UPDATE public.platform_subscriptions SET trial_end = NOW() + INTERVAL '10 days' WHERE id = v_sub;

  -- 3. Project limit on a trial (3)
  SELECT id INTO v_status FROM public.project_statuses WHERE is_active ORDER BY created_at LIMIT 1;
  FOR i IN 1..3 LOOP
    INSERT INTO public.projects (project_name, project_code, account_id, owner_user_id, status_id, created_by)
    VALUES ('v1258 project ' || i, 'V1258-' || i || '-' || (floor(random() * 99999))::int, v_acc, v_owner.id, v_status, v_owner.id)
    RETURNING id INTO v_p;
  END LOOP;
  BEGIN
    INSERT INTO public.projects (project_name, project_code, account_id, owner_user_id, status_id, created_by)
    VALUES ('v1258 project 4', 'V1258-4-' || (floor(random() * 99999))::int, v_acc, v_owner.id, v_status, v_owner.id);
    RAISE EXCEPTION 'FAIL 3: a 4th project was allowed on a trial';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'PLANNER_LIMIT%' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS 3: 4th project refused (PLANNER_LIMIT)';

  -- Project roles for the session tests
  SELECT id INTO v_pm_role FROM public.project_roles WHERE role_name = 'project_manager' AND project_id IS NULL LIMIT 1;
  SELECT id INTO v_tm_role FROM public.project_roles WHERE role_name = 'team_member' AND project_id IS NULL LIMIT 1;
  INSERT INTO public.project_memberships (project_id, user_id, project_role_id, invitation_status, is_active) VALUES (v_p, v_owner.id, v_pm_role, 'accepted', TRUE);
  INSERT INTO public.tasks (project_id, task_code, task_name, estimated_duration_days, assigned_to_user_id, created_by)
  VALUES (v_p, '', 'v1258 task', 2, v_member.id, v_owner.id) RETURNING id INTO v_task;

  PERFORM set_config('v1258.acc', v_acc::text, TRUE);
  PERFORM set_config('v1258.project', v_p::text, TRUE);
  PERFORM set_config('v1258.task', v_task::text, TRUE);
  PERFORM set_config('v1258.sub', v_sub::text, TRUE);
  PERFORM set_config('v1258.owner_auth', v_owner.auth_user_id::text, TRUE);
  PERFORM set_config('v1258.member_auth', COALESCE(v_member.auth_user_id::text, ''), TRUE);
  PERFORM set_config('v1258.member', COALESCE(v_member.id::text, ''), TRUE);
  PERFORM set_config('v1258.tm_role', COALESCE(v_tm_role::text, ''), TRUE);
  UPDATE public.users SET last_active_account_id = v_acc WHERE id = v_owner.id;
END $$;

-- 4. Planner session against the wall (simulated JWT for the owner)
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('v1258.owner_auth'), 'role', 'authenticated')::text, TRUE);
SET LOCAL ROLE authenticated;
DO $$
DECLARE n INT;
BEGIN
  IF public.auth_user_account_edition() <> 'planner' THEN RAISE EXCEPTION 'FAIL 4: session is not on the planner account'; END IF;
  -- A Platform-only register is walled (only if the table has RLS; v1251 warns otherwise).
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace WHERE ns.nspname = 'public' AND c.relname = 'change_requests' AND c.relrowsecurity) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.change_requests'::regclass AND polname = 'planner_wall') THEN
      RAISE EXCEPTION 'FAIL 4: change_requests has no planner_wall policy — run SQL/v1251_planner_table_wall.sql first (in-list: %)',
        EXISTS (SELECT 1 FROM public.planner_table_allowlist WHERE table_name = 'change_requests');
    END IF;
    SELECT COUNT(*) INTO n FROM public.change_requests;
    IF n <> 0 THEN
      RAISE EXCEPTION 'FAIL 4: planner session can read change_requests (% rows). current_user=%, planner=%, policies: %',
        n, current_user, public.planner_session_is_planner(),
        (SELECT string_agg(polname || CASE WHEN polpermissive THEN ' (permissive)' ELSE ' (restrictive)' END, ', ')
           FROM pg_policy WHERE polrelid = 'public.change_requests'::regclass);
    END IF;
  END IF;
  -- An allow-listed table is readable for its own project.
  SELECT COUNT(*) INTO n FROM public.tasks WHERE project_id = current_setting('v1258.project')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL 4: owner cannot read own planner task (% rows)', n; END IF;
  RAISE NOTICE 'PASS 4a: walled table empty, planner table readable';
END $$;
RESET ROLE;

-- 4b. Expired trial → writes refused on allow-listed tables
UPDATE public.platform_subscriptions SET trial_end = NOW() - INTERVAL '1 day' WHERE id = current_setting('v1258.sub')::uuid;
SET LOCAL ROLE authenticated;
DO $$
DECLARE n INT;
BEGIN
  UPDATE public.tasks SET task_name = 'blocked' WHERE id = current_setting('v1258.task')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL 4b: an expired trial could still change a task'; END IF;
  RAISE NOTICE 'PASS 4b: expired trial is read-only';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS 4b: expired trial is read-only (write refused)';
END $$;
RESET ROLE;
UPDATE public.platform_subscriptions SET trial_end = NOW() + INTERVAL '10 days' WHERE id = current_setting('v1258.sub')::uuid;

-- 5. Team member: own task progress only (needs a second user)
DO $$
BEGIN
  IF current_setting('v1258.member') = '' OR current_setting('v1258.tm_role') = '' THEN
    RAISE NOTICE 'SKIP 5: needs a second user and the team_member project role';
    RETURN;
  END IF;
  INSERT INTO public.project_memberships (project_id, user_id, project_role_id, invitation_status, is_active)
  VALUES (current_setting('v1258.project')::uuid, current_setting('v1258.member')::uuid, current_setting('v1258.tm_role')::uuid, 'accepted', TRUE);
  UPDATE public.users SET last_active_account_id = current_setting('v1258.acc')::uuid WHERE id = current_setting('v1258.member')::uuid;
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', NULLIF(current_setting('v1258.member_auth'), ''), 'role', 'authenticated')::text, TRUE);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF current_setting('v1258.member') = '' THEN RETURN; END IF;
  -- Progress on own task: allowed
  UPDATE public.tasks SET percentage_complete = 50 WHERE id = current_setting('v1258.task')::uuid;
  -- Changing the plan: refused
  BEGIN
    UPDATE public.tasks SET estimated_duration_days = 9 WHERE id = current_setting('v1258.task')::uuid;
    RAISE EXCEPTION 'FAIL 5: a team member changed the plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 5: team member can update progress only';
END $$;
RESET ROLE;

ROLLBACK;
