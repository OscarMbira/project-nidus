-- v1217: let Project Managers start and execute test runs (testing_centre.run).
-- Covers the insert/update policies on tc_test_runs. Create, edit, delete and
-- configure stay with the admin roles.

INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code = 'testing_centre.run'
  AND r.role_name IN ('project_manager', 'Project Manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Verification: Project Manager now holds testing_centre.run
SELECT r.role_name, p.permission_code, rp.is_active
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE p.permission_code = 'testing_centre.run'
  AND r.role_name IN ('project_manager', 'Project Manager')
ORDER BY r.role_name;
