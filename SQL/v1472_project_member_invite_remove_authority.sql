-- ============================================================================
-- v1472: Who may invite / remove project members, and as which role (v1343, slice 2)
-- ============================================================================
-- PRD projectprd/v1343_project_administrator_support_role_PRD.md amendments A3 and A8.
-- Prerequisites: v1471 (project_administrator role), v597, v908, v1168.
--
-- Before: the invite RPC let anyone holding any user_roles row on the project send invitations,
-- never checked the invited role's level, and removing a member was a plain table update.
--
-- Rules now enforced in the database (the pickers already follow the same rules):
--   Who may invite / remove (A8):
--     - organisation admins (pmo_admin, org_admin, system_admin, super_admin, account_owner);
--     - the project's Project Manager (projects.project_manager_user_id);
--     - a member whose project role has the invite permission (user.invite / project.manage_users,
--       v1168), or is Project Manager / Programme Manager / Board Member / Sponsor (as v597).
--       Team Manager gains user.invite here so Team Managers keep inviting.
--   Which role (A3):
--     - the role's project level must be ≤ the caller's highest level on that project;
--     - a caller whose highest level is below Team Manager (8), e.g. a Project Administrator (7),
--       may not give or remove governance roles (Project Assurance, Quality Assurance,
--       Change Authority, or any project role marked is_governance_only).
--   Organisation admins skip both checks.
-- Removal: new remove_project_member() applies the same rules to a membership or a
-- project-scoped user_roles row (the app's two member row kinds).
-- Idempotent. Ends with a pre-release check: recent invitations whose sender would now be refused.
-- ============================================================================

-- ── 0. Team Manager keeps inviting (permission previously implied by the loose clause) ──
UPDATE public.project_roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["user.invite"]'::jsonb
WHERE role_name = 'team_manager' AND project_id IS NULL
  AND NOT COALESCE(permissions, '[]'::jsonb) @> '["user.invite"]'::jsonb;

-- ── 1. Helpers (SECURITY DEFINER, row security off: read-only lookups) ────────────────

-- Organisation admin (same role list as v908's bypass), by internal user id.
CREATE OR REPLACE FUNCTION public.project_user_is_org_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner')
  );
$$;

-- Project level of a role name (built-in template, or the organisation's own custom role);
-- 'pm_' legacy prefixes map to the plain name. Unknown roles → NULL.
CREATE OR REPLACE FUNCTION public.project_role_level_for_name(p_role_name text, p_account_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT MAX(pr.role_level)
  FROM project_roles pr
  WHERE pr.is_template = TRUE AND pr.project_id IS NULL AND pr.is_active = TRUE
    AND pr.role_name = regexp_replace(lower(replace(trim(p_role_name), ' ', '_')), '^pm_', '')
    AND (pr.account_id IS NULL OR pr.account_id = p_account_id);
$$;

CREATE OR REPLACE FUNCTION public.project_role_is_governance(p_role_name text, p_account_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT regexp_replace(lower(replace(trim(p_role_name), ' ', '_')), '^pm_', '')
           IN ('project_assurance', 'quality_assurance', 'change_authority')
      OR EXISTS (
        SELECT 1 FROM project_roles pr
        WHERE pr.is_template = TRUE AND pr.project_id IS NULL
          AND pr.role_name = regexp_replace(lower(replace(trim(p_role_name), ' ', '_')), '^pm_', '')
          AND (pr.account_id IS NULL OR pr.account_id = p_account_id)
          AND COALESCE(pr.is_governance_only, FALSE) = TRUE
      );
$$;

-- The caller's highest project level on one project: memberships, project-scoped user_roles
-- (mapped to the role template), and the project's named Project Manager (9).
CREATE OR REPLACE FUNCTION public.project_user_role_cap(p_user_id uuid, p_project_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT GREATEST(
    COALESCE((
      SELECT MAX(pr.role_level) FROM project_memberships pm JOIN project_roles pr ON pr.id = pm.project_role_id
      WHERE pm.user_id = p_user_id AND pm.project_id = p_project_id AND pm.is_active = TRUE
        AND COALESCE(pm.invitation_status, 'accepted') = 'accepted'), 0),
    COALESCE((
      SELECT MAX(public.project_role_level_for_name(r.role_name, p.account_id))
      FROM user_roles ur JOIN roles r ON r.id = ur.role_id JOIN projects p ON p.id = ur.project_id
      WHERE ur.user_id = p_user_id AND ur.project_id = p_project_id
        AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE), 0),
    CASE WHEN EXISTS (SELECT 1 FROM projects p WHERE p.id = p_project_id AND p.project_manager_user_id = p_user_id)
         THEN 9 ELSE 0 END
  );
$$;

-- May this user invite / remove members on the project at all? (A8)
CREATE OR REPLACE FUNCTION public.project_user_can_manage_members(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT public.project_user_is_org_admin(p_user_id)
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = p_project_id AND p.project_manager_user_id = p_user_id
                 AND COALESCE(p.is_deleted, FALSE) = FALSE)
    OR EXISTS (
      SELECT 1 FROM project_memberships pm JOIN project_roles pr ON pr.id = pm.project_role_id
      WHERE pm.user_id = p_user_id AND pm.project_id = p_project_id AND pm.is_active = TRUE
        AND COALESCE(pm.invitation_status, 'accepted') = 'accepted' AND pr.is_active = TRUE
        AND (public.project_permission_matches(pr.permissions, 'user.invite')
             OR pr.role_name IN ('project_manager', 'programme_manager', 'project_board_member', 'project_sponsor')))
    OR EXISTS (
      SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id JOIN projects p ON p.id = ur.project_id
      JOIN project_roles pr ON pr.is_template = TRUE AND pr.project_id IS NULL AND pr.is_active = TRUE
        AND pr.role_name = regexp_replace(lower(replace(trim(r.role_name), ' ', '_')), '^pm_', '')
        AND (pr.account_id IS NULL OR pr.account_id = p.account_id)
      WHERE ur.user_id = p_user_id AND ur.project_id = p_project_id
        AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND (public.project_permission_matches(pr.permissions, 'user.invite')
             OR pr.role_name IN ('project_manager', 'programme_manager', 'project_board_member', 'project_sponsor')));
$$;

-- May this user give (or remove) this role on the project? (A3)
CREATE OR REPLACE FUNCTION public.project_user_can_assign_role(p_user_id uuid, p_project_id uuid, p_role_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT CASE
    WHEN public.project_user_is_org_admin(p_user_id) THEN TRUE
    ELSE (
      SELECT COALESCE(lvl.target, 999) <= lvl.cap
             AND NOT (lvl.cap < 8 AND public.project_role_is_governance(p_role_name, lvl.account_id))
      FROM (
        SELECT public.project_role_level_for_name(p_role_name, p.account_id) AS target,
               public.project_user_role_cap(p_user_id, p_project_id) AS cap,
               p.account_id
        FROM projects p WHERE p.id = p_project_id
      ) lvl
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.project_user_is_org_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_user_role_cap(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_user_can_manage_members(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_user_can_assign_role(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_role_level_for_name(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_role_is_governance(text, uuid) TO authenticated;

-- ── 2. Invite RPC (same signature as v597) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id uuid,
  p_invited_email text,
  p_role_id uuid,
  p_invitation_message text DEFAULT NULL,
  p_invitation_expires_at timestamptz DEFAULT NULL,
  p_invited_first_name text DEFAULT NULL,
  p_invited_last_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_inviter_id uuid;
  v_role_name text;
  v_id uuid := gen_random_uuid();
BEGIN
  PERFORM set_config('statement_timeout', '15000', true);

  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_inviter_id := (SELECT id FROM public.users WHERE auth_user_id = v_auth LIMIT 1);
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter user profile not found' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.is_user_pmo_admin(v_auth) OR public.project_user_can_manage_members(v_inviter_id, p_project_id)) THEN
    RAISE EXCEPTION 'Forbidden: PMO suite admin or project invite access required'
      USING ERRCODE = '42501';
  END IF;

  v_role_name := (SELECT role_name FROM public.roles WHERE id = p_role_id);
  IF v_role_name IS NULL THEN
    RAISE EXCEPTION 'Unknown role' USING ERRCODE = '22023';
  END IF;
  IF NOT (public.is_user_pmo_admin(v_auth) OR public.project_user_can_assign_role(v_inviter_id, p_project_id, v_role_name)) THEN
    RAISE EXCEPTION 'Forbidden: you cannot invite someone as %', v_role_name
      USING ERRCODE = '42501',
            HINT = 'You can invite roles up to your own level on this project; governance roles need a Team Manager, Project Manager or PMO.';
  END IF;

  INSERT INTO public.project_invitations (
    id, project_id, invited_email, invited_user_id, role_id, invited_by_user_id,
    invitation_message, invitation_expires_at, invited_first_name, invited_last_name, entity_type
  )
  VALUES (
    v_id,
    p_project_id,
    trim(p_invited_email),
    (SELECT id FROM public.users WHERE lower(trim(email)) = lower(trim(p_invited_email)) LIMIT 1),
    p_role_id,
    v_inviter_id,
    NULLIF(trim(p_invitation_message), ''),
    p_invitation_expires_at,
    NULLIF(trim(p_invited_first_name), ''),
    NULLIF(trim(p_invited_last_name), ''),
    'project'
  );

  RETURN (
    SELECT json_build_object(
      'id', i.id,
      'invitation_token', i.invitation_token,
      'invitation_expires_at', i.invitation_expires_at,
      'invitation_status', i.invitation_status,
      'project_id', i.project_id,
      'invited_email', i.invited_email,
      'invited_first_name', i.invited_first_name,
      'invited_last_name', i.invited_last_name,
      'role_id', i.role_id,
      'created_at', i.created_at
    )
    FROM public.project_invitations i WHERE i.id = v_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) TO service_role;
COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) IS
  'v1472 (v1343 A3 / A8): invitation by an organisation admin, the project''s PM, or a member whose role may invite; the invited role must be within the inviter''s level, and below Team Manager governance roles are refused.';

-- ── 3. Picker RPC: same rules as the server (v908 + governance exclusion) ─────────────
CREATE OR REPLACE FUNCTION public.get_assignable_project_roles(
  p_account_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  role_name VARCHAR,
  role_display_name VARCHAR,
  role_description TEXT,
  role_level INTEGER,
  industry_category_id UUID,
  is_governance_only BOOLEAN,
  account_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_org_admin BOOLEAN;
  v_max_level INTEGER;
BEGIN
  IF p_account_id IS NULL OR auth.uid() IS NULL THEN
    RETURN;
  END IF;

  v_user_id := (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid() LIMIT 1);
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  v_is_org_admin := public.project_user_is_org_admin(v_user_id);

  IF v_is_org_admin THEN
    v_max_level := 999;
  ELSIF p_project_id IS NOT NULL THEN
    v_max_level := public.project_user_role_cap(v_user_id, p_project_id);
  ELSE
    v_max_level := COALESCE((
      SELECT MAX(pr.role_level)
      FROM project_memberships pm
      JOIN project_roles pr ON pr.id = pm.project_role_id
      WHERE pm.user_id = v_user_id AND pm.is_active = TRUE), 0);
  END IF;

  RETURN QUERY
  SELECT pr.id, pr.role_name, pr.role_display_name, pr.role_description, pr.role_level,
         pr.industry_category_id, pr.is_governance_only, pr.account_id
  FROM project_roles pr
  WHERE pr.is_template = TRUE
    AND pr.is_active = TRUE
    AND (pr.account_id IS NULL OR pr.account_id = p_account_id)
    AND pr.role_level <= v_max_level
    -- v1343 A3: below Team Manager (e.g. Project Administrator) no governance roles
    AND (v_is_org_admin OR v_max_level >= 8 OR NOT public.project_role_is_governance(pr.role_name, p_account_id))
  ORDER BY pr.role_level DESC, pr.role_display_name;
END;
$$;

COMMENT ON FUNCTION public.get_assignable_project_roles(UUID, UUID) IS
  'Roles the caller may assign, capped at their own project level (v906/v908); below Team Manager no governance roles (v1472, v1343 A3).';

-- ── 4. Remove a member (membership row, or project-scoped user_roles row) ──────────────
CREATE OR REPLACE FUNCTION public.remove_project_member(
  p_membership_id uuid DEFAULT NULL,
  p_user_role_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_caller uuid;
  v_project uuid;
  v_role text;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  v_caller := (SELECT id FROM users WHERE auth_user_id = v_auth LIMIT 1);
  IF (p_membership_id IS NULL) = (p_user_role_id IS NULL) THEN
    RAISE EXCEPTION 'Give exactly one of p_membership_id or p_user_role_id' USING ERRCODE = '22023';
  END IF;

  IF p_membership_id IS NOT NULL THEN
    v_project := (SELECT pm.project_id FROM project_memberships pm WHERE pm.id = p_membership_id);
    v_role := (SELECT pr.role_name FROM project_memberships pm JOIN project_roles pr ON pr.id = pm.project_role_id
               WHERE pm.id = p_membership_id);
  ELSE
    v_project := (SELECT ur.project_id FROM user_roles ur WHERE ur.id = p_user_role_id);
    v_role := (SELECT r.role_name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.id = p_user_role_id);
  END IF;

  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Member not found on a project' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (public.is_user_pmo_admin(v_auth)
          OR (public.project_user_can_manage_members(v_caller, v_project)
              AND public.project_user_can_assign_role(v_caller, v_project, COALESCE(v_role, '')))) THEN
    RAISE EXCEPTION 'Forbidden: you cannot remove a member with the role %', COALESCE(v_role, '(unknown)')
      USING ERRCODE = '42501';
  END IF;

  IF p_membership_id IS NOT NULL THEN
    UPDATE project_memberships
    SET is_active = FALSE, invitation_status = 'cancelled', updated_at = NOW()
    WHERE id = p_membership_id;
  ELSE
    UPDATE user_roles
    SET is_active = FALSE, is_deleted = TRUE, updated_at = NOW()
    WHERE id = p_user_role_id;
  END IF;

  RETURN json_build_object('project_id', v_project, 'role_name', v_role,
                           'membership_id', p_membership_id, 'user_role_id', p_user_role_id);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_project_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_project_member(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.remove_project_member(uuid, uuid) IS
  'v1472 (v1343 A3): remove a project member (membership or project-scoped user_roles row) — caller must manage members on the project and be allowed to give that role.';

NOTIFY pgrst, 'reload schema';

-- ── Pre-release check: invitations in the last 90 days whose sender would now be refused ──
-- Expect few or none. Rows here are people who invited through the old "any role on the
-- project" clause, or invited a role above their level; tell them before release.
SELECT 'refused_now' AS check_name, i.created_at, p.project_code, u.email AS inviter, r.role_name AS invited_role,
       public.project_user_can_manage_members(i.invited_by_user_id, i.project_id) AS may_invite,
       public.project_user_can_assign_role(i.invited_by_user_id, i.project_id, r.role_name) AS may_give_role
FROM public.project_invitations i
JOIN public.projects p ON p.id = i.project_id
JOIN public.roles r ON r.id = i.role_id
LEFT JOIN public.users u ON u.id = i.invited_by_user_id
WHERE i.created_at > NOW() - INTERVAL '90 days'
  AND i.invited_by_user_id IS NOT NULL
  AND NOT public.is_user_pmo_admin(u.auth_user_id)
  AND (NOT public.project_user_can_manage_members(i.invited_by_user_id, i.project_id)
       OR NOT public.project_user_can_assign_role(i.invited_by_user_id, i.project_id, r.role_name))
ORDER BY i.created_at DESC;
