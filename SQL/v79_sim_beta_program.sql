-- ============================================================================
-- PM Simulator Beta Program Infrastructure
-- Version: v79
-- Description: Beta user program tracking, feedback collection, and analytics
-- ============================================================================

-- Beta Program Enrollment
CREATE TABLE IF NOT EXISTS sim.beta_program_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
    cohort VARCHAR(50), -- e.g., 'early_access', 'beta_1', 'beta_2'
    invited_by UUID REFERENCES auth.users(id),
    completion_date TIMESTAMP WITH TIME ZONE,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Beta Feedback
CREATE TABLE IF NOT EXISTS sim.beta_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES sim.beta_program_enrollments(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('bug_report', 'feature_request', 'usability', 'performance', 'general')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'acknowledged', 'resolved', 'closed', 'rejected')),
    assigned_to UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    attachments JSONB DEFAULT '[]',
    upvotes INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Beta Feedback Votes
CREATE TABLE IF NOT EXISTS sim.beta_feedback_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES sim.beta_feedback(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) DEFAULT 'upvote' CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(feedback_id, user_id)
);

-- Beta Surveys
CREATE TABLE IF NOT EXISTS sim.beta_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    survey_type VARCHAR(50) CHECK (survey_type IN ('onboarding', 'mid_program', 'exit', 'custom')),
    questions JSONB NOT NULL, -- Array of question objects
    target_cohort VARCHAR(50),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Beta Survey Responses
CREATE TABLE IF NOT EXISTS sim.beta_survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES sim.beta_surveys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL, -- Map of question_id to answer
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, user_id)
);

-- Beta Program Analytics
CREATE TABLE IF NOT EXISTS sim.beta_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES sim.beta_program_enrollments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL,
    metric_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beta_enrollments_user ON sim.beta_program_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_enrollments_status ON sim.beta_program_enrollments(status, cohort);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON sim.beta_feedback(user_id, status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON sim.beta_feedback(feedback_type, severity);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_votes_feedback ON sim.beta_feedback_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_beta_surveys_active ON sim.beta_surveys(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_beta_survey_responses_survey ON sim.beta_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_beta_analytics_user ON sim.beta_analytics(user_id, recorded_at);

-- Function to enroll user in beta program
CREATE OR REPLACE FUNCTION sim.enroll_in_beta_program(
    user_id_param UUID,
    cohort_param VARCHAR(50) DEFAULT 'beta_1',
    invited_by_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    enrollment_id UUID;
BEGIN
    INSERT INTO sim.beta_program_enrollments (
        user_id,
        cohort,
        invited_by
    )
    VALUES (
        user_id_param,
        cohort_param,
        invited_by_param
    )
    RETURNING id INTO enrollment_id;

    RETURN enrollment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to submit beta feedback
CREATE OR REPLACE FUNCTION sim.submit_beta_feedback(
    user_id_param UUID,
    feedback_type_param VARCHAR(50),
    title_param VARCHAR(255),
    description_param TEXT,
    severity_param VARCHAR(20) DEFAULT 'medium',
    tags_param TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
    feedback_id UUID;
    enrollment_id UUID;
BEGIN
    -- Get user's enrollment
    SELECT id INTO enrollment_id
    FROM sim.beta_program_enrollments
    WHERE user_id = user_id_param AND status = 'active'
    LIMIT 1;

    INSERT INTO sim.beta_feedback (
        user_id,
        enrollment_id,
        feedback_type,
        title,
        description,
        severity,
        tags
    )
    VALUES (
        user_id_param,
        enrollment_id,
        feedback_type_param,
        title_param,
        description_param,
        severity_param,
        tags_param
    )
    RETURNING id INTO feedback_id;

    RETURN feedback_id;
END;
$$ LANGUAGE plpgsql;

-- Function to vote on feedback
CREATE OR REPLACE FUNCTION sim.vote_on_feedback(
    feedback_id_param UUID,
    user_id_param UUID,
    vote_type_param VARCHAR(10) DEFAULT 'upvote'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO sim.beta_feedback_votes (feedback_id, user_id, vote_type)
    VALUES (feedback_id_param, user_id_param, vote_type_param)
    ON CONFLICT (feedback_id, user_id) DO UPDATE SET vote_type = vote_type_param;

    -- Update feedback upvote count
    UPDATE sim.beta_feedback
    SET upvotes = (
        SELECT COUNT(*) FROM sim.beta_feedback_votes
        WHERE feedback_id = feedback_id_param AND vote_type = 'upvote'
    )
    WHERE id = feedback_id_param;
END;
$$ LANGUAGE plpgsql;

-- View for beta program statistics
CREATE OR REPLACE VIEW sim.beta_program_stats AS
SELECT
    bpe.cohort,
    COUNT(*) AS total_enrollments,
    COUNT(*) FILTER (WHERE bpe.status = 'active') AS active_users,
    COUNT(*) FILTER (WHERE bpe.status = 'completed') AS completed_users,
    COUNT(*) FILTER (WHERE bpe.status = 'withdrawn') AS withdrawn_users,
    AVG(EXTRACT(EPOCH FROM (bpe.completion_date - bpe.enrollment_date)) / 86400) AS avg_days_to_completion,
    COUNT(DISTINCT bf.id) AS total_feedback_items,
    COUNT(DISTINCT bf.id) FILTER (WHERE bf.status = 'resolved') AS resolved_feedback
FROM sim.beta_program_enrollments bpe
LEFT JOIN sim.beta_feedback bf ON bf.enrollment_id = bpe.id
GROUP BY bpe.cohort;

-- View for feedback summary
CREATE OR REPLACE VIEW sim.beta_feedback_summary AS
SELECT
    bf.feedback_type,
    bf.severity,
    bf.status,
    COUNT(*) AS count,
    AVG(bf.upvotes) AS avg_upvotes,
    MAX(bf.upvotes) AS max_upvotes
FROM sim.beta_feedback bf
GROUP BY bf.feedback_type, bf.severity, bf.status
ORDER BY count DESC;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Beta program infrastructure created successfully';
  RAISE NOTICE 'Use sim.enroll_in_beta_program() to enroll users';
  RAISE NOTICE 'Use sim.submit_beta_feedback() to collect feedback';
  RAISE NOTICE 'View sim.beta_program_stats for program analytics';
  RAISE NOTICE 'View sim.beta_feedback_summary for feedback insights';
END $$;

