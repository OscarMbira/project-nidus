-- =============================================================================
-- v963m_sim_guest_access_training_tables.sql
-- v963 PMIS Core Gap Closure — Phase 13 (Guest Access, GAP-19) and Phase 14
-- (Training Tracker, GAP-20) Simulator (sim schema) mirrors of
-- public.guest_collaborators/guest_access_tokens and
-- public.training_certifications/member_training_records
-- (SQL/v645_pmis_gap_tables_tier3.sql). Fixes the Simulator route for Training
-- Tracker that already exists in PmisGapRoutes.jsx (TrainingPageSim) but queries a
-- sim table that never existed. Guest Access has no Simulator route today (Platform
-- feature only in the current route file) — this file adds the schema for parity
-- (rule 34) so a future Simulator route can be wired without another migration.
--
-- sim schema has no accounts/organisation concept (each practice project is
-- single-owner, see sim.practice_projects.user_id) so
-- sim.training_certifications is scoped to its creator + practice-project members
-- via the same admin-managed-catalog pattern as public.training_certifications,
-- minus the account_id column. linked_skill_id is a soft (non-FK) reference —
-- sim.skill_catalog does not exist yet as of this migration (tracked separately
-- under GAP-11 Skills Matrix); adding the FK later is a non-breaking column
-- constraint addition once that table lands.
--
-- Prerequisites: v66 (sim schema core), sim.practice_projects (v80),
--                 sim.practice_project_memberships (v242/v389), sim.update_updated_at(),
--                 sim.pmis_gap_can_access_practice_project() (v963l, this initiative)
-- PostgreSQL 15+ (Supabase). Idempotent.
-- =============================================================================

-- ── GAP-19: Guest Access ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.guest_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  guest_email VARCHAR(255) NOT NULL,
  guest_name VARCHAR(255),
  permission_level VARCHAR(30) NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'limited_edit')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_guest_collaborators UNIQUE (practice_project_id, guest_email)
);

CREATE TABLE IF NOT EXISTS sim.guest_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES sim.guest_collaborators(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- ── GAP-20: Training & Certifications ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.training_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_name VARCHAR(255) NOT NULL,
  certification_code VARCHAR(60),
  issuing_body VARCHAR(255),
  validity_months INTEGER,
  linked_skill_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.member_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_id UUID REFERENCES sim.training_certifications(id) ON DELETE SET NULL,
  record_type VARCHAR(30) NOT NULL DEFAULT 'certification'
    CHECK (record_type IN ('certification', 'training', 'development_plan')),
  title VARCHAR(255) NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  completion_status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Triggers ───────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'guest_collaborators', 'training_certifications', 'member_training_records'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE sim.guest_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_guest_collaborators ON sim.guest_collaborators;
CREATE POLICY policy_sim_guest_collaborators ON sim.guest_collaborators FOR ALL TO authenticated
  USING (sim.pmis_gap_can_access_practice_project(practice_project_id))
  WITH CHECK (sim.pmis_gap_can_access_practice_project(practice_project_id));

ALTER TABLE sim.guest_access_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_guest_access_tokens ON sim.guest_access_tokens;
CREATE POLICY policy_sim_guest_access_tokens ON sim.guest_access_tokens FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.guest_collaborators g
    WHERE g.id = guest_access_tokens.guest_id AND sim.pmis_gap_can_access_practice_project(g.practice_project_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.guest_collaborators g
    WHERE g.id = guest_access_tokens.guest_id AND sim.pmis_gap_can_access_practice_project(g.practice_project_id)
  ));

-- Catalog: any authenticated sim user may read; only the creator may manage
-- (no org-admin concept in sim — practice projects are single-owner).
ALTER TABLE sim.training_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_training_certifications_read ON sim.training_certifications;
CREATE POLICY policy_sim_training_certifications_read ON sim.training_certifications FOR SELECT TO authenticated
  USING (COALESCE(is_deleted, FALSE) = FALSE);
DROP POLICY IF EXISTS policy_sim_training_certifications_insert ON sim.training_certifications;
CREATE POLICY policy_sim_training_certifications_insert ON sim.training_certifications FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS policy_sim_training_certifications_update ON sim.training_certifications;
CREATE POLICY policy_sim_training_certifications_update ON sim.training_certifications FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS policy_sim_training_certifications_delete ON sim.training_certifications;
CREATE POLICY policy_sim_training_certifications_delete ON sim.training_certifications FOR DELETE TO authenticated
  USING (created_by = auth.uid());

ALTER TABLE sim.member_training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_member_training_records ON sim.member_training_records;
CREATE POLICY policy_sim_member_training_records ON sim.member_training_records FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Registry ─────────────────────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.guest_collaborators', 'External guest collaborator registry — simulator (GAP-19)', false, true, 'simulation'),
  ('sim.guest_access_tokens', 'Guest access token records — simulator (GAP-19)', false, true, 'simulation'),
  ('sim.training_certifications', 'Certification catalog — simulator (GAP-20)', false, true, 'simulation'),
  ('sim.member_training_records', 'Member training and certification records — simulator (GAP-20)', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963m_sim_guest_access_training_tables.sql completed'; END $$;
