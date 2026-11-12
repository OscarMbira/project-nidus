-- ============================================================================
-- v1448: Simulator Decision Log on the sim schema (practice projects)
-- PRD/plan: projectprd/v1340 / projectplan/v1340 (wave 2b follow-up: Simulator parity gap)
--
-- The Simulator's Decision Log pages (/simulator/governance/decisions) were a copy of the
-- Platform pages and saved to public.project_decisions against Platform projects. That breaks
-- the rule that Simulator data never goes to the public schema, and it meant the Simulator AI
-- search (sim.ai_v_decisions, v1274) never saw them. From this version the Simulator pages use
-- sim.project_decisions (v628d), keyed by sim.practice_projects, like the other practice
-- registers. Decisions saved earlier through the Simulator stay in public.project_decisions
-- and remain visible in the Platform, where their projects are.
--
-- 1. updated_by column (the pages record who last changed a decision).
-- 2. Decision ID from Admin ID Generation (rule 16.2): AFTER INSERT trigger on
--    decision_reference. Run Admin SQL v248 (rule sim.project_decisions, SDEC) first.
--    Rows with a blank reference are filled once the rule exists.
-- 3. Access: v628d let any signed-in user read and change every Simulator decision. Now only
--    the practice project's owner and its active members can (same as sim.assumptions, v963b).
-- 4. Custom fields screen decision_detail in the sim schema.
--
-- Idempotent. Run after Admin v248 and v1447.
-- ============================================================================

-- ── 1. Column ───────────────────────────────────────────────────────────────
ALTER TABLE sim.project_decisions ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ── 2. Decision ID ──────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sim_project_decisions_display_id ON sim.project_decisions;
CREATE TRIGGER trg_sim_project_decisions_display_id
  AFTER INSERT ON sim.project_decisions
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.project_decisions', 'decision_reference');

UPDATE sim.project_decisions d
   SET decision_reference = admin.generate_display_id('sim.project_decisions', d.id)
 WHERE COALESCE(btrim(d.decision_reference), '') = ''
   AND EXISTS (SELECT 1 FROM admin.id_generation_rules r WHERE r.target_table = 'sim.project_decisions');

-- ── 3. Access ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sim_project_decisions_all" ON sim.project_decisions;

DROP POLICY IF EXISTS policy_sim_project_decisions_select ON sim.project_decisions;
CREATE POLICY policy_sim_project_decisions_select ON sim.project_decisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = project_decisions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_project_decisions_insert ON sim.project_decisions;
CREATE POLICY policy_sim_project_decisions_insert ON sim.project_decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = project_decisions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_project_decisions_update ON sim.project_decisions;
CREATE POLICY policy_sim_project_decisions_update ON sim.project_decisions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = project_decisions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = project_decisions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

-- Hard delete: practice project owner only (the pages soft-delete through is_deleted).
DROP POLICY IF EXISTS policy_sim_project_decisions_delete ON sim.project_decisions;
CREATE POLICY policy_sim_project_decisions_delete ON sim.project_decisions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = project_decisions.project_id AND pp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_decisions TO authenticated;
GRANT ALL ON sim.project_decisions TO service_role;

-- ── 4. Custom fields screen ─────────────────────────────────────────────────
INSERT INTO sim.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, 'decision_detail', 'Decision log entry', 'decision', '/simulator/governance/decisions/:id', 3, TRUE
FROM sim.system_modules m
WHERE m.module_code = 'projects'
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  is_active = TRUE,
  updated_at = NOW();

-- ── Check ───────────────────────────────────────────────────────────────────
SELECT
  (SELECT string_agg(policyname, ', ' ORDER BY policyname) FROM pg_policies
    WHERE schemaname = 'sim' AND tablename = 'project_decisions') AS sim_policies_expected_4,
  EXISTS (SELECT 1 FROM admin.id_generation_rules WHERE target_table = 'sim.project_decisions') AS admin_rule_exists,
  (SELECT count(*) FROM sim.project_decisions WHERE COALESCE(btrim(decision_reference), '') = '') AS blank_references,
  (SELECT count(*) FROM sim.system_screens WHERE screen_code = 'decision_detail') AS sim_screen_rows;
