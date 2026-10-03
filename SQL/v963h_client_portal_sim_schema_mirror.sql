-- =============================================================================
-- v963h_client_portal_sim_schema_mirror.sql
-- v963 PMIS Core Gap Closure — Phase 10 (GAP-07 Client Portal): sim schema mirror.
-- Mirrors public.client_portal_configs / client_portal_sections / client_portal_guests /
-- client_portal_sessions (SQL/v644) into the sim schema. `project_id` becomes
-- `practice_project_id`, referencing sim.practice_projects (SQL/v80), matching the naming
-- convention used by every other sim project-scoped table.
-- Prerequisites: v66 (sim.update_updated_at), v80 (sim.practice_projects).
-- No seed data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.client_portal_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  portal_name VARCHAR(255) NOT NULL,
  portal_slug VARCHAR(80) NOT NULL,
  branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_client_portal_slug UNIQUE (portal_slug)
);

CREATE TABLE IF NOT EXISTS sim.client_portal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES sim.client_portal_configs(id) ON DELETE CASCADE,
  section_key VARCHAR(60) NOT NULL,
  section_label VARCHAR(120) NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_client_portal_sections UNIQUE (portal_id, section_key)
);

CREATE TABLE IF NOT EXISTS sim.client_portal_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES sim.client_portal_configs(id) ON DELETE CASCADE,
  guest_email VARCHAR(255) NOT NULL,
  guest_name VARCHAR(255),
  access_token_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES sim.client_portal_guests(id) ON DELETE CASCADE,
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_ended_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  pages_viewed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_client_portal_configs_project ON sim.client_portal_configs (practice_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_client_portal_sections_portal ON sim.client_portal_sections (portal_id);
CREATE INDEX IF NOT EXISTS idx_sim_client_portal_guests_portal ON sim.client_portal_guests (portal_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_client_portal_sessions_guest ON sim.client_portal_sessions (guest_id);

-- ── Triggers ─────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_portal_configs', 'client_portal_sections', 'client_portal_guests']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sim_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_sim_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- A portal is visible/editable to the owner of its linked practice project. Sections/guests/
-- sessions resolve through their parent portal. Guest tokens are never exposed via a SELECT of
-- access_token_hash in the app UI (rule: hashed at rest, never re-displayed after creation) —
-- enforced at the application layer (clientPortalService.js never re-selects that column after
-- the initial insert response), same as RLS enforces row-level access here.

ALTER TABLE sim.client_portal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_portal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_portal_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.client_portal_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_sim_client_portal_configs ON sim.client_portal_configs;
CREATE POLICY policy_sim_client_portal_configs ON sim.client_portal_configs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = client_portal_configs.practice_project_id AND pp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = client_portal_configs.practice_project_id AND pp.user_id = auth.uid()));

DROP POLICY IF EXISTS policy_sim_client_portal_sections ON sim.client_portal_sections;
CREATE POLICY policy_sim_client_portal_sections ON sim.client_portal_sections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.client_portal_configs c
    JOIN sim.practice_projects pp ON pp.id = c.practice_project_id
    WHERE c.id = client_portal_sections.portal_id AND pp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS policy_sim_client_portal_guests ON sim.client_portal_guests;
CREATE POLICY policy_sim_client_portal_guests ON sim.client_portal_guests FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.client_portal_configs c
    JOIN sim.practice_projects pp ON pp.id = c.practice_project_id
    WHERE c.id = client_portal_guests.portal_id AND pp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS policy_sim_client_portal_sessions ON sim.client_portal_sessions;
CREATE POLICY policy_sim_client_portal_sessions ON sim.client_portal_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.client_portal_guests g
    JOIN sim.client_portal_configs c ON c.id = g.portal_id
    JOIN sim.practice_projects pp ON pp.id = c.practice_project_id
    WHERE g.id = client_portal_sessions.guest_id AND pp.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.client_portal_configs, sim.client_portal_sections, sim.client_portal_guests TO authenticated;
GRANT SELECT ON sim.client_portal_sessions TO authenticated;

-- ── database_tables registry ────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.client_portal_configs', 'Simulator per-project client portal settings (GAP-07 sim mirror)', false, true),
  ('sim.client_portal_sections', 'Visible sections per Simulator client portal (GAP-07 sim mirror)', false, true),
  ('sim.client_portal_guests', 'Guest access tokens for Simulator client portal (GAP-07 sim mirror)', false, true),
  ('sim.client_portal_sessions', 'Simulator client portal access session log (GAP-07 sim mirror)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963h_client_portal_sim_schema_mirror.sql completed'; END $$;
