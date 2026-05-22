-- v628e: Team Member Timesheets
-- Time entries per project member with draft → submitted → approved/rejected workflow
-- TL/TM can review and approve; PM has full oversight

-- ── Platform schema ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  task_id         uuid,
  entry_date      date        NOT NULL,
  hours_worked    numeric(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  description     text,
  work_category   text        DEFAULT 'general'
                  CHECK (work_category IN (
                    'general', 'design', 'development', 'testing', 'review',
                    'meeting', 'documentation', 'training', 'support', 'other'
                  )),
  status          text        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at    timestamptz,
  reviewed_by     uuid        REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  review_notes    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  is_deleted      boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_project_id ON public.timesheet_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_user_id ON public.timesheet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_entry_date ON public.timesheet_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_status ON public.timesheet_entries(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_timesheet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_timesheet_entries_updated_at ON public.timesheet_entries;
CREATE TRIGGER trg_timesheet_entries_updated_at
  BEFORE UPDATE ON public.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_timesheet_updated_at();

-- Auto-set submitted_at when status changes to submitted
CREATE OR REPLACE FUNCTION public.set_timesheet_submitted_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    NEW.submitted_at = now();
  END IF;
  IF NEW.status IN ('approved', 'rejected') AND OLD.status NOT IN ('approved', 'rejected') THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_timesheet_submitted_at ON public.timesheet_entries;
CREATE TRIGGER trg_timesheet_submitted_at
  BEFORE UPDATE ON public.timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_timesheet_submitted_at();

-- RLS
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Members see their own entries; TL/TM/PM see all in their projects
DROP POLICY IF EXISTS "timesheet_entries_select" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_select" ON public.timesheet_entries
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = timesheet_entries.project_id
          AND up.user_id    = auth.uid()
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
  );

-- Members can insert their own entries
DROP POLICY IF EXISTS "timesheet_entries_insert" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_insert" ON public.timesheet_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = timesheet_entries.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

-- Members can update their own draft/rejected entries;
-- TL/TM/PM can update status (approve/reject)
DROP POLICY IF EXISTS "timesheet_entries_update" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_update" ON public.timesheet_entries
  FOR UPDATE USING (
    (user_id = auth.uid() AND status IN ('draft', 'rejected'))
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = timesheet_entries.project_id
          AND up.user_id    = auth.uid()
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
  );

-- Members can delete their own draft entries
DROP POLICY IF EXISTS "timesheet_entries_delete" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_delete" ON public.timesheet_entries
  FOR DELETE USING (
    user_id = auth.uid() AND status = 'draft'
  );

-- ── Simulator schema ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.timesheet_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL,
  user_id         uuid        NOT NULL,
  task_id         uuid,
  entry_date      date        NOT NULL,
  hours_worked    numeric(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  description     text,
  work_category   text        DEFAULT 'general',
  status          text        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at    timestamptz,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  review_notes    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  is_deleted      boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sim_timesheet_entries_project_id ON sim.timesheet_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_sim_timesheet_entries_user_id ON sim.timesheet_entries(user_id);

ALTER TABLE sim.timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sim_timesheet_entries_all" ON sim.timesheet_entries
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Register in database_tables ───────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('timesheet_entries', 'Team member timesheet entries per project with approval workflow (draft, submitted, approved, rejected)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();
