-- =============================================================================
-- v1222: Standalone Project Manager project, NOT under any organisation.
-- account_id is left NULL, so the project is outside the organisation's
-- account. Access comes from projects.project_manager_user_id.
-- Project manager and owner: the user with email oscarmbirablogging@gmail.com.
-- Idempotent: fixed hex-only UUIDs, ON CONFLICT DO NOTHING.
-- =============================================================================

DO $$
DECLARE
  v_pm_id UUID;
BEGIN
  SELECT id INTO v_pm_id
  FROM public.users
  WHERE email = 'oscarmbirablogging@gmail.com'
  LIMIT 1;

  IF v_pm_id IS NULL THEN
    RAISE EXCEPTION 'v1222: no user with email oscarmbirablogging@gmail.com';
  END IF;

  INSERT INTO public.projects
    (id, project_code, project_name, project_description, is_deleted,
     account_id, owner_user_id, project_manager_user_id, budget_currency, created_by)
  VALUES
    ('c1222001-0000-4000-8000-000000000001', 'PM-STANDALONE-01', 'Personal Consulting Pilot',
     'Standalone project managed by a Project Manager outside any organisation.',
     FALSE, NULL, v_pm_id, v_pm_id, 'USD', v_pm_id)
  ON CONFLICT DO NOTHING;

  -- The project selector lists projects from project_memberships, so the PM needs one.
  INSERT INTO public.project_memberships
    (id, project_id, user_id, project_role_id, invitation_status, is_active)
  SELECT 'c1222003-0000-4000-8000-000000000001', 'c1222001-0000-4000-8000-000000000001', v_pm_id,
         pr.id, 'accepted', TRUE
  FROM public.project_roles pr
  WHERE pr.role_name = 'project_manager'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO public.project_budget_categories
    (id, project_id, category_name, budget_amount, display_order)
  VALUES
    ('c1222002-0000-4000-8000-000000000001', 'c1222001-0000-4000-8000-000000000001', 'Consulting time', 60000.00, 0),
    ('c1222002-0000-4000-8000-000000000002', 'c1222001-0000-4000-8000-000000000001', 'Travel', 8000.00, 1)
  ON CONFLICT DO NOTHING;
END $$;

-- Verification: the project exists and has no organisation
SELECT project_code, project_name, account_id, project_manager_user_id
FROM public.projects
WHERE project_code = 'PM-STANDALONE-01';
