-- =============================================================================
-- v463_sim_micro_plans.sql
-- Simulator mirror of all Micro-Plans tables (sim schema)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. sim.project_micro_plans
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.project_micro_plans (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id    UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  plan_reference         TEXT NOT NULL,
  plan_name              TEXT NOT NULL,
  plan_type              TEXT NOT NULL DEFAULT 'team_delivery'
                           CHECK (plan_type IN (
                             'team_delivery','quality','risk_response','test',
                             'procurement','communications','stakeholder_engagement',
                             'change_management','resource','custom'
                           )),
  description            TEXT,
  objectives             TEXT,
  scope_in               TEXT,
  scope_out              TEXT,
  assumptions            TEXT,
  constraints            TEXT,
  responsible_team       TEXT,
  owner_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at            TIMESTAMPTZ,
  approval_notes         TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN (
                             'draft','active','under_review','approved','superseded','archived'
                           )),
  version_number         TEXT NOT NULL DEFAULT '1.0',
  review_frequency       TEXT DEFAULT 'weekly',
  next_review_date       DATE,
  overall_rag            TEXT DEFAULT 'green'
                           CHECK (overall_rag IN ('green','amber','red')),
  overall_progress_pct   INTEGER DEFAULT 0 CHECK (overall_progress_pct BETWEEN 0 AND 100),
  tags                   TEXT[],
  is_draft               BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at       TIMESTAMPTZ,
  is_deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_micro_plan_reference UNIQUE (practice_project_id, plan_reference)
);

-- auto-reference trigger
CREATE OR REPLACE FUNCTION sim.trg_fn_sim_micro_plan_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.plan_reference IS NOT NULL AND NEW.plan_reference != '' THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) + 1 INTO v_count
  FROM sim.project_micro_plans
  WHERE practice_project_id = NEW.practice_project_id;
  NEW.plan_reference := 'MPL-' || LPAD(v_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_micro_plan_reference ON sim.project_micro_plans;
CREATE TRIGGER trg_sim_micro_plan_reference
  BEFORE INSERT ON sim.project_micro_plans
  FOR EACH ROW EXECUTE FUNCTION sim.trg_fn_sim_micro_plan_reference();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. sim.micro_plan_activities
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.micro_plan_activities (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  micro_plan_id            UUID NOT NULL REFERENCES sim.project_micro_plans(id) ON DELETE CASCADE,
  practice_project_id      UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  activity_reference       TEXT NOT NULL,
  activity_name            TEXT NOT NULL,
  description              TEXT,
  category                 TEXT DEFAULT 'other',
  priority                 TEXT DEFAULT 'medium'
                             CHECK (priority IN ('critical','high','medium','low')),
  owner_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  planned_start_date       DATE,
  planned_end_date         DATE,
  planned_duration_days    INTEGER,
  actual_start_date        DATE,
  actual_end_date          DATE,
  actual_duration_days     INTEGER,
  progress_pct             INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  status                   TEXT DEFAULT 'not_started'
                             CHECK (status IN (
                               'not_started','in_progress','on_hold',
                               'completed','cancelled','deferred'
                             )),
  rag_status               TEXT DEFAULT 'green'
                             CHECK (rag_status IN ('green','amber','red')),
  is_milestone             BOOLEAN NOT NULL DEFAULT FALSE,
  is_critical              BOOLEAN NOT NULL DEFAULT FALSE,
  deliverable_output       TEXT,
  notes                    TEXT,
  sort_order               INTEGER DEFAULT 0,
  is_deleted               BOOLEAN NOT NULL DEFAULT FALSE,
  created_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_activity_reference UNIQUE (micro_plan_id, activity_reference)
);

-- auto-reference trigger
CREATE OR REPLACE FUNCTION sim.trg_fn_sim_activity_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.activity_reference IS NOT NULL AND NEW.activity_reference != '' THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) + 1 INTO v_count
  FROM sim.micro_plan_activities
  WHERE micro_plan_id = NEW.micro_plan_id;
  NEW.activity_reference := 'MPA-' || LPAD(v_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_activity_reference ON sim.micro_plan_activities;
CREATE TRIGGER trg_sim_activity_reference
  BEFORE INSERT ON sim.micro_plan_activities
  FOR EACH ROW EXECUTE FUNCTION sim.trg_fn_sim_activity_reference();

-- plan progress recalc trigger
CREATE OR REPLACE FUNCTION sim.trg_fn_sim_update_plan_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_plan_id   UUID;
  v_avg_pct   INTEGER;
  v_rag       TEXT;
  v_red_cnt   INTEGER;
  v_amber_cnt INTEGER;
BEGIN
  v_plan_id := COALESCE(NEW.micro_plan_id, OLD.micro_plan_id);
  SELECT
    COALESCE(AVG(progress_pct)::INTEGER, 0),
    COUNT(*) FILTER (WHERE rag_status = 'red'),
    COUNT(*) FILTER (WHERE rag_status = 'amber')
  INTO v_avg_pct, v_red_cnt, v_amber_cnt
  FROM sim.micro_plan_activities
  WHERE micro_plan_id = v_plan_id AND is_deleted IS NOT TRUE;

  v_rag := CASE
    WHEN v_red_cnt > 0   THEN 'red'
    WHEN v_amber_cnt > 0 THEN 'amber'
    ELSE 'green'
  END;

  UPDATE sim.project_micro_plans
  SET overall_progress_pct = v_avg_pct,
      overall_rag          = v_rag,
      updated_at           = NOW()
  WHERE id = v_plan_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_update_plan_progress ON sim.micro_plan_activities;
CREATE TRIGGER trg_sim_update_plan_progress
  AFTER INSERT OR UPDATE OR DELETE ON sim.micro_plan_activities
  FOR EACH ROW EXECUTE FUNCTION sim.trg_fn_sim_update_plan_progress();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. sim.micro_plan_versions (append-only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.micro_plan_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  micro_plan_id  UUID NOT NULL REFERENCES sim.project_micro_plans(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  snapshot_data  JSONB NOT NULL,
  change_summary TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. sim.micro_plan_comments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.micro_plan_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  micro_plan_id    UUID NOT NULL REFERENCES sim.project_micro_plans(id) ON DELETE CASCADE,
  activity_id      UUID REFERENCES sim.micro_plan_activities(id) ON DELETE SET NULL,
  author_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text     TEXT NOT NULL,
  is_status_update BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sim_micro_plans_project   ON sim.project_micro_plans(practice_project_id, status);
CREATE INDEX IF NOT EXISTS idx_sim_micro_acts_plan       ON sim.micro_plan_activities(micro_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_sim_micro_versions_plan   ON sim.micro_plan_versions(micro_plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_micro_comments_plan   ON sim.micro_plan_comments(micro_plan_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sim.project_micro_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.micro_plan_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.micro_plan_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.micro_plan_comments   ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_micro_plans_all ON sim.project_micro_plans
  USING (
    is_deleted IS NOT TRUE
    AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = project_micro_plans.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_micro_acts_all ON sim.micro_plan_activities
  USING (
    is_deleted IS NOT TRUE
    AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = micro_plan_activities.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_micro_versions_select ON sim.micro_plan_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sim.project_micro_plans mp
      JOIN sim.practice_projects pp ON pp.id = mp.practice_project_id
      WHERE mp.id = micro_plan_versions.micro_plan_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_micro_versions_insert ON sim.micro_plan_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.project_micro_plans mp
      JOIN sim.practice_projects pp ON pp.id = mp.practice_project_id
      WHERE mp.id = micro_plan_versions.micro_plan_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY sim_micro_comments_all ON sim.micro_plan_comments
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_micro_plans mp
      JOIN sim.practice_projects pp ON pp.id = mp.practice_project_id
      WHERE mp.id = micro_plan_comments.micro_plan_id
        AND pp.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.project_micro_plans',
   'Sim: Team micro-plan headers for practice projects',
   FALSE, TRUE),
  ('sim.micro_plan_activities',
   'Sim: Detailed activity rows within a micro-plan for practice projects',
   FALSE, TRUE),
  ('sim.micro_plan_versions',
   'Sim: Immutable version snapshots of micro-plans for practice projects',
   FALSE, TRUE),
  ('sim.micro_plan_comments',
   'Sim: Discussion and status update comments within micro-plans for practice projects',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();
