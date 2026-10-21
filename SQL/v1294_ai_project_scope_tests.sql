-- ============================================================================
-- v1294 tests: Ask Nidus project scope. Run after v1294_ai_project_scope.sql.
-- Impersonates real users through request.jwt.claims (read-only: nothing is written).
--
--   T1  functions exist
--   T2  an org-wide user (oldest account owner): "All my projects" → no extra limit, toggle offered
--   T3  org-wide user, a project chosen → limited to exactly that project
--   T4  project-level user (Team Member / Team Lead only): toggle not offered, "All" is refused,
--       every allowed project is one they are assigned to
--   T5  project-level user asking for a project they are not on → falls back to their own
--   T6  query runner: an empty project_ids list returns no rows (fails closed)
--   T7  query runner: a bad id in project_ids is refused
--   T8  query runner: project_id and project_ids filters build valid SQL
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1294_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1294_results;

DO $$
DECLARE
  v_owner_auth UUID;
  v_tm_auth    UUID;
  v_tm_user    UUID;
  v_assigned   UUID[];
  v_other      UUID;
  v_any_proj   UUID;
  v_scope      JSONB;
  v_res        JSONB;
  v_err        TEXT;
BEGIN
  -- T1
  INSERT INTO v1294_results VALUES ('T1 functions exist',
    to_regprocedure('public.ai_project_scope(uuid, boolean)') IS NOT NULL
    AND to_regprocedure('public.ai_run_query_in(text, jsonb)') IS NOT NULL, NULL);

  -- An org-wide user: the owner of the oldest account.
  SELECT u.auth_user_id INTO v_owner_auth
    FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
   WHERE u.auth_user_id IS NOT NULL AND COALESCE(a.is_deleted, FALSE) = FALSE
   ORDER BY a.created_at LIMIT 1;

  IF v_owner_auth IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_auth, 'role', 'authenticated')::text, TRUE);
    v_scope := public.ai_project_scope(NULL, TRUE);
    INSERT INTO v1294_results VALUES ('T2 org-wide "All my projects" → no extra limit',
      v_scope ->> 'mode' = 'all' AND v_scope -> 'project_ids' = 'null'::jsonb AND (v_scope ->> 'can_choose_all')::boolean
      OR NOT (v_scope ->> 'org_wide')::boolean,   -- owner without an org-wide role: not applicable
      v_scope::text);

    SELECT id INTO v_any_proj FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at LIMIT 1;
    IF v_any_proj IS NOT NULL AND (v_scope ->> 'org_wide')::boolean THEN
      v_scope := public.ai_project_scope(v_any_proj, FALSE);
      INSERT INTO v1294_results VALUES ('T3 org-wide, project chosen → that project only',
        v_scope -> 'project_ids' = jsonb_build_array(v_any_proj), v_scope::text);
    ELSE
      INSERT INTO v1294_results VALUES ('T3 skipped', TRUE, 'no project, or the owner has no org-wide role');
    END IF;

    -- T6 / T7 run as the owner (any signed-in user works).
    BEGIN
      v_res := public.ai_run_query_in('public', jsonb_build_object('entity', 'risks', 'project_ids', '[]'::jsonb,
                                      'aggregates', jsonb_build_array(jsonb_build_object('fn', 'count', 'alias', 'n'))));
      INSERT INTO v1294_results VALUES ('T6 empty project_ids → no rows',
        COALESCE((v_res -> 'rows' -> 0 ->> 'n')::int, 0) = 0, v_res ->> 'explanation');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v1294_results VALUES ('T6 empty project_ids → no rows', FALSE, SQLERRM);
    END;
    BEGIN
      PERFORM public.ai_run_query_in('public', jsonb_build_object('entity', 'risks', 'project_ids', '["not-a-uuid"]'::jsonb));
      v_err := NULL;
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
    END;
    INSERT INTO v1294_results VALUES ('T7 bad project id refused', v_err LIKE 'AIQ: project_ids must be project ids%', v_err);

    -- T8: single project_id and project_ids filters both build valid SQL (both hit the v1276 array bug).
    IF v_any_proj IS NOT NULL THEN
      BEGIN
        v_res := public.ai_run_query_in('public', jsonb_build_object('entity', 'risks', 'project_id', v_any_proj,
                                        'project_ids', jsonb_build_array(v_any_proj),
                                        'aggregates', jsonb_build_array(jsonb_build_object('fn', 'count', 'alias', 'n'))));
        INSERT INTO v1294_results VALUES ('T8 project filters build valid SQL', TRUE, v_res ->> 'explanation');
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO v1294_results VALUES ('T8 project filters build valid SQL', FALSE, SQLERRM);
      END;
    END IF;
  ELSE
    INSERT INTO v1294_results VALUES ('T2-T3, T6-T7 skipped', TRUE, 'no account owner to test with');
  END IF;

  -- A project-level user: only team_member / team_lead system roles, at least one active membership.
  SELECT u.id, u.auth_user_id INTO v_tm_user, v_tm_auth
    FROM public.users u
   WHERE u.auth_user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.project_memberships pm WHERE pm.user_id = u.id AND pm.is_active)
     AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
                  WHERE ur.user_id = u.id AND ur.is_active AND lower(r.role_name) IN ('team_member', 'team_lead'))
     AND NOT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
                      WHERE ur.user_id = u.id AND ur.is_active
                        AND lower(regexp_replace(trim(r.role_name), '[[:space:]]+', '_', 'g')) NOT IN ('team_member', 'team_lead'))
   LIMIT 1;

  IF v_tm_auth IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tm_auth, 'role', 'authenticated')::text, TRUE);
    SELECT array_agg(DISTINCT project_id) INTO v_assigned FROM public.project_memberships WHERE user_id = v_tm_user AND is_active;
    v_scope := public.ai_project_scope(NULL, TRUE);
    INSERT INTO v1294_results VALUES ('T4 project-level user: no toggle, only assigned projects',
      NOT (v_scope ->> 'can_choose_all')::boolean AND v_scope ->> 'mode' = 'project'
      AND jsonb_typeof(v_scope -> 'project_ids') = 'array'
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_scope -> 'project_ids') x
                       WHERE x::uuid <> ALL (v_assigned)
                         AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = x::uuid
                                          AND (p.project_manager_user_id = v_tm_user OR p.owner_user_id = v_tm_user))),
      v_scope::text);

    SELECT id INTO v_other FROM public.projects
     WHERE COALESCE(is_deleted, FALSE) = FALSE AND id <> ALL (v_assigned)
       AND project_manager_user_id IS DISTINCT FROM v_tm_user AND owner_user_id IS DISTINCT FROM v_tm_user
     LIMIT 1;
    IF v_other IS NOT NULL THEN
      v_scope := public.ai_project_scope(v_other, FALSE);
      INSERT INTO v1294_results VALUES ('T5 not-assigned project → falls back to own',
        v_scope ->> 'note' = 'not_assigned' AND NOT (v_scope -> 'project_ids') @> to_jsonb(v_other::text), v_scope::text);
    ELSE
      INSERT INTO v1294_results VALUES ('T5 skipped', TRUE, 'no project outside the test user''s assignments');
    END IF;
  ELSE
    INSERT INTO v1294_results VALUES ('T4-T5 skipped', TRUE, 'no Team Member / Team Lead-only user with a project');
  END IF;

  PERFORM set_config('request.jwt.claims', NULL, TRUE);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1294_results ORDER BY test;
