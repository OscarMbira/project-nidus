-- ============================================================================
-- v1242: Simulator twins of the planning tables the shared @nidus/planning screens need
-- Plan: projectplan/v1239_dual_mode_planning_product_plan.md (Slice 2.1, decision D3)
--
-- Creates sim.<table> from the LIVE public.<table> definition (CREATE TABLE … (LIKE … INCLUDING
-- ALL)) so every column added over the years is included, then:
--   * project_id → practice_project_id, FK to sim.practice_projects (Simulator convention);
--   * re-creates FKs between the twins (LIKE does not copy foreign keys);
--   * RLS via sim.auth_user_can_access_practice_project() (owner / manager / member / PMO);
--   * display-ID trigger for dependency_code (Admin rule: Admin SQL v226).
-- task_statuses is NOT twinned: it is a read-only lookup; sim.tasks.status_id references
-- public.task_statuses. Practice data is never written to public (Simulator rules).
-- Idempotent. Prerequisites: public tables (v06, v18, v39, v139, v644), sim.practice_projects,
-- sim.auth_user_can_access_practice_project (v841), sim.trg_apply_admin_display_id (v756).
-- ============================================================================

-- ── 1. Tables (structure copied from public) ────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.tasks                       (LIKE public.tasks INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.task_dependencies           (LIKE public.task_dependencies INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.project_baselines           (LIKE public.project_baselines INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.baseline_snapshots          (LIKE public.baseline_snapshots INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.project_milestones          (LIKE public.project_milestones INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.gantt_settings              (LIKE public.gantt_settings INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.inter_project_dependencies  (LIKE public.inter_project_dependencies INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.dependency_resolutions      (LIKE public.dependency_resolutions INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.dependency_impacts          (LIKE public.dependency_impacts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS sim.dependency_critical_paths   (LIKE public.dependency_critical_paths INCLUDING ALL);

-- ── 2. project_id → practice_project_id (where the column exists) ───────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','task_dependencies','project_baselines','project_milestones','gantt_settings']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'sim' AND table_name = t AND column_name = 'project_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'sim' AND table_name = t AND column_name = 'practice_project_id') THEN
      EXECUTE format('ALTER TABLE sim.%I RENAME COLUMN project_id TO practice_project_id', t);
    END IF;
  END LOOP;
END $$;

-- ── 3. Foreign keys (idempotent: add only when missing) ─────────────────────
CREATE OR REPLACE FUNCTION pg_temp.add_fk(p_table TEXT, p_name TEXT, p_def TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = p_name AND conrelid = p_table::regclass) THEN
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', p_table, p_name, p_def);
  END IF;
END $$;

DO $$
BEGIN
  -- practice project owners
  PERFORM pg_temp.add_fk('sim.tasks', 'sim_tasks_practice_project_fk',
    'FOREIGN KEY (practice_project_id) REFERENCES sim.practice_projects(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.project_baselines', 'sim_project_baselines_practice_project_fk',
    'FOREIGN KEY (practice_project_id) REFERENCES sim.practice_projects(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.project_milestones', 'sim_project_milestones_practice_project_fk',
    'FOREIGN KEY (practice_project_id) REFERENCES sim.practice_projects(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.gantt_settings', 'sim_gantt_settings_practice_project_fk',
    'FOREIGN KEY (practice_project_id) REFERENCES sim.practice_projects(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.inter_project_dependencies', 'sim_ipd_source_practice_project_fk',
    'FOREIGN KEY (source_project_id) REFERENCES sim.practice_projects(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.inter_project_dependencies', 'sim_ipd_target_practice_project_fk',
    'FOREIGN KEY (target_project_id) REFERENCES sim.practice_projects(id) ON DELETE CASCADE');

  -- between twins
  PERFORM pg_temp.add_fk('sim.tasks', 'sim_tasks_parent_fk',
    'FOREIGN KEY (parent_task_id) REFERENCES sim.tasks(id) ON DELETE SET NULL');
  PERFORM pg_temp.add_fk('sim.tasks', 'sim_tasks_status_fk',
    'FOREIGN KEY (status_id) REFERENCES public.task_statuses(id)');
  PERFORM pg_temp.add_fk('sim.task_dependencies', 'sim_task_dependencies_predecessor_fk',
    'FOREIGN KEY (predecessor_task_id) REFERENCES sim.tasks(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.task_dependencies', 'sim_task_dependencies_successor_fk',
    'FOREIGN KEY (successor_task_id) REFERENCES sim.tasks(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.baseline_snapshots', 'sim_baseline_snapshots_baseline_fk',
    'FOREIGN KEY (baseline_id) REFERENCES sim.project_baselines(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.project_milestones', 'sim_project_milestones_task_fk',
    'FOREIGN KEY (task_id) REFERENCES sim.tasks(id) ON DELETE SET NULL');
  PERFORM pg_temp.add_fk('sim.dependency_resolutions', 'sim_dependency_resolutions_dependency_fk',
    'FOREIGN KEY (dependency_id) REFERENCES sim.inter_project_dependencies(id) ON DELETE CASCADE');
  PERFORM pg_temp.add_fk('sim.dependency_impacts', 'sim_dependency_impacts_dependency_fk',
    'FOREIGN KEY (dependency_id) REFERENCES sim.inter_project_dependencies(id) ON DELETE CASCADE');
END $$;

CREATE INDEX IF NOT EXISTS idx_sim_tasks_practice_project ON sim.tasks (practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_task_dependencies_successor ON sim.task_dependencies (successor_task_id);
CREATE INDEX IF NOT EXISTS idx_sim_project_milestones_practice_project ON sim.project_milestones (practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_project_baselines_practice_project ON sim.project_baselines (practice_project_id);

-- ── 4. Display-ID trigger (rule 16.2; Admin rule in Admin SQL v226) ─────────
DROP TRIGGER IF EXISTS trg_sim_inter_project_dependencies_admin_display_id ON sim.inter_project_dependencies;
CREATE TRIGGER trg_sim_inter_project_dependencies_admin_display_id
  AFTER INSERT ON sim.inter_project_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.inter_project_dependencies', 'dependency_code');

-- ── 5. RLS ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','task_dependencies','project_baselines','baseline_snapshots','project_milestones',
                           'gantt_settings','inter_project_dependencies','dependency_resolutions','dependency_impacts',
                           'dependency_critical_paths']
  LOOP
    EXECUTE format('ALTER TABLE sim.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON sim.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON sim.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS policy_sim_%s_access ON sim.%I', t, t);
  END LOOP;
END $$;

CREATE POLICY policy_sim_tasks_access ON sim.tasks FOR ALL TO authenticated
  USING (sim.auth_user_can_access_practice_project(practice_project_id))
  WITH CHECK (sim.auth_user_can_access_practice_project(practice_project_id));

CREATE POLICY policy_sim_task_dependencies_access ON sim.task_dependencies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.tasks t WHERE t.id = predecessor_task_id
                 AND sim.auth_user_can_access_practice_project(t.practice_project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.tasks t WHERE t.id = predecessor_task_id
                 AND sim.auth_user_can_access_practice_project(t.practice_project_id)));

CREATE POLICY policy_sim_project_baselines_access ON sim.project_baselines FOR ALL TO authenticated
  USING (sim.auth_user_can_access_practice_project(practice_project_id))
  WITH CHECK (sim.auth_user_can_access_practice_project(practice_project_id));

CREATE POLICY policy_sim_baseline_snapshots_access ON sim.baseline_snapshots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.project_baselines b WHERE b.id = baseline_id
                 AND sim.auth_user_can_access_practice_project(b.practice_project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.project_baselines b WHERE b.id = baseline_id
                 AND sim.auth_user_can_access_practice_project(b.practice_project_id)));

CREATE POLICY policy_sim_project_milestones_access ON sim.project_milestones FOR ALL TO authenticated
  USING (sim.auth_user_can_access_practice_project(practice_project_id))
  WITH CHECK (sim.auth_user_can_access_practice_project(practice_project_id));

CREATE POLICY policy_sim_gantt_settings_access ON sim.gantt_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid()
              AND (practice_project_id IS NULL OR sim.auth_user_can_access_practice_project(practice_project_id)));

CREATE POLICY policy_sim_inter_project_dependencies_access ON sim.inter_project_dependencies FOR ALL TO authenticated
  USING (sim.auth_user_can_access_practice_project(source_project_id)
         OR sim.auth_user_can_access_practice_project(target_project_id))
  WITH CHECK (sim.auth_user_can_access_practice_project(source_project_id));

CREATE POLICY policy_sim_dependency_resolutions_access ON sim.dependency_resolutions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.inter_project_dependencies d WHERE d.id = dependency_id
                 AND (sim.auth_user_can_access_practice_project(d.source_project_id)
                      OR sim.auth_user_can_access_practice_project(d.target_project_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.inter_project_dependencies d WHERE d.id = dependency_id
                 AND sim.auth_user_can_access_practice_project(d.source_project_id)));

CREATE POLICY policy_sim_dependency_impacts_access ON sim.dependency_impacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.inter_project_dependencies d WHERE d.id = dependency_id
                 AND (sim.auth_user_can_access_practice_project(d.source_project_id)
                      OR sim.auth_user_can_access_practice_project(d.target_project_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.inter_project_dependencies d WHERE d.id = dependency_id
                 AND sim.auth_user_can_access_practice_project(d.source_project_id)));

-- Portfolio-level analysis rows: visible to their author and PMO admins.
CREATE POLICY policy_sim_dependency_critical_paths_access ON sim.dependency_critical_paths FOR ALL TO authenticated
  USING (created_by = sim.get_current_user_id() OR analyzed_by_user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())
  WITH CHECK (created_by = sim.get_current_user_id() OR public.is_pmo_admin_user());

-- ── 6. Registry ─────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.tasks', 'Simulator: practice project activities (twin of public.tasks; v1239 shared planning screens)', false, true),
  ('sim.task_dependencies', 'Simulator: dependencies between practice activities (twin of public.task_dependencies)', false, true),
  ('sim.project_baselines', 'Simulator: practice project schedule baselines (twin of public.project_baselines)', false, true),
  ('sim.baseline_snapshots', 'Simulator: baseline snapshot rows (twin of public.baseline_snapshots)', false, true),
  ('sim.project_milestones', 'Simulator: practice project milestones (twin of public.project_milestones)', false, true),
  ('sim.gantt_settings', 'Simulator: per-user Gantt view settings (twin of public.gantt_settings)', false, true),
  ('sim.inter_project_dependencies', 'Simulator: dependencies between practice projects (twin of public.inter_project_dependencies)', false, true),
  ('sim.dependency_resolutions', 'Simulator: resolutions of practice inter-project dependencies', false, true),
  ('sim.dependency_impacts', 'Simulator: impact assessments of practice inter-project dependencies', false, true),
  ('sim.dependency_critical_paths', 'Simulator: critical-path analysis across practice projects', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1242: 10 sim planning twins created (RLS via sim.auth_user_can_access_practice_project).';
END $$;
