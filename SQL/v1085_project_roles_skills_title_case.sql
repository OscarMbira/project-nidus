-- v1085: Title-case Project Roles & Skills menu labels
UPDATE public.menu_items
SET menu_label = 'Project Roles & Skills',
    updated_at = NOW()
WHERE menu_code IN ('plat_pm_pt_project_roles', 'sim_pm_practice_project_roles')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE 'v1085_project_roles_skills_title_case.sql applied';
END $$;
