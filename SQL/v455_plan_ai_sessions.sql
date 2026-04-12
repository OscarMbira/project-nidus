-- =============================================================================
-- v455_plan_ai_sessions.sql
-- AI Plan Generation Sessions
-- Platform: public schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_ai_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organisation_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  prompt_text          TEXT NOT NULL,
  industry_template    TEXT,
  generated_phases     JSONB,     -- [{name, duration_weeks, deliverables[]}]
  generated_milestones JSONB,     -- [{name, week_offset, acceptance_criteria}]
  generated_tasks      JSONB,     -- [{name, duration_days, dependencies[], phase}]
  generated_risks      JSONB,     -- [{title, probability, impact, mitigation}]
  ai_assumptions       TEXT,
  ai_explanation       TEXT,
  status               TEXT NOT NULL DEFAULT 'generated'
                         CHECK (status IN ('generated','accepted','modified','rejected')),
  accepted_at          TIMESTAMPTZ,
  accepted_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_ai_sessions_project ON public.plan_ai_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_plan_ai_sessions_created ON public.plan_ai_sessions(created_at DESC);

-- RLS
ALTER TABLE public.plan_ai_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_sessions_select ON public.plan_ai_sessions;
CREATE POLICY ai_sessions_select ON public.plan_ai_sessions
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_ai_sessions.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS ai_sessions_insert ON public.plan_ai_sessions;
CREATE POLICY ai_sessions_insert ON public.plan_ai_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_ai_sessions.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ai_sessions_update ON public.plan_ai_sessions;
CREATE POLICY ai_sessions_update ON public.plan_ai_sessions
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_ai_sessions.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- DB Registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_ai_sessions',
   'Records of AI-generated project plans — stores prompt, generated output, assumptions, and acceptance status',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
