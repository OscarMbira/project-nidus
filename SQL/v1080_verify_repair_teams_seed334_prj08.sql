-- =============================================================================
-- v1080: Verify + repair SEED334-PRJ-08 teams visibility
-- =============================================================================
-- Run AFTER v1079. Soft-undeletes seed teams; ensures owner membership.
-- Verification SELECT at end shows rows in the Results tab.
-- =============================================================================

DO $$
DECLARE
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_project_id UUID;
  v_account_id UUID;
  v_owner_id UUID;
  v_role_id UUID;
  v_team_count INT;
  v_member_count INT;
  v_role_count INT;
BEGIN
  SELECT id, account_id, owner_user_id
    INTO v_project_id, v_account_id, v_owner_id
  FROM public.projects
  WHERE project_code = v_project_code
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1080: project % not found', v_project_code;
  END IF;

  RAISE NOTICE 'v1080: project_id=% account_id=% owner=%',
    v_project_id, v_account_id, v_owner_id;

  UPDATE public.teams
  SET is_deleted = FALSE,
      deleted_at = NULL,
      deleted_by = NULL,
      is_active = TRUE,
      updated_at = NOW()
  WHERE project_id = v_project_id
    AND team_name IN ('Route Optimization Delivery', 'Integration & Ops Support');

  SELECT COUNT(*) INTO v_team_count
  FROM public.teams
  WHERE project_id = v_project_id
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND team_name IN ('Route Optimization Delivery', 'Integration & Ops Support');

  SELECT COUNT(*) INTO v_member_count
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE t.project_id = v_project_id
    AND t.team_name IN ('Route Optimization Delivery', 'Integration & Ops Support')
    AND COALESCE(tm.is_deleted, FALSE) = FALSE
    AND COALESCE(tm.is_active, TRUE) = TRUE;

  SELECT COUNT(*) INTO v_role_count
  FROM public.team_functional_roles tfr
  JOIN public.teams t ON t.id = tfr.team_id
  WHERE t.project_id = v_project_id
    AND t.team_name IN ('Route Optimization Delivery', 'Integration & Ops Support')
    AND COALESCE(tfr.is_active, TRUE) = TRUE;

  RAISE NOTICE 'v1080: seed teams=% members=% roles=% for %',
    v_team_count, v_member_count, v_role_count, v_project_code;

  IF v_team_count = 0 THEN
    RAISE EXCEPTION 'v1080: NO TEAMS — re-run SQL/v1079_seed_teams_seed334_prj08.sql';
  END IF;

  SELECT id INTO v_role_id
  FROM public.project_roles
  WHERE role_name IN ('project_manager', 'team_member')
  ORDER BY CASE role_name WHEN 'project_manager' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_owner_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO public.project_memberships (
      project_id, user_id, project_role_id, invitation_status, is_active, accepted_at
    )
    SELECT v_project_id, v_owner_id, v_role_id, 'accepted', TRUE, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.project_memberships pm
      WHERE pm.project_id = v_project_id
        AND pm.user_id = v_owner_id
        AND COALESCE(pm.is_active, TRUE) = TRUE
    );
  ELSIF v_owner_id IS NOT NULL AND v_role_id IS NULL THEN
    RAISE NOTICE 'v1080: no project_roles row — membership repair skipped';
  END IF;
END $$;

SELECT
  t.team_code,
  t.team_name,
  t.team_type,
  t.is_active,
  p.project_code
FROM public.teams t
JOIN public.projects p ON p.id = t.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
  AND t.team_name IN ('Route Optimization Delivery', 'Integration & Ops Support')
  AND COALESCE(t.is_deleted, FALSE) = FALSE
ORDER BY t.team_name;
