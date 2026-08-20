-- =============================================================================
-- v901: Map invitation NAME → users.full_name and ROLE → users.job_title
-- when a user is created / first accepts an email invitation.
--
-- Symptom: Invitee NAME on the accept card (e.g. "Arun Quality Manager") did
-- not land on My Profile → Full Name (email handle "qualityassurance" instead).
-- Invitee ROLE (e.g. "Quality Assurance") did not land on Job Title (left blank).
--
-- Fix:
--   1. Helper apply_invitation_profile_defaults() — fills full_name / first /
--      last from the invitee name only when the current full_name is missing or
--      still the email handle; fills job_title from role_display_name only when
--      job_title is blank. Never overwrites a real, user-edited profile.
--   2. AFTER UPDATE triggers on project_invitations and organisation_invitations
--      when status becomes 'accepted' (covers accept_project_invitation,
--      accept_organisation_invitation, manager/team appointment fallbacks).
--   3. One-time backfill for existing users who already have an invitation
--      (accepted or otherwise) but still have a handle-like name / blank title.
--
-- Run after v900_fix_get_my_display_name_backfill_overwrite.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_invitation_profile_defaults(
  p_user_id uuid,
  p_invited_first_name text,
  p_invited_last_name text,
  p_invitation_message text,
  p_role_display_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first text;
  v_last  text;
  v_full  text;
  v_extracted text;
  v_role  text;
  v_parts text[];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  v_first := NULLIF(TRIM(COALESCE(p_invited_first_name, '')), '');
  v_last  := NULLIF(TRIM(COALESCE(p_invited_last_name, '')), '');
  v_full  := NULLIF(TRIM(CONCAT_WS(' ', v_first, v_last)), '');

  IF v_full IS NULL AND p_invitation_message IS NOT NULL THEN
    v_extracted := NULLIF(
      TRIM(REGEXP_REPLACE(
        SUBSTRING(p_invitation_message FROM '(?ni)^\s*Dear\s+([^,\n]+)'),
        '\*+',
        '',
        'g'
      )),
      ''
    );
    IF v_extracted IS NOT NULL THEN
      v_parts := REGEXP_SPLIT_TO_ARRAY(TRIM(v_extracted), '\s+');
      IF array_length(v_parts, 1) = 1 THEN
        v_first := v_parts[1];
        v_last  := NULL;
      ELSIF array_length(v_parts, 1) > 1 THEN
        v_last  := v_parts[array_length(v_parts, 1)];
        v_first := NULLIF(TRIM(ARRAY_TO_STRING(v_parts[1:array_length(v_parts, 1) - 1], ' ')), '');
      END IF;
      v_full := NULLIF(TRIM(CONCAT_WS(' ', v_first, v_last)), '');
    END IF;
  END IF;

  v_role := NULLIF(TRIM(COALESCE(p_role_display_name, '')), '');

  IF v_full IS NULL AND v_role IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.users u
  SET
    first_name = CASE
      WHEN v_first IS NOT NULL AND (
        u.first_name IS NULL OR TRIM(u.first_name) = ''
        OR (
          v_full IS NOT NULL
          AND (
            u.full_name IS NULL
            OR TRIM(u.full_name) = ''
            OR LOWER(TRIM(u.full_name)) = LOWER(SPLIT_PART(u.email::text, '@', 1))
            OR LOWER(TRIM(u.full_name)) = LOWER(TRIM(u.email::text))
          )
        )
      ) THEN v_first
      ELSE u.first_name
    END,
    last_name = CASE
      WHEN v_last IS NOT NULL AND (
        u.last_name IS NULL OR TRIM(u.last_name) = ''
        OR (
          v_full IS NOT NULL
          AND (
            u.full_name IS NULL
            OR TRIM(u.full_name) = ''
            OR LOWER(TRIM(u.full_name)) = LOWER(SPLIT_PART(u.email::text, '@', 1))
            OR LOWER(TRIM(u.full_name)) = LOWER(TRIM(u.email::text))
          )
        )
      ) THEN v_last
      ELSE u.last_name
    END,
    full_name = CASE
      WHEN v_full IS NOT NULL AND (
        u.full_name IS NULL
        OR TRIM(u.full_name) = ''
        OR LOWER(TRIM(u.full_name)) = LOWER(SPLIT_PART(u.email::text, '@', 1))
        OR LOWER(TRIM(u.full_name)) = LOWER(TRIM(u.email::text))
      ) THEN v_full
      ELSE u.full_name
    END,
    job_title = CASE
      WHEN v_role IS NOT NULL AND (u.job_title IS NULL OR TRIM(u.job_title) = '') THEN v_role
      ELSE u.job_title
    END,
    updated_at = NOW()
  WHERE u.id = p_user_id
    AND COALESCE(u.is_deleted, FALSE) = FALSE;
END;
$$;

COMMENT ON FUNCTION public.apply_invitation_profile_defaults(uuid, text, text, text, text) IS
  'v901: Copy invitation invitee name → users.full_name and role display name → users.job_title when those profile fields are blank or still an email handle.';

REVOKE ALL ON FUNCTION public.apply_invitation_profile_defaults(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_invitation_profile_defaults(uuid, text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Project invitation accept → profile defaults
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_project_invitation_apply_profile_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role_display text;
BEGIN
  IF NEW.invitation_status IS DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.invitation_status IS NOT DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;

  v_user_id := COALESCE(NEW.accepted_by_user_id, NEW.invited_user_id);
  IF v_user_id IS NULL AND NEW.invited_email IS NOT NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.invited_email))
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.role_display_name INTO v_role_display
  FROM public.roles r
  WHERE r.id = NEW.role_id
  LIMIT 1;

  PERFORM public.apply_invitation_profile_defaults(
    v_user_id,
    NEW.invited_first_name,
    NEW.invited_last_name,
    NEW.invitation_message,
    v_role_display
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_invitation_apply_profile_defaults ON public.project_invitations;
CREATE TRIGGER trg_project_invitation_apply_profile_defaults
  AFTER UPDATE OF invitation_status ON public.project_invitations
  FOR EACH ROW
  WHEN (NEW.invitation_status = 'accepted')
  EXECUTE FUNCTION public.trg_project_invitation_apply_profile_defaults();

-- ---------------------------------------------------------------------------
-- Organisation invitation accept → profile defaults
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_organisation_invitation_apply_profile_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role_display text;
  v_first text;
  v_last text;
BEGIN
  IF NEW.invitation_status IS DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.invitation_status IS NOT DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;

  v_user_id := COALESCE(NEW.accepted_by_user_id, NEW.invited_user_id);
  IF v_user_id IS NULL AND NEW.invited_email IS NOT NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.invited_email))
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.role_display_name INTO v_role_display
  FROM public.roles r
  WHERE r.id = NEW.role_id
  LIMIT 1;

  v_first := NULLIF(TRIM(COALESCE(NEW.invitation_metadata->>'first_name', '')), '');
  v_last  := NULLIF(TRIM(COALESCE(NEW.invitation_metadata->>'last_name', '')), '');

  PERFORM public.apply_invitation_profile_defaults(
    v_user_id,
    v_first,
    v_last,
    NEW.invitation_message,
    v_role_display
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organisation_invitation_apply_profile_defaults ON public.organisation_invitations;
CREATE TRIGGER trg_organisation_invitation_apply_profile_defaults
  AFTER UPDATE OF invitation_status ON public.organisation_invitations
  FOR EACH ROW
  WHEN (NEW.invitation_status = 'accepted')
  EXECUTE FUNCTION public.trg_organisation_invitation_apply_profile_defaults();

-- ---------------------------------------------------------------------------
-- One-time repair: existing invitees whose Full Name is still the email handle
-- or whose Job Title is still blank.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    WITH ranked AS (
      SELECT
        u.id AS user_id,
        pi.invited_first_name,
        pi.invited_last_name,
        pi.invitation_message,
        rl.role_display_name,
        ROW_NUMBER() OVER (
          PARTITION BY u.id
          ORDER BY
            CASE pi.invitation_status
              WHEN 'accepted' THEN 0
              WHEN 'pending' THEN 1
              ELSE 2
            END,
            pi.accepted_at DESC NULLS LAST,
            pi.updated_at DESC NULLS LAST,
            pi.created_at DESC
        ) AS rn
      FROM public.users u
      INNER JOIN public.project_invitations pi
        ON LOWER(TRIM(pi.invited_email)) = LOWER(TRIM(u.email))
       AND COALESCE(pi.is_deleted, FALSE) = FALSE
      INNER JOIN public.roles rl ON rl.id = pi.role_id
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    )
    SELECT user_id, invited_first_name, invited_last_name, invitation_message, role_display_name
    FROM ranked
    WHERE rn = 1
  LOOP
    PERFORM public.apply_invitation_profile_defaults(
      rec.user_id,
      rec.invited_first_name,
      rec.invited_last_name,
      rec.invitation_message,
      rec.role_display_name
    );
  END LOOP;

  FOR rec IN
    WITH ranked AS (
      SELECT
        u.id AS user_id,
        NULLIF(TRIM(COALESCE(oi.invitation_metadata->>'first_name', '')), '') AS invited_first_name,
        NULLIF(TRIM(COALESCE(oi.invitation_metadata->>'last_name', '')), '') AS invited_last_name,
        oi.invitation_message,
        rl.role_display_name,
        ROW_NUMBER() OVER (
          PARTITION BY u.id
          ORDER BY
            CASE oi.invitation_status
              WHEN 'accepted' THEN 0
              WHEN 'pending' THEN 1
              ELSE 2
            END,
            oi.accepted_at DESC NULLS LAST,
            oi.updated_at DESC NULLS LAST,
            oi.created_at DESC
        ) AS rn
      FROM public.users u
      INNER JOIN public.organisation_invitations oi
        ON LOWER(TRIM(oi.invited_email)) = LOWER(TRIM(u.email))
       AND COALESCE(oi.is_deleted, FALSE) = FALSE
      INNER JOIN public.roles rl ON rl.id = oi.role_id
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    )
    SELECT user_id, invited_first_name, invited_last_name, invitation_message, role_display_name
    FROM ranked
    WHERE rn = 1
  LOOP
    PERFORM public.apply_invitation_profile_defaults(
      rec.user_id,
      rec.invited_first_name,
      rec.invited_last_name,
      rec.invitation_message,
      rec.role_display_name
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE 'v901_invitation_accept_profile_name_and_job_title.sql applied'; END $$;
