-- =============================================================================
-- v646_pmis_gap_tables_simulator.sql
-- PMIS Gap Analysis (v631) — Simulator tables: GAP-26 to GAP-29 (sim schema)
-- Prerequisites: v66 (sim core), v643 (set_pmis_updated_at optional)
-- No seed data.
-- =============================================================================

-- ── GAP-26: Multiplayer Simulation ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.multiplayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_code VARCHAR(12) NOT NULL,
  session_status VARCHAR(30) NOT NULL DEFAULT 'lobby'
    CHECK (session_status IN ('lobby', 'active', 'completed', 'cancelled')),
  max_players INTEGER NOT NULL DEFAULT 6,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  session_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_multiplayer_sessions_code UNIQUE (session_code)
);

CREATE INDEX IF NOT EXISTS idx_multiplayer_sessions_host ON sim.multiplayer_sessions (host_user_id);
CREATE INDEX IF NOT EXISTS idx_multiplayer_sessions_scenario ON sim.multiplayer_sessions (scenario_id);

CREATE TABLE IF NOT EXISTS sim.multiplayer_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sim.multiplayer_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_role VARCHAR(60) NOT NULL,
  role_score NUMERIC(8,2),
  team_score NUMERIC(8,2),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  CONSTRAINT uq_multiplayer_participants UNIQUE (session_id, user_id)
);

-- ── GAP-27: Certification Exam Mode ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.certification_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_code VARCHAR(60) NOT NULL,
  exam_title VARCHAR(255) NOT NULL,
  scenario_id UUID REFERENCES sim.scenarios(id) ON DELETE SET NULL,
  pass_mark_pct NUMERIC(5,2) NOT NULL DEFAULT 70,
  time_limit_minutes INTEGER,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_certification_exams_code UNIQUE (exam_code)
);

CREATE TABLE IF NOT EXISTS sim.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES sim.certification_exams(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL DEFAULT 1,
  question_text TEXT NOT NULL,
  question_type VARCHAR(30) NOT NULL DEFAULT 'decision'
    CHECK (question_type IN ('decision', 'multiple_choice', 'scenario_event')),
  correct_answer JSONB,
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES sim.certification_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score_pct NUMERIC(5,2),
  pass_fail VARCHAR(10) CHECK (pass_fail IN ('pass', 'fail', 'pending')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON sim.exam_attempts (user_id, exam_id);

CREATE TABLE IF NOT EXISTS sim.exam_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES sim.exam_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number VARCHAR(40) NOT NULL,
  verification_code VARCHAR(64) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_exam_certificates_attempt UNIQUE (attempt_id),
  CONSTRAINT uq_exam_certificates_number UNIQUE (certificate_number)
);

-- ── GAP-28: Scenario Marketplace ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.scenario_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
  listing_title VARCHAR(255) NOT NULL,
  listing_description TEXT,
  industry_vertical VARCHAR(80),
  difficulty_level VARCHAR(30),
  duration_minutes INTEGER,
  price_tier VARCHAR(30) NOT NULL DEFAULT 'free'
    CHECK (price_tier IN ('free', 'premium', 'corporate_pack')),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_by UUID REFERENCES auth.users(id),
  average_rating NUMERIC(3,2),
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_scenario_marketplace_listing UNIQUE (scenario_id)
);

-- Extend existing sim.scenario_reviews for marketplace listings (v66)
ALTER TABLE sim.scenario_reviews
  ADD COLUMN IF NOT EXISTS marketplace_listing_id UUID
    REFERENCES sim.scenario_marketplace_listings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_scenario_reviews_marketplace
  ON sim.scenario_reviews (marketplace_listing_id) WHERE marketplace_listing_id IS NOT NULL;

-- ── GAP-29: Cross-Run Analytics ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.cross_run_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES sim.scenarios(id) ON DELETE SET NULL,
  run_count INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(8,2),
  best_score NUMERIC(8,2),
  score_trend JSONB NOT NULL DEFAULT '[]'::jsonb,
  weak_categories JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cross_run_analytics_user_scenario UNIQUE (user_id, scenario_id)
);

CREATE TABLE IF NOT EXISTS sim.improvement_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_id UUID REFERENCES sim.cross_run_analytics(id) ON DELETE CASCADE,
  insight_category VARCHAR(60) NOT NULL,
  insight_title VARCHAR(255) NOT NULL,
  insight_body TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_improvement_insights_user ON sim.improvement_insights (user_id) WHERE is_dismissed = FALSE;

-- ── Triggers (sim.update_updated_at from v66) ──────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'multiplayer_sessions', 'multiplayer_participants',
    'certification_exams', 'exam_questions', 'exam_attempts',
    'scenario_marketplace_listings', 'cross_run_analytics', 'improvement_insights'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sim_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_sim_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE sim.multiplayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.multiplayer_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.certification_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.exam_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.scenario_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.cross_run_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.improvement_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_multiplayer_sessions ON sim.multiplayer_sessions;
CREATE POLICY policy_multiplayer_sessions ON sim.multiplayer_sessions FOR ALL TO authenticated
  USING (host_user_id = auth.uid() OR EXISTS (SELECT 1 FROM sim.multiplayer_participants mp WHERE mp.session_id = multiplayer_sessions.id AND mp.user_id = auth.uid()))
  WITH CHECK (host_user_id = auth.uid());

DROP POLICY IF EXISTS policy_multiplayer_participants ON sim.multiplayer_participants;
CREATE POLICY policy_multiplayer_participants ON sim.multiplayer_participants FOR ALL TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM sim.multiplayer_sessions ms WHERE ms.id = multiplayer_participants.session_id AND ms.host_user_id = auth.uid()));

DROP POLICY IF EXISTS policy_certification_exams_read ON sim.certification_exams;
CREATE POLICY policy_certification_exams_read ON sim.certification_exams FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS policy_exam_questions_read ON sim.exam_questions;
CREATE POLICY policy_exam_questions_read ON sim.exam_questions FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_exam_attempts_own ON sim.exam_attempts;
CREATE POLICY policy_exam_attempts_own ON sim.exam_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS policy_exam_certificates_own ON sim.exam_certificates;
CREATE POLICY policy_exam_certificates_own ON sim.exam_certificates FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS policy_marketplace_listings_read ON sim.scenario_marketplace_listings;
CREATE POLICY policy_marketplace_listings_read ON sim.scenario_marketplace_listings FOR SELECT TO authenticated USING (is_published = TRUE);

DROP POLICY IF EXISTS policy_cross_run_analytics_own ON sim.cross_run_analytics;
CREATE POLICY policy_cross_run_analytics_own ON sim.cross_run_analytics FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS policy_improvement_insights_own ON sim.improvement_insights;
CREATE POLICY policy_improvement_insights_own ON sim.improvement_insights FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sim TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.multiplayer_sessions', 'Multiplayer simulation session hosts (GAP-26)', false, true),
  ('sim.multiplayer_participants', 'Players in multiplayer sessions (GAP-26)', false, true),
  ('sim.certification_exams', 'Simulator certification exam definitions (GAP-27)', false, true),
  ('sim.exam_questions', 'Questions per certification exam (GAP-27)', false, true),
  ('sim.exam_attempts', 'User exam attempt records (GAP-27)', false, true),
  ('sim.exam_certificates', 'Certificates issued on exam pass (GAP-27)', false, true),
  ('sim.scenario_marketplace_listings', 'Marketplace scenario listings (GAP-28)', false, true),
  ('sim.cross_run_analytics', 'Cross-run score analytics per user (GAP-29)', false, true),
  ('sim.improvement_insights', 'AI coaching improvement insights (GAP-29)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v646_pmis_gap_tables_simulator.sql completed'; END $$;
