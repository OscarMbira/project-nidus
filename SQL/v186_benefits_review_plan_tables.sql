-- ============================================================================
-- Benefits Review Plan - Database Schema
-- Version: v186
-- Description: Creates tables for Benefits Review Plan module
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- This script creates the database schema for the Benefits Review Plan module,
-- which defines HOW and WHEN project benefits will be measured and reviewed.
-- This is a PLANNING document that enhances the existing Benefits Realization
-- infrastructure (v40) with a strategy/planning layer.
--
-- Prerequisites:
-- - v01 through v40 must be run first (core tables and benefits tables)
-- - projects table must exist
-- - programmes table must exist (if used)
-- - users table must exist
-- - benefits table must exist (from v40)
--
-- ============================================================================
-- SECTION 1: CREATE benefits_review_plans TABLE (Main Document)
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_review_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Document Reference
    document_ref VARCHAR(100),
    version_number VARCHAR(20) DEFAULT '1.0',

    -- Context
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    business_case_id UUID, -- Reference to business case if exists

    -- Document Metadata
    plan_title VARCHAR(300) NOT NULL,
    release VARCHAR(100),
    plan_date DATE DEFAULT CURRENT_DATE,
    author_user_id UUID REFERENCES users(id),
    owner_user_id UUID REFERENCES users(id),
    client VARCHAR(200),

    -- 3. Scope
    scope_description TEXT,
    benefits_coverage_notes TEXT, -- Notes on which benefits are covered

    -- 4. Accountability
    accountability_description TEXT,

    -- 5. Benefits Measurement
    measurement_approach TEXT,
    measurement_timing_rationale TEXT, -- Reasons for timing choices

    -- 6. Resources
    resources_description TEXT,
    estimated_review_effort_hours DECIMAL(10,2),
    estimated_review_cost DECIMAL(12,2),
    review_cost_currency VARCHAR(3) DEFAULT 'USD',

    -- 7. Baseline Measures
    baseline_measures_description TEXT,
    baseline_recording_date DATE,
    baseline_source TEXT,

    -- 8. Performance Review
    performance_review_approach TEXT,
    performance_review_frequency VARCHAR(50), -- 'monthly', 'quarterly', 'stage_end', 'project_end'
    performance_review_criteria TEXT,

    -- Dis-benefits Consideration
    dis_benefits_included BOOLEAN DEFAULT false,
    dis_benefits_description TEXT,

    -- Document Status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'archived'

    -- Document Location
    document_location TEXT,
    document_url TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT brp_status_check CHECK (
        status IN ('draft', 'pending_approval', 'approved', 'archived')
    ),
    CONSTRAINT brp_performance_frequency_check CHECK (
        performance_review_frequency IS NULL OR performance_review_frequency IN ('monthly', 'quarterly', 'stage_end', 'project_end', 'annually', 'weekly', 'on_demand')
    )
);

CREATE INDEX IF NOT EXISTS idx_benefits_review_plans_project ON benefits_review_plans(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_review_plans_programme ON benefits_review_plans(programme_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_review_plans_status ON benefits_review_plans(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_review_plans_document_ref ON benefits_review_plans(document_ref) WHERE is_deleted = false;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_benefits_review_plans_updated_at ON benefits_review_plans;
CREATE TRIGGER trg_benefits_review_plans_updated_at
    BEFORE UPDATE ON benefits_review_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE benefits_review_plans IS 'Main document for Benefits Review Plan - defines how and when benefits will be measured and reviewed';

-- ============================================================================
-- SECTION 2: CREATE benefits_review_plan_revisions TABLE (Revision History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_review_plan_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    review_plan_id UUID NOT NULL REFERENCES benefits_review_plans(id) ON DELETE CASCADE,

    -- Revision Details
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_revision_date DATE,
    revision_number VARCHAR(20) NOT NULL,
    summary_of_changes TEXT,
    changes_marked BOOLEAN DEFAULT false,

    -- Author
    revised_by_user_id UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_brp_revisions_plan ON benefits_review_plan_revisions(review_plan_id);
CREATE INDEX IF NOT EXISTS idx_brp_revisions_date ON benefits_review_plan_revisions(revision_date);

COMMENT ON TABLE benefits_review_plan_revisions IS 'Revision history for Benefits Review Plans';

-- ============================================================================
-- SECTION 3: CREATE benefits_review_plan_approvals TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_review_plan_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    review_plan_id UUID NOT NULL REFERENCES benefits_review_plans(id) ON DELETE CASCADE,

    -- Approver Details
    approver_user_id UUID REFERENCES users(id),
    approver_name VARCHAR(200),
    approver_title VARCHAR(200),

    -- Approval Status
    approval_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'requested_changes'
    approval_date DATE,
    signature_reference VARCHAR(200), -- Reference to digital signature if applicable
    version_approved VARCHAR(20),

    -- Comments
    comments TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT brp_approval_status_check CHECK (
        approval_status IN ('pending', 'approved', 'rejected', 'requested_changes')
    )
);

CREATE INDEX IF NOT EXISTS idx_brp_approvals_plan ON benefits_review_plan_approvals(review_plan_id);
CREATE INDEX IF NOT EXISTS idx_brp_approvals_approver ON benefits_review_plan_approvals(approver_user_id);
CREATE INDEX IF NOT EXISTS idx_brp_approvals_status ON benefits_review_plan_approvals(approval_status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_benefits_review_plan_approvals_updated_at ON benefits_review_plan_approvals;
CREATE TRIGGER trg_benefits_review_plan_approvals_updated_at
    BEFORE UPDATE ON benefits_review_plan_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE benefits_review_plan_approvals IS 'Approval tracking for Benefits Review Plans';

-- ============================================================================
-- SECTION 4: CREATE benefits_review_plan_distribution TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_review_plan_distribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    review_plan_id UUID NOT NULL REFERENCES benefits_review_plans(id) ON DELETE CASCADE,

    -- Recipient Details
    recipient_user_id UUID REFERENCES users(id),
    recipient_name VARCHAR(200),
    recipient_title VARCHAR(200),
    recipient_email VARCHAR(255),

    -- Distribution Details
    date_of_issue DATE DEFAULT CURRENT_DATE,
    version_issued VARCHAR(20),
    distribution_method VARCHAR(50), -- 'email', 'portal', 'print', 'meeting'

    -- Acknowledgement
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_date DATE,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT brp_distribution_method_check CHECK (
        distribution_method IS NULL OR distribution_method IN ('email', 'portal', 'print', 'meeting', 'other')
    )
);

CREATE INDEX IF NOT EXISTS idx_brp_distribution_plan ON benefits_review_plan_distribution(review_plan_id);
CREATE INDEX IF NOT EXISTS idx_brp_distribution_recipient ON benefits_review_plan_distribution(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_brp_distribution_acknowledged ON benefits_review_plan_distribution(acknowledged);

COMMENT ON TABLE benefits_review_plan_distribution IS 'Distribution list for Benefits Review Plans';

-- ============================================================================
-- SECTION 5: CREATE benefits_review_plan_benefits TABLE (Scope - Benefits Coverage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_review_plan_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    review_plan_id UUID NOT NULL REFERENCES benefits_review_plans(id) ON DELETE CASCADE,
    benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,

    -- Coverage Details
    included_in_scope BOOLEAN DEFAULT true,
    exclusion_reason TEXT, -- If not included, why

    -- Measurement Schedule
    measurement_start_date DATE,
    measurement_end_date DATE,
    measurement_frequency VARCHAR(50), -- 'weekly', 'monthly', 'quarterly', 'annually', 'once'
    measurement_timing_reason TEXT, -- Why this timing

    -- Accountable Person (override benefit owner if different)
    accountable_user_id UUID REFERENCES users(id),
    accountability_notes TEXT,

    -- Review Schedule
    next_review_date DATE,
    review_completed BOOLEAN DEFAULT false,
    last_review_date DATE,

    -- Priority
    priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT brp_benefits_unique UNIQUE (review_plan_id, benefit_id),
    CONSTRAINT brp_benefits_frequency_check CHECK (
        measurement_frequency IS NULL OR measurement_frequency IN ('weekly', 'monthly', 'quarterly', 'annually', 'once', 'on_demand')
    ),
    CONSTRAINT brp_benefits_priority_check CHECK (
        priority IN ('critical', 'high', 'medium', 'low')
    )
);

CREATE INDEX IF NOT EXISTS idx_brp_benefits_plan ON benefits_review_plan_benefits(review_plan_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_brp_benefits_benefit ON benefits_review_plan_benefits(benefit_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_brp_benefits_accountable ON benefits_review_plan_benefits(accountable_user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_brp_benefits_next_review ON benefits_review_plan_benefits(next_review_date) WHERE is_deleted = false AND review_completed = false;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_benefits_review_plan_benefits_updated_at ON benefits_review_plan_benefits;
CREATE TRIGGER trg_benefits_review_plan_benefits_updated_at
    BEFORE UPDATE ON benefits_review_plan_benefits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE benefits_review_plan_benefits IS 'Links benefits to review plans with measurement schedule and accountability';

-- ============================================================================
-- SECTION 6: CREATE benefits_review_plan_resources TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_review_plan_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    review_plan_id UUID NOT NULL REFERENCES benefits_review_plans(id) ON DELETE CASCADE,

    -- Resource Details
    resource_type VARCHAR(50) NOT NULL, -- 'person', 'skill', 'tool', 'system', 'budget', 'other'
    resource_name VARCHAR(200) NOT NULL,
    resource_description TEXT,

    -- Person/Skill Details
    assigned_user_id UUID REFERENCES users(id),
    skill_required VARCHAR(200),
    skill_level VARCHAR(50), -- 'basic', 'intermediate', 'advanced', 'expert'

    -- Effort & Cost
    estimated_effort_hours DECIMAL(10,2),
    estimated_cost DECIMAL(12,2),
    cost_currency VARCHAR(3) DEFAULT 'USD',

    -- Availability
    required_from_date DATE,
    required_to_date DATE,
    availability_confirmed BOOLEAN DEFAULT false,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT brp_resources_type_check CHECK (
        resource_type IN ('person', 'skill', 'tool', 'system', 'budget', 'other')
    ),
    CONSTRAINT brp_resources_skill_level_check CHECK (
        skill_level IS NULL OR skill_level IN ('basic', 'intermediate', 'advanced', 'expert')
    )
);

CREATE INDEX IF NOT EXISTS idx_brp_resources_plan ON benefits_review_plan_resources(review_plan_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_brp_resources_type ON benefits_review_plan_resources(resource_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_brp_resources_assigned ON benefits_review_plan_resources(assigned_user_id) WHERE is_deleted = false;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_benefits_review_plan_resources_updated_at ON benefits_review_plan_resources;
CREATE TRIGGER trg_benefits_review_plan_resources_updated_at
    BEFORE UPDATE ON benefits_review_plan_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE benefits_review_plan_resources IS 'Resources needed to carry out benefits review work';

-- ============================================================================
-- SECTION 7: CREATE dis_benefits TABLE (Dis-benefits/Negative Impacts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dis_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Context
    review_plan_id UUID REFERENCES benefits_review_plans(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,

    -- Dis-benefit Details
    dis_benefit_code VARCHAR(100) NOT NULL,
    dis_benefit_name VARCHAR(200) NOT NULL,
    dis_benefit_description TEXT,

    -- Category
    dis_benefit_category VARCHAR(50), -- 'financial', 'operational', 'reputation', 'compliance', 'customer', 'employee', 'other'

    -- Impact Assessment
    impact_severity VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low', 'minimal'
    impact_probability DECIMAL(5,2), -- 0-100%
    impact_description TEXT,

    -- Measurement
    measurable BOOLEAN DEFAULT false,
    measurement_unit VARCHAR(50),
    baseline_value DECIMAL(15,2),
    current_value DECIMAL(15,2),

    -- Mitigation
    mitigation_approach TEXT,
    mitigation_owner_user_id UUID REFERENCES users(id),
    mitigation_status VARCHAR(50) DEFAULT 'identified', -- 'identified', 'planned', 'in_progress', 'mitigated', 'accepted'

    -- Monitoring
    monitoring_frequency VARCHAR(50),
    next_review_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'realized', 'mitigated', 'closed'

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT dis_benefits_category_check CHECK (
        dis_benefit_category IS NULL OR dis_benefit_category IN ('financial', 'operational', 'reputation', 'compliance', 'customer', 'employee', 'other')
    ),
    CONSTRAINT dis_benefits_severity_check CHECK (
        impact_severity IN ('critical', 'high', 'medium', 'low', 'minimal')
    ),
    CONSTRAINT dis_benefits_probability_check CHECK (
        impact_probability IS NULL OR (impact_probability >= 0 AND impact_probability <= 100)
    ),
    CONSTRAINT dis_benefits_mitigation_status_check CHECK (
        mitigation_status IN ('identified', 'planned', 'in_progress', 'mitigated', 'accepted')
    ),
    CONSTRAINT dis_benefits_status_check CHECK (
        status IN ('active', 'realized', 'mitigated', 'closed')
    )
);

CREATE INDEX IF NOT EXISTS idx_dis_benefits_plan ON dis_benefits(review_plan_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_dis_benefits_project ON dis_benefits(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_dis_benefits_status ON dis_benefits(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_dis_benefits_severity ON dis_benefits(impact_severity) WHERE is_deleted = false;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_dis_benefits_updated_at ON dis_benefits;
CREATE TRIGGER trg_dis_benefits_updated_at
    BEFORE UPDATE ON dis_benefits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE dis_benefits IS 'Negative impacts or dis-benefits that need to be tracked and mitigated';

-- ============================================================================
-- SECTION 8: CREATE benefits_review_schedule TABLE (Scheduled Reviews)
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_review_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    review_plan_id UUID NOT NULL REFERENCES benefits_review_plans(id) ON DELETE CASCADE,
    benefit_id UUID REFERENCES benefits(id) ON DELETE SET NULL, -- NULL = all benefits review

    -- Review Details
    review_name VARCHAR(200) NOT NULL,
    review_description TEXT,
    review_type VARCHAR(50) NOT NULL, -- 'benefit_review', 'baseline_review', 'performance_review', 'final_review'

    -- Schedule
    planned_date DATE NOT NULL,
    forecast_date DATE,
    actual_date DATE,
    review_duration_hours DECIMAL(5,2),

    -- Location
    review_location VARCHAR(200),
    is_virtual BOOLEAN DEFAULT true,
    meeting_link TEXT,

    -- Participants
    reviewer_user_id UUID REFERENCES users(id), -- Primary reviewer
    attendees UUID[], -- Array of user IDs

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'

    -- Outcome
    outcome_summary TEXT,
    findings TEXT,
    recommendations TEXT,
    action_items TEXT,

    -- Documents
    review_report_url TEXT,
    supporting_documents TEXT[],

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT benefits_review_schedule_type_check CHECK (
        review_type IN ('benefit_review', 'baseline_review', 'performance_review', 'final_review')
    ),
    CONSTRAINT benefits_review_schedule_status_check CHECK (
        status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled')
    )
);

CREATE INDEX IF NOT EXISTS idx_benefits_review_schedule_plan ON benefits_review_schedule(review_plan_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_review_schedule_benefit ON benefits_review_schedule(benefit_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_review_schedule_date ON benefits_review_schedule(planned_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_review_schedule_status ON benefits_review_schedule(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_benefits_review_schedule_reviewer ON benefits_review_schedule(reviewer_user_id) WHERE is_deleted = false;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_benefits_review_schedule_updated_at ON benefits_review_schedule;
CREATE TRIGGER trg_benefits_review_schedule_updated_at
    BEFORE UPDATE ON benefits_review_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE benefits_review_schedule IS 'Scheduled benefit reviews and their outcomes';

-- ============================================================================
-- SECTION 9: ENHANCE benefits TABLE
-- ============================================================================

-- Add fields to existing benefits table
DO $$
BEGIN
    -- Review plan link
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'benefits' AND column_name = 'review_plan_id'
    ) THEN
        ALTER TABLE benefits ADD COLUMN review_plan_id UUID REFERENCES benefits_review_plans(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_benefits_review_plan_id ON benefits(review_plan_id) WHERE is_deleted = false;
    END IF;

    -- Business case reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'benefits' AND column_name = 'business_case_reference'
    ) THEN
        ALTER TABLE benefits ADD COLUMN business_case_reference VARCHAR(200);
    END IF;

    -- Baseline recording details
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'benefits' AND column_name = 'baseline_recording_date'
    ) THEN
        ALTER TABLE benefits ADD COLUMN baseline_recording_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'benefits' AND column_name = 'baseline_source'
    ) THEN
        ALTER TABLE benefits ADD COLUMN baseline_source TEXT;
    END IF;

    -- Dis-benefit flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'benefits' AND column_name = 'is_dis_benefit'
    ) THEN
        ALTER TABLE benefits ADD COLUMN is_dis_benefit BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_benefits_is_dis_benefit ON benefits(is_dis_benefit) WHERE is_deleted = false;
    END IF;
END $$;

-- ============================================================================
-- SECTION 10: REGISTER NEW TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('benefits_review_plans', 'Main Benefits Review Plan document', false, true, 'benefits'),
    ('benefits_review_plan_revisions', 'Revision history for Benefits Review Plans', false, true, 'benefits'),
    ('benefits_review_plan_approvals', 'Approval tracking for Benefits Review Plans', false, true, 'benefits'),
    ('benefits_review_plan_distribution', 'Distribution list for Benefits Review Plans', false, true, 'benefits'),
    ('benefits_review_plan_benefits', 'Links benefits to review plans with measurement schedules', false, true, 'benefits'),
    ('benefits_review_plan_resources', 'Resources needed for benefits review work', false, true, 'benefits'),
    ('dis_benefits', 'Negative impacts or dis-benefits tracking', false, true, 'benefits'),
    ('benefits_review_schedule', 'Scheduled benefit reviews and outcomes', false, true, 'benefits')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ============================================================================
-- End of v186_benefits_review_plan_tables.sql
-- ============================================================================
