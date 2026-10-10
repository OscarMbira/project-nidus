-- v1215: grant read-only Testing Centre access (testing_centre.view) to Project Managers.
-- Without it the Testing Centre dashboard and test tables are denied for PM users.
-- Only the view permission is granted; create/edit/run/configure stay with admin roles.

INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code = 'testing_centre.view'
  AND r.role_name IN ('project_manager', 'Project Manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Verification: roles that now hold testing_centre.view
SELECT r.role_name, p.permission_code, rp.is_active
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE p.permission_code = 'testing_centre.view'
ORDER BY r.role_name;
