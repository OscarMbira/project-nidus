-- v618: SECURITY DEFINER helper so the invitation accept page (anon context)
-- can detect whether an invitee already has a login account.
-- Checks public.users.auth_user_id IS NOT NULL — a set auth_user_id means the
-- row is linked to a real Supabase auth account.

CREATE OR REPLACE FUNCTION public.check_email_has_auth_account(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE lower(trim(email)) = lower(trim(p_email))
      AND auth_user_id IS NOT NULL
      AND is_deleted = false
  );
$$;

-- Allow the anon and authenticated roles to call this function
GRANT EXECUTE ON FUNCTION public.check_email_has_auth_account(text) TO anon, authenticated;

COMMENT ON FUNCTION public.check_email_has_auth_account(text) IS
  'Returns true when a users row with a linked auth_user_id exists for the given email. '
  'Used by the invitation accept page (unauthenticated context) to decide whether to show '
  '"Log in" vs "Create account". SECURITY DEFINER so it bypasses RLS.';
