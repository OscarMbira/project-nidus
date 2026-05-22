-- v628d: Project Decisions (Decision Log)
-- Standalone decision register accessible from the Controls & Registers sidebar
-- Full CRUD for all project roles (team members, TL, TM, PM)

-- ── Platform schema ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_decisions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  decision_reference  text,
  decision_title      text        NOT NULL,
  description         text,
  decision_date       date,
  decided_by          uuid        REFERENCES auth.users(id),
  decided_by_name     text,
  category            text        DEFAULT 'general',
  status              text        NOT NULL DEFAULT 'proposed'
                      CHECK (status IN ('proposed', 'approved', 'rejected', 'deferred', 'superseded')),
  priority            text        NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  rationale           text,
  impact              text,
  alternatives_considered text,
  review_date         date,
  related_risk_id     uuid,
  related_issue_id    uuid,
  created_by          uuid        REFERENCES auth.users(id),
  updated_by          uuid        REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  is_deleted          boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_decisions_project_id ON public.project_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_decisions_status ON public.project_decisions(status);
CREATE INDEX IF NOT EXISTS idx_project_decisions_decision_date ON public.project_decisions(decision_date);

-- Auto-generate decision_reference (DEC-YYYY-NNNN)
CREATE OR REPLACE FUNCTION public.generate_decision_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seq_num integer;
BEGIN
  IF NEW.decision_reference IS NULL OR NEW.decision_reference = '' THEN
    SELECT COALESCE(MAX(
      CASE WHEN decision_reference ~ '^DEC-[0-9]{4}-[0-9]+$'
           THEN CAST(SPLIT_PART(decision_reference, '-', 3) AS integer)
           ELSE 0 END
    ), 0) + 1
    INTO seq_num
    FROM public.project_decisions
    WHERE project_id = NEW.project_id AND is_deleted = false;

    NEW.decision_reference := 'DEC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_decisions_ref ON public.project_decisions;
CREATE TRIGGER trg_project_decisions_ref
  BEFORE INSERT ON public.project_decisions
  FOR EACH ROW EXECUTE FUNCTION public.generate_decision_reference();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_project_decisions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_project_decisions_updated_at ON public.project_decisions;
CREATE TRIGGER trg_project_decisions_updated_at
  BEFORE UPDATE ON public.project_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_project_decisions_updated_at();

-- RLS
ALTER TABLE public.project_decisions ENABLE ROW LEVEL SECURITY;

-- All project members can view
DROP POLICY IF EXISTS "project_decisions_select" ON public.project_decisions;
CREATE POLICY "project_decisions_select" ON public.project_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_decisions.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

-- All project members can insert
DROP POLICY IF EXISTS "project_decisions_insert" ON public.project_decisions;
CREATE POLICY "project_decisions_insert" ON public.project_decisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_decisions.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

-- Creator or PM/TL/TM can update
DROP POLICY IF EXISTS "project_decisions_update" ON public.project_decisions;
CREATE POLICY "project_decisions_update" ON public.project_decisions
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = project_decisions.project_id
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

-- Creator or PM can soft-delete
DROP POLICY IF EXISTS "project_decisions_delete" ON public.project_decisions;
CREATE POLICY "project_decisions_delete" ON public.project_decisions
  FOR DELETE USING (
    created_by = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = project_decisions.project_id
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
    )
  );

-- ── Simulator schema ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.project_decisions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid        NOT NULL,
  decision_reference  text,
  decision_title      text        NOT NULL,
  description         text,
  decision_date       date,
  decided_by          uuid,
  decided_by_name     text,
  category            text        DEFAULT 'general',
  status              text        NOT NULL DEFAULT 'proposed'
                      CHECK (status IN ('proposed', 'approved', 'rejected', 'deferred', 'superseded')),
  priority            text        NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  rationale           text,
  impact              text,
  alternatives_considered text,
  review_date         date,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  is_deleted          boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sim_project_decisions_project_id ON sim.project_decisions(project_id);

ALTER TABLE sim.project_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sim_project_decisions_all" ON sim.project_decisions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Register in database_tables ───────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_decisions', 'Decision log for project decisions including status, rationale, and impact', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();
