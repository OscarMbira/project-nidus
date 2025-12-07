-- =============================================
-- Project Management Simulator - RLS Policies
-- Version: v67
-- Date: 2025-11-20
-- Description: Row Level Security policies for sim schema tables
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE sim.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.scenario_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.module_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.custom_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.simulator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.scenario_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.scenario_reviews ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SCENARIOS POLICIES
-- =============================================

-- Anyone can view active scenarios
CREATE POLICY "scenarios_select_active"
ON sim.scenarios FOR SELECT
USING (is_active = true);

-- Only admins can insert scenarios
CREATE POLICY "scenarios_insert_admin"
ON sim.scenarios FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('System Admin', 'Superuser')
    )
);

-- Only admins can update scenarios
CREATE POLICY "scenarios_update_admin"
ON sim.scenarios FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('System Admin', 'Superuser')
    )
);

-- =============================================
-- SCENARIO PHASES POLICIES
-- =============================================

-- Anyone can view phases for active scenarios
CREATE POLICY "phases_select_active"
ON sim.scenario_phases FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sim.scenarios s
        WHERE s.id = scenario_id AND s.is_active = true
    )
);

-- =============================================
-- SIMULATION RUNS POLICIES
-- =============================================

-- Users can view their own runs
CREATE POLICY "runs_select_own"
ON sim.simulation_runs FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own runs
CREATE POLICY "runs_insert_own"
ON sim.simulation_runs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own runs
CREATE POLICY "runs_update_own"
ON sim.simulation_runs FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own runs (soft delete preferred)
CREATE POLICY "runs_delete_own"
ON sim.simulation_runs FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- AI EVENTS POLICIES
-- =============================================

-- Users can view events for their own runs
CREATE POLICY "events_select_own_runs"
ON sim.ai_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sim.simulation_runs r
        WHERE r.id = run_id AND r.user_id = auth.uid()
    )
);

-- System can insert events (via service role)
CREATE POLICY "events_insert_service"
ON sim.ai_events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sim.simulation_runs r
        WHERE r.id = run_id AND r.user_id = auth.uid()
    )
);

-- Users can update events in their runs (for responses)
CREATE POLICY "events_update_own_runs"
ON sim.ai_events FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM sim.simulation_runs r
        WHERE r.id = run_id AND r.user_id = auth.uid()
    )
);

-- =============================================
-- MODULE SCORES POLICIES
-- =============================================

-- Users can view scores for their own runs
CREATE POLICY "scores_select_own_runs"
ON sim.module_scores FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sim.simulation_runs r
        WHERE r.id = run_id AND r.user_id = auth.uid()
    )
);

-- System can insert scores
CREATE POLICY "scores_insert_own_runs"
ON sim.module_scores FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sim.simulation_runs r
        WHERE r.id = run_id AND r.user_id = auth.uid()
    )
);

-- =============================================
-- USER PROGRESS POLICIES
-- =============================================

-- Users can view their own progress
CREATE POLICY "progress_select_own"
ON sim.user_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "progress_insert_own"
ON sim.user_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "progress_update_own"
ON sim.user_progress FOR UPDATE
USING (auth.uid() = user_id);

-- =============================================
-- CUSTOM SCENARIOS POLICIES
-- =============================================

-- Users can view their own scenarios and public ones
CREATE POLICY "custom_scenarios_select"
ON sim.custom_scenarios FOR SELECT
USING (
    auth.uid() = user_id
    OR (is_public = true AND is_approved = true)
);

-- Users can create their own scenarios
CREATE POLICY "custom_scenarios_insert_own"
ON sim.custom_scenarios FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scenarios
CREATE POLICY "custom_scenarios_update_own"
ON sim.custom_scenarios FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own scenarios
CREATE POLICY "custom_scenarios_delete_own"
ON sim.custom_scenarios FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- CERTIFICATES POLICIES
-- =============================================

-- Users can view their own certificates
CREATE POLICY "certificates_select_own"
ON sim.certificates FOR SELECT
USING (auth.uid() = user_id);

-- System can insert certificates
CREATE POLICY "certificates_insert_service"
ON sim.certificates FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- LEADERBOARD POLICIES
-- =============================================

-- Anyone can view leaderboards
CREATE POLICY "leaderboard_select_all"
ON sim.leaderboard_entries FOR SELECT
USING (true);

-- System inserts leaderboard entries
CREATE POLICY "leaderboard_insert_own"
ON sim.leaderboard_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System updates leaderboard entries
CREATE POLICY "leaderboard_update_own"
ON sim.leaderboard_entries FOR UPDATE
USING (auth.uid() = user_id);

-- =============================================
-- SUBSCRIPTIONS POLICIES
-- =============================================

-- Users can view their own subscriptions
CREATE POLICY "subscriptions_select_own"
ON sim.simulator_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- System can insert subscriptions
CREATE POLICY "subscriptions_insert_own"
ON sim.simulator_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can update subscriptions
CREATE POLICY "subscriptions_update_own"
ON sim.simulator_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- =============================================
-- SCENARIO PACKS POLICIES
-- =============================================

-- Anyone can view active packs
CREATE POLICY "packs_select_active"
ON sim.scenario_packs FOR SELECT
USING (is_active = true);

-- =============================================
-- USER PURCHASES POLICIES
-- =============================================

-- Users can view their own purchases
CREATE POLICY "purchases_select_own"
ON sim.user_purchases FOR SELECT
USING (auth.uid() = user_id);

-- System can insert purchases
CREATE POLICY "purchases_insert_own"
ON sim.user_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- BADGES POLICIES
-- =============================================

-- Anyone can view active badges
CREATE POLICY "badges_select_active"
ON sim.badges FOR SELECT
USING (is_active = true);

-- =============================================
-- USER BADGES POLICIES
-- =============================================

-- Users can view their own badges
CREATE POLICY "user_badges_select_own"
ON sim.user_badges FOR SELECT
USING (auth.uid() = user_id);

-- System can insert badges
CREATE POLICY "user_badges_insert_own"
ON sim.user_badges FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ASSESSMENT QUESTIONS POLICIES
-- =============================================

-- Anyone can view active questions
CREATE POLICY "questions_select_active"
ON sim.assessment_questions FOR SELECT
USING (is_active = true);

-- =============================================
-- ASSESSMENT RESPONSES POLICIES
-- =============================================

-- Users can view their own responses
CREATE POLICY "responses_select_own"
ON sim.assessment_responses FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "responses_insert_own"
ON sim.assessment_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- SCENARIO REVIEWS POLICIES
-- =============================================

-- Anyone can view reviews
CREATE POLICY "reviews_select_all"
ON sim.scenario_reviews FOR SELECT
USING (true);

-- Users can create reviews
CREATE POLICY "reviews_insert_own"
ON sim.scenario_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "reviews_update_own"
ON sim.scenario_reviews FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "reviews_delete_own"
ON sim.scenario_reviews FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- END OF SCRIPT
-- =============================================
