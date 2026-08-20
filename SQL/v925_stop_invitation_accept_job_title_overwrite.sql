-- ============================================================================
-- v925: SaaS Industry-Aware Tenant Provisioning — Phase 6 (stop DB-level job_title
-- overwrite from invitation role)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md, decision 4.
--
-- v901 (apply_invitation_profile_defaults + its two AFTER UPDATE triggers on
-- project_invitations / organisation_invitations) is the actual authoritative source
-- of the "job_title is overwritten with the security role's display name" conflation
-- the brief calls out as already live in production — it fires on EVERY invitation
-- acceptance path (new user via the accept-invitation edge function, and existing/
-- registered users via accept_project_invitation / accept_organisation_invitation),
-- regardless of what any client-side or edge-function code does. Fixing only the
-- edge function (this session's earlier JS/TS changes) would have been insufficient:
-- this trigger runs immediately after invitation_status flips to 'accepted' and
-- would still set job_title from role_display_name whenever job_title is blank.
--
-- This migration keeps apply_invitation_profile_defaults()'s full_name/first_name/
-- last_name logic completely unchanged (still wanted — invitee NAME should still
-- land on the profile) and removes only the job_title CASE branch. The function
-- signature is untouched (p_role_display_name is still accepted, just no longer
-- used to write job_title) so the two existing trigger functions need no changes.
-- ============================================================================

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

  -- v925: p_role_display_name intentionally no longer read — job_title is genuinely
  -- free-text profile info now (PRD decision 4), never mirrored from the security
  -- role granted by this invitation.
  IF v_full IS NULL THEN
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
    updated_at = NOW()
  WHERE u.id = p_user_id
    AND COALESCE(u.is_deleted, FALSE) = FALSE;
END;
$$;

COMMENT ON FUNCTION public.apply_invitation_profile_defaults(uuid, text, text, text, text) IS
  'v925 (supersedes v901): Copy invitation invitee name -> users.full_name only. job_title is no longer copied from role_display_name (PRD v918 decision 4) — job_title is genuinely free-text profile info, never a mirror of the security role granted by the invitation.';

REVOKE ALL ON FUNCTION public.apply_invitation_profile_defaults(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_invitation_profile_defaults(uuid, text, text, text, text) TO authenticated, service_role;

DO $$
BEGIN
  RAISE NOTICE 'v925: apply_invitation_profile_defaults() no longer copies role_display_name into job_title';
END $$;
