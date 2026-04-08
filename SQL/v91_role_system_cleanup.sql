-- ============================================================================
-- Registration Flow Revamp - Role System Cleanup
-- Version: v91
-- Date: 2025-12-09
-- Purpose: Clean up role tables to match project-based role architecture
-- ============================================================================

-- Prerequisites:
-- - v03_user_access_tables.sql (users, roles, user_roles)
-- - v84_accounts_and_extensions.sql (accounts)
-- - v85_project_invitations_seats.sql (project_seat_allocations)
-- - v86_default_project_roles_seed.sql (permissions)

-- Purpose:
-- 1. Clean public.roles to keep only system roles (account_owner)
-- 2. Ensure project_roles table exists with proper structure
-- 3. Seed project role templates (organization hierarchy)
-- 4. Remove system_admin and billing_manager (separate admin app)
-- 5. Add helpful comments explaining role system

-- ============================================================================
-- STEP 1: Backup existing data (just in case)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles_backup AS
SELECT * FROM roles WHERE 1=0; -- Create empty backup table structure

-- Only backup if backup is empty (avoid re-backing up)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles_backup LIMIT 1) THEN
        INSERT INTO roles_backup SELECT * FROM roles;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_roles_backup AS
SELECT * FROM user_roles WHERE 1=0; -- Create empty backup table structure

-- Only backup if backup is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles_backup LIMIT 1) THEN
        INSERT INTO user_roles_backup SELECT * FROM user_roles;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create project_roles table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_roles (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project Reference (NULL for templates, specific UUID for custom roles)
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Role Information
    role_name VARCHAR(100) NOT NULL,
    role_display_name VARCHAR(200) NOT NULL,
    role_description TEXT,

    -- Role Type
    is_system_default BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT TRUE, -- TRUE for templates, FALSE for custom
    role_level INTEGER DEFAULT 1,

    -- Permissions (JSONB array of permission codes)
    permissions JSONB DEFAULT '[]'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for project_roles
CREATE INDEX IF NOT EXISTS idx_project_roles_project_id ON project_roles(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_roles_active ON project_roles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_roles_level ON project_roles(role_level);

-- Partial unique indexes (replaces WHERE clauses in UNIQUE constraints)
-- Templates must have unique role_name
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_roles_template 
    ON project_roles(role_name) 
    WHERE is_template = TRUE AND project_id IS NULL;

-- Custom roles must have unique role_name per project
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_roles_custom 
    ON project_roles(project_id, role_name) 
    WHERE is_template = FALSE AND project_id IS NOT NULL;

-- Comments
COMMENT ON TABLE project_roles IS 'Project-specific role templates (organization hierarchy) and custom roles. Templates (is_template=TRUE) are pre-defined. Custom roles can be created dynamically per project. NEVER hardcode role IDs - always lookup by role_name.';
COMMENT ON COLUMN project_roles.project_id IS 'NULL for templates, specific project UUID for custom roles';
COMMENT ON COLUMN project_roles.is_template IS 'TRUE for pre-defined templates, FALSE for custom project-specific roles';
COMMENT ON COLUMN project_roles.permissions IS 'JSONB array of permission codes (e.g., ["project.view", "tasks.edit"])';

-- ============================================================================
-- STEP 3: Create project_memberships table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_memberships (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project and User
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Project Role (references project_roles, not roles)
    project_role_id UUID NOT NULL REFERENCES project_roles(id) ON DELETE RESTRICT,

    -- Invitation Details
    invited_by_user_id UUID REFERENCES users(id),
    invitation_status VARCHAR(50) DEFAULT 'accepted' CHECK (invitation_status IN (
        'pending', 'accepted', 'expired', 'declined', 'cancelled'
    )),
    invitation_token VARCHAR(255) UNIQUE,
    invitation_sent_at TIMESTAMP,
    invitation_expires_at TIMESTAMP,
    accepted_at TIMESTAMP DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for project_memberships
CREATE INDEX IF NOT EXISTS idx_project_memberships_project_id ON project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_user_id ON project_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_role_id ON project_memberships(project_role_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_active ON project_memberships(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_memberships_status ON project_memberships(invitation_status);
CREATE INDEX IF NOT EXISTS idx_project_memberships_token ON project_memberships(invitation_token) WHERE invitation_token IS NOT NULL;

-- Partial unique index: One active membership per user per project
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_memberships_user_project 
    ON project_memberships(project_id, user_id) 
    WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE project_memberships IS 'Assigns project roles to users per project (e.g., Project Manager in Project A, Team Member in Project B)';
COMMENT ON COLUMN project_memberships.project_role_id IS 'References project_roles.id (project-specific role, not system role)';

-- ============================================================================
-- STEP 4: Clean public.roles (Keep only system roles)
-- ============================================================================

-- Delete non-system roles (these should be in project_roles)
-- Keep only roles that are system roles AND in the allowed list
DELETE FROM roles
WHERE is_system_role = FALSE
   OR (is_system_role = TRUE AND role_name NOT IN ('system_admin', 'account_owner', 'billing_manager'));

-- Ensure system role exists (ONLY account_owner)
INSERT INTO roles (
  role_name, role_display_name, role_description,
  role_level, is_system_role, is_default_role, is_active
) VALUES
  ('account_owner', 'Account Owner', 'Account and organization owner',
   90, TRUE, FALSE, TRUE)
ON CONFLICT (role_name) DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  is_system_role = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Remove system_admin and billing_manager (separate admin application)
DELETE FROM roles WHERE role_name IN ('system_admin', 'billing_manager');

-- ============================================================================
-- STEP 5: Seed project_roles table with templates
-- ============================================================================

-- Insert project role templates (Organization Hierarchy)
-- Note: These are templates. System supports dynamic creation of additional roles.
INSERT INTO project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active
) VALUES
  ('project_board_member', 'Project Board Member', 'Executive oversight and governance',
   TRUE, TRUE, 12,
   '["project.view", "project.edit", "reports.view", "reports.export", "governance.manage"]'::jsonb,
   TRUE),

  ('project_sponsor', 'Project Sponsor/Executive', 'Project sponsorship and strategic direction',
   TRUE, TRUE, 11,
   '["project.view", "project.edit", "reports.view", "strategic.approve", "budget.approve"]'::jsonb,
   TRUE),

  ('programme_manager', 'Programme Manager', 'Multi-project coordination',
   TRUE, TRUE, 10,
   '["project.view", "project.edit", "project.manage_users", "reports.view", "programme.manage"]'::jsonb,
   TRUE),

  ('project_manager', 'Project Manager', 'Day-to-day project management',
   TRUE, TRUE, 9,
   '["project.view", "project.edit", "project.manage_users", "tasks.create", "tasks.edit", "risks.manage", "budget.manage"]'::jsonb,
   TRUE),

  ('team_manager', 'Team Manager', 'Team supervision and coordination',
   TRUE, TRUE, 8,
   '["project.view", "tasks.view", "tasks.edit", "tasks.assign", "team.view", "team.manage"]'::jsonb,
   TRUE),

  ('project_assurance', 'Project Assurance', 'Quality and compliance oversight',
   TRUE, TRUE, 7,
   '["project.view", "tasks.view", "risks.view", "quality.manage", "compliance.check", "reports.view", "audit.conduct"]'::jsonb,
   TRUE),

  ('quality_assurance', 'Quality Assurance', 'Quality validation and testing',
   TRUE, TRUE, 6,
   '["project.view", "tasks.view", "quality.test", "quality.validate", "defects.manage", "reports.view"]'::jsonb,
   TRUE),

  ('change_authority', 'Change Authority', 'Change control and approval',
   TRUE, TRUE, 5,
   '["project.view", "changes.view", "changes.approve", "changes.reject", "impact.assess", "reports.view"]'::jsonb,
   TRUE),

  ('team_member', 'Team Member', 'Task execution and delivery',
   TRUE, TRUE, 4,
   '["project.view", "tasks.view", "tasks.update", "documents.view", "documents.upload"]'::jsonb,
   TRUE)
ON CONFLICT (role_name) WHERE is_template = TRUE AND project_id IS NULL DO UPDATE
SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- ============================================================================
-- STEP 6: Register tables in database_tables registry
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_roles', 'Project-specific roles with custom permissions', FALSE, TRUE),
  ('project_memberships', 'User-to-project role assignments', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

-- ============================================================================
-- STEP 7: Add helpful comments
-- ============================================================================

COMMENT ON TABLE roles IS 'System-wide role: ONLY account_owner (system_admin and billing_manager in separate admin app)';
COMMENT ON TABLE user_roles IS 'Assigns system role to users (Account Owner only)';
COMMENT ON TABLE project_memberships IS 'Assigns project roles to users per project (e.g., Project Manager in Project A, Team Member in Project B)';
COMMENT ON TABLE platform_subscriptions IS 'Project subscriptions (ONE subscription PER project, not per account)';

-- Add comment for subscription_id column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'subscription_id'
    ) THEN
        COMMENT ON COLUMN projects.subscription_id IS 'Each project has its own subscription with seat limits';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Verification Queries (for manual verification)
-- ============================================================================

-- Verify system roles (should return exactly 1 row)
-- SELECT role_name, role_display_name, is_system_role
-- FROM roles
-- WHERE is_active = TRUE
-- ORDER BY role_level DESC;
-- Expected: account_owner

-- Verify project role templates (should return 9 rows)
-- SELECT role_name, role_display_name, is_template, role_level
-- FROM project_roles
-- WHERE is_template = TRUE
--   AND is_active = TRUE
-- ORDER BY role_level DESC;
-- Expected: project_board_member, project_sponsor, programme_manager,
--           project_manager, team_manager, project_assurance,
--           quality_assurance, change_authority, team_member

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

