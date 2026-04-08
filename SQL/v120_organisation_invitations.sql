-- ============================================================================
-- Organisation Invitations
-- Version: v120
-- Description: Creates organisation-level invitation table for role assignments
-- Author: Development Team
-- Date: 2025-01-27
-- ============================================================================

-- Prerequisites:
-- - v03_user_access_tables.sql (users, roles, user_roles)
-- - v84_accounts_and_extensions.sql (accounts)

-- Purpose:
-- 1. Create organisation_invitations table for inviting users with roles
-- 2. Support Project Sponsor/Executive role assignment workflow

-- ============================================================================
-- TABLE: organisation_invitations
-- Description: Manages user invitations to organisation with specific roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS organisation_invitations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Organisation and User
    organisation_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL if new user

    -- Role Assignment
    role_id UUID NOT NULL REFERENCES roles(id), -- Role to be assigned
    role_name VARCHAR(100) NOT NULL, -- Denormalized for easier querying

    -- Invitation Details
    invited_by_user_id UUID NOT NULL REFERENCES users(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    invitation_message TEXT,

    -- Status Tracking
    invitation_status VARCHAR(50) DEFAULT 'pending' CHECK (invitation_status IN (
        'pending',
        'accepted',
        'declined',
        'expired',
        'cancelled'
    )),

    -- Timestamps
    invitation_sent_at TIMESTAMP DEFAULT NOW(),
    invitation_expires_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    -- Acceptance Details
    accepted_by_user_id UUID REFERENCES users(id), -- User who accepted

    -- Metadata
    invitation_metadata JSONB DEFAULT '{}',

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_org_invitations_expires_after_sent CHECK (
        invitation_expires_at IS NULL OR invitation_expires_at > invitation_sent_at
    )
);

-- Indexes
CREATE INDEX idx_org_invitations_organisation_id ON organisation_invitations(organisation_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_org_invitations_email ON organisation_invitations(invited_email) WHERE is_deleted = FALSE;
CREATE INDEX idx_org_invitations_token ON organisation_invitations(invitation_token) WHERE invitation_status = 'pending';
CREATE INDEX idx_org_invitations_status ON organisation_invitations(invitation_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_org_invitations_invited_by ON organisation_invitations(invited_by_user_id);
CREATE INDEX idx_org_invitations_expires_at ON organisation_invitations(invitation_expires_at) WHERE invitation_status = 'pending';
CREATE INDEX idx_org_invitations_role_name ON organisation_invitations(role_name);

-- Triggers
CREATE TRIGGER trg_org_invitations_before_insert
    BEFORE INSERT ON organisation_invitations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_org_invitations_before_update
    BEFORE UPDATE ON organisation_invitations
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE organisation_invitations IS 'Manages user invitations to organisation with specific role assignments';
COMMENT ON COLUMN organisation_invitations.invited_email IS 'Email address of invited user';
COMMENT ON COLUMN organisation_invitations.invited_user_id IS 'User ID if user exists, NULL for new users';
COMMENT ON COLUMN organisation_invitations.role_id IS 'Role to be assigned when invitation is accepted';
COMMENT ON COLUMN organisation_invitations.role_name IS 'Denormalized role name for easier querying';
COMMENT ON COLUMN organisation_invitations.invitation_token IS 'Unique token for invitation acceptance link';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('organisation_invitations', 'Organisation-level user invitation management with role assignments', false, true, 'organisation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- FUNCTION: Generate organisation invitation token
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_org_invitation_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Validate organisation invitation token
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_org_invitation_token(p_token VARCHAR(255))
RETURNS TABLE (
    is_valid BOOLEAN,
    invitation_id UUID,
    organisation_id UUID,
    invited_email VARCHAR(255),
    role_id UUID,
    role_name VARCHAR(100),
    invitation_status VARCHAR(50),
    expires_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN oi.invitation_status = 'pending' 
                AND (oi.invitation_expires_at IS NULL OR oi.invitation_expires_at > NOW())
            THEN TRUE
            ELSE FALSE
        END as is_valid,
        oi.id,
        oi.organisation_id,
        oi.invited_email,
        oi.role_id,
        oi.role_name,
        oi.invitation_status,
        oi.invitation_expires_at
    FROM organisation_invitations oi
    WHERE oi.invitation_token = p_token
        AND oi.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;

