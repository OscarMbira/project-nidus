-- =============================================================================
-- v461_sim_planning_tables.sql
-- Simulator mirror of all Planning Intelligence Module tables
-- Simulator: sim schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. sim.plan_scenarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_scenarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id   UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  scenario_type         TEXT NOT NULL DEFAULT 'custom'
                          CHECK (scenario_type IN (
                            'best_case','most_likely','worst_case',
                            'recovery','accelerated','constrained_resource','custom'
                          )),
  name                  TEXT NOT NULL,
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','active','promoted','archived')),
  is_baseline           BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_from_id      UUID REFERENCES sim.plan_scenarios(id) ON DELETE SET NULL,
  milestone_delta_days  INTEGER DEFAULT 0,
  cost_delta            NUMERIC(18,2) DEFAULT 0,
  is_draft              BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at      TIMESTAMPTZ,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_plan_scenario_name UNIQUE (practice_project_id, name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. sim.plan_scenario_task_snapshots
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_scenario_task_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         UUID NOT NULL REFERENCES sim.plan_scenarios(id) ON DELETE CASCADE,
  task_name           TEXT NOT NULL,
  start_date          DATE,
  end_date            DATE,
  duration_days       INTEGER,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  is_milestone        BOOLEAN NOT NULL DEFAULT FALSE,
  is_critical_path    BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_level    INTEGER DEFAULT 50 CHECK (confidence_level BETWEEN 0 AND 100),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. sim.plan_intelligence_rules
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_intelligence_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code        TEXT NOT NULL UNIQUE,
  rule_name        TEXT NOT NULL,
  rule_description TEXT,
  severity         TEXT NOT NULL DEFAULT 'warning'
                     CHECK (severity IN ('info','warning','error')),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to       TEXT NOT NULL DEFAULT 'task'
                     CHECK (applies_to IN ('task','milestone','schedule','portfolio')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. sim.plan_intelligence_findings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_intelligence_findings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  rule_id      UUID NOT NULL REFERENCES sim.plan_intelligence_rules(id) ON DELETE CASCADE,
  finding_text TEXT NOT NULL,
  severity     TEXT NOT NULL CHECK (severity IN ('info','warning','error')),
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','acknowledged','resolved')),
  scanned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. sim.plan_health_scores
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_health_scores (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id       UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  scored_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score             INTEGER NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  logic_quality             INTEGER NOT NULL DEFAULT 0 CHECK (logic_quality BETWEEN 0 AND 100),
  dependency_completeness   INTEGER NOT NULL DEFAULT 0 CHECK (dependency_completeness BETWEEN 0 AND 100),
  milestone_realism         INTEGER NOT NULL DEFAULT 0 CHECK (milestone_realism BETWEEN 0 AND 100),
  critical_path_stability   INTEGER NOT NULL DEFAULT 0 CHECK (critical_path_stability BETWEEN 0 AND 100),
  baseline_discipline       INTEGER NOT NULL DEFAULT 0 CHECK (baseline_discipline BETWEEN 0 AND 100),
  resource_feasibility      INTEGER NOT NULL DEFAULT 0 CHECK (resource_feasibility BETWEEN 0 AND 100),
  scope_traceability        INTEGER NOT NULL DEFAULT 0 CHECK (scope_traceability BETWEEN 0 AND 100),
  risk_exposure             INTEGER NOT NULL DEFAULT 0 CHECK (risk_exposure BETWEEN 0 AND 100),
  change_pressure           INTEGER NOT NULL DEFAULT 0 CHECK (change_pressure BETWEEN 0 AND 100),
  governance_readiness      INTEGER NOT NULL DEFAULT 0 CHECK (governance_readiness BETWEEN 0 AND 100),
  score_delta               INTEGER DEFAULT 0,
  summary_notes             TEXT,
  findings_count            INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. sim.plan_pbs_nodes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_pbs_nodes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id  UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  parent_id            UUID REFERENCES sim.plan_pbs_nodes(id) ON DELETE CASCADE,
  node_code            TEXT,
  name                 TEXT NOT NULL,
  description          TEXT,
  product_type         TEXT NOT NULL DEFAULT 'product'
                         CHECK (product_type IN ('product','sub-product','component')),
  quality_criteria     TEXT,
  acceptance_criteria  TEXT,
  status               TEXT NOT NULL DEFAULT 'not_started'
                         CHECK (status IN (
                           'not_started','in_progress','under_review','approved','rejected'
                         )),
  sort_order           INTEGER DEFAULT 0,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. sim.plan_pfd_edges
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_pfd_edges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  from_node_id      UUID NOT NULL REFERENCES sim.plan_pbs_nodes(id) ON DELETE CASCADE,
  to_node_id        UUID NOT NULL REFERENCES sim.plan_pbs_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'produces'
                      CHECK (relationship_type IN ('produces','requires','approves','feeds_into')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_pfd_edge UNIQUE (from_node_id, to_node_id, relationship_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. sim.plan_ai_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_ai_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id  UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  prompt_text          TEXT NOT NULL,
  industry_template    TEXT,
  generated_phases     JSONB,
  generated_milestones JSONB,
  generated_tasks      JSONB,
  generated_risks      JSONB,
  ai_assumptions       TEXT,
  ai_explanation       TEXT,
  status               TEXT NOT NULL DEFAULT 'generated'
                         CHECK (status IN ('generated','accepted','modified','rejected')),
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. sim.plan_recovery_options
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_recovery_options (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id   UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  trigger_type          TEXT NOT NULL
                          CHECK (trigger_type IN (
                            'milestone_slippage','resource_overload',
                            'budget_overrun','risk_materialised'
                          )),
  strategy              TEXT NOT NULL
                          CHECK (strategy IN (
                            'fast_track','crash','scope_defer','resequence',
                            'parallelise','wave_split','alternate_resource'
                          )),
  strategy_description  TEXT NOT NULL,
  schedule_saving_days  INTEGER DEFAULT 0,
  cost_impact           NUMERIC(18,2) DEFAULT 0,
  risk_impact           TEXT,
  status                TEXT NOT NULL DEFAULT 'suggested'
                          CHECK (status IN (
                            'suggested','under_review','approved','applied','rejected'
                          )),
  generated_by_ai       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. sim.plan_confidence_forecasts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_confidence_forecasts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id   UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  confidence_pct        INTEGER NOT NULL DEFAULT 50 CHECK (confidence_pct BETWEEN 0 AND 100),
  optimistic_date       DATE,
  likely_date           DATE,
  pessimistic_date      DATE,
  uncertainty_band_days INTEGER DEFAULT 0,
  basis_notes           TEXT,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. sim.plan_governance_rules
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_governance_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_name       TEXT NOT NULL UNIQUE,
  gate_description TEXT,
  required_before TEXT NOT NULL DEFAULT 'execution_start'
                    CHECK (required_before IN ('execution_start','go_live','project_close')),
  check_type      TEXT NOT NULL
                    CHECK (check_type IN (
                      'milestone_exists','risk_review_done',
                      'approval_obtained','readiness_gate'
                    )),
  is_mandatory    BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. sim.plan_governance_findings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_governance_findings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  rule_id             UUID NOT NULL REFERENCES sim.plan_governance_rules(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','compliant','non_compliant','waived')),
  last_checked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_governance_finding UNIQUE (practice_project_id, rule_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. sim.plan_collision_alerts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.plan_collision_alerts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collision_type       TEXT NOT NULL
                         CHECK (collision_type IN (
                           'resource_overlap','milestone_clash',
                           'environment_clash','vendor_bottleneck','budget_concentration'
                         )),
  practice_project_a_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  practice_project_b_id UUID REFERENCES sim.practice_projects(id) ON DELETE SET NULL,
  conflict_start_date  DATE,
  conflict_end_date    DATE,
  description          TEXT NOT NULL,
  severity             TEXT NOT NULL DEFAULT 'warning'
                         CHECK (severity IN ('info','warning','critical')),
  status               TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open','acknowledged','resolved')),
  detected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Indexes — all sim tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sim_scenarios_project         ON sim.plan_scenarios(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_snapshots_scenario        ON sim.plan_scenario_task_snapshots(scenario_id);
CREATE INDEX IF NOT EXISTS idx_sim_intel_findings_project    ON sim.plan_intelligence_findings(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_health_project            ON sim.plan_health_scores(practice_project_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_pbs_project               ON sim.plan_pbs_nodes(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_pfd_project               ON sim.plan_pfd_edges(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_ai_sessions_project       ON sim.plan_ai_sessions(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_recovery_project          ON sim.plan_recovery_options(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_confidence_project        ON sim.plan_confidence_forecasts(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_gov_findings_project      ON sim.plan_governance_findings(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_collision_project_a       ON sim.plan_collision_alerts(practice_project_a_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. RLS — enable on all sim planning tables (users see own practice project data)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sim.plan_scenarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_scenario_task_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_intelligence_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_intelligence_findings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_health_scores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_pbs_nodes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_pfd_edges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_ai_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_recovery_options       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_confidence_forecasts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_governance_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_governance_findings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.plan_collision_alerts       ENABLE ROW LEVEL SECURITY;

-- Scenarios: user owns the practice project
CREATE POLICY sim_scenarios_all ON sim.plan_scenarios
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_scenarios.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_snapshots_all ON sim.plan_scenario_task_snapshots
  USING (
    EXISTS (
      SELECT 1 FROM sim.plan_scenarios ps
      JOIN sim.practice_projects pp ON pp.id = ps.practice_project_id
      WHERE ps.id = plan_scenario_task_snapshots.scenario_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_intel_rules_all ON sim.plan_intelligence_rules FOR SELECT USING (TRUE);

CREATE POLICY sim_intel_findings_all ON sim.plan_intelligence_findings
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_intelligence_findings.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_health_all ON sim.plan_health_scores
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_health_scores.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_pbs_all ON sim.plan_pbs_nodes
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_pbs_nodes.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_pfd_all ON sim.plan_pfd_edges
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_pfd_edges.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_ai_sessions_all ON sim.plan_ai_sessions
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_ai_sessions.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_recovery_all ON sim.plan_recovery_options
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_recovery_options.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_confidence_all ON sim.plan_confidence_forecasts
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_confidence_forecasts.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_gov_rules_all ON sim.plan_governance_rules FOR SELECT USING (TRUE);

CREATE POLICY sim_gov_findings_all ON sim.plan_governance_findings
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_governance_findings.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_collision_all ON sim.plan_collision_alerts
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = plan_collision_alerts.practice_project_a_id
        AND pp.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. Seed sim intelligence rules (mirror of public rules)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO sim.plan_intelligence_rules (rule_code, rule_name, rule_description, severity, applies_to)
SELECT rule_code, rule_name, rule_description, severity, applies_to
FROM public.plan_intelligence_rules
WHERE organisation_id IS NULL
ON CONFLICT (rule_code) DO NOTHING;

-- Seed sim governance rules (mirror of public rules)
INSERT INTO sim.plan_governance_rules
  (gate_name, gate_description, required_before, check_type, is_mandatory)
SELECT gate_name, gate_description, required_before, check_type, is_mandatory
FROM public.plan_governance_rules
WHERE organisation_id IS NULL
ON CONFLICT (gate_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.plan_scenarios',               'Sim: What-if schedule scenarios per practice project',                          FALSE, TRUE),
  ('sim.plan_scenario_task_snapshots', 'Sim: Frozen task snapshots for scenario exploration',                           FALSE, TRUE),
  ('sim.plan_intelligence_rules',      'Sim: Quality scan rules for practice project schedules',                        FALSE, TRUE),
  ('sim.plan_intelligence_findings',   'Sim: Diagnostic findings from planning intelligence scans',                     FALSE, TRUE),
  ('sim.plan_health_scores',           'Sim: Schedule health scores for practice projects',                             FALSE, TRUE),
  ('sim.plan_pbs_nodes',               'Sim: Product Breakdown Structure nodes for practice projects',                  FALSE, TRUE),
  ('sim.plan_pfd_edges',               'Sim: Product Flow Diagram edges for practice projects',                         FALSE, TRUE),
  ('sim.plan_ai_sessions',             'Sim: AI-generated plan sessions for practice projects',                         FALSE, TRUE),
  ('sim.plan_recovery_options',        'Sim: Recovery strategies for distressed practice projects',                     FALSE, TRUE),
  ('sim.plan_confidence_forecasts',    'Sim: Three-point probability forecasts for practice project milestones',         FALSE, TRUE),
  ('sim.plan_governance_rules',        'Sim: Governance gate rules for practice projects',                              FALSE, TRUE),
  ('sim.plan_governance_findings',     'Sim: Gate compliance status for practice projects',                             FALSE, TRUE),
  ('sim.plan_collision_alerts',        'Sim: Cross-project conflict alerts for practice projects',                      FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();
