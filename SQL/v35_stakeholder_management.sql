-- ================================================
-- File: v35_stakeholder_management.sql
-- Description: Stakeholder Management module tables
-- Version: 1.1 (Added cleanup statements for idempotency)
-- Date: 2025-01-17
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v34 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist

-- Purpose:
-- Creates tables for Stakeholder Management module:
-- 1. stakeholders - Stakeholder register
-- 2. stakeholder_analysis - Power/Interest matrix analysis
-- 3. stakeholder_engagement - Engagement strategy and tracking
-- 4. communication_plans - Communication planning
-- 5. stakeholder_communications - Communication log
-- 6. stakeholder_feedback - Feedback and satisfaction tracking

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- CLEANUP: Drop existing tables if they exist (in reverse dependency order)
-- ================================================

DROP TABLE IF EXISTS stakeholder_feedback CASCADE;
DROP TABLE IF EXISTS stakeholder_communications CASCADE;
DROP TABLE IF EXISTS communication_plans CASCADE;
DROP TABLE IF EXISTS stakeholder_engagement CASCADE;
DROP TABLE IF EXISTS stakeholder_analysis CASCADE;
DROP TABLE IF EXISTS stakeholders CASCADE;

-- Drop views
DROP VIEW IF EXISTS stakeholder_power_interest_matrix CASCADE;
DROP VIEW IF EXISTS stakeholder_engagement_summary CASCADE;

-- ================================================
-- TABLE 1: stakeholders
-- Description: Stakeholder register
-- Category: stakeholder
-- ================================================

CREATE TABLE IF NOT EXISTS stakeholders (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- If stakeholder is a system user

    -- Stakeholder Information
    stakeholder_reference VARCHAR(100),
    stakeholder_name VARCHAR(200) NOT NULL,
    stakeholder_title VARCHAR(200),
    stakeholder_organization VARCHAR(200),
    stakeholder_department VARCHAR(200),

    -- Classification
    stakeholder_type VARCHAR(100), -- 'internal', 'external', 'customer', 'supplier', 'partner', 'regulator', 'community'
    stakeholder_category VARCHAR(100), -- 'individual', 'group', 'organization', 'community'
    stakeholder_role VARCHAR(200), -- Their role in relation to the project

    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    office_location VARCHAR(200),
    preferred_contact_method VARCHAR(50), -- 'email', 'phone', 'in-person', 'video-call'

    -- Relationships
    reports_to_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
    organization_level VARCHAR(100), -- 'executive', 'senior-management', 'middle-management', 'staff'

    -- Project Role
    project_role VARCHAR(200), -- Their specific role in this project
    is_decision_maker BOOLEAN DEFAULT FALSE,
    is_influencer BOOLEAN DEFAULT FALSE,
    is_affected_by_project BOOLEAN DEFAULT FALSE,

    -- Availability
    availability_hours_per_week DECIMAL(10,2),
    time_zone VARCHAR(100),
    availability_constraints TEXT,

    -- Status
    stakeholder_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'departed'
    status_date DATE,

    -- Notes
    notes TEXT,
    special_requirements TEXT,
    tags TEXT[],

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_id ON stakeholders(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholders_type ON stakeholders(stakeholder_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholders_category ON stakeholders(stakeholder_category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholders_status ON stakeholders(stakeholder_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholders_reference ON stakeholders(stakeholder_reference) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stakeholders_updated_at ON stakeholders;
CREATE TRIGGER trg_stakeholders_updated_at
    BEFORE UPDATE ON stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 2: stakeholder_analysis
-- Description: Power/Interest matrix and stakeholder analysis
-- Category: stakeholder
-- ================================================

CREATE TABLE IF NOT EXISTS stakeholder_analysis (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Analysis Date
    analysis_date DATE NOT NULL,
    analysis_period VARCHAR(100), -- 'initiation', 'planning', 'execution', 'closure', 'quarterly'

    -- Power/Influence
    power_level INTEGER CHECK (power_level >= 1 AND power_level <= 5), -- 1=Low, 5=High
    power_description TEXT,
    power_sources TEXT[], -- e.g., 'positional', 'resource-control', 'expertise', 'network'

    -- Interest/Impact
    interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 5), -- 1=Low, 5=High
    interest_description TEXT,
    impact_on_project INTEGER CHECK (impact_on_project >= 1 AND impact_on_project <= 5),

    -- Matrix Quadrant
    matrix_quadrant VARCHAR(50), -- 'keep-satisfied', 'manage-closely', 'monitor', 'keep-informed'

    -- Attitude
    current_attitude VARCHAR(50), -- 'champion', 'supporter', 'neutral', 'critic', 'blocker'
    desired_attitude VARCHAR(50), -- Target attitude
    attitude_notes TEXT,

    -- Support Level
    support_level INTEGER CHECK (support_level >= 1 AND support_level <= 5), -- 1=Strongly Opposed, 5=Strongly Supportive
    support_rationale TEXT,

    -- Expectations & Concerns
    expectations TEXT,
    concerns TEXT,
    potential_objections TEXT,

    -- Influence Strategy
    influence_strategy TEXT,
    engagement_approach TEXT,

    -- Salience Model (Mitchell et al.)
    has_power BOOLEAN DEFAULT FALSE,
    has_legitimacy BOOLEAN DEFAULT FALSE,
    has_urgency BOOLEAN DEFAULT FALSE,
    salience_category VARCHAR(50), -- 'definitive', 'expectant', 'latent', 'non-stakeholder'

    -- Dependencies
    depends_on_project BOOLEAN DEFAULT FALSE,
    project_depends_on_them BOOLEAN DEFAULT FALSE,
    dependency_description TEXT,

    -- Risk & Opportunity
    associated_risks TEXT,
    associated_opportunities TEXT,

    -- Analyzed By
    analyzed_by UUID REFERENCES users(id),

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakeholder_analysis_stakeholder_id ON stakeholder_analysis(stakeholder_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_analysis_project_id ON stakeholder_analysis(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_analysis_date ON stakeholder_analysis(analysis_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_analysis_quadrant ON stakeholder_analysis(matrix_quadrant) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_analysis_attitude ON stakeholder_analysis(current_attitude) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stakeholder_analysis_updated_at ON stakeholder_analysis;
CREATE TRIGGER trg_stakeholder_analysis_updated_at
    BEFORE UPDATE ON stakeholder_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 3: stakeholder_engagement
-- Description: Engagement strategy and tracking
-- Category: stakeholder
-- ================================================

CREATE TABLE IF NOT EXISTS stakeholder_engagement (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Engagement Strategy
    engagement_level VARCHAR(50), -- 'unaware', 'resistant', 'neutral', 'supportive', 'leading'
    target_engagement_level VARCHAR(50), -- Desired level
    engagement_strategy TEXT,
    engagement_tactics TEXT[],

    -- Communication Preferences
    preferred_communication_frequency VARCHAR(50), -- 'daily', 'weekly', 'bi-weekly', 'monthly', 'as-needed'
    preferred_communication_method VARCHAR(50), -- 'email', 'meeting', 'phone', 'video-call', 'report'
    preferred_meeting_type VARCHAR(50), -- '1-on-1', 'group', 'presentation', 'workshop'
    communication_style_preference VARCHAR(50), -- 'detailed', 'summary', 'visual', 'data-driven'

    -- Information Needs
    information_needs TEXT,
    information_sensitivity_level VARCHAR(50), -- 'public', 'internal', 'confidential', 'restricted'
    need_to_know_areas TEXT[],

    -- Decision Rights
    decision_authority_areas TEXT[],
    consultation_required_for TEXT[],
    approval_required_for TEXT[],

    -- Engagement Activities
    key_engagement_activities TEXT[],
    engagement_milestones JSONB, -- Array of milestone objects

    -- Relationship Management
    relationship_owner_user_id UUID REFERENCES users(id),
    relationship_strength VARCHAR(50), -- 'strong', 'moderate', 'weak', 'new'
    trust_level VARCHAR(50), -- 'high', 'medium', 'low', 'building'

    -- Issues & Barriers
    engagement_barriers TEXT,
    mitigation_actions TEXT,

    -- Success Indicators
    engagement_success_criteria TEXT,
    measurement_approach TEXT,

    -- Period
    engagement_period_start DATE,
    engagement_period_end DATE,

    -- Status
    engagement_status VARCHAR(50) DEFAULT 'active', -- 'active', 'on-hold', 'completed'

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_stakeholder_id ON stakeholder_engagement(stakeholder_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_project_id ON stakeholder_engagement(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_owner ON stakeholder_engagement(relationship_owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_level ON stakeholder_engagement(engagement_level) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_status ON stakeholder_engagement(engagement_status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stakeholder_engagement_updated_at ON stakeholder_engagement;
CREATE TRIGGER trg_stakeholder_engagement_updated_at
    BEFORE UPDATE ON stakeholder_engagement
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 4: communication_plans
-- Description: Communication planning
-- Category: stakeholder
-- ================================================

CREATE TABLE IF NOT EXISTS communication_plans (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Plan Information
    plan_name VARCHAR(200) NOT NULL,
    plan_description TEXT,
    plan_version VARCHAR(20) DEFAULT '1.0',

    -- Plan Period
    plan_start_date DATE NOT NULL,
    plan_end_date DATE,
    plan_status VARCHAR(50) DEFAULT 'active', -- 'draft', 'active', 'archived'

    -- Communication Objectives
    communication_objectives TEXT,
    success_criteria TEXT,

    -- Target Audiences
    target_stakeholder_groups TEXT[],
    key_messages TEXT,

    -- Communication Channels
    primary_channels VARCHAR(100)[], -- 'email', 'meetings', 'reports', 'presentations', 'intranet', 'newsletter'
    channel_effectiveness JSONB, -- Effectiveness ratings by channel

    -- Frequency & Timing
    communication_schedule JSONB, -- Scheduled communications
    critical_milestones_communication TEXT,

    -- Roles & Responsibilities
    communication_owner_user_id UUID REFERENCES users(id),
    communication_team_members UUID[],
    approval_required_by UUID REFERENCES users(id),

    -- Templates & Standards
    templates_used TEXT[],
    branding_guidelines TEXT,
    tone_and_style TEXT,

    -- Measurement
    effectiveness_metrics TEXT[],
    feedback_mechanisms TEXT,

    -- Risk Mitigation
    communication_risks TEXT,
    contingency_plans TEXT,

    -- Budget
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),

    -- Review Schedule
    review_frequency VARCHAR(50), -- 'weekly', 'monthly', 'quarterly'
    last_review_date DATE,
    next_review_date DATE,

    -- Documents
    plan_document_url TEXT,
    supporting_documents_urls TEXT[],

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communication_plans_project_id ON communication_plans(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_communication_plans_owner ON communication_plans(communication_owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_communication_plans_status ON communication_plans(plan_status) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_communication_plans_updated_at ON communication_plans;
CREATE TRIGGER trg_communication_plans_updated_at
    BEFORE UPDATE ON communication_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 5: stakeholder_communications
-- Description: Communication log and tracking
-- Category: stakeholder
-- ================================================

CREATE TABLE IF NOT EXISTS stakeholder_communications (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    communication_plan_id UUID REFERENCES communication_plans(id) ON DELETE SET NULL,
    stakeholder_ids UUID[], -- Multiple stakeholders can receive same communication

    -- Communication Information
    communication_reference VARCHAR(100),
    communication_subject VARCHAR(200) NOT NULL,
    communication_type VARCHAR(100), -- 'email', 'meeting', 'presentation', 'report', 'call', 'memo', 'announcement'
    communication_category VARCHAR(100), -- 'status-update', 'decision', 'approval-request', 'information', 'urgent'

    -- Content
    communication_summary TEXT,
    communication_content TEXT,
    key_messages TEXT[],

    -- Timing
    planned_date DATE,
    actual_date DATE,
    communication_datetime TIMESTAMP,

    -- Channel
    communication_channel VARCHAR(100), -- 'email', 'face-to-face', 'video-call', 'phone', 'document', 'portal'
    distribution_method VARCHAR(100),

    -- Sender/Presenter
    sent_by_user_id UUID REFERENCES users(id),
    presented_by_user_id UUID REFERENCES users(id),

    -- Recipients
    to_recipients TEXT[],
    cc_recipients TEXT[],
    bcc_recipients TEXT[],
    attendees UUID[], -- For meetings

    -- Status
    communication_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'delivered', 'read', 'acknowledged', 'failed'
    delivery_status VARCHAR(50),
    delivery_timestamp TIMESTAMP,

    -- Response/Feedback
    response_required BOOLEAN DEFAULT FALSE,
    response_due_date DATE,
    response_received BOOLEAN DEFAULT FALSE,
    response_summary TEXT,
    feedback_received TEXT,

    -- Meeting Details (if applicable)
    meeting_duration_minutes INTEGER,
    meeting_location VARCHAR(200),
    meeting_link TEXT,
    meeting_minutes_url TEXT,
    action_items TEXT[],

    -- Documents
    attachment_urls TEXT[],
    presentation_url TEXT,

    -- Effectiveness
    communication_effectiveness VARCHAR(50), -- 'very-effective', 'effective', 'neutral', 'ineffective'
    effectiveness_notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,

    -- Compliance
    is_confidential BOOLEAN DEFAULT FALSE,
    retention_period_years INTEGER,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_project_id ON stakeholder_communications(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_plan_id ON stakeholder_communications(communication_plan_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_type ON stakeholder_communications(communication_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_date ON stakeholder_communications(actual_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_status ON stakeholder_communications(communication_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_sent_by ON stakeholder_communications(sent_by_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stakeholder_communications_updated_at ON stakeholder_communications;
CREATE TRIGGER trg_stakeholder_communications_updated_at
    BEFORE UPDATE ON stakeholder_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- TABLE 6: stakeholder_feedback
-- Description: Feedback and satisfaction tracking
-- Category: stakeholder
-- ================================================

CREATE TABLE IF NOT EXISTS stakeholder_feedback (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    communication_id UUID REFERENCES stakeholder_communications(id) ON DELETE SET NULL,

    -- Feedback Information
    feedback_date DATE NOT NULL,
    feedback_type VARCHAR(100), -- 'survey', 'interview', 'comment', 'complaint', 'suggestion', 'compliment'
    feedback_category VARCHAR(100), -- 'project-progress', 'communication', 'engagement', 'deliverable', 'process', 'team'

    -- Feedback Content
    feedback_summary TEXT,
    feedback_details TEXT,
    verbatim_comments TEXT,

    -- Ratings
    overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5), -- 1=Very Dissatisfied, 5=Very Satisfied
    communication_satisfaction INTEGER CHECK (communication_satisfaction >= 1 AND communication_satisfaction <= 5),
    engagement_satisfaction INTEGER CHECK (engagement_satisfaction >= 1 AND engagement_satisfaction <= 5),
    deliverable_satisfaction INTEGER CHECK (deliverable_satisfaction >= 1 AND deliverable_satisfaction <= 5),

    -- Sentiment
    sentiment VARCHAR(50), -- 'very-positive', 'positive', 'neutral', 'negative', 'very-negative'
    sentiment_score DECIMAL(5,2), -- -1.0 to +1.0

    -- Themes & Topics
    themes TEXT[],
    topics_mentioned TEXT[],

    -- Action Required
    action_required BOOLEAN DEFAULT FALSE,
    action_description TEXT,
    action_owner_user_id UUID REFERENCES users(id),
    action_due_date DATE,
    action_status VARCHAR(50), -- 'pending', 'in-progress', 'completed'
    action_outcome TEXT,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,

    -- Collector
    collected_by_user_id UUID REFERENCES users(id),
    collection_method VARCHAR(100), -- 'online-survey', 'phone-interview', 'face-to-face', 'email', 'feedback-form'

    -- Privacy
    is_anonymous BOOLEAN DEFAULT FALSE,
    share_with_team BOOLEAN DEFAULT TRUE,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_stakeholder_id ON stakeholder_feedback(stakeholder_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_project_id ON stakeholder_feedback(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_date ON stakeholder_feedback(feedback_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_type ON stakeholder_feedback(feedback_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_sentiment ON stakeholder_feedback(sentiment) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_action_required ON stakeholder_feedback(action_required) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_stakeholder_feedback_updated_at ON stakeholder_feedback;
CREATE TRIGGER trg_stakeholder_feedback_updated_at
    BEFORE UPDATE ON stakeholder_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- VIEW: stakeholder_power_interest_matrix
-- Description: Power/Interest matrix visualization data
-- ================================================

CREATE OR REPLACE VIEW stakeholder_power_interest_matrix AS
SELECT
    s.id as stakeholder_id,
    s.stakeholder_name,
    s.stakeholder_organization,
    s.project_id,
    p.project_name,
    sa.power_level,
    sa.interest_level,
    sa.matrix_quadrant,
    sa.current_attitude,
    sa.support_level,
    sa.analysis_date,
    se.engagement_level,
    se.target_engagement_level
FROM stakeholders s
JOIN stakeholder_analysis sa ON s.id = sa.stakeholder_id
LEFT JOIN stakeholder_engagement se ON s.id = se.stakeholder_id AND se.is_deleted = FALSE
LEFT JOIN projects p ON s.project_id = p.id
WHERE s.is_deleted = FALSE
  AND sa.is_deleted = FALSE
  AND s.stakeholder_status = 'active'
  AND sa.id IN (
    SELECT id FROM stakeholder_analysis sa2
    WHERE sa2.stakeholder_id = s.id
    ORDER BY sa2.analysis_date DESC
    LIMIT 1
  );

-- ================================================
-- VIEW: stakeholder_engagement_summary
-- Description: Stakeholder engagement summary by project
-- ================================================

CREATE OR REPLACE VIEW stakeholder_engagement_summary AS
SELECT
    p.id as project_id,
    p.project_name,
    COUNT(DISTINCT s.id) as total_stakeholders,
    COUNT(DISTINCT CASE WHEN s.stakeholder_status = 'active' THEN s.id END) as active_stakeholders,
    COUNT(DISTINCT CASE WHEN sa.current_attitude IN ('champion', 'supporter') THEN s.id END) as supporters,
    COUNT(DISTINCT CASE WHEN sa.current_attitude = 'neutral' THEN s.id END) as neutral,
    COUNT(DISTINCT CASE WHEN sa.current_attitude IN ('critic', 'blocker') THEN s.id END) as critics,
    AVG(sa.support_level) as average_support_level,
    AVG(sf.overall_satisfaction) as average_satisfaction,
    COUNT(DISTINCT sc.id) as total_communications,
    COUNT(DISTINCT sf.id) as total_feedback_items
FROM projects p
LEFT JOIN stakeholders s ON p.id = s.project_id AND s.is_deleted = FALSE
LEFT JOIN stakeholder_analysis sa ON s.id = sa.stakeholder_id AND sa.is_deleted = FALSE
LEFT JOIN stakeholder_feedback sf ON s.id = sf.stakeholder_id AND sf.is_deleted = FALSE
LEFT JOIN stakeholder_communications sc ON p.id = sc.project_id AND sc.is_deleted = FALSE
GROUP BY p.id, p.project_name;

-- ================================================
-- Register Tables in database_tables Registry
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('stakeholders', 'Stakeholder register with contact information and classifications', false, true),
  ('stakeholder_analysis', 'Power/Interest matrix and stakeholder analysis records', false, true),
  ('stakeholder_engagement', 'Stakeholder engagement strategies and tracking', false, true),
  ('communication_plans', 'Communication planning and strategy documentation', false, true),
  ('stakeholder_communications', 'Communication log and tracking for all stakeholder interactions', false, true),
  ('stakeholder_feedback', 'Stakeholder feedback and satisfaction tracking', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ================================================
-- End of v35_stakeholder_management.sql
-- ================================================
