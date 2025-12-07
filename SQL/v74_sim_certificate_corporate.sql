-- ============================================================================
-- PM Simulator Certificate & Corporate Features
-- Version: v74
-- Description: Corporate license management, team analytics, and bulk provisioning
-- ============================================================================

-- Corporate Licenses Table
CREATE TABLE IF NOT EXISTS sim.corporate_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    company_email VARCHAR(255) NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id),
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('team', 'enterprise', 'custom')),
    max_users INTEGER NOT NULL DEFAULT 10,
    current_users INTEGER DEFAULT 0,
    subscription_id UUID REFERENCES sim.simulator_subscriptions(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'cancelled')),
    billing_contact_email VARCHAR(255),
    billing_contact_name VARCHAR(255),
    billing_address JSONB,
    contract_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contract_end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corporate Users (team members)
CREATE TABLE IF NOT EXISTS sim.corporate_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES sim.corporate_licenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(license_id, user_id)
);

-- Corporate Analytics
CREATE TABLE IF NOT EXISTS sim.corporate_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES sim.corporate_licenses(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_simulations INTEGER DEFAULT 0,
    completed_simulations INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    total_xp_earned BIGINT DEFAULT 0,
    certificates_earned INTEGER DEFAULT 0,
    scenarios_completed JSONB DEFAULT '{}',
    user_engagement JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(license_id, period_start)
);

-- Bulk User Invitations
CREATE TABLE IF NOT EXISTS sim.bulk_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES sim.corporate_licenses(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invitation_type VARCHAR(50) DEFAULT 'email' CHECK (invitation_type IN ('email', 'csv', 'api')),
    emails TEXT[],
    csv_file_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_invitations INTEGER DEFAULT 0,
    successful_invitations INTEGER DEFAULT 0,
    failed_invitations INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_corporate_licenses_admin ON sim.corporate_licenses(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_licenses_status ON sim.corporate_licenses(status);
CREATE INDEX IF NOT EXISTS idx_corporate_users_license ON sim.corporate_users(license_id);
CREATE INDEX IF NOT EXISTS idx_corporate_users_user ON sim.corporate_users(user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_users_status ON sim.corporate_users(status);
CREATE INDEX IF NOT EXISTS idx_corporate_analytics_license ON sim.corporate_analytics(license_id);
CREATE INDEX IF NOT EXISTS idx_corporate_analytics_period ON sim.corporate_analytics(period_start);
CREATE INDEX IF NOT EXISTS idx_bulk_invitations_license ON sim.bulk_invitations(license_id);
CREATE INDEX IF NOT EXISTS idx_bulk_invitations_status ON sim.bulk_invitations(status);

-- Function to update corporate license user count
CREATE OR REPLACE FUNCTION sim.update_corporate_license_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE sim.corporate_licenses
        SET current_users = current_users + 1
        WHERE id = NEW.license_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE sim.corporate_licenses
            SET current_users = current_users + 1
            WHERE id = NEW.license_id;
        ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE sim.corporate_licenses
            SET current_users = GREATEST(0, current_users - 1)
            WHERE id = NEW.license_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE sim.corporate_licenses
        SET current_users = GREATEST(0, current_users - 1)
        WHERE id = OLD.license_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user count
CREATE TRIGGER trigger_update_corporate_user_count
    AFTER INSERT OR UPDATE OR DELETE ON sim.corporate_users
    FOR EACH ROW
    EXECUTE FUNCTION sim.update_corporate_license_user_count();

-- Function to check if user can be added to license
CREATE OR REPLACE FUNCTION sim.can_add_user_to_license(
    license_id_param UUID,
    user_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    license_record RECORD;
    existing_user BOOLEAN;
BEGIN
    -- Get license details
    SELECT * INTO license_record
    FROM sim.corporate_licenses
    WHERE id = license_id_param
      AND status = 'active';

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check if user already exists
    SELECT EXISTS(
        SELECT 1 FROM sim.corporate_users
        WHERE license_id = license_id_param
          AND user_id = user_id_param
    ) INTO existing_user;

    IF existing_user THEN
        RETURN false;
    END IF;

    -- Check if license has capacity
    IF license_record.current_users >= license_record.max_users THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get corporate analytics summary
CREATE OR REPLACE FUNCTION sim.get_corporate_analytics_summary(
    license_id_param UUID,
    period_start_param DATE DEFAULT NULL,
    period_end_param DATE DEFAULT NULL
)
RETURNS TABLE (
    total_users INTEGER,
    active_users INTEGER,
    total_simulations INTEGER,
    completed_simulations INTEGER,
    average_score DECIMAL,
    total_xp BIGINT,
    certificates_earned INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT cu.user_id)::INTEGER AS total_users,
        COUNT(DISTINCT cu.user_id) FILTER (WHERE cu.status = 'active')::INTEGER AS active_users,
        COUNT(sr.id)::INTEGER AS total_simulations,
        COUNT(sr.id) FILTER (WHERE sr.status = 'completed')::INTEGER AS completed_simulations,
        AVG(sr.total_score)::DECIMAL AS average_score,
        COALESCE(SUM(up.total_xp), 0)::BIGINT AS total_xp,
        COUNT(c.id)::INTEGER AS certificates_earned
    FROM sim.corporate_users cu
    LEFT JOIN sim.simulation_runs sr ON sr.user_id = cu.user_id
    LEFT JOIN sim.user_progress up ON up.user_id = cu.user_id
    LEFT JOIN sim.certificates c ON c.user_id = cu.user_id
    WHERE cu.license_id = license_id_param
      AND cu.status = 'active'
      AND (period_start_param IS NULL OR sr.started_at >= period_start_param)
      AND (period_end_param IS NULL OR sr.started_at <= period_end_param);
END;
$$ LANGUAGE plpgsql STABLE;

-- View for corporate dashboard
CREATE OR REPLACE VIEW sim.corporate_dashboard AS
SELECT
    cl.id AS license_id,
    cl.company_name,
    cl.license_type,
    cl.max_users,
    cl.current_users,
    cl.status AS license_status,
    COUNT(DISTINCT cu.user_id) FILTER (WHERE cu.status = 'active') AS active_team_members,
    COUNT(DISTINCT sr.id) AS total_simulations,
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.status = 'completed') AS completed_simulations,
    AVG(sr.total_score) AS average_score,
    COUNT(DISTINCT c.id) AS certificates_earned
FROM sim.corporate_licenses cl
LEFT JOIN sim.corporate_users cu ON cu.license_id = cl.id
LEFT JOIN sim.simulation_runs sr ON sr.user_id = cu.user_id
LEFT JOIN sim.certificates c ON c.user_id = cu.user_id
GROUP BY cl.id, cl.company_name, cl.license_type, cl.max_users, cl.current_users, cl.status;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Certificate & Corporate features created successfully';
  RAISE NOTICE 'Use sim.can_add_user_to_license() to check license capacity';
  RAISE NOTICE 'Use sim.get_corporate_analytics_summary() for team analytics';
END $$;

