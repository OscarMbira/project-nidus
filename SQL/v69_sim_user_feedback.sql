-- ============================================================================
-- PM Simulator User Feedback Table
-- Version: v69
-- Description: User feedback collection for quality testing and calibration
-- ============================================================================

-- User Feedback Table
CREATE TABLE IF NOT EXISTS sim.user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_run_id UUID REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES sim.scenarios(id) ON DELETE SET NULL,
  
  -- Event Quality Ratings (1-5 scale)
  event_realism_rating INTEGER CHECK (event_realism_rating BETWEEN 1 AND 5),
  event_relevance_rating INTEGER CHECK (event_relevance_rating BETWEEN 1 AND 5),
  event_challenge_rating INTEGER CHECK (event_challenge_rating BETWEEN 1 AND 5),
  event_educational_rating INTEGER CHECK (event_educational_rating BETWEEN 1 AND 5),
  option_quality_rating INTEGER CHECK (option_quality_rating BETWEEN 1 AND 5),
  
  -- Overall Experience Ratings
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  difficulty_appropriate BOOLEAN,
  feedback_helpful BOOLEAN,
  hints_helpful BOOLEAN,
  
  -- AI-Specific Ratings (if applicable)
  ai_event_quality_rating INTEGER CHECK (ai_event_quality_rating BETWEEN 1 AND 5),
  ai_feedback_quality_rating INTEGER CHECK (ai_feedback_quality_rating BETWEEN 1 AND 5),
  ai_hints_quality_rating INTEGER CHECK (ai_hints_quality_rating BETWEEN 1 AND 5),
  
  -- Open Feedback
  positive_feedback TEXT,
  negative_feedback TEXT,
  suggestions TEXT,
  bug_reports TEXT,
  
  -- Metadata
  feedback_type VARCHAR(50) CHECK (feedback_type IN ('event', 'scenario', 'overall', 'ai_quality')),
  feedback_context JSONB DEFAULT '{}'::jsonb, -- Additional context data
  is_anonymous BOOLEAN DEFAULT false,
  
  -- Standard audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON sim.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_scenario_id ON sim.user_feedback(scenario_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_run_id ON sim.user_feedback(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON sim.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON sim.user_feedback(created_at DESC);

-- RLS Policies
ALTER TABLE sim.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON sim.user_feedback
  FOR SELECT
  USING (auth.uid() = user_id OR is_anonymous = true);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON sim.user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON sim.user_feedback
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access"
  ON sim.user_feedback
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Feedback Summary View
-- ============================================================================
CREATE OR REPLACE VIEW sim.feedback_summary AS
SELECT 
  feedback_type,
  COUNT(*) as total_feedback,
  AVG(overall_rating) as avg_overall_rating,
  AVG(event_realism_rating) as avg_realism,
  AVG(event_relevance_rating) as avg_relevance,
  AVG(event_challenge_rating) as avg_challenge,
  AVG(event_educational_rating) as avg_educational,
  AVG(option_quality_rating) as avg_option_quality,
  AVG(ai_event_quality_rating) as avg_ai_event_quality,
  AVG(ai_feedback_quality_rating) as avg_ai_feedback_quality,
  AVG(ai_hints_quality_rating) as avg_ai_hints_quality,
  COUNT(CASE WHEN would_recommend = true THEN 1 END) as recommend_count,
  COUNT(CASE WHEN difficulty_appropriate = true THEN 1 END) as appropriate_count,
  COUNT(CASE WHEN feedback_helpful = true THEN 1 END) as helpful_count,
  COUNT(CASE WHEN hints_helpful = true THEN 1 END) as hints_helpful_count
FROM sim.user_feedback
GROUP BY feedback_type;

-- ============================================================================
-- Scenario Feedback View
-- ============================================================================
CREATE OR REPLACE VIEW sim.scenario_feedback_summary AS
SELECT 
  s.id as scenario_id,
  s.name as scenario_name,
  s.difficulty_level,
  COUNT(f.id) as feedback_count,
  AVG(f.overall_rating) as avg_rating,
  AVG(f.event_realism_rating) as avg_realism,
  AVG(f.event_relevance_rating) as avg_relevance,
  AVG(f.event_challenge_rating) as avg_challenge,
  AVG(f.event_educational_rating) as avg_educational,
  AVG(f.option_quality_rating) as avg_option_quality,
  COUNT(CASE WHEN f.would_recommend = true THEN 1 END) as recommend_count,
  COUNT(CASE WHEN f.difficulty_appropriate = true THEN 1 END) as appropriate_count
FROM sim.scenarios s
LEFT JOIN sim.user_feedback f ON s.id = f.scenario_id
GROUP BY s.id, s.name, s.difficulty_level;

-- ============================================================================
-- Register table in database_tables registry
-- ============================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.user_feedback', 'User feedback for quality testing and calibration', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'User feedback table created successfully';
  RAISE NOTICE 'Feedback summary views created';
END $$;

