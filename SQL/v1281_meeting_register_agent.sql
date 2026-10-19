-- ============================================================================
-- v1281: Meeting-to-Register agent (PRD D13, stories 29–31, 35; plan SQL #10)
--
-- Extends the v409 meeting staging tables (public + sim). The agent only reads records and
-- writes these staging rows; people accept items on the review checklist and the app then
-- creates DRAFT records in the registers (risks/issues: status 'draft', decisions: 'proposed',
-- actions: an open daily-log action). Agents never update, submit, approve or delete records.
--
--   * <schema>.comm_meeting_extracted_decisions   new staging table → project_decisions
--   * enrichment columns on the four staging tables:
--       duplicate_of_id / duplicate_of_ref / duplicate_title / duplicate_score  (possible duplicate)
--       suggested_owner_id / suggested_owner_name, suggested_due_date, mapped_values (org's own values)
--       agent_note, agent_enriched_at
--   * comm_meeting_action_items: project link, created daily-log action, review fields, statuses
--   * status 'merged' on staging rows = filed as an update to an existing record
--   * <schema>.comm_meeting_record_updates   "add as update to existing record": the meeting note
--     and source quote against the record (Platform risks/issues also get a comment row)
--   * public.comm_user_can_file_meeting(_sim)(meeting)  — who may file a meeting: the organiser,
--     a participant, or anyone with access to the meeting's project (sim: the run owner).
--     v409 only let the organiser create staging rows; filing now follows these rules.
--
-- Prerequisites: v409, v628d (project_decisions), v1226, v1272. Idempotent.
-- After running: re-run SQL/v1251_planner_table_wall.sql (new public tables, CLAUDE.md rule 6).
-- Rollback: v1281_meeting_register_agent_rollback.sql
-- ============================================================================

-- ── 1. Who may file a meeting ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.comm_user_can_file_meeting(p_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comm_meetings m
     WHERE m.id = p_meeting_id
       AND public.user_has_access_to_account(m.account_id)
       AND (m.organised_by = public.comm_current_user_id()
            OR public.comm_user_is_meeting_participant(m.id, public.comm_current_user_id())
            OR (m.project_id IS NOT NULL AND public.auth_user_can_access_project(m.project_id)))
  );
$$;

CREATE OR REPLACE FUNCTION public.comm_user_can_file_meeting_sim(p_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.comm_meetings m
     WHERE m.id = p_meeting_id
       AND (m.organised_by = public.comm_current_user_id()
            OR public.comm_user_is_meeting_participant_sim(m.id, public.comm_current_user_id())
            OR (m.simulation_run_id IS NOT NULL AND public.sim_auth_user_owns_run(m.simulation_run_id)))
  );
$$;

GRANT EXECUTE ON FUNCTION public.comm_user_can_file_meeting(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_user_can_file_meeting_sim(UUID) TO authenticated, service_role;

-- ── 2. Decisions staging table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comm_meeting_extracted_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.project_decisions(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_extracted_title TEXT NOT NULL,
  ai_extracted_desc TEXT,
  rationale TEXT,
  made_by_name TEXT,
  ai_confidence NUMERIC(4,3),
  source_quote TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created', 'merged')),
  enriched_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comm_extracted_decisions_meeting ON public.comm_meeting_extracted_decisions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_comm_extracted_decisions_project ON public.comm_meeting_extracted_decisions(project_id);

CREATE TABLE IF NOT EXISTS sim.comm_meeting_extracted_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES sim.project_decisions(id) ON DELETE SET NULL,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  ai_extracted_title TEXT NOT NULL,
  ai_extracted_desc TEXT,
  rationale TEXT,
  made_by_name TEXT,
  ai_confidence NUMERIC(4,3),
  source_quote TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created', 'merged')),
  enriched_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_comm_extracted_decisions_meeting ON sim.comm_meeting_extracted_decisions(meeting_id);

-- ── 3. Action items: project link, created record, review fields ────────────
ALTER TABLE public.comm_meeting_action_items
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS daily_log_entry_id UUID REFERENCES public.daily_log_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE sim.comm_meeting_action_items
  ADD COLUMN IF NOT EXISTS practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS daily_log_entry_id UUID REFERENCES sim.practice_daily_log_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('ALTER TABLE %I.comm_meeting_action_items DROP CONSTRAINT IF EXISTS comm_meeting_action_items_status_check', s);
    EXECUTE format($c$ALTER TABLE %I.comm_meeting_action_items ADD CONSTRAINT comm_meeting_action_items_status_check
      CHECK (status IN ('pending', 'assigned', 'converted_to_task', 'completed', 'dismissed', 'enriched', 'created', 'merged'))$c$, s);
    EXECUTE format('ALTER TABLE %I.comm_meeting_extracted_issues DROP CONSTRAINT IF EXISTS comm_meeting_extracted_issues_status_check', s);
    EXECUTE format($c$ALTER TABLE %I.comm_meeting_extracted_issues ADD CONSTRAINT comm_meeting_extracted_issues_status_check
      CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created', 'merged'))$c$, s);
    EXECUTE format('ALTER TABLE %I.comm_meeting_extracted_risks DROP CONSTRAINT IF EXISTS comm_meeting_extracted_risks_status_check', s);
    EXECUTE format($c$ALTER TABLE %I.comm_meeting_extracted_risks ADD CONSTRAINT comm_meeting_extracted_risks_status_check
      CHECK (status IN ('pending_review', 'approved', 'rejected', 'enriched', 'created', 'merged'))$c$, s);
  END LOOP;
END $$;

-- ── 4. Enrichment columns on every staging table ────────────────────────────
DO $$
DECLARE s TEXT; t TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    FOREACH t IN ARRAY ARRAY['comm_meeting_extracted_issues', 'comm_meeting_extracted_risks',
                             'comm_meeting_action_items', 'comm_meeting_extracted_decisions'] LOOP
      EXECUTE format($a$ALTER TABLE %I.%I
        ADD COLUMN IF NOT EXISTS duplicate_of_id UUID,
        ADD COLUMN IF NOT EXISTS duplicate_of_ref TEXT,
        ADD COLUMN IF NOT EXISTS duplicate_title TEXT,
        ADD COLUMN IF NOT EXISTS duplicate_score NUMERIC(5,4),
        ADD COLUMN IF NOT EXISTS suggested_owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS suggested_owner_name TEXT,
        ADD COLUMN IF NOT EXISTS suggested_due_date DATE,
        ADD COLUMN IF NOT EXISTS mapped_values JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS agent_note TEXT,
        ADD COLUMN IF NOT EXISTS agent_enriched_at TIMESTAMPTZ$a$, s, t);
    END LOOP;
  END LOOP;
END $$;

-- ── 5. Updates filed against existing records ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.comm_meeting_record_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.comm_meetings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('risk', 'issue', 'action', 'decision')),
  record_id UUID NOT NULL,
  record_ref TEXT,
  note TEXT NOT NULL,
  source_quote TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comm_record_updates_record ON public.comm_meeting_record_updates(entity_type, record_id);
CREATE INDEX IF NOT EXISTS idx_comm_record_updates_meeting ON public.comm_meeting_record_updates(meeting_id);

CREATE TABLE IF NOT EXISTS sim.comm_meeting_record_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.comm_meetings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('risk', 'issue', 'action', 'decision')),
  record_id UUID NOT NULL,
  record_ref TEXT,
  note TEXT NOT NULL,
  source_quote TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_comm_record_updates_record ON sim.comm_meeting_record_updates(entity_type, record_id);

-- ── 6. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.comm_meeting_extracted_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_extracted_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_meeting_record_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.comm_meeting_record_updates ENABLE ROW LEVEL SECURITY;

-- Platform decisions: same shape as v409 extracted issues, filing by anyone who may file the meeting
DROP POLICY IF EXISTS comm_extracted_decisions_select ON public.comm_meeting_extracted_decisions;
CREATE POLICY comm_extracted_decisions_select ON public.comm_meeting_extracted_decisions
  FOR SELECT TO authenticated USING (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS comm_extracted_decisions_insert ON public.comm_meeting_extracted_decisions;
CREATE POLICY comm_extracted_decisions_insert ON public.comm_meeting_extracted_decisions
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id) AND public.comm_user_can_file_meeting(meeting_id));
DROP POLICY IF EXISTS comm_extracted_decisions_update ON public.comm_meeting_extracted_decisions;
CREATE POLICY comm_extracted_decisions_update ON public.comm_meeting_extracted_decisions
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

-- Platform issues/risks: extra INSERT policy (permissive, OR'd with v409's organiser-only one)
DROP POLICY IF EXISTS comm_extracted_issues_file_insert ON public.comm_meeting_extracted_issues;
CREATE POLICY comm_extracted_issues_file_insert ON public.comm_meeting_extracted_issues
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id) AND public.comm_user_can_file_meeting(meeting_id));
DROP POLICY IF EXISTS comm_extracted_risks_file_insert ON public.comm_meeting_extracted_risks;
CREATE POLICY comm_extracted_risks_file_insert ON public.comm_meeting_extracted_risks
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id) AND public.comm_user_can_file_meeting(meeting_id));

-- Platform action items: filers may add and review them (v409 mutate policy stays for the organiser)
DROP POLICY IF EXISTS comm_action_items_file_insert ON public.comm_meeting_action_items;
CREATE POLICY comm_action_items_file_insert ON public.comm_meeting_action_items
  FOR INSERT TO authenticated
  WITH CHECK (public.comm_user_can_file_meeting(meeting_id)
              AND (project_id IS NULL OR public.auth_user_can_access_project(project_id)));
DROP POLICY IF EXISTS comm_action_items_file_update ON public.comm_meeting_action_items;
CREATE POLICY comm_action_items_file_update ON public.comm_meeting_action_items
  FOR UPDATE TO authenticated
  USING (public.comm_user_can_file_meeting(meeting_id))
  WITH CHECK (public.comm_user_can_file_meeting(meeting_id));

-- Platform summaries: filers may save the AI summary
DROP POLICY IF EXISTS comm_meeting_summaries_file_insert ON public.comm_meeting_summaries;
CREATE POLICY comm_meeting_summaries_file_insert ON public.comm_meeting_summaries
  FOR INSERT TO authenticated WITH CHECK (public.comm_user_can_file_meeting(meeting_id));
DROP POLICY IF EXISTS comm_meeting_summaries_file_update ON public.comm_meeting_summaries;
CREATE POLICY comm_meeting_summaries_file_update ON public.comm_meeting_summaries
  FOR UPDATE TO authenticated
  USING (public.comm_user_can_file_meeting(meeting_id)) WITH CHECK (public.comm_user_can_file_meeting(meeting_id));

DROP POLICY IF EXISTS comm_record_updates_select ON public.comm_meeting_record_updates;
CREATE POLICY comm_record_updates_select ON public.comm_meeting_record_updates
  FOR SELECT TO authenticated USING (public.comm_user_can_file_meeting(meeting_id));
DROP POLICY IF EXISTS comm_record_updates_insert ON public.comm_meeting_record_updates;
CREATE POLICY comm_record_updates_insert ON public.comm_meeting_record_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.comm_user_can_file_meeting(meeting_id) AND created_by = public.comm_current_user_id());

-- Simulator: the run owner files their practice meetings
DROP POLICY IF EXISTS sim_extracted_decisions_all ON sim.comm_meeting_extracted_decisions;
CREATE POLICY sim_extracted_decisions_all ON sim.comm_meeting_extracted_decisions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.practice_projects pp
                  WHERE pp.id = sim.comm_meeting_extracted_decisions.practice_project_id
                    AND public.sim_auth_user_owns_run(pp.simulation_run_id)))
  WITH CHECK (public.comm_user_can_file_meeting_sim(meeting_id)
              AND EXISTS (SELECT 1 FROM sim.practice_projects pp
                           WHERE pp.id = practice_project_id AND public.sim_auth_user_owns_run(pp.simulation_run_id)));

DROP POLICY IF EXISTS sim_extracted_issues_file_insert ON sim.comm_meeting_extracted_issues;
CREATE POLICY sim_extracted_issues_file_insert ON sim.comm_meeting_extracted_issues
  FOR INSERT TO authenticated
  WITH CHECK (public.comm_user_can_file_meeting_sim(meeting_id)
              AND EXISTS (SELECT 1 FROM sim.practice_projects pp
                           WHERE pp.id = practice_project_id AND public.sim_auth_user_owns_run(pp.simulation_run_id)));
DROP POLICY IF EXISTS sim_extracted_risks_file_insert ON sim.comm_meeting_extracted_risks;
CREATE POLICY sim_extracted_risks_file_insert ON sim.comm_meeting_extracted_risks
  FOR INSERT TO authenticated
  WITH CHECK (public.comm_user_can_file_meeting_sim(meeting_id)
              AND EXISTS (SELECT 1 FROM sim.practice_projects pp
                           WHERE pp.id = practice_project_id AND public.sim_auth_user_owns_run(pp.simulation_run_id)));
DROP POLICY IF EXISTS sim_action_items_file ON sim.comm_meeting_action_items;
CREATE POLICY sim_action_items_file ON sim.comm_meeting_action_items
  FOR ALL TO authenticated
  USING (public.comm_user_can_file_meeting_sim(meeting_id))
  WITH CHECK (public.comm_user_can_file_meeting_sim(meeting_id));
DROP POLICY IF EXISTS sim_meeting_summaries_file ON sim.comm_meeting_summaries;
CREATE POLICY sim_meeting_summaries_file ON sim.comm_meeting_summaries
  FOR ALL TO authenticated
  USING (public.comm_user_can_file_meeting_sim(meeting_id))
  WITH CHECK (public.comm_user_can_file_meeting_sim(meeting_id));

DROP POLICY IF EXISTS sim_record_updates_select ON sim.comm_meeting_record_updates;
CREATE POLICY sim_record_updates_select ON sim.comm_meeting_record_updates
  FOR SELECT TO authenticated USING (public.comm_user_can_file_meeting_sim(meeting_id));
DROP POLICY IF EXISTS sim_record_updates_insert ON sim.comm_meeting_record_updates;
CREATE POLICY sim_record_updates_insert ON sim.comm_meeting_record_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.comm_user_can_file_meeting_sim(meeting_id) AND created_by = public.comm_current_user_id());

GRANT SELECT, INSERT, UPDATE ON public.comm_meeting_extracted_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.comm_meeting_extracted_decisions TO authenticated;
GRANT SELECT, INSERT ON public.comm_meeting_record_updates TO authenticated;
GRANT SELECT, INSERT ON sim.comm_meeting_record_updates TO authenticated;
GRANT ALL ON public.comm_meeting_extracted_decisions, public.comm_meeting_record_updates TO service_role;
GRANT ALL ON sim.comm_meeting_extracted_decisions, sim.comm_meeting_record_updates TO service_role;

-- ── 7. Registry (CLAUDE.md "Database Table Registration Rule") ──────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('comm_meeting_extracted_decisions', 'Decisions extracted from a meeting by the Meeting-to-Register agent, waiting for review (v1281)', false, true),
  ('comm_meeting_record_updates', 'Meeting notes filed as updates against existing risks, issues, actions or decisions (v1281)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1281_meeting_register_agent.sql completed — re-run v1251_planner_table_wall.sql'; END $$;
