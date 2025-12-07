-- =============================================
-- Project Management Simulator - Core Schema
-- Version: v66
-- Date: 2025-11-20
-- Description: Creates sim schema and core tables for the PM Simulator module
-- =============================================

-- Create sim schema
CREATE SCHEMA IF NOT EXISTS sim;

-- Grant usage on sim schema
GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT ALL ON SCHEMA sim TO service_role;

-- =============================================
-- CORE TABLES
-- =============================================

-- Simulation Scenarios
CREATE TABLE sim.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    industry VARCHAR(100),
    methodology VARCHAR(50),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    target_role VARCHAR(50) CHECK (target_role IN ('programme_manager', 'project_manager', 'team_lead', 'team_member')),
    duration_minutes INTEGER DEFAULT 60,
    estimated_time_display VARCHAR(50),
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    scenario_data JSONB DEFAULT '{}',
    learning_objectives JSONB DEFAULT '[]',
    skills_covered JSONB DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    thumbnail_url TEXT,
    sort_order INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Scenario Phases (for full lifecycle scenarios)
CREATE TABLE sim.scenario_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
    phase_name VARCHAR(100) NOT NULL,
    phase_order INTEGER NOT NULL,
    description TEXT,
    duration_minutes INTEGER,
    phase_data JSONB DEFAULT '{}',
    scoring_criteria JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation Runs (user sessions)
CREATE TABLE sim.simulation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES sim.scenarios(id),
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'paused', 'completed', 'abandoned')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_phase VARCHAR(100),
    current_step INTEGER DEFAULT 1,
    total_score INTEGER DEFAULT 0,
    max_possible_score INTEGER DEFAULT 100,
    time_spent_minutes INTEGER DEFAULT 0,
    simulation_state JSONB DEFAULT '{}',
    decisions_made JSONB DEFAULT '[]',
    seed_value INTEGER DEFAULT floor(random() * 1000000)::INTEGER,
    difficulty_modifier DECIMAL(3,2) DEFAULT 1.0,
    hints_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Events
CREATE TABLE sim.ai_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) CHECK (event_category IN ('resource', 'schedule', 'budget', 'stakeholder', 'technical', 'external', 'team', 'quality')),
    event_name VARCHAR(255),
    event_description TEXT,
    event_data JSONB DEFAULT '{}',
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_deadline TIMESTAMP WITH TIME ZONE,
    user_response JSONB,
    response_time_seconds INTEGER,
    response_score INTEGER,
    max_score INTEGER DEFAULT 100,
    feedback TEXT,
    impact_analysis JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Module Scores (per phase/module scoring)
CREATE TABLE sim.module_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    module_type VARCHAR(50),
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN max_score > 0 THEN (score::DECIMAL / max_score * 100) ELSE 0 END) STORED,
    metrics JSONB DEFAULT '{}',
    feedback TEXT,
    strengths JSONB DEFAULT '[]',
    improvements JSONB DEFAULT '[]',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Progress (overall progress tracking)
CREATE TABLE sim.user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    xp_to_next_level INTEGER DEFAULT 100,
    badges JSONB DEFAULT '[]',
    competencies JSONB DEFAULT '{}',
    completed_scenarios INTEGER DEFAULT 0,
    total_simulations INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    total_time_minutes INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_streak_date DATE,
    preferred_role VARCHAR(50),
    preferred_methodology VARCHAR(50),
    skill_assessment_completed BOOLEAN DEFAULT false,
    skill_assessment_results JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT false,
    tutorial_completed BOOLEAN DEFAULT false,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Scenarios (user-uploaded)
CREATE TABLE sim.custom_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) CHECK (source_type IN ('text', 'document', 'spreadsheet', 'url')),
    original_content TEXT,
    original_file_url TEXT,
    extracted_data JSONB DEFAULT '{}',
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'processing', 'valid', 'invalid')),
    validation_errors JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificates
CREATE TABLE sim.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('module_completion', 'role_mastery', 'methodology_expert', 'professional', 'verified')),
    certificate_name VARCHAR(255) NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    verification_code VARCHAR(100) UNIQUE NOT NULL,
    score INTEGER,
    grade VARCHAR(10),
    metadata JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    badge_url TEXT,
    linkedin_shared BOOLEAN DEFAULT false,
    physical_ordered BOOLEAN DEFAULT false,
    physical_shipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard Entries
CREATE TABLE sim.leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    leaderboard_type VARCHAR(50) NOT NULL CHECK (leaderboard_type IN ('global', 'role', 'methodology', 'industry', 'weekly', 'monthly')),
    category VARCHAR(100),
    period VARCHAR(20),
    period_start DATE,
    period_end DATE,
    score INTEGER NOT NULL,
    rank INTEGER,
    previous_rank INTEGER,
    simulations_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, leaderboard_type, category, period_start)
);

-- Simulator Subscriptions
CREATE TABLE sim.simulator_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('free', 'basic', 'professional', 'enterprise', 'lifetime_basic', 'lifetime_professional', 'lifetime_ultimate')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    is_lifetime BOOLEAN DEFAULT false,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
    next_billing_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenario Packs
CREATE TABLE sim.scenario_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    industry VARCHAR(100),
    scenario_count INTEGER DEFAULT 0,
    scenario_ids UUID[] DEFAULT '{}',
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    discount_percentage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    thumbnail_url TEXT,
    sort_order INTEGER DEFAULT 0,
    purchases_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Purchases
CREATE TABLE sim.user_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('subscription', 'lifetime', 'scenario_pack', 'certificate', 'scenario', 'physical_certificate')),
    item_id UUID,
    item_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_provider VARCHAR(50) CHECK (payment_provider IN ('stripe', 'paypal')),
    payment_id VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    refund_amount DECIMAL(10,2),
    refunded_at TIMESTAMP WITH TIME ZONE,
    receipt_url TEXT,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Badges Definition
CREATE TABLE sim.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    badge_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('progression', 'skill', 'achievement', 'special', 'streak')),
    icon_url TEXT,
    xp_reward INTEGER DEFAULT 0,
    requirements JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_hidden BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Badges (earned badges)
CREATE TABLE sim.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES sim.badges(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Skill Assessment Questions
CREATE TABLE sim.assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) CHECK (question_type IN ('multiple_choice', 'true_false', 'scale')),
    options JSONB DEFAULT '[]',
    correct_answer JSONB,
    difficulty VARCHAR(20),
    skill_tags JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Assessment Responses
CREATE TABLE sim.assessment_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES sim.assessment_questions(id),
    response JSONB NOT NULL,
    is_correct BOOLEAN,
    score INTEGER,
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenario Ratings/Reviews
CREATE TABLE sim.scenario_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_completion BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scenario_id, user_id)
);

-- =============================================
-- INDEXES
-- =============================================

-- Scenarios indexes
CREATE INDEX idx_sim_scenarios_industry ON sim.scenarios(industry);
CREATE INDEX idx_sim_scenarios_methodology ON sim.scenarios(methodology);
CREATE INDEX idx_sim_scenarios_difficulty ON sim.scenarios(difficulty_level);
CREATE INDEX idx_sim_scenarios_role ON sim.scenarios(target_role);
CREATE INDEX idx_sim_scenarios_active ON sim.scenarios(is_active);
CREATE INDEX idx_sim_scenarios_premium ON sim.scenarios(is_premium);

-- Simulation runs indexes
CREATE INDEX idx_sim_runs_user ON sim.simulation_runs(user_id);
CREATE INDEX idx_sim_runs_scenario ON sim.simulation_runs(scenario_id);
CREATE INDEX idx_sim_runs_status ON sim.simulation_runs(status);
CREATE INDEX idx_sim_runs_started ON sim.simulation_runs(started_at);

-- AI events indexes
CREATE INDEX idx_sim_events_run ON sim.ai_events(run_id);
CREATE INDEX idx_sim_events_type ON sim.ai_events(event_type);
CREATE INDEX idx_sim_events_category ON sim.ai_events(event_category);

-- User progress indexes
CREATE INDEX idx_sim_progress_user ON sim.user_progress(user_id);
CREATE INDEX idx_sim_progress_level ON sim.user_progress(current_level);
CREATE INDEX idx_sim_progress_xp ON sim.user_progress(total_xp);

-- Leaderboard indexes
CREATE INDEX idx_sim_leaderboard_type ON sim.leaderboard_entries(leaderboard_type);
CREATE INDEX idx_sim_leaderboard_period ON sim.leaderboard_entries(period_start);
CREATE INDEX idx_sim_leaderboard_score ON sim.leaderboard_entries(score DESC);

-- Subscriptions indexes
CREATE INDEX idx_sim_subscriptions_user ON sim.simulator_subscriptions(user_id);
CREATE INDEX idx_sim_subscriptions_status ON sim.simulator_subscriptions(status);
CREATE INDEX idx_sim_subscriptions_plan ON sim.simulator_subscriptions(plan_type);

-- Certificates indexes
CREATE INDEX idx_sim_certificates_user ON sim.certificates(user_id);
CREATE INDEX idx_sim_certificates_type ON sim.certificates(certificate_type);
CREATE INDEX idx_sim_certificates_number ON sim.certificates(certificate_number);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Calculate user level based on XP
CREATE OR REPLACE FUNCTION sim.calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN GREATEST(1, FLOOR(SQRT(xp / 100.0)) + 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate XP needed for next level
CREATE OR REPLACE FUNCTION sim.xp_for_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (current_level * current_level * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update user progress after simulation completion
CREATE OR REPLACE FUNCTION sim.update_user_progress_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    xp_earned INTEGER;
    new_level INTEGER;
BEGIN
    -- Only process when status changes to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Calculate XP based on score and difficulty
        xp_earned := GREATEST(50, NEW.total_score * NEW.difficulty_modifier::INTEGER);

        -- Update user progress
        INSERT INTO sim.user_progress (user_id, total_xp, completed_scenarios, total_simulations)
        VALUES (NEW.user_id, xp_earned, 1, 1)
        ON CONFLICT (user_id) DO UPDATE SET
            total_xp = sim.user_progress.total_xp + xp_earned,
            completed_scenarios = sim.user_progress.completed_scenarios + 1,
            total_simulations = sim.user_progress.total_simulations + 1,
            current_level = sim.calculate_level(sim.user_progress.total_xp + xp_earned),
            xp_to_next_level = sim.xp_for_next_level(sim.calculate_level(sim.user_progress.total_xp + xp_earned)),
            average_score = ((sim.user_progress.average_score * sim.user_progress.completed_scenarios) + NEW.total_score) / (sim.user_progress.completed_scenarios + 1),
            highest_score = GREATEST(sim.user_progress.highest_score, NEW.total_score),
            total_time_minutes = sim.user_progress.total_time_minutes + COALESCE(NEW.time_spent_minutes, 0),
            last_activity_at = NOW(),
            updated_at = NOW();

        -- Update scenario completions count
        UPDATE sim.scenarios
        SET completions_count = completions_count + 1,
            average_score = ((average_score * completions_count) + NEW.total_score) / (completions_count + 1)
        WHERE id = NEW.scenario_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating progress
CREATE TRIGGER trigger_update_progress_on_completion
    AFTER UPDATE ON sim.simulation_runs
    FOR EACH ROW
    EXECUTE FUNCTION sim.update_user_progress_on_completion();

-- Generate certificate number
CREATE OR REPLACE FUNCTION sim.generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
    cert_number TEXT;
BEGIN
    cert_number := 'PMSIM-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                   LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    RETURN cert_number;
END;
$$ LANGUAGE plpgsql;

-- Generate verification code
CREATE OR REPLACE FUNCTION sim.generate_verification_code()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION sim.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_scenarios_updated_at
    BEFORE UPDATE ON sim.scenarios
    FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at();

CREATE TRIGGER update_runs_updated_at
    BEFORE UPDATE ON sim.simulation_runs
    FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at();

CREATE TRIGGER update_progress_updated_at
    BEFORE UPDATE ON sim.user_progress
    FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at();

CREATE TRIGGER update_custom_scenarios_updated_at
    BEFORE UPDATE ON sim.custom_scenarios
    FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON sim.simulator_subscriptions
    FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at();

-- =============================================
-- VIEWS
-- =============================================

-- User Dashboard View
CREATE OR REPLACE VIEW sim.user_dashboard AS
SELECT
    u.id AS user_id,
    u.email,
    COALESCE(p.total_xp, 0) AS total_xp,
    COALESCE(p.current_level, 1) AS current_level,
    COALESCE(p.xp_to_next_level, 100) AS xp_to_next_level,
    COALESCE(p.badges, '[]'::JSONB) AS badges,
    COALESCE(p.competencies, '{}'::JSONB) AS competencies,
    COALESCE(p.completed_scenarios, 0) AS completed_scenarios,
    COALESCE(p.total_simulations, 0) AS total_simulations,
    COALESCE(p.average_score, 0) AS average_score,
    COALESCE(p.streak_days, 0) AS streak_days,
    COALESCE(p.skill_assessment_completed, false) AS skill_assessment_completed,
    COALESCE(p.onboarding_completed, false) AS onboarding_completed,
    p.preferred_role,
    (SELECT COUNT(*) FROM sim.simulation_runs r WHERE r.user_id = u.id AND r.status = 'in_progress') AS active_runs,
    (SELECT COUNT(*) FROM sim.certificates c WHERE c.user_id = u.id) AS certificates_earned
FROM auth.users u
LEFT JOIN sim.user_progress p ON u.id = p.user_id;

-- Scenario Library View
CREATE OR REPLACE VIEW sim.scenario_library AS
SELECT
    s.*,
    (SELECT COUNT(*) FROM sim.simulation_runs r WHERE r.scenario_id = s.id AND r.status = 'completed') AS total_completions,
    (SELECT AVG(r.total_score) FROM sim.simulation_runs r WHERE r.scenario_id = s.id AND r.status = 'completed') AS avg_completion_score
FROM sim.scenarios s
WHERE s.is_active = true
ORDER BY s.sort_order, s.created_at DESC;

-- =============================================
-- REGISTER TABLES IN DATABASE REGISTRY
-- =============================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.scenarios', 'Simulation scenarios for PM training', false, true),
    ('sim.scenario_phases', 'Phases within simulation scenarios', false, true),
    ('sim.simulation_runs', 'User simulation sessions and progress', false, true),
    ('sim.ai_events', 'AI-generated events during simulations', false, true),
    ('sim.module_scores', 'Scores per module/phase in simulations', false, true),
    ('sim.user_progress', 'Overall user progress and XP tracking', false, true),
    ('sim.custom_scenarios', 'User-uploaded custom scenarios', false, true),
    ('sim.certificates', 'Earned certificates and credentials', false, true),
    ('sim.leaderboard_entries', 'Leaderboard rankings and scores', false, true),
    ('sim.simulator_subscriptions', 'Simulator subscription plans', false, true),
    ('sim.scenario_packs', 'Bundled scenario packages for sale', false, true),
    ('sim.user_purchases', 'User purchase history', false, true),
    ('sim.badges', 'Achievement badge definitions', false, true),
    ('sim.user_badges', 'Badges earned by users', false, true),
    ('sim.assessment_questions', 'Skill assessment quiz questions', false, true),
    ('sim.assessment_responses', 'User responses to assessments', false, true),
    ('sim.scenario_reviews', 'User ratings and reviews of scenarios', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =============================================
-- END OF SCRIPT
-- =============================================
