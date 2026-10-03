-- =============================================================================
-- v963p_pmis_gap_phase15_notification_preferences_sim_and_rls.sql
-- v963 PMIS Core Gap Closure — Phase 15: Notification Preferences (GAP-21)
--
-- 1) Fixes a real RLS gap in the existing public.notification_preference_templates
--    table (created by v645 with no RLS enabled at all — every authenticated user could
--    read/write every row with zero restriction). Real CRUD is now being built on top of
--    it, so this closes that gap rather than building UI atop an unsecured table.
-- 2) Builds the sim schema mirror (sim.notification_preferences /
--    sim.notification_preference_templates) — Platform-Simulator parity, fixes the
--    5 currently-broken Simulator routes that query a nonexistent sim table.
--
-- Prerequisites: v645 (public.notification_preferences / notification_preference_templates),
-- v397/v398 (public.is_user_pmo_admin), v66 (sim.update_updated_at).
-- =============================================================================

-- ── 1) Close the RLS gap on the existing public table ───────────────────────────

ALTER TABLE public.notification_preference_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_notification_preference_templates_read ON public.notification_preference_templates;
CREATE POLICY policy_notification_preference_templates_read ON public.notification_preference_templates
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_notification_preference_templates_write ON public.notification_preference_templates;
CREATE POLICY policy_notification_preference_templates_write ON public.notification_preference_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_notification_preference_templates_update ON public.notification_preference_templates;
CREATE POLICY policy_notification_preference_templates_update ON public.notification_preference_templates
  FOR UPDATE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_notification_preference_templates_delete ON public.notification_preference_templates;
CREATE POLICY policy_notification_preference_templates_delete ON public.notification_preference_templates
  FOR DELETE TO authenticated USING (public.is_user_pmo_admin(auth.uid()));

-- ── 2) Sim schema mirror ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.notification_preference_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(120) NOT NULL,
  role_name VARCHAR(80),
  event_category VARCHAR(60) NOT NULL,
  channel_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  channel_email BOOLEAN NOT NULL DEFAULT TRUE,
  channel_push BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(30) NOT NULL DEFAULT 'instant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_category VARCHAR(60) NOT NULL,
  channel_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  channel_email BOOLEAN NOT NULL DEFAULT TRUE,
  channel_push BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(30) NOT NULL DEFAULT 'instant',
  mute_project_ids UUID[] DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_notification_preferences UNIQUE (user_id, event_category)
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['notification_preference_templates', 'notification_preferences']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sim_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_sim_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

ALTER TABLE sim.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_notification_preferences_own ON sim.notification_preferences;
CREATE POLICY policy_sim_notification_preferences_own ON sim.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Simulator has no organisation/PMO-admin concept at the schema level (see sim.practice_projects
-- — single user_id owner, no accounts table). Templates are shared reference content across the
-- whole practice sandbox, so — unlike the Platform table above — read AND write are open to any
-- authenticated user here, consistent with how other shared sim reference tables behave
-- (e.g. sim.custom_scenarios' public/published visibility). Flagged in the v963 plan review.
ALTER TABLE sim.notification_preference_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_notification_preference_templates ON sim.notification_preference_templates;
CREATE POLICY policy_sim_notification_preference_templates ON sim.notification_preference_templates FOR ALL TO authenticated
  USING (is_deleted = FALSE) WITH CHECK (TRUE);

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.notification_preferences, sim.notification_preference_templates TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.notification_preferences', 'Per-user notification preferences (GAP-21, Simulator)', false, true),
  ('sim.notification_preference_templates', 'Default notification templates by role (GAP-21, Simulator)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963p_pmis_gap_phase15_notification_preferences_sim_and_rls.sql completed'; END $$;
