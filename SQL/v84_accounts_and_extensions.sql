-- ============================================================================
-- Multi-Tenant Accounts & Table Extensions
-- Version: v84
-- Description: Creates accounts table and extends projects/platform_subscriptions for multi-tenancy
-- Author: Development Team
-- Date: 2025-11-27
-- ============================================================================

-- Prerequisites:
-- - v03_user_access_tables.sql (users, roles, permissions, user_roles)
-- - v04_project_core_tables.sql (projects)
-- - v82_pm_subscriptions.sql (platform_subscriptions - renamed in v90)

-- Purpose:
-- 1. Create accounts table (organization/company entity for PM Platform)
-- 2. Extend projects table with account_id and project_manager_user_id
-- 3. Extend platform_subscriptions table with account linking and seat limits
-- 4. Create necessary indexes, triggers, and RLS policies

-- Note: Simulator platform does NOT use accounts - it's individual-based
-- This is PM Platform specific (public schema)

-- ============================================================================
-- TABLE 1: accounts
-- Description: Organization/company entity owned by Programme/Project Manager
-- Category: account
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner (Programme/Project Manager)
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Account Information
    account_name VARCHAR(200) NOT NULL,
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_display_name VARCHAR(200),

    -- Business Information
    company_name VARCHAR(200),
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(100),

    -- Contact Information
    billing_email VARCHAR(255),
    primary_phone VARCHAR(20),
    primary_email VARCHAR(255),

    -- Address Information
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_code VARCHAR(3),

    -- Account Type
    account_type VARCHAR(50) DEFAULT 'individual' CHECK (account_type IN (
        'individual',
        'company',
        'enterprise',
        'educational',
        'non_profit'
    )),

    -- Account Settings
    default_timezone VARCHAR(100) DEFAULT 'UTC',
    default_currency VARCHAR(3) DEFAULT 'USD',
    default_language VARCHAR(10) DEFAULT 'en',

    -- Branding (optional)
    logo_url TEXT,
    brand_color VARCHAR(7), -- Hex color code

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,

    -- Suspension (for non-payment or violations)
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMP,
    suspended_reason TEXT,
    suspended_by UUID REFERENCES users(id),

    -- Metadata
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes for accounts
CREATE UNIQUE INDEX idx_accounts_code_unique ON accounts(account_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_accounts_owner_user_id ON accounts(owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_accounts_is_active ON accounts(is_active) WHERE is_deleted = FALSE;
CREATE INDEX idx_accounts_account_type ON accounts(account_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_accounts_country_code ON accounts(country_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_accounts_created_at ON accounts(created_at DESC);
CREATE INDEX idx_accounts_name_search ON accounts USING gin(to_tsvector('english', account_name));

-- Triggers for accounts
CREATE TRIGGER trg_accounts_before_insert
    BEFORE INSERT ON accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_accounts_before_update
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE accounts IS 'PM Platform: Organization/company accounts owned by Programme/Project Managers';
COMMENT ON COLUMN accounts.owner_user_id IS 'Programme/Project Manager who owns this account';
COMMENT ON COLUMN accounts.account_code IS 'Short unique identifier (e.g., ACME001, TECH042)';
COMMENT ON COLUMN accounts.account_type IS 'Type: individual, company, enterprise, educational, non_profit';
COMMENT ON COLUMN accounts.is_suspended IS 'Account suspended for non-payment or policy violations';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('accounts', 'PM Platform: Organization/company accounts for multi-tenant project management', false, true, 'account')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- EXTEND projects table
-- Description: Add account_id and project_manager_user_id
-- ============================================================================

-- Add account_id column to projects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE projects ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;
        CREATE INDEX idx_projects_account_id ON projects(account_id) WHERE is_deleted = FALSE;
        COMMENT ON COLUMN projects.account_id IS 'Account that owns this project (PM Platform multi-tenancy)';
        RAISE NOTICE 'Added projects.account_id column';
    END IF;
END $$;

-- Add project_manager_user_id column to projects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'project_manager_user_id'
    ) THEN
        ALTER TABLE projects ADD COLUMN project_manager_user_id UUID REFERENCES users(id);
        CREATE INDEX idx_projects_manager_id ON projects(project_manager_user_id) WHERE is_deleted = FALSE;
        COMMENT ON COLUMN projects.project_manager_user_id IS 'Primary Project Manager assigned to this project';
        RAISE NOTICE 'Added projects.project_manager_user_id column';
    END IF;
END $$;

-- ============================================================================
-- EXTEND platform_subscriptions table
-- Description: Add account linking and per-project seat configuration
-- Note: Table was renamed from pm_subscriptions to platform_subscriptions in v90
-- ============================================================================

-- Add account_id column to platform_subscriptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'platform_subscriptions' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE platform_subscriptions ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;
        CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_account_id ON platform_subscriptions(account_id) WHERE account_id IS NOT NULL;
        COMMENT ON COLUMN platform_subscriptions.account_id IS 'Account this subscription belongs to';
        RAISE NOTICE 'Added platform_subscriptions.account_id column';
    END IF;
END $$;

-- Add base_users_per_project column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'platform_subscriptions' AND column_name = 'base_users_per_project'
    ) THEN
        ALTER TABLE platform_subscriptions ADD COLUMN base_users_per_project INTEGER DEFAULT 30;
        COMMENT ON COLUMN platform_subscriptions.base_users_per_project IS 'Base number of users included per project (default 30)';
        RAISE NOTICE 'Added platform_subscriptions.base_users_per_project column';
    END IF;
END $$;

-- Add extra_user_price column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'platform_subscriptions' AND column_name = 'extra_user_price'
    ) THEN
        ALTER TABLE platform_subscriptions ADD COLUMN extra_user_price DECIMAL(10,2);
        COMMENT ON COLUMN platform_subscriptions.extra_user_price IS 'Price per additional user seat beyond base limit';
        RAISE NOTICE 'Added platform_subscriptions.extra_user_price column';
    END IF;
END $$;

-- Add extra_user_discount_rate column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'platform_subscriptions' AND column_name = 'extra_user_discount_rate'
    ) THEN
        ALTER TABLE platform_subscriptions ADD COLUMN extra_user_discount_rate DECIMAL(5,4) DEFAULT 0.7000;
        COMMENT ON COLUMN platform_subscriptions.extra_user_discount_rate IS 'Discount rate for extra users (0.7000 = 70% discount)';
        RAISE NOTICE 'Added platform_subscriptions.extra_user_discount_rate column';
    END IF;
END $$;

-- ============================================================================
-- FUNCTION: Auto-generate account code
-- Description: Generates unique account code from account name
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_account_code(p_account_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_base_code VARCHAR;
    v_final_code VARCHAR;
    v_counter INTEGER := 1;
    v_exists BOOLEAN;
BEGIN
    -- Generate base code from account name (first 3-4 chars, uppercase, alphanumeric only)
    v_base_code := UPPER(REGEXP_REPLACE(SUBSTRING(p_account_name, 1, 4), '[^A-Z0-9]', '', 'g'));

    -- If base is too short, pad with hash of account name
    IF LENGTH(v_base_code) < 3 THEN
        v_base_code := v_base_code || UPPER(SUBSTRING(MD5(p_account_name), 1, 3));
    END IF;

    -- Ensure minimum length of 3
    IF LENGTH(v_base_code) < 3 THEN
        v_base_code := 'ACC';
    END IF;

    -- Try to find unique code
    v_final_code := v_base_code || LPAD(v_counter::TEXT, 3, '0');

    LOOP
        SELECT EXISTS(
            SELECT 1 FROM accounts
            WHERE account_code = v_final_code AND is_deleted = FALSE
        ) INTO v_exists;

        EXIT WHEN NOT v_exists;

        v_counter := v_counter + 1;
        v_final_code := v_base_code || LPAD(v_counter::TEXT, 3, '0');

        -- Safety limit
        IF v_counter > 999 THEN
            v_final_code := v_base_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));
            EXIT;
        END IF;
    END LOOP;

    RETURN v_final_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_account_code(VARCHAR) IS 'Generates unique account code from account name (e.g., "Acme Corp" → "ACME001")';

-- ============================================================================
-- TRIGGER: Auto-set account code if not provided
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_accounts_set_code()
RETURNS TRIGGER AS $$
BEGIN
    -- If account_code is not provided or empty, generate one
    IF NEW.account_code IS NULL OR NEW.account_code = '' THEN
        NEW.account_code := generate_account_code(NEW.account_name);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_set_code_before_insert ON accounts;
CREATE TRIGGER trg_accounts_set_code_before_insert
    BEFORE INSERT ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION trg_accounts_set_code();

COMMENT ON FUNCTION trg_accounts_set_code() IS 'Auto-generates account_code if not provided during insert';

-- ============================================================================
-- FUNCTION: Get account subscription details
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_subscription(p_account_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_type VARCHAR,
    status VARCHAR,
    is_active BOOLEAN,
    base_users_per_project INTEGER,
    extra_user_price DECIMAL,
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.id as subscription_id,
        ps.plan_type,
        ps.status,
        (ps.status IN ('active', 'trialing') OR ps.is_in_grace_period = true) as is_active,
        ps.base_users_per_project,
        ps.extra_user_price,
        ps.started_at,
        ps.expires_at
    FROM platform_subscriptions ps
    WHERE ps.account_id = p_account_id
    AND (ps.is_deleted IS NULL OR ps.is_deleted = FALSE)
    ORDER BY ps.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_account_subscription(UUID) IS 'Returns active subscription details for an account';

-- ============================================================================
-- FUNCTION: Get account projects with counts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_projects(p_account_id UUID)
RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR,
    project_code VARCHAR,
    project_manager_name VARCHAR,
    status_name VARCHAR,
    member_count BIGINT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as project_id,
        p.project_name,
        p.project_code,
        u.full_name as project_manager_name,
        ps.status_name,
        (
            SELECT COUNT(DISTINCT ur.user_id)
            FROM user_roles ur
            WHERE ur.project_id = p.id
            AND ur.is_deleted = FALSE
            AND ur.is_active = TRUE
        ) as member_count,
        p.created_at
    FROM projects p
    LEFT JOIN users u ON u.id = p.project_manager_user_id
    LEFT JOIN project_statuses ps ON ps.id = p.status_id
    WHERE p.account_id = p_account_id
    AND p.is_deleted = FALSE
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_account_projects(UUID) IS 'Returns all projects for an account with member counts';

-- ============================================================================
-- RLS POLICIES for accounts table
-- ============================================================================

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view accounts they own
CREATE POLICY policy_accounts_select_owner
    ON accounts FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = accounts.owner_user_id
        )
    );

-- Policy 2: Users can view accounts they are members of (via projects)
CREATE POLICY policy_accounts_select_member
    ON accounts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN user_roles ur ON ur.project_id = p.id
            INNER JOIN users u ON u.id = ur.user_id
            WHERE p.account_id = accounts.id
            AND p.is_deleted = FALSE
            AND ur.is_deleted = FALSE
            AND ur.is_active = TRUE
            AND u.auth_user_id = auth.uid()
        )
    );

-- Policy 3: Only account owners can update their accounts
CREATE POLICY policy_accounts_update_owner
    ON accounts FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = accounts.owner_user_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = accounts.owner_user_id
        )
    );

-- Policy 4: Authenticated users can create accounts (for signup)
CREATE POLICY policy_accounts_insert
    ON accounts FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = owner_user_id
        )
    );

-- Policy 5: System admins can manage all accounts
CREATE POLICY policy_accounts_admin_all
    ON accounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name = 'System Admin'
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND ur.project_id IS NULL  -- Global role
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    accounts_exists BOOLEAN;
    account_id_exists BOOLEAN;
    pm_account_id_exists BOOLEAN;
    pm_seats_exists BOOLEAN;
BEGIN
    -- Check accounts table
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'accounts'
    ) INTO accounts_exists;

    -- Check projects.account_id
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'account_id'
    ) INTO account_id_exists;

    -- Check platform_subscriptions.account_id
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'platform_subscriptions' AND column_name = 'account_id'
    ) INTO pm_account_id_exists;

    -- Check platform_subscriptions.base_users_per_project
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'platform_subscriptions' AND column_name = 'base_users_per_project'
    ) INTO pm_seats_exists;

    IF accounts_exists AND account_id_exists AND pm_account_id_exists AND pm_seats_exists THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ v84 Migration Successful';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Created:';
        RAISE NOTICE '  - accounts table';
        RAISE NOTICE 'Extended:';
        RAISE NOTICE '  - projects.account_id';
        RAISE NOTICE '  - projects.project_manager_user_id';
        RAISE NOTICE '  - platform_subscriptions.account_id';
        RAISE NOTICE '  - platform_subscriptions.base_users_per_project';
        RAISE NOTICE '  - platform_subscriptions.extra_user_price';
        RAISE NOTICE '  - platform_subscriptions.extra_user_discount_rate';
        RAISE NOTICE 'Functions:';
        RAISE NOTICE '  - generate_account_code()';
        RAISE NOTICE '  - get_account_subscription()';
        RAISE NOTICE '  - get_account_projects()';
        RAISE NOTICE 'RLS: ✓ Enabled on accounts';
        RAISE NOTICE '========================================';
    ELSE
        RAISE EXCEPTION 'Migration verification failed';
    END IF;
END $$;
