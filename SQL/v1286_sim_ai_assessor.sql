-- ============================================================================
-- v1286: Simulator AI Assessor (PRD D14, stories 46–48; plan SQL #15). sim schema only.
--
--   * sim.scenario_rubrics — criteria per scenario: weight and a descriptor for each level 1–4.
--     Written by scenario authors in Admin → AI Centre → Assessor Calibration (Admin SQL v239).
--   * sim.ai_assessments — the Assessor's scores at a decision point or at run end, with a reason
--     and evidence per criterion. Advisory by default. Written only by the sim-ai-assess edge
--     function (service role, after checking the run belongs to the caller); learners read their own.
--   * sim.ai_assessment_flags — a learner disagrees with an assessment (feeds calibration).
--   * sim.ai_assessment_calibration — an author's own levels for an assessment (Admin only).
--   * sim.scenarios: assessor_counts + assessor_weight (0–100%). Admin can switch a scenario to
--     "counts toward score" only once it is calibrated: ≥ 30 author-scored assessments with ≥ 80%
--     of criterion levels within ±1 of the author (enforced in Admin SQL v239).
--   * sim.ai_run_score(run_id) — the run's score for certificates: the rule-based score, blended
--     with the Assessor's run-end score only when the scenario counts it.
-- Prerequisites: v66 (sim core), v1272. Idempotent.
-- ============================================================================

ALTER TABLE sim.scenarios
  ADD COLUMN IF NOT EXISTS assessor_counts BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assessor_weight NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE sim.scenarios DROP CONSTRAINT IF EXISTS scenarios_assessor_weight_range;
ALTER TABLE sim.scenarios ADD CONSTRAINT scenarios_assessor_weight_range CHECK (assessor_weight BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS sim.scenario_rubrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id   UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
  criterion_key TEXT NOT NULL CHECK (criterion_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  title         TEXT NOT NULL,
  description   TEXT,
  weight        NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (weight > 0),
  levels        JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(levels) = 'array'),  -- [{level:1..4, descriptor}]
  applies_to    TEXT NOT NULL DEFAULT 'both' CHECK (applies_to IN ('decision', 'run_end', 'both')),
  sort_order    INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin UUID,
  UNIQUE (scenario_id, criterion_key)
);

CREATE TABLE IF NOT EXISTS sim.ai_assessments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id             UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id        UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
  assessment_point   TEXT NOT NULL CHECK (assessment_point IN ('decision', 'run_end')),
  ai_event_id        UUID REFERENCES sim.ai_events(id) ON DELETE SET NULL,
  criteria           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{criterion_key, level, reason, evidence:[{type,id,quote}]}]
  overall_score      NUMERIC(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  summary            TEXT,
  model              TEXT,
  counts_toward_score BOOLEAN NOT NULL DEFAULT FALSE,   -- snapshot of the scenario switch when scored
  weight             NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_assessments_run ON sim.ai_assessments (run_id);
CREATE INDEX IF NOT EXISTS idx_ai_assessments_scenario ON sim.ai_assessments (scenario_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_assessments_decision ON sim.ai_assessments (ai_event_id) WHERE ai_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_assessments_run_end ON sim.ai_assessments (run_id) WHERE assessment_point = 'run_end';

CREATE TABLE IF NOT EXISTS sim.ai_assessment_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES sim.ai_assessments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criterion_key TEXT,
  reason        TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 2000),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upheld', 'dismissed')),
  review_note   TEXT,
  reviewed_by_admin UUID,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_assessment_flags_assessment ON sim.ai_assessment_flags (assessment_id);

CREATE TABLE IF NOT EXISTS sim.ai_assessment_calibration (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id    UUID NOT NULL REFERENCES sim.ai_assessments(id) ON DELETE CASCADE,
  author_admin_id  UUID NOT NULL,
  author_levels    JSONB NOT NULL,          -- {criterion_key: level}
  author_overall   NUMERIC(5,2),
  agreement        NUMERIC(5,2),            -- % of criteria within ±1 level of the Assessor
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, author_admin_id)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE sim.scenario_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_assessment_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_assessment_calibration ENABLE ROW LEVEL SECURITY;

-- Learners may read a scenario's rubric (it explains how they are assessed).
DROP POLICY IF EXISTS sim_scenario_rubrics_read ON sim.scenario_rubrics;
CREATE POLICY sim_scenario_rubrics_read ON sim.scenario_rubrics FOR SELECT TO authenticated USING (is_active);

DROP POLICY IF EXISTS sim_ai_assessments_owner_read ON sim.ai_assessments;
CREATE POLICY sim_ai_assessments_owner_read ON sim.ai_assessments FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS sim_ai_assessment_flags_owner ON sim.ai_assessment_flags;
CREATE POLICY sim_ai_assessment_flags_owner ON sim.ai_assessment_flags FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS sim_ai_assessment_flags_insert ON sim.ai_assessment_flags;
CREATE POLICY sim_ai_assessment_flags_insert ON sim.ai_assessment_flags FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open'
              AND EXISTS (SELECT 1 FROM sim.ai_assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));
-- No client policies on calibration: Admin RPCs only.

GRANT SELECT ON sim.scenario_rubrics, sim.ai_assessments TO authenticated;
GRANT SELECT, INSERT ON sim.ai_assessment_flags TO authenticated;
GRANT ALL ON sim.scenario_rubrics, sim.ai_assessments, sim.ai_assessment_flags, sim.ai_assessment_calibration TO service_role;

-- ── Run score for certificates ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sim.ai_run_score(p_run_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = sim, public
AS $$
  -- base = the rule-based score as a percentage of the run's maximum
  SELECT jsonb_build_object(
    'base', b.pct,
    'assessor', a.overall_score,
    'weight', CASE WHEN s.assessor_counts AND a.id IS NOT NULL THEN s.assessor_weight ELSE 0 END,
    'score', CASE WHEN s.assessor_counts AND a.id IS NOT NULL
                  THEN ROUND(b.pct * (100 - s.assessor_weight) / 100 + a.overall_score * s.assessor_weight / 100)
                  ELSE b.pct END)
    FROM sim.simulation_runs r
    CROSS JOIN LATERAL (SELECT ROUND(CASE WHEN COALESCE(r.max_possible_score, 0) > 0
                                          THEN COALESCE(r.total_score, 0) * 100.0 / r.max_possible_score
                                          ELSE COALESCE(r.total_score, 0) END) AS pct) b
    JOIN sim.scenarios s ON s.id = r.scenario_id
    LEFT JOIN sim.ai_assessments a ON a.run_id = r.id AND a.assessment_point = 'run_end'
   WHERE r.id = p_run_id;
$$;
GRANT EXECUTE ON FUNCTION sim.ai_run_score(UUID) TO authenticated, service_role;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.scenario_rubrics', 'Simulator: AI Assessor rubric criteria per scenario, with level descriptors (v1286)', false, true),
  ('sim.ai_assessments', 'Simulator: AI Assessor scores per decision and per run, with reasons and evidence (v1286)', false, true),
  ('sim.ai_assessment_flags', 'Simulator: learner disagreements with AI Assessor results (v1286)', false, true),
  ('sim.ai_assessment_calibration', 'Simulator: scenario authors'' own scores used to calibrate the AI Assessor (v1286)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1286_sim_ai_assessor.sql completed — run v1286_sim_ai_assessor_tests.sql'; END $$;
