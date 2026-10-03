-- ================================================
-- File: v1183_project_work_plans.sql
-- Description: Core Work Plan tables (v1180 PRD) — project_work_plans (one header per person
--              per period, draft/submitted/approved/rejected lifecycle mirroring
--              timesheet_entries), project_work_plan_items (the line items), and
--              project_work_plan_reviews (append-only approve/reject decision log, mirroring
--              timesheet_entry_reviews, v1169).
--
--              RLS reuses the proven SECURITY DEFINER + row_security=off pattern (v1016/v1086)
--              rather than a raw JOIN policy, to avoid the chronic RLS-recursion/HTTP-500 bug
--              class this codebase has hit 16+ times before. A new
--              auth_user_can_manage_work_plans() function covers the broader Work Plan approval
--              authority set confirmed in the PRD interview: PMO Admin/account owner, named
--              Project Manager, or a user_roles row with role_name in
--              (project_manager, programme_manager, pm_project_manager, team_lead, pm_team_lead,
--              team_manager, pm_team_manager) for that project — the exact same role-name set
--              v1086 already uses for Team Charter approval authority.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- ── Shared authority check ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auth_user_can_manage_work_plans(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = p_project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND public.is_pmo_admin_or_owner_for_account(p.account_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.users u ON u.id = p.project_manager_user_id
        WHERE p.id = p_project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND u.auth_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.project_id = p_project_id
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND lower(trim(coalesce(r.role_name, ''))) IN (
            'project_manager', 'programme_manager', 'pm_project_manager',
            'team_lead', 'pm_team_lead', 'team_manager', 'pm_team_manager'
          )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_can_manage_work_plans(UUID) TO authenticated;

COMMENT ON FUNCTION public.auth_user_can_manage_work_plans(UUID) IS 'v1183: TRUE if the current user may view/approve every Work Plan on this project — PMO Admin/account owner, named Project Manager, or an active project-scoped role of project_manager/programme_manager/team_lead/team_manager. SECURITY DEFINER + row_security off, same proven pattern as auth_user_can_access_project()/auth_user_can_access_account() (v1016).';

-- ── project_work_plans (header) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_work_plans (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id            UUID        NOT NULL REFERENCES auth.users(id),
    period_type        VARCHAR(10) NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    period_start_date  DATE        NOT NULL,
    period_end_date    DATE        NOT NULL,
    status             TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    submitted_at       TIMESTAMPTZ,
    reviewed_by        UUID        REFERENCES auth.users(id),
    reviewed_at        TIMESTAMPTZ,
    review_notes       TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted         BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_project_work_plans_person_period UNIQUE (project_id, user_id, period_start_date)
);

CREATE INDEX IF NOT EXISTS idx_project_work_plans_project ON public.project_work_plans(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_work_plans_user ON public.project_work_plans(user_id) WHERE is_deleted = FALSE;

COMMENT ON TABLE public.project_work_plans IS 'v1183: one Work Plan header per person per period (weekly or monthly, per the project''s resolved work_plan_period_type), draft/submitted/approved/rejected — mirrors the timesheet_entries approval lifecycle.';

ALTER TABLE public.project_work_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_work_plans_select" ON public.project_work_plans;
CREATE POLICY "project_work_plans_select" ON public.project_work_plans
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      user_id = auth.uid()
      OR public.auth_user_can_manage_work_plans(project_id)
    )
  );

DROP POLICY IF EXISTS "project_work_plans_insert" ON public.project_work_plans;
CREATE POLICY "project_work_plans_insert" ON public.project_work_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.auth_user_can_access_project(project_id)
  );

DROP POLICY IF EXISTS "project_work_plans_update" ON public.project_work_plans;
CREATE POLICY "project_work_plans_update" ON public.project_work_plans
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND status IN ('draft', 'rejected'))
    OR public.auth_user_can_manage_work_plans(project_id)
  );

DROP POLICY IF EXISTS "project_work_plans_delete" ON public.project_work_plans;
CREATE POLICY "project_work_plans_delete" ON public.project_work_plans
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'draft');

-- ── project_work_plan_items (line items) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_work_plan_items (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    work_plan_id            UUID        NOT NULL REFERENCES public.project_work_plans(id) ON DELETE CASCADE,
    sort_order              INTEGER     NOT NULL DEFAULT 0,
    details                 TEXT        NOT NULL,
    status_code             VARCHAR(50) NOT NULL REFERENCES public.work_plan_item_statuses(code) DEFAULT 'not_started',
    target_completion_pct   NUMERIC(5,2) CHECK (target_completion_pct IS NULL OR (target_completion_pct >= 0 AND target_completion_pct <= 100)),
    planned_start_date      DATE,
    planned_end_date        DATE,
    role_code               VARCHAR(100),
    task_id                 UUID        REFERENCES public.tasks(id) ON DELETE SET NULL,
    work_category            VARCHAR(50) REFERENCES public.timesheet_work_categories(code),
    estimated_hours          NUMERIC(6,2) CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    remark                   TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted                BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_project_work_plan_items_plan ON public.project_work_plan_items(work_plan_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_work_plan_items_task ON public.project_work_plan_items(task_id) WHERE task_id IS NOT NULL;

COMMENT ON TABLE public.project_work_plan_items IS 'v1183: individual planned work items on a Work Plan. task_id and work_category are both optional and used (task_id preferred) to match this item to Timesheet entries for the planned-vs-actual comparison — unlike timesheet_entries.task_id, this IS a real FK.';
COMMENT ON COLUMN public.project_work_plan_items.role_code IS 'v1183: free-text role tag (defaults to the user''s primary project role in the UI, overridable for multi-role users) — not an FK, since project role naming varies by org/project_roles template.';

ALTER TABLE public.project_work_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_work_plan_items_select" ON public.project_work_plan_items;
CREATE POLICY "project_work_plan_items_select" ON public.project_work_plan_items
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM public.project_work_plans wp
      WHERE wp.id = project_work_plan_items.work_plan_id
        AND wp.is_deleted = FALSE
        AND (wp.user_id = auth.uid() OR public.auth_user_can_manage_work_plans(wp.project_id))
    )
  );

DROP POLICY IF EXISTS "project_work_plan_items_insert" ON public.project_work_plan_items;
CREATE POLICY "project_work_plan_items_insert" ON public.project_work_plan_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_work_plans wp
      WHERE wp.id = project_work_plan_items.work_plan_id
        AND wp.is_deleted = FALSE
        AND wp.user_id = auth.uid()
        AND wp.status IN ('draft', 'rejected')
    )
  );

DROP POLICY IF EXISTS "project_work_plan_items_update" ON public.project_work_plan_items;
CREATE POLICY "project_work_plan_items_update" ON public.project_work_plan_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_work_plans wp
      WHERE wp.id = project_work_plan_items.work_plan_id
        AND wp.is_deleted = FALSE
        AND wp.user_id = auth.uid()
        AND wp.status IN ('draft', 'rejected')
    )
  );

DROP POLICY IF EXISTS "project_work_plan_items_delete" ON public.project_work_plan_items;
CREATE POLICY "project_work_plan_items_delete" ON public.project_work_plan_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_work_plans wp
      WHERE wp.id = project_work_plan_items.work_plan_id
        AND wp.is_deleted = FALSE
        AND wp.user_id = auth.uid()
        AND wp.status IN ('draft', 'rejected')
    )
  );

-- ── project_work_plan_reviews (append-only decision log) ───────────────────

CREATE TABLE IF NOT EXISTS public.project_work_plan_reviews (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    work_plan_id  UUID        NOT NULL REFERENCES public.project_work_plans(id) ON DELETE CASCADE,
    decision      TEXT        NOT NULL CHECK (decision IN ('approved', 'rejected')),
    reviewer_id   UUID        NOT NULL REFERENCES auth.users(id),
    notes         TEXT        NOT NULL,
    decided_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_project_work_plan_reviews_notes_not_blank CHECK (length(trim(notes)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_project_work_plan_reviews_plan ON public.project_work_plan_reviews(work_plan_id);
CREATE INDEX IF NOT EXISTS idx_project_work_plan_reviews_decided_at ON public.project_work_plan_reviews(decided_at);

COMMENT ON TABLE public.project_work_plan_reviews IS 'v1183: append-only history of every approve/reject decision on a Work Plan — never updated/overwritten, one row per decision. notes is mandatory (matches the mandatory-justification rule already enforced for Timesheet/record-lifecycle approvals).';

ALTER TABLE public.project_work_plan_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_work_plan_reviews_select" ON public.project_work_plan_reviews;
CREATE POLICY "project_work_plan_reviews_select" ON public.project_work_plan_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_work_plans wp
      WHERE wp.id = project_work_plan_reviews.work_plan_id
        AND wp.is_deleted = FALSE
        AND (wp.user_id = auth.uid() OR public.auth_user_can_manage_work_plans(wp.project_id))
    )
  );

DROP POLICY IF EXISTS "project_work_plan_reviews_insert" ON public.project_work_plan_reviews;
CREATE POLICY "project_work_plan_reviews_insert" ON public.project_work_plan_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_work_plans wp
      WHERE wp.id = project_work_plan_reviews.work_plan_id
        AND wp.is_deleted = FALSE
        AND public.auth_user_can_manage_work_plans(wp.project_id)
    )
  );

-- ── Register new tables ─────────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_work_plans', 'Per-person weekly/monthly Work Plan headers with draft/submitted/approved/rejected lifecycle (v1180)', false, true),
  ('project_work_plan_items', 'Individual planned work items on a Work Plan, optionally linked to a Task or Timesheet work category for planned-vs-actual comparison (v1180)', false, true),
  ('project_work_plan_reviews', 'Append-only approve/reject decision log for Work Plans, mirroring timesheet_entry_reviews (v1180)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1183: project_work_plans, project_work_plan_items, project_work_plan_reviews created.';
  RAISE NOTICE '================================================';
END $$;
