-- ============================================================================
-- Project Invitations & Seat Management
-- Version: v85
-- Description: Creates invitation and seat management tables for PM Platform
-- Author: Development Team
-- Date: 2025-11-27
-- ============================================================================

-- Prerequisites:
-- - v03_user_access_tables.sql (users, roles, user_roles)
-- - v04_project_core_tables.sql (projects)
-- - v84_accounts_and_extensions.sql (accounts)

-- Purpose:
-- 1. Create project_invitations table (invitation workflow)
-- 2. Create project_seat_allocations table (seat tracking per project)
-- 3. Create extra_seat_purchases table (additional seat purchase history)
-- 4. Create functions for seat management and invitation handling
-- 5. Create triggers for automatic seat calculation

-- Note: Uses existing user_roles table for actual role assignments
-- project_invitations is for pending invitations only

-- ============================================================================
-- TABLE 1: project_invitations
-- Description: Manages user invitations to projects (PM Platform)
-- Category: project
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_invitations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project and User
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL if new user

    -- Role Assignment
    role_id UUID NOT NULL REFERENCES roles(id), -- Role to be assigned

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
    accepted_by_user_id UUID REFERENCES users(id), -- User who accepted (might differ from invited_user_id if email already exists)

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
    CONSTRAINT chk_invitations_expires_after_sent CHECK (
        invitation_expires_at IS NULL OR invitation_expires_at > invitation_sent_at
    )
);

-- Indexes
CREATE INDEX idx_project_invitations_project_id ON project_invitations(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_invitations_email ON project_invitations(invited_email) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_invitations_token ON project_invitations(invitation_token) WHERE invitation_status = 'pending';
CREATE INDEX idx_project_invitations_status ON project_invitations(invitation_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_invitations_invited_by ON project_invitations(invited_by_user_id);
CREATE INDEX idx_project_invitations_expires_at ON project_invitations(invitation_expires_at) WHERE invitation_status = 'pending';

-- Triggers
CREATE TRIGGER trg_project_invitations_before_insert
    BEFORE INSERT ON project_invitations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_project_invitations_before_update
    BEFORE UPDATE ON project_invitations
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_invitations IS 'PM Platform: Manages pending user invitations to projects';
COMMENT ON COLUMN project_invitations.invited_email IS 'Email address of invited user';
COMMENT ON COLUMN project_invitations.invited_user_id IS 'User ID if user exists, NULL for new users';
COMMENT ON COLUMN project_invitations.role_id IS 'Role to be assigned when invitation is accepted';
COMMENT ON COLUMN project_invitations.invitation_token IS 'Unique token for invitation acceptance link';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_invitations', 'PM Platform: User invitation management for projects', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- TABLE 2: project_seat_allocations
-- Description: Tracks seat usage and limits per project (PM Platform)
-- Category: project
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_seat_allocations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project Reference (one allocation per project)
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Account and Subscription
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES pm_subscriptions(id),

    -- Seat Limits
    included_seats INTEGER DEFAULT 30,
    extra_seats_purchased INTEGER DEFAULT 0,
    total_seats INTEGER GENERATED ALWAYS AS (included_seats + extra_seats_purchased) STORED,

    -- Current Usage
    current_user_count INTEGER DEFAULT 0,
    available_seats INTEGER GENERATED ALWAYS AS (included_seats + extra_seats_purchased - current_user_count) STORED,

    -- Tracking
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    last_warning_sent_at TIMESTAMP, -- When 80% warning was sent

    -- Metadata
    allocation_metadata JSONB DEFAULT '{}',

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_seat_allocation_positive CHECK (
        included_seats >= 0 AND extra_seats_purchased >= 0 AND current_user_count >= 0
    )
);

-- Indexes
CREATE UNIQUE INDEX idx_seat_allocations_project_unique ON project_seat_allocations(project_id);
CREATE INDEX idx_seat_allocations_account_id ON project_seat_allocations(account_id);
CREATE INDEX idx_seat_allocations_subscription_id ON project_seat_allocations(subscription_id);
CREATE INDEX idx_seat_allocations_usage ON project_seat_allocations(current_user_count, total_seats);

-- Comments
COMMENT ON TABLE project_seat_allocations IS 'PM Platform: Tracks seat usage and limits per project';
COMMENT ON COLUMN project_seat_allocations.included_seats IS 'Base seats included in subscription (default 30)';
COMMENT ON COLUMN project_seat_allocations.extra_seats_purchased IS 'Additional seats purchased beyond base';
COMMENT ON COLUMN project_seat_allocations.total_seats IS 'Computed: included + extra';
COMMENT ON COLUMN project_seat_allocations.current_user_count IS 'Active members in project (from user_roles)';
COMMENT ON COLUMN project_seat_allocations.available_seats IS 'Computed: total - current';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_seat_allocations', 'PM Platform: Seat usage tracking per project', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- TABLE 3: extra_seat_purchases
-- Description: Tracks additional seat purchases (PM Platform)
-- Category: billing
-- ============================================================================

CREATE TABLE IF NOT EXISTS extra_seat_purchases (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project and Account
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES pm_subscriptions(id),

    -- Purchase Details
    seats_purchased INTEGER NOT NULL CHECK (seats_purchased > 0),
    price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Payment Information
    payment_provider VARCHAR(50) DEFAULT 'paynow',
    payment_reference VARCHAR(255),
    payment_transaction_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'refunded',
        'cancelled'
    )),

    -- Dates
    payment_initiated_at TIMESTAMP DEFAULT NOW(),
    payment_completed_at TIMESTAMP,
    payment_failed_at TIMESTAMP,

    -- Purchaser
    purchased_by_user_id UUID NOT NULL REFERENCES users(id),

    -- Refund Info
    refunded_at TIMESTAMP,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,

    -- Metadata
    purchase_metadata JSONB DEFAULT '{}',
    payment_response JSONB DEFAULT '{}',

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_extra_seat_purchases_project_id ON extra_seat_purchases(project_id);
CREATE INDEX idx_extra_seat_purchases_account_id ON extra_seat_purchases(account_id);
CREATE INDEX idx_extra_seat_purchases_status ON extra_seat_purchases(payment_status);
CREATE INDEX idx_extra_seat_purchases_purchaser ON extra_seat_purchases(purchased_by_user_id);
CREATE INDEX idx_extra_seat_purchases_reference ON extra_seat_purchases(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX idx_extra_seat_purchases_created_at ON extra_seat_purchases(created_at DESC);

-- Comments
COMMENT ON TABLE extra_seat_purchases IS 'PM Platform: Additional seat purchase history';
COMMENT ON COLUMN extra_seat_purchases.seats_purchased IS 'Number of additional seats purchased in this transaction';
COMMENT ON COLUMN extra_seat_purchases.price_per_seat IS 'Price per seat at time of purchase';
COMMENT ON COLUMN extra_seat_purchases.payment_provider IS 'Payment provider (paynow, stripe, etc.)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('extra_seat_purchases', 'PM Platform: Additional seat purchase transactions', false, true, 'billing')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- FUNCTION: Calculate project seat usage
-- Description: Counts active users in a project and updates allocation
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_project_seat_usage(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_user_count INTEGER;
BEGIN
    -- Count active users with project roles
    SELECT COUNT(DISTINCT user_id)
    INTO v_user_count
    FROM user_roles
    WHERE project_id = p_project_id
    AND is_deleted = FALSE
    AND is_active = TRUE;

    -- Update seat allocation if exists
    UPDATE project_seat_allocations
    SET current_user_count = v_user_count,
        last_calculated_at = NOW(),
        updated_at = NOW()
    WHERE project_id = p_project_id;

    RETURN v_user_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_project_seat_usage(UUID) IS 'Calculates and updates current user count for a project';

-- ============================================================================
-- FUNCTION: Check seat availability
-- Description: Checks if project has available seats for new user
-- ============================================================================

CREATE OR REPLACE FUNCTION check_seat_availability(p_project_id UUID)
RETURNS TABLE (
    has_available_seats BOOLEAN,
    current_count INTEGER,
    total_seats INTEGER,
    available_seats INTEGER,
    usage_percentage DECIMAL
) AS $$
BEGIN
    -- Refresh seat count first
    PERFORM calculate_project_seat_usage(p_project_id);

    RETURN QUERY
    SELECT
        (psa.available_seats > 0) as has_available_seats,
        psa.current_user_count as current_count,
        psa.total_seats,
        psa.available_seats,
        CASE
            WHEN psa.total_seats > 0 THEN
                ROUND((psa.current_user_count::DECIMAL / psa.total_seats * 100), 2)
            ELSE 0
        END as usage_percentage
    FROM project_seat_allocations psa
    WHERE psa.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_seat_availability(UUID) IS 'Checks if project has available seats and returns usage stats';

-- ============================================================================
-- FUNCTION: Create/Initialize seat allocation for project
-- Description: Creates seat allocation record when project is created
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_project_seat_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_base_seats INTEGER;
    v_subscription_id UUID;
BEGIN
    -- Only initialize if account_id is set
    IF NEW.account_id IS NOT NULL THEN
        -- Get base seats from account subscription
        SELECT id, base_users_per_project
        INTO v_subscription_id, v_base_seats
        FROM pm_subscriptions
        WHERE account_id = NEW.account_id
        AND status IN ('active', 'trialing')
        ORDER BY created_at DESC
        LIMIT 1;

        -- Default to 30 if no subscription found
        v_base_seats := COALESCE(v_base_seats, 30);

        -- Create seat allocation record
        INSERT INTO project_seat_allocations (
            project_id,
            account_id,
            subscription_id,
            included_seats,
            extra_seats_purchased,
            current_user_count
        )
        VALUES (
            NEW.id,
            NEW.account_id,
            v_subscription_id,
            v_base_seats,
            0,
            0
        )
        ON CONFLICT (project_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_init_seat_allocation ON projects;
CREATE TRIGGER trg_projects_init_seat_allocation
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION initialize_project_seat_allocation();

COMMENT ON FUNCTION initialize_project_seat_allocation() IS 'Auto-creates seat allocation when project is created';

-- ============================================================================
-- FUNCTION: Update seat count when user role changes
-- Description: Recalculates seat usage when user_roles changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_seat_count_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for project-specific roles
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.project_id IS NOT NULL THEN
        PERFORM calculate_project_seat_usage(NEW.project_id);
    ELSIF TG_OP = 'DELETE' AND OLD.project_id IS NOT NULL THEN
        PERFORM calculate_project_seat_usage(OLD.project_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_roles_update_seat_count ON user_roles;
CREATE TRIGGER trg_user_roles_update_seat_count
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_seat_count_on_role_change();

COMMENT ON FUNCTION update_seat_count_on_role_change() IS 'Auto-updates seat count when user roles change';

-- ============================================================================
-- FUNCTION: Process extra seat purchase
-- Description: Updates seat allocation after successful purchase
-- ============================================================================

CREATE OR REPLACE FUNCTION process_extra_seat_purchase(
    p_purchase_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
    v_seats_purchased INTEGER;
    v_payment_status VARCHAR;
BEGIN
    -- Get purchase details
    SELECT project_id, seats_purchased, payment_status
    INTO v_project_id, v_seats_purchased, v_payment_status
    FROM extra_seat_purchases
    WHERE id = p_purchase_id;

    -- Only process if payment completed
    IF v_payment_status = 'completed' THEN
        -- Update seat allocation
        UPDATE project_seat_allocations
        SET extra_seats_purchased = extra_seats_purchased + v_seats_purchased,
            updated_at = NOW()
        WHERE project_id = v_project_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_extra_seat_purchase(UUID) IS 'Updates seat allocation after successful extra seat purchase';

-- ============================================================================
-- FUNCTION: Generate invitation token
-- Description: Generates secure random token for invitations
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR AS $$
DECLARE
    v_token VARCHAR;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random token (UUID + random string)
        v_token := REPLACE(uuid_generate_v4()::TEXT, '-', '') || SUBSTRING(MD5(RANDOM()::TEXT), 1, 16);

        -- Check if token already exists
        SELECT EXISTS(
            SELECT 1 FROM project_invitations
            WHERE invitation_token = v_token
        ) INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_token;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invitation_token() IS 'Generates unique invitation token';

-- ============================================================================
-- TRIGGER: Set invitation expiry and token
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_invitations_set_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Set token if not provided
    IF NEW.invitation_token IS NULL OR NEW.invitation_token = '' THEN
        NEW.invitation_token := generate_invitation_token();
    END IF;

    -- Set expiry if not provided (7 days from now)
    IF NEW.invitation_expires_at IS NULL THEN
        NEW.invitation_expires_at := NOW() + INTERVAL '7 days';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invitations_set_defaults_before_insert ON project_invitations;
CREATE TRIGGER trg_invitations_set_defaults_before_insert
    BEFORE INSERT ON project_invitations
    FOR EACH ROW
    EXECUTE FUNCTION trg_invitations_set_defaults();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_seat_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_seat_purchases ENABLE ROW LEVEL SECURITY;

-- Invitations: Users can see invitations they sent or received
CREATE POLICY policy_invitations_select
    ON project_invitations FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = invited_by_user_id
        )
        OR auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = invited_user_id
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND email = invited_email
        )
    );

-- Invitations: Project members with permission can create invitations
CREATE POLICY policy_invitations_insert
    ON project_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            INNER JOIN users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
            AND ur.project_id = project_invitations.project_id
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- Seat allocations: Project members can view
CREATE POLICY policy_seat_allocations_select
    ON project_seat_allocations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            INNER JOIN users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
            AND ur.project_id = project_seat_allocations.project_id
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- Seat purchases: Account members can view
CREATE POLICY policy_seat_purchases_select
    ON extra_seat_purchases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM accounts a
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE u.auth_user_id = auth.uid()
            AND a.id = extra_seat_purchases.account_id
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            INNER JOIN users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
            AND ur.project_id = extra_seat_purchases.project_id
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    invitations_exists BOOLEAN;
    allocations_exists BOOLEAN;
    purchases_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'project_invitations'
    ) INTO invitations_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'project_seat_allocations'
    ) INTO allocations_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'extra_seat_purchases'
    ) INTO purchases_exists;

    IF invitations_exists AND allocations_exists AND purchases_exists THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ v85 Migration Successful';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Created Tables:';
        RAISE NOTICE '  - project_invitations';
        RAISE NOTICE '  - project_seat_allocations';
        RAISE NOTICE '  - extra_seat_purchases';
        RAISE NOTICE 'Functions:';
        RAISE NOTICE '  - calculate_project_seat_usage()';
        RAISE NOTICE '  - check_seat_availability()';
        RAISE NOTICE '  - initialize_project_seat_allocation()';
        RAISE NOTICE '  - update_seat_count_on_role_change()';
        RAISE NOTICE '  - process_extra_seat_purchase()';
        RAISE NOTICE '  - generate_invitation_token()';
        RAISE NOTICE 'Triggers:';
        RAISE NOTICE '  - Auto-init seat allocation on project creation';
        RAISE NOTICE '  - Auto-update seat count on role changes';
        RAISE NOTICE '  - Auto-generate invitation tokens';
        RAISE NOTICE 'RLS: ✓ Enabled on all tables';
        RAISE NOTICE '========================================';
    ELSE
        RAISE EXCEPTION 'Migration verification failed';
    END IF;
END $$;
