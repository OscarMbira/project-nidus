-- =============================================================================
-- v459_plan_collision_alerts.sql
-- Portfolio Collision Detection — Alerts Table + Detection Function
-- Platform: public schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. plan_collision_alerts — cross-project conflicts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_collision_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  collision_type      TEXT NOT NULL
                        CHECK (collision_type IN (
                          'resource_overlap','milestone_clash',
                          'environment_clash','vendor_bottleneck','budget_concentration'
                        )),
  project_a_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_b_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  resource_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  vendor_id           UUID,
  conflict_start_date DATE,
  conflict_end_date   DATE,
  description         TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'warning'
                        CHECK (severity IN ('info','warning','critical')),
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','acknowledged','resolved')),
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  resolved_by         UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. detect_portfolio_collisions() — scans resource overlaps across all org projects
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.detect_portfolio_collisions(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rec   RECORD;
BEGIN
  -- Clear existing open alerts for this org (re-detect from scratch)
  DELETE FROM public.plan_collision_alerts
  WHERE organisation_id = p_org_id AND status = 'open';

  -- Detect resource overlaps: same person assigned to overlapping tasks across projects
  FOR v_rec IN
    SELECT
      t1.assigned_to            AS resource_id,
      t1.project_id             AS project_a_id,
      t2.project_id             AS project_b_id,
      GREATEST(t1.start_date, t2.start_date) AS conflict_start,
      LEAST(t1.end_date, t2.end_date)         AS conflict_end
    FROM public.tasks t1
    JOIN public.tasks t2
      ON  t1.assigned_to = t2.assigned_to
      AND t1.project_id  != t2.project_id
      AND t1.id          < t2.id               -- avoid duplicates
      AND t1.start_date  <= t2.end_date
      AND t1.end_date    >= t2.start_date
    JOIN public.projects p1 ON p1.id = t1.project_id AND p1.account_id = p_org_id
    JOIN public.projects p2 ON p2.id = t2.project_id AND p2.account_id = p_org_id
    WHERE t1.assigned_to IS NOT NULL
      AND t1.is_deleted IS NOT TRUE
      AND t2.is_deleted IS NOT TRUE
    LIMIT 100  -- cap to avoid runaway detection
  LOOP
    INSERT INTO public.plan_collision_alerts (
      organisation_id, collision_type, project_a_id, project_b_id,
      resource_id, conflict_start_date, conflict_end_date,
      description, severity, status
    ) VALUES (
      p_org_id, 'resource_overlap', v_rec.project_a_id, v_rec.project_b_id,
      v_rec.resource_id, v_rec.conflict_start, v_rec.conflict_end,
      'Resource is assigned to overlapping tasks across two projects during this period.',
      'warning', 'open'
    );
    v_count := v_count + 1;
  END LOOP;

  -- Detect milestone clashes: same milestone date across multiple projects in the org
  FOR v_rec IN
    SELECT
      t1.project_id  AS project_a_id,
      t2.project_id  AS project_b_id,
      t1.end_date    AS clash_date
    FROM public.tasks t1
    JOIN public.tasks t2
      ON  t1.end_date   = t2.end_date
      AND t1.is_milestone = TRUE
      AND t2.is_milestone = TRUE
      AND t1.project_id  != t2.project_id
      AND t1.id          < t2.id
    JOIN public.projects p1 ON p1.id = t1.project_id AND p1.account_id = p_org_id
    JOIN public.projects p2 ON p2.id = t2.project_id AND p2.account_id = p_org_id
    WHERE t1.is_deleted IS NOT TRUE
      AND t2.is_deleted IS NOT TRUE
    LIMIT 50
  LOOP
    INSERT INTO public.plan_collision_alerts (
      organisation_id, collision_type, project_a_id, project_b_id,
      conflict_start_date, conflict_end_date,
      description, severity, status
    ) VALUES (
      p_org_id, 'milestone_clash', v_rec.project_a_id, v_rec.project_b_id,
      v_rec.clash_date, v_rec.clash_date,
      'Two projects have milestones falling on the same date, which may create stakeholder or governance conflicts.',
      'info', 'open'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_collision_org         ON public.plan_collision_alerts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_collision_status      ON public.plan_collision_alerts(status);
CREATE INDEX IF NOT EXISTS idx_collision_severity    ON public.plan_collision_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_collision_project_a   ON public.plan_collision_alerts(project_a_id);
CREATE INDEX IF NOT EXISTS idx_collision_detected_at ON public.plan_collision_alerts(detected_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plan_collision_alerts ENABLE ROW LEVEL SECURITY;

-- PMO/Portfolio/Programme see all alerts for their org; PM sees own-project rows
DROP POLICY IF EXISTS collision_select ON public.plan_collision_alerts;
CREATE POLICY collision_select ON public.plan_collision_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      JOIN public.projects proj    ON proj.id = up.project_id
      WHERE up.user_id = auth.uid()
        AND proj.account_id = plan_collision_alerts.organisation_id
        AND (
          pr.role_name IN ('PMO Admin','Portfolio Manager','Programme Manager','System Admin')
          OR up.project_id = plan_collision_alerts.project_a_id
          OR up.project_id = plan_collision_alerts.project_b_id
        )
    )
  );

DROP POLICY IF EXISTS collision_insert ON public.plan_collision_alerts;
CREATE POLICY collision_insert ON public.plan_collision_alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.user_id = auth.uid()
        AND pr.role_name IN ('PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS collision_update ON public.plan_collision_alerts;
CREATE POLICY collision_update ON public.plan_collision_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.user_id = auth.uid()
        AND pr.role_name IN ('PMO Admin','Portfolio Manager','Programme Manager','System Admin','Project Manager')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_collision_alerts',
   'Cross-project conflict alerts — resource overlaps, milestone clashes, and environment conflicts',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
