-- ============================================================================
-- v580: Ensure legacy PM invitation roles exist in public.roles
-- ============================================================================
-- Fixes: "System role 'pm_team_member' is missing" when sending project invitations.
-- Safe to re-run (ON CONFLICT). Run in Supabase SQL Editor if v86 was skipped or roles
-- were deactivated/deleted.
-- Prerequisites: public.roles table
-- PostgreSQL 15+ (Supabase)
-- ============================================================================

INSERT INTO roles (
  role_name,
  role_display_name,
  role_description,
  role_level,
  is_system_role,
  is_default_role,
  can_manage_users,
  can_manage_projects,
  can_manage_system,
  is_active,
  is_deleted
)
VALUES
  (
    'pm_team_member',
    'Team Member',
    'Contributes to project deliverables and executes assigned tasks.',
    3, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE
  ),
  (
    'pm_team_manager',
    'Team Manager',
    'Supervises team members and coordinates team activities.',
    7, TRUE, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE
  ),
  (
    'pm_project_assurance',
    'Project Assurance',
    'Provides independent oversight of project quality and compliance.',
    6, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE
  ),
  (
    'pm_quality_assurance',
    'Quality Assurance (PM)',
    'Quality validation for project team invitations',
    6, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE
  ),
  (
    'pm_change_authority',
    'Change Authority (PM)',
    'Change control role for project team invitations',
    5, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE
  )
ON CONFLICT (role_name) DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  is_system_role = EXCLUDED.is_system_role,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v580_ensure_pm_invitation_roles.sql applied — pm_team_member and related invitation roles are active';
END $$;
