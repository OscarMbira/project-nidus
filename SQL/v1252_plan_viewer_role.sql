-- ============================================================================
-- v1252: plan_viewer role — v1239 Slice 7.1 (D11)
-- A read-only planner role: sees Home, Projects, the schedule views and the Planning Hub, and
-- changes nothing. Created as a system role (roles) and as a project role template
-- (project_roles) so a planner invitation can give it on one project.
-- Menu grants for plan_viewer are in v1254 (pln_ menus). Read-only is enforced by the
-- role-permission model (no can_use on any pln_ item) and the planner write wall (v1251).
-- Idempotent.
-- ============================================================================

INSERT INTO public.roles (role_name, role_display_name, role_description, role_level, is_system_role, is_default_role, is_active, account_id)
SELECT 'plan_viewer', 'Plan Viewer', 'Project Planner: read-only access to project schedules and the Planning Hub.', 1, TRUE, FALSE, TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_name = 'plan_viewer' AND account_id IS NULL);

INSERT INTO public.project_roles (role_name, role_display_name, role_description, is_system_default, is_template, role_level, permissions, is_active)
SELECT 'plan_viewer', 'Plan Viewer', 'Read-only access to the project schedule', TRUE, TRUE, 1,
       '["project.view", "tasks.view", "reports.view"]'::jsonb, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.project_roles WHERE role_name = 'plan_viewer' AND project_id IS NULL);

DO $$ BEGIN RAISE NOTICE 'v1252 applied: plan_viewer system role + project role template'; END $$;
