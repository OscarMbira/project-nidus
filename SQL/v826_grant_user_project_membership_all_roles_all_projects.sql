-- =============================================================================
-- v826: Grant every active user proper user_projects membership on every
--       active project, generalising v825 (which only covered the
--       project_manager/oscarmbirablogging@gmail.com account) to all roles
--       (account_owner, pmo_admin, project_manager, pm_team_member, etc.).
-- Context: Risk Register (and any module gated the same way) hides data via
--          RLS from any account with no user_projects row for that project.
--          v825 fixed this for one account; this generalises the fix so every
--          demo/test persona (Team Member, Account Owner, PMO Admin, ...) can
--          see seeded data across all projects, matching their system role.
-- access_level mapping (by role_name; when a user holds several roles, the
-- one with the highest roles.role_level wins):
--   system_admin, account_owner        -> 'owner'
--   pmo_admin, project_board_member,
--   project_sponsor, programme_manager,
--   project_manager, pm_team_manager,
--   pm_project_assurance,
--   pm_quality_assurance,
--   pm_change_authority, executive,
--   portfolio_manager                  -> 'admin'
--   pm_team_member (and any unlisted/future role) -> 'member'
-- Safety: only INSERTs missing rows, or reactivates a soft-deleted row back to
--         the role-based access_level. Never overwrites an existing ACTIVE
--         membership's access_level (so manually-customised per-project access
--         is preserved).
-- Idempotent: safe to re-run.
-- =============================================================================

WITH user_role_priority AS (
  SELECT
    u.id AS user_id,
    r.role_name,
    r.role_display_name,
    ROW_NUMBER() OVER (
      PARTITION BY u.id
      ORDER BY COALESCE(r.role_level, 1) DESC
    ) AS rn
  FROM public.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
    AND COALESCE(ur.is_deleted, false) = false
    AND ur.is_active = true
  JOIN public.roles r ON r.id = ur.role_id
  WHERE COALESCE(u.is_deleted, false) = false
),
target_users AS (
  SELECT
    user_id,
    role_display_name,
    CASE role_name
      WHEN 'system_admin'           THEN 'owner'
      WHEN 'account_owner'         THEN 'owner'
      WHEN 'pmo_admin'             THEN 'admin'
      WHEN 'project_board_member'  THEN 'admin'
      WHEN 'project_sponsor'       THEN 'admin'
      WHEN 'programme_manager'     THEN 'admin'
      WHEN 'project_manager'       THEN 'admin'
      WHEN 'pm_team_manager'       THEN 'admin'
      WHEN 'pm_project_assurance'  THEN 'admin'
      WHEN 'pm_quality_assurance'  THEN 'admin'
      WHEN 'pm_change_authority'   THEN 'admin'
      WHEN 'executive'             THEN 'admin'
      WHEN 'portfolio_manager'     THEN 'admin'
      ELSE 'member' -- pm_team_member and any unlisted/future role
    END AS access_level
  FROM user_role_priority
  WHERE rn = 1
)
INSERT INTO public.user_projects (
  user_id, project_id, project_role, access_level,
  is_active, receive_notifications, is_deleted, created_by
)
SELECT
  tu.user_id, p.id, tu.role_display_name, tu.access_level,
  true, true, false, tu.user_id
FROM target_users tu
CROSS JOIN public.projects p
WHERE COALESCE(p.is_deleted, false) = false
ON CONFLICT (user_id, project_id) DO UPDATE SET
  is_deleted = false,
  is_active = true,
  access_level = EXCLUDED.access_level,
  project_role = EXCLUDED.project_role,
  updated_at = NOW()
WHERE public.user_projects.is_deleted = true;
