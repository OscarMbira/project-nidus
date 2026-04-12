-- =============================================================================
-- v462_micro_plans.sql
-- Team Micro-Plans — Sub/Mini/Workstream Plans (Platform: public schema)
-- Tables: project_micro_plans, micro_plan_activities,
--         micro_plan_versions, micro_plan_comments
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. project_micro_plans — plan header
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_micro_plans (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organisation_id          UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plan_reference           TEXT NOT NULL,     -- auto-generated: MPL-001, MPL-002…
  plan_name                TEXT NOT NULL,
  plan_type                TEXT NOT NULL DEFAULT 'team_delivery'
                             CHECK (plan_type IN (
                               'team_delivery','quality','risk_response','test',
                               'procurement','communications','stakeholder_engagement',
                               'change_management','resource','custom'
                             )),
  description              TEXT,
  objectives               TEXT,
  scope_in                 TEXT,
  scope_out                TEXT,
  assumptions              TEXT,
  constraints              TEXT,
  responsible_team         TEXT,
  owner_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approver_id              UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at              TIMESTAMPTZ,
  approval_notes           TEXT,
  status                   TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN (
                               'draft','active','under_review','approved','superseded','archived'
                             )),
  version_number           TEXT NOT NULL DEFAULT '1.0',
  review_frequency         TEXT DEFAULT 'weekly'
                             CHECK (review_frequency IN (
                               'daily','weekly','bi_weekly','monthly','as_needed'
                             )),
  next_review_date         DATE,
  linked_master_plan_id    UUID,   -- FK to project_plans if exists
  linked_stage_plan_id     UUID,   -- FK to stage_plans if exists
  linked_work_package_id   UUID,
  overall_rag              TEXT DEFAULT 'green'
                             CHECK (overall_rag IN ('green','amber','red')),
  overall_progress_pct     INTEGER DEFAULT 0 CHECK (overall_progress_pct BETWEEN 0 AND 100),
  tags                     TEXT[],
  is_draft                 BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at         TIMESTAMPTZ,
  is_deleted               BOOLEAN NOT NULL DEFAULT FALSE,
  created_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_micro_plan_reference UNIQUE (project_id, plan_reference)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Auto-generate plan_reference: MPL-001, MPL-002… per project
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_micro_plan_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.plan_reference IS NOT NULL AND NEW.plan_reference != '' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.project_micro_plans
  WHERE project_id = NEW.project_id;

  NEW.plan_reference := 'MPL-' || LPAD(v_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_micro_plan_reference ON public.project_micro_plans;
CREATE TRIGGER trg_micro_plan_reference
  BEFORE INSERT ON public.project_micro_plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_micro_plan_reference();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_set_micro_plans_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_micro_plans_updated_at ON public.project_micro_plans;
CREATE TRIGGER trg_micro_plans_updated_at
  BEFORE UPDATE ON public.project_micro_plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_micro_plans_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. micro_plan_activities — detailed activity rows
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.micro_plan_activities (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  micro_plan_id             UUID NOT NULL REFERENCES public.project_micro_plans(id) ON DELETE CASCADE,
  project_id                UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_reference        TEXT NOT NULL,    -- auto-generated: MPA-001…
  activity_name             TEXT NOT NULL,
  description               TEXT,
  category                  TEXT DEFAULT 'other'
                              CHECK (category IN (
                                'planning','execution','review','sign_off','reporting',
                                'monitoring','quality_check','risk_response','testing',
                                'procurement','communication','training','other'
                              )),
  priority                  TEXT DEFAULT 'medium'
                              CHECK (priority IN ('critical','high','medium','low')),
  owner_id                  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  supporting_member_ids     UUID[],
  planned_start_date        DATE,
  planned_end_date          DATE,
  planned_duration_days     INTEGER,
  planned_effort_days       NUMERIC(8,2),
  actual_start_date         DATE,
  actual_end_date           DATE,
  actual_duration_days      INTEGER,
  actual_effort_days        NUMERIC(8,2),
  schedule_variance_days    INTEGER GENERATED ALWAYS AS
                              (actual_duration_days - planned_duration_days) STORED,
  effort_variance_days      NUMERIC(8,2) GENERATED ALWAYS AS
                              (actual_effort_days - planned_effort_days) STORED,
  progress_pct              INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  status                    TEXT DEFAULT 'not_started'
                              CHECK (status IN (
                                'not_started','in_progress','on_hold',
                                'completed','cancelled','deferred'
                              )),
  rag_status                TEXT DEFAULT 'green'
                              CHECK (rag_status IN ('green','amber','red')),
  is_milestone              BOOLEAN NOT NULL DEFAULT FALSE,
  is_critical               BOOLEAN NOT NULL DEFAULT FALSE,
  deliverable_output        TEXT,
  quality_check_required    BOOLEAN NOT NULL DEFAULT FALSE,
  quality_check_status      TEXT DEFAULT 'not_required'
                              CHECK (quality_check_status IN (
                                'not_required','pending','passed','failed'
                              )),
  quality_check_notes       TEXT,
  entry_criteria            TEXT,
  exit_criteria             TEXT,
  risk_flag                 BOOLEAN NOT NULL DEFAULT FALSE,
  linked_risk_id            UUID,
  issue_flag                BOOLEAN NOT NULL DEFAULT FALSE,
  linked_issue_id           UUID,
  linked_master_task_id     UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  predecessor_activity_id   UUID REFERENCES public.micro_plan_activities(id) ON DELETE SET NULL,
  dependency_type           TEXT DEFAULT 'FS'
                              CHECK (dependency_type IN ('FS','SS','FF','SF')),
  lag_days                  INTEGER DEFAULT 0,
  notes                     TEXT,
  tags                      TEXT[],
  attachments               JSONB,
  sort_order                INTEGER DEFAULT 0,
  is_deleted                BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_activity_reference UNIQUE (micro_plan_id, activity_reference)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auto-generate activity_reference: MPA-001, MPA-002… per micro-plan
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_micro_activity_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.activity_reference IS NOT NULL AND NEW.activity_reference != '' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.micro_plan_activities
  WHERE micro_plan_id = NEW.micro_plan_id;

  NEW.activity_reference := 'MPA-' || LPAD(v_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_micro_activity_reference ON public.micro_plan_activities;
CREATE TRIGGER trg_micro_activity_reference
  BEFORE INSERT ON public.micro_plan_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_micro_activity_reference();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_set_micro_activities_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_micro_activities_updated_at ON public.micro_plan_activities;
CREATE TRIGGER trg_micro_activities_updated_at
  BEFORE UPDATE ON public.micro_plan_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_micro_activities_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Trigger: recalculate plan progress/RAG after activity changes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_update_plan_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_plan_id  UUID;
  v_avg_pct  INTEGER;
  v_rag      TEXT;
  v_red_cnt  INTEGER;
  v_amber_cnt INTEGER;
BEGIN
  v_plan_id := COALESCE(NEW.micro_plan_id, OLD.micro_plan_id);

  SELECT
    COALESCE(AVG(progress_pct)::INTEGER, 0),
    COUNT(*) FILTER (WHERE rag_status = 'red'),
    COUNT(*) FILTER (WHERE rag_status = 'amber')
  INTO v_avg_pct, v_red_cnt, v_amber_cnt
  FROM public.micro_plan_activities
  WHERE micro_plan_id = v_plan_id AND is_deleted IS NOT TRUE;

  v_rag := CASE
    WHEN v_red_cnt > 0   THEN 'red'
    WHEN v_amber_cnt > 0 THEN 'amber'
    ELSE 'green'
  END;

  UPDATE public.project_micro_plans
  SET overall_progress_pct = v_avg_pct,
      overall_rag          = v_rag,
      updated_at           = NOW()
  WHERE id = v_plan_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_plan_progress ON public.micro_plan_activities;
CREATE TRIGGER trg_update_plan_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.micro_plan_activities
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_update_plan_progress();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. micro_plan_versions — immutable version snapshots (append-only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.micro_plan_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  micro_plan_id  UUID NOT NULL REFERENCES public.project_micro_plans(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  snapshot_data  JSONB NOT NULL,   -- full copy of plan header + activities at snapshot time
  change_summary TEXT,
  created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- no updated_at — this table is append-only
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. micro_plan_comments — activity-level or plan-level discussion
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.micro_plan_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  micro_plan_id    UUID NOT NULL REFERENCES public.project_micro_plans(id) ON DELETE CASCADE,
  activity_id      UUID REFERENCES public.micro_plan_activities(id) ON DELETE SET NULL,
  author_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment_text     TEXT NOT NULL,
  is_status_update BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.trg_set_micro_comments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_micro_comments_updated_at ON public.micro_plan_comments;
CREATE TRIGGER trg_micro_comments_updated_at
  BEFORE UPDATE ON public.micro_plan_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_micro_comments_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_micro_plans_project    ON public.project_micro_plans(project_id, status);
CREATE INDEX IF NOT EXISTS idx_micro_plans_owner      ON public.project_micro_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_micro_plans_is_draft   ON public.project_micro_plans(is_draft) WHERE is_draft = TRUE;
CREATE INDEX IF NOT EXISTS idx_micro_activities_plan  ON public.micro_plan_activities(micro_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_micro_activities_owner ON public.micro_plan_activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_micro_versions_plan    ON public.micro_plan_versions(micro_plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_comments_plan    ON public.micro_plan_comments(micro_plan_id);
CREATE INDEX IF NOT EXISTS idx_micro_comments_act     ON public.micro_plan_comments(activity_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.project_micro_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_plan_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_plan_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_plan_comments  ENABLE ROW LEVEL SECURITY;

-- project_micro_plans — SELECT: all project members
DROP POLICY IF EXISTS micro_plans_select ON public.project_micro_plans;
CREATE POLICY micro_plans_select ON public.project_micro_plans
  FOR SELECT USING (
    is_deleted IS NOT TRUE
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_micro_plans.project_id
        AND up.user_id = auth.uid()
    )
  );

-- project_micro_plans — INSERT: plan owner creates their own plan
DROP POLICY IF EXISTS micro_plans_insert ON public.project_micro_plans;
CREATE POLICY micro_plans_insert ON public.project_micro_plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_micro_plans.project_id
        AND up.user_id = auth.uid()
    )
  );

-- project_micro_plans — UPDATE: owner or PM/Admin
DROP POLICY IF EXISTS micro_plans_update ON public.project_micro_plans;
CREATE POLICY micro_plans_update ON public.project_micro_plans
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = project_micro_plans.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- project_micro_plans — DELETE: owner or PM/Admin (soft delete only via UPDATE)
DROP POLICY IF EXISTS micro_plans_delete ON public.project_micro_plans;
CREATE POLICY micro_plans_delete ON public.project_micro_plans
  FOR DELETE USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = project_micro_plans.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- micro_plan_activities — SELECT: all project members
DROP POLICY IF EXISTS micro_acts_select ON public.micro_plan_activities;
CREATE POLICY micro_acts_select ON public.micro_plan_activities
  FOR SELECT USING (
    is_deleted IS NOT TRUE
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = micro_plan_activities.project_id
        AND up.user_id = auth.uid()
    )
  );

-- micro_plan_activities — INSERT/UPDATE/DELETE: plan owner or PM/Admin
DROP POLICY IF EXISTS micro_acts_insert ON public.micro_plan_activities;
CREATE POLICY micro_acts_insert ON public.micro_plan_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_micro_plans mp
      JOIN public.user_projects up ON up.project_id = mp.project_id
      WHERE mp.id = micro_plan_activities.micro_plan_id
        AND (mp.owner_id = auth.uid() OR up.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS micro_acts_update ON public.micro_plan_activities;
CREATE POLICY micro_acts_update ON public.micro_plan_activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_micro_plans mp
      JOIN public.user_projects up ON up.project_id = mp.project_id
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE mp.id = micro_plan_activities.micro_plan_id
        AND up.user_id = auth.uid()
        AND (
          mp.owner_id = auth.uid()
          OR pr.role_name IN ('Project Manager','PMO Admin','System Admin')
          OR micro_plan_activities.owner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS micro_acts_delete ON public.micro_plan_activities;
CREATE POLICY micro_acts_delete ON public.micro_plan_activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_micro_plans mp
      JOIN public.user_projects up ON up.project_id = mp.project_id
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE mp.id = micro_plan_activities.micro_plan_id
        AND up.user_id = auth.uid()
        AND (
          mp.owner_id = auth.uid()
          OR pr.role_name IN ('Project Manager','PMO Admin','System Admin')
        )
    )
  );

-- micro_plan_versions — SELECT: all project members; no direct INSERT (trigger only)
DROP POLICY IF EXISTS micro_versions_select ON public.micro_plan_versions;
CREATE POLICY micro_versions_select ON public.micro_plan_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_micro_plans mp
      JOIN public.user_projects up ON up.project_id = mp.project_id
      WHERE mp.id = micro_plan_versions.micro_plan_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS micro_versions_insert ON public.micro_plan_versions;
CREATE POLICY micro_versions_insert ON public.micro_plan_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_micro_plans mp
      JOIN public.user_projects up ON up.project_id = mp.project_id
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE mp.id = micro_plan_versions.micro_plan_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- micro_plan_comments — all project members can read + insert; owners can update/delete own
DROP POLICY IF EXISTS micro_comments_select ON public.micro_plan_comments;
CREATE POLICY micro_comments_select ON public.micro_plan_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_micro_plans mp
      JOIN public.user_projects up ON up.project_id = mp.project_id
      WHERE mp.id = micro_plan_comments.micro_plan_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS micro_comments_insert ON public.micro_plan_comments;
CREATE POLICY micro_comments_insert ON public.micro_plan_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_micro_plans mp
      JOIN public.user_projects up ON up.project_id = mp.project_id
      WHERE mp.id = micro_plan_comments.micro_plan_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS micro_comments_update ON public.micro_plan_comments;
CREATE POLICY micro_comments_update ON public.micro_plan_comments
  FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS micro_comments_delete ON public.micro_plan_comments;
CREATE POLICY micro_comments_delete ON public.micro_plan_comments
  FOR DELETE USING (author_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_micro_plans',
   'Team micro-plan headers — sub-plans per team/role (quality, risk, test, delivery, etc.)',
   FALSE, TRUE),
  ('micro_plan_activities',
   'Detailed activity rows within a micro-plan — full lifecycle tracking with progress, RAG, and dependencies',
   FALSE, TRUE),
  ('micro_plan_versions',
   'Immutable version snapshots of micro-plans — append-only for full audit trail and version restore',
   FALSE, TRUE),
  ('micro_plan_comments',
   'Discussion and status update comments at plan-level or activity-level within micro-plans',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
