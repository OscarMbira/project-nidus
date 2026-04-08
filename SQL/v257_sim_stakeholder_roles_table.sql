-- =============================================
-- v257: Simulator Stakeholder Roles Lookup Table
-- Description: Create stakeholder_roles table in sim schema for searchable dropdown
-- =============================================

-- Create stakeholder_roles table in sim schema
CREATE TABLE IF NOT EXISTS sim.stakeholder_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(100) NOT NULL,
    role_code VARCHAR(20),
    role_category VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id),
    CONSTRAINT sim_stakeholder_roles_name_unique UNIQUE (role_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sim_stakeholder_roles_active ON sim.stakeholder_roles(is_active) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_sim_stakeholder_roles_category ON sim.stakeholder_roles(role_category) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_sim_stakeholder_roles_display_order ON sim.stakeholder_roles(display_order) WHERE is_deleted = false;

-- Enable RLS
ALTER TABLE sim.stakeholder_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to read roles
CREATE POLICY "sim_stakeholder_roles_read_authenticated" ON sim.stakeholder_roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow anon users to read roles
CREATE POLICY "sim_stakeholder_roles_read_anon" ON sim.stakeholder_roles
    FOR SELECT
    TO anon
    USING (true);

-- Allow admins to manage roles (insert, update, delete)
CREATE POLICY "sim_stakeholder_roles_admin_all" ON sim.stakeholder_roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('super_admin', 'pmo_admin', 'org_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('super_admin', 'pmo_admin', 'org_admin')
        )
    );

-- Seed initial stakeholder roles data (same as public schema)
INSERT INTO sim.stakeholder_roles (role_name, role_code, role_category, description, display_order, is_active) VALUES
-- Executive roles
('Chief Executive Officer', 'CEO', 'Executive', 'Top executive responsible for overall company strategy and direction', 1, true),
('Chief Financial Officer', 'CFO', 'Executive', 'Executive responsible for financial planning and management', 2, true),
('Chief Technology Officer', 'CTO', 'Executive', 'Executive responsible for technology strategy and implementation', 3, true),
('Chief Information Officer', 'CIO', 'Executive', 'Executive responsible for information technology and systems', 4, true),
('Chief Operating Officer', 'COO', 'Executive', 'Executive responsible for day-to-day operations', 5, true),
('Managing Director', 'MD', 'Executive', 'Senior executive managing business operations', 6, true),
('Executive Director', 'ED', 'Executive', 'Board-level director with executive responsibilities', 7, true),

-- Project roles
('Project Sponsor', 'PS', 'Project', 'Senior stakeholder who champions and funds the project', 10, true),
('Project Manager', 'PM', 'Project', 'Person responsible for planning and executing the project', 11, true),
('Programme Manager', 'PGM', 'Project', 'Manager overseeing multiple related projects', 12, true),
('Portfolio Manager', 'PFM', 'Project', 'Manager overseeing collection of projects and programmes', 13, true),
('Business Analyst', 'BA', 'Project', 'Analyst who gathers and documents business requirements', 14, true),
('Technical Lead', 'TL', 'Project', 'Senior technical person leading development efforts', 15, true),
('Solution Architect', 'SA', 'Project', 'Architect responsible for technical solution design', 16, true),
('Project Coordinator', 'PC', 'Project', 'Supports project manager with coordination activities', 17, true),

-- Business roles
('Product Owner', 'PO', 'Business', 'Person responsible for product vision and backlog', 20, true),
('Business Owner', 'BO', 'Business', 'Person accountable for business outcomes', 21, true),
('Subject Matter Expert', 'SME', 'Business', 'Expert with deep knowledge in specific domain', 22, true),
('Process Owner', 'PRO', 'Business', 'Person responsible for business process management', 23, true),
('Business Unit Manager', 'BUM', 'Business', 'Manager of a specific business unit or department', 24, true),
('Change Manager', 'CM', 'Business', 'Person managing organizational change activities', 25, true),

-- Operations roles
('Department Head', 'DH', 'Operations', 'Leader of a department or division', 30, true),
('IT Manager', 'ITM', 'Operations', 'Manager of IT operations and services', 31, true),
('Operations Manager', 'OPM', 'Operations', 'Manager of operational activities', 32, true),
('Service Manager', 'SVM', 'Operations', 'Manager responsible for service delivery', 33, true),
('Team Lead', 'TLD', 'Operations', 'Leader of a functional team', 34, true),

-- Quality roles
('Quality Assurance Lead', 'QAL', 'Quality', 'Lead responsible for quality assurance activities', 40, true),
('Quality Manager', 'QM', 'Quality', 'Manager overseeing quality standards and processes', 41, true),
('Test Manager', 'TM', 'Quality', 'Manager responsible for testing activities', 42, true),

-- External roles
('Customer Representative', 'CR', 'External', 'Representative from customer organization', 50, true),
('Vendor Representative', 'VR', 'External', 'Representative from vendor or supplier', 51, true),
('Consultant', 'CON', 'External', 'External consultant providing expertise', 52, true),
('Contractor', 'CTR', 'External', 'External contractor working on the project', 53, true),
('Partner Representative', 'PR', 'External', 'Representative from partner organization', 54, true),

-- User roles
('End User', 'EU', 'User', 'Person who will use the final product or system', 60, true),
('Key User', 'KU', 'User', 'Important user who represents user community', 61, true),
('User Representative', 'UR', 'User', 'Person representing user interests', 62, true),

-- Technical roles
('System Administrator', 'SYS', 'Technical', 'Person managing system administration', 70, true),
('Database Administrator', 'DBA', 'Technical', 'Person managing database systems', 71, true),
('Security Officer', 'SO', 'Technical', 'Person responsible for security matters', 72, true),
('Infrastructure Lead', 'IL', 'Technical', 'Lead responsible for infrastructure', 73, true),

-- Governance roles
('Steering Committee Member', 'SCM', 'Governance', 'Member of project steering committee', 80, true),
('Board Member', 'BM', 'Governance', 'Member of project or corporate board', 81, true),
('Audit Representative', 'AR', 'Governance', 'Representative from audit function', 82, true),
('Compliance Officer', 'CO', 'Governance', 'Person responsible for regulatory compliance', 83, true)

ON CONFLICT (role_name) DO UPDATE SET
    role_code = EXCLUDED.role_code,
    role_category = EXCLUDED.role_category,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Add comment to table
COMMENT ON TABLE sim.stakeholder_roles IS 'Lookup table for stakeholder roles in simulator - used in searchable dropdowns';

-- Grant table permissions to authenticated and anon roles
GRANT SELECT ON sim.stakeholder_roles TO authenticated;
GRANT SELECT ON sim.stakeholder_roles TO anon;

-- Grant usage on the sim schema
GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT USAGE ON SCHEMA sim TO anon;
