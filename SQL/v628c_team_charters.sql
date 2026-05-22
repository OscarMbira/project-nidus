-- v628c: Team Charters table
-- Stores the team charter document for a project (one per project)
-- PM/TL create & edit; all team members view

-- ── Platform schema ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_charters (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title             text        NOT NULL DEFAULT 'Team Charter',
  purpose           text,
  objectives        text,
  values            text,
  ways_of_working   text,
  norms             text,
  raci_notes        text,
  communication_plan text,
  version_number    integer     NOT NULL DEFAULT 1,
  status            text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'archived')),
  created_by        uuid        REFERENCES auth.users(id),
  updated_by        uuid        REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  is_deleted        boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_team_charters_project_id ON public.team_charters(project_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_team_charters_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_team_charters_updated_at ON public.team_charters;
CREATE TRIGGER trg_team_charters_updated_at
  BEFORE UPDATE ON public.team_charters
  FOR EACH ROW EXECUTE FUNCTION public.set_team_charters_updated_at();

-- RLS
ALTER TABLE public.team_charters ENABLE ROW LEVEL SECURITY;

-- Any project member can view
DROP POLICY IF EXISTS "team_charters_select" ON public.team_charters;
CREATE POLICY "team_charters_select" ON public.team_charters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_charters.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

-- PM, TL, TM can insert
DROP POLICY IF EXISTS "team_charters_insert" ON public.team_charters;
CREATE POLICY "team_charters_insert" ON public.team_charters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_charters.project_id
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
  );

-- PM, TL, TM can update
DROP POLICY IF EXISTS "team_charters_update" ON public.team_charters;
CREATE POLICY "team_charters_update" ON public.team_charters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_charters.project_id
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
  );

-- Only PM can delete (soft)
DROP POLICY IF EXISTS "team_charters_delete" ON public.team_charters;
CREATE POLICY "team_charters_delete" ON public.team_charters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = team_charters.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
        AND ur.is_active = TRUE
        AND NOT COALESCE(ur.is_deleted, FALSE)
        AND r.role_name = 'project_manager'
    )
  );

-- ── Simulator schema ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.team_charters (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL,
  title             text        NOT NULL DEFAULT 'Team Charter',
  purpose           text,
  objectives        text,
  values            text,
  ways_of_working   text,
  norms             text,
  raci_notes        text,
  communication_plan text,
  version_number    integer     NOT NULL DEFAULT 1,
  status            text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'archived')),
  created_by        uuid,
  updated_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  is_deleted        boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sim_team_charters_project_id ON sim.team_charters(project_id);

ALTER TABLE sim.team_charters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_team_charters_all" ON sim.team_charters;
CREATE POLICY "sim_team_charters_all" ON sim.team_charters
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Register in database_tables ───────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('team_charters', 'Team charter documents defining team purpose, values, norms, and ways of working per project', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
