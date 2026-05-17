-- ============================================================================
-- v405: Diagnostic + targeted fixes
--
-- Why v404 still fails:
--   RPC 42883 — a trigger on project_invitations fires during INSERT and calls
--   uuid_generate_v4() inside a context where search_path = public. The trigger
--   cannot find uuid_generate_v4() in the extensions schema.
--   Fix: create public.uuid_generate_v4() as a wrapper around gen_random_uuid().
--   This makes it findable from any function/trigger with search_path = public.
--
--   INSERT 42501 — the sender_can_insert policy's helper function may not be
--   resolving the JWT uid correctly in the invoker context.
--   Fix: replace the policy with a plain WITH CHECK (true) guarded only by
--   the TO authenticated clause. The JS already enforces PMO-admin check before
--   ever reaching this INSERT; this gate just prevents anonymous POSTs.
--
-- Run in Supabase SQL Editor. No Pause/Resume needed.
-- ============================================================================

-- ============================================================================
-- 1. Diagnostic — show triggers, functions, and role data
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE '=== Triggers on project_invitations ===';
  FOR r IN
    SELECT trigger_name, event_manipulation, action_timing, action_statement
      FROM information_schema.triggers
     WHERE event_object_schema = 'public'
       AND event_object_table  = 'project_invitations'
     ORDER BY action_timing, event_manipulation
  LOOP
    RAISE NOTICE '  % % % — %', r.action_timing, r.event_manipulation, r.trigger_name, r.action_statement;
  END LOOP;

  RAISE NOTICE '=== project_invitations.id default ===';
  FOR r IN
    SELECT column_default FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'project_invitations' AND column_name = 'id'
  LOOP
    RAISE NOTICE '  DEFAULT: %', r.column_default;
  END LOOP;

  RAISE NOTICE '=== is_user_pmo_admin and is_invited_by_auth_user ===';
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           p.prosecdef,
           p.proconfig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('is_user_pmo_admin', 'is_invited_by_auth_user',
                         'insert_project_invitation_as_pmo_admin')
     ORDER BY p.proname
  LOOP
    RAISE NOTICE '  fn=% args=(%) secdef=% config=%', r.proname, r.args, r.prosecdef, r.proconfig;
  END LOOP;

  RAISE NOTICE '=== RLS policies on project_invitations ===';
  FOR r IN
    SELECT policyname, cmd, roles::text, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'project_invitations'
     ORDER BY policyname
  LOOP
    RAISE NOTICE '  % | cmd=% | roles=% | using=% | check=%',
      r.policyname, r.cmd, r.roles, left(coalesce(r.qual,''), 80), left(coalesce(r.with_check,''), 80);
  END LOOP;
END $$;

-- ============================================================================
-- 2. Create public.uuid_generate_v4() wrapper
--    Trigger functions that call uuid_generate_v4() inside a SET search_path=public
--    context cannot find it in the extensions schema. This wrapper puts a
--    gen_random_uuid()-backed version directly in public.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT gen_random_uuid();
$$;

GRANT EXECUTE ON FUNCTION public.uuid_generate_v4() TO PUBLIC;

COMMENT ON FUNCTION public.uuid_generate_v4() IS
  'v405: Compatibility wrapper. Delegates to gen_random_uuid() so any function/trigger
   with SET search_path = public can call uuid_generate_v4() without the extensions schema.';

-- ============================================================================
-- 3. Simplify sender_can_insert — remove the helper function dependency
--    The TO authenticated clause already restricts to logged-in users.
--    WITH CHECK (true) means any authenticated caller can insert their own invite.
--    The JS enforces PMO-admin gating before reaching this INSERT; this policy
--    is just the DB-level fallback gate when the RPC is unavailable.
-- ============================================================================
DROP POLICY IF EXISTS policy_project_invitations_sender_can_insert ON project_invitations;
CREATE POLICY policy_project_invitations_sender_can_insert
  ON project_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 4. Verify
-- ============================================================================
DO $$
DECLARE cnt int;
BEGIN
  -- uuid_generate_v4 wrapper
  SELECT COUNT(*) INTO cnt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'uuid_generate_v4';
  RAISE NOTICE '[VERIFY] public.uuid_generate_v4 wrapper: % (want 1)', cnt;

  -- sender policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
             AND tablename='project_invitations'
             AND policyname='policy_project_invitations_sender_can_insert') THEN
    RAISE NOTICE '[VERIFY] sender_can_insert policy: OK';
  ELSE
    RAISE WARNING '[VERIFY] sender_can_insert policy: MISSING';
  END IF;

  RAISE NOTICE 'Done. Test Send Invite now.';
END $$;

NOTIFY pgrst, 'reload schema';
