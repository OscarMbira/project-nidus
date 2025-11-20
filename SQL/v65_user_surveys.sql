-- ================================================
-- File: v65_user_surveys.sql
-- Description: User survey system for Phase 10
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Creates user survey system for Phase 10 Launch & Support module
-- Allows creation and management of surveys, collection of responses

-- ================================================
-- TABLE: surveys
-- Description: Survey definitions
-- Category: survey
-- ================================================

CREATE TABLE IF NOT EXISTS surveys (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Survey Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    survey_type VARCHAR(50) DEFAULT 'general',  -- 'post_training', '30_day', '90_day', 'quarterly', 'annual', 'general', 'custom'
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'closed'
    
    -- Scheduling
    start_date DATE,
    end_date DATE,
    target_audience VARCHAR(50),  -- 'all_users', 'new_users', 'admin', 'project_manager', 'team_lead', 'team_member'
    
    -- Configuration
    is_anonymous BOOLEAN DEFAULT TRUE,
    is_required BOOLEAN DEFAULT FALSE,
    allow_multiple_responses BOOLEAN DEFAULT FALSE,
    
    -- Results
    total_responses INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2),
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ================================================
-- TABLE: survey_questions
-- Description: Survey questions
-- Category: survey
-- ================================================

CREATE TABLE IF NOT EXISTS survey_questions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    
    -- Question Information
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',  -- 'multiple_choice', 'single_choice', 'text', 'rating', 'yes_no', 'scale'
    question_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    
    -- Options (for multiple/single choice questions)
    options JSONB,  -- Array of option objects: [{"value": "option1", "text": "Option 1"}, ...]
    
    -- Settings
    min_value INTEGER,  -- For scale/rating questions
    max_value INTEGER,  -- For scale/rating questions
    placeholder_text TEXT,  -- For text questions
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- ================================================
-- TABLE: survey_responses
-- Description: Survey responses
-- Category: survey
-- ================================================

CREATE TABLE IF NOT EXISTS survey_responses (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL if anonymous
    
    -- Response Information
    response_data JSONB NOT NULL,  -- Map of question_id to answer
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Context
    page_url VARCHAR(500),
    user_agent TEXT,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(survey_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_surveys_dates ON surveys(start_date, end_date) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON survey_questions(survey_id, question_order);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_responses_completed ON survey_responses(survey_id, is_completed);

-- Triggers
DROP TRIGGER IF EXISTS trg_surveys_before_insert ON surveys;
CREATE TRIGGER trg_surveys_before_insert
    BEFORE INSERT ON surveys
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_surveys_before_update ON surveys;
CREATE TRIGGER trg_surveys_before_update
    BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Function to update survey response count
CREATE OR REPLACE FUNCTION update_survey_response_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = TRUE AND (OLD IS NULL OR OLD.is_completed = FALSE) THEN
        UPDATE surveys
        SET total_responses = total_responses + 1,
            updated_at = NOW()
        WHERE id = NEW.survey_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_survey_responses_update_count ON survey_responses;
CREATE TRIGGER trg_survey_responses_update_count
    AFTER INSERT OR UPDATE ON survey_responses
    FOR EACH ROW EXECUTE FUNCTION update_survey_response_count();

-- RLS Policies
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view active surveys
CREATE POLICY "Users can view active surveys"
    ON surveys FOR SELECT
    USING (
        is_deleted = FALSE AND
        status = 'active' AND
        (start_date IS NULL OR start_date <= CURRENT_DATE) AND
        (end_date IS NULL OR end_date >= CURRENT_DATE)
    );

-- Policy: Admins can view all surveys
CREATE POLICY "Admins can view all surveys"
    ON surveys FOR SELECT
    USING (
        is_deleted = FALSE AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Policy: Admins can manage surveys
CREATE POLICY "Admins can manage surveys"
    ON surveys FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Policy: Users can view questions for active surveys
CREATE POLICY "Users can view survey questions"
    ON survey_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM surveys
            WHERE id = survey_id
            AND is_deleted = FALSE
            AND status = 'active'
        ) OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Policy: Users can respond to surveys
CREATE POLICY "Users can respond to surveys"
    ON survey_responses FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL OR
        EXISTS (
            SELECT 1 FROM surveys
            WHERE id = survey_id
            AND is_deleted = FALSE
            AND status = 'active'
            AND is_anonymous = TRUE
        )
    );

-- Policy: Users can view their own responses
CREATE POLICY "Users can view their responses"
    ON survey_responses FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Comments
COMMENT ON TABLE surveys IS 'User survey system for Phase 10';
COMMENT ON TABLE survey_questions IS 'Survey questions';
COMMENT ON TABLE survey_responses IS 'Survey responses';

-- Register tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('surveys', 'User survey definitions', false, true, 'survey'),
    ('survey_questions', 'Survey questions', false, true, 'survey'),
    ('survey_responses', 'Survey responses', false, true, 'survey')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

