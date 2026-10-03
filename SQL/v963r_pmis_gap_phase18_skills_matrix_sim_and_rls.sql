-- =============================================================================
-- v963r_pmis_gap_phase18_skills_matrix_sim_and_rls.sql
-- v963 PMIS Core Gap Closure — Phase 18: Skills Matrix (GAP-11)
--
-- Fully separate from the existing `resource_skills` table / ResourceSkills.jsx
-- (free-text per-resource skill list) — NOT touched here. This is the distinct,
-- org-wide skill catalog + 1-5 competency matrix (skill_catalog / member_skills /
-- skill_requirements / skill_endorsements, v644).
--
-- 1) Closes a real RLS gap: public.skill_requirements and public.skill_endorsements
--    (v644) were created with no RLS enabled at all.
-- 2) Builds the sim schema mirror. Simulator has no organisation/accounts concept at
--    the schema level, so sim.skill_categories/sim.skill_catalog drop the account_id
--    scoping and use created_by (single-user ownership) instead — a deliberate,
--    documented adaptation, not a literal 1:1 mirror, since sim is a single shared
--    practice sandbox rather than a multi-tenant org boundary.
--
-- Prerequisites: v644 (public.skill_categories/skill_catalog/member_skills/
-- skill_requirements/skill_endorsements), v397/v398 (public.is_user_pmo_admin),
-- v66 (sim.update_updated_at), v80 (sim.practice_projects).
-- =============================================================================

-- ── 1) Close the RLS gap on the existing public tables ──────────────────────────

ALTER TABLE public.skill_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_skill_requirements ON public.skill_requirements;
CREATE POLICY policy_skill_requirements ON public.skill_requirements FOR ALL TO authenticated
  USING (
    public.is_user_pmo_admin(auth.uid())
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = skill_requirements.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
    ))
  )
  WITH CHECK (
    public.is_user_pmo_admin(auth.uid())
    OR (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = skill_requirements.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
    ))
  );

ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_skill_endorsements_read ON public.skill_endorsements;
CREATE POLICY policy_skill_endorsements_read ON public.skill_endorsements FOR SELECT TO authenticated
  USING (
    endorser_user_id = auth.uid()
    OR public.is_user_pmo_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.member_skills ms WHERE ms.id = skill_endorsements.member_skill_id AND ms.user_id = auth.uid())
  );
DROP POLICY IF EXISTS policy_skill_endorsements_write ON public.skill_endorsements;
CREATE POLICY policy_skill_endorsements_write ON public.skill_endorsements FOR INSERT TO authenticated
  WITH CHECK (endorser_user_id = auth.uid());
DROP POLICY IF EXISTS policy_skill_endorsements_delete ON public.skill_endorsements;
CREATE POLICY policy_skill_endorsements_delete ON public.skill_endorsements FOR DELETE TO authenticated
  USING (endorser_user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

-- ── 2) Sim schema mirror ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_name VARCHAR(120) NOT NULL,
  category_code VARCHAR(40),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.skill_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES sim.skill_categories(id) ON DELETE SET NULL,
  skill_name VARCHAR(255) NOT NULL,
  skill_code VARCHAR(60),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES sim.skill_catalog(id) ON DELETE CASCADE,
  competency_level INTEGER NOT NULL DEFAULT 1 CHECK (competency_level BETWEEN 1 AND 5),
  assessed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_member_skills UNIQUE (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS sim.skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES sim.skill_catalog(id) ON DELETE CASCADE,
  required_level INTEGER NOT NULL DEFAULT 3 CHECK (required_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_skill_id UUID NOT NULL REFERENCES sim.member_skills(id) ON DELETE CASCADE,
  endorser_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endorsement_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sim_skill_endorsements UNIQUE (member_skill_id, endorser_user_id)
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'skill_categories', 'skill_catalog', 'member_skills', 'skill_requirements'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sim_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_sim_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

-- Catalog/categories: shared reference content across the sandbox, readable by everyone;
-- mutable by whoever created the row (single-user ownership — no PMO-admin concept in sim).
ALTER TABLE sim.skill_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_skill_categories_read ON sim.skill_categories;
CREATE POLICY policy_sim_skill_categories_read ON sim.skill_categories FOR SELECT TO authenticated USING (is_deleted = FALSE);
DROP POLICY IF EXISTS policy_sim_skill_categories_write ON sim.skill_categories;
CREATE POLICY policy_sim_skill_categories_write ON sim.skill_categories FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS policy_sim_skill_categories_update ON sim.skill_categories;
CREATE POLICY policy_sim_skill_categories_update ON sim.skill_categories FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS policy_sim_skill_categories_delete ON sim.skill_categories;
CREATE POLICY policy_sim_skill_categories_delete ON sim.skill_categories FOR DELETE TO authenticated USING (created_by = auth.uid());

ALTER TABLE sim.skill_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_skill_catalog_read ON sim.skill_catalog;
CREATE POLICY policy_sim_skill_catalog_read ON sim.skill_catalog FOR SELECT TO authenticated USING (is_deleted = FALSE);
DROP POLICY IF EXISTS policy_sim_skill_catalog_write ON sim.skill_catalog;
CREATE POLICY policy_sim_skill_catalog_write ON sim.skill_catalog FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS policy_sim_skill_catalog_update ON sim.skill_catalog;
CREATE POLICY policy_sim_skill_catalog_update ON sim.skill_catalog FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS policy_sim_skill_catalog_delete ON sim.skill_catalog;
CREATE POLICY policy_sim_skill_catalog_delete ON sim.skill_catalog FOR DELETE TO authenticated USING (created_by = auth.uid());

ALTER TABLE sim.member_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_member_skills ON sim.member_skills;
CREATE POLICY policy_sim_member_skills ON sim.member_skills FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE sim.skill_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_skill_requirements ON sim.skill_requirements;
CREATE POLICY policy_sim_skill_requirements ON sim.skill_requirements FOR ALL TO authenticated
  USING (
    project_id IS NULL
    OR EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = skill_requirements.project_id AND pp.user_id = auth.uid())
  )
  WITH CHECK (
    project_id IS NULL
    OR EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = skill_requirements.project_id AND pp.user_id = auth.uid())
  );

ALTER TABLE sim.skill_endorsements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_skill_endorsements_read ON sim.skill_endorsements;
CREATE POLICY policy_sim_skill_endorsements_read ON sim.skill_endorsements FOR SELECT TO authenticated
  USING (
    endorser_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sim.member_skills ms WHERE ms.id = skill_endorsements.member_skill_id AND ms.user_id = auth.uid())
  );
DROP POLICY IF EXISTS policy_sim_skill_endorsements_write ON sim.skill_endorsements;
CREATE POLICY policy_sim_skill_endorsements_write ON sim.skill_endorsements FOR INSERT TO authenticated
  WITH CHECK (endorser_user_id = auth.uid());
DROP POLICY IF EXISTS policy_sim_skill_endorsements_delete ON sim.skill_endorsements;
CREATE POLICY policy_sim_skill_endorsements_delete ON sim.skill_endorsements FOR DELETE TO authenticated
  USING (endorser_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON
  sim.skill_categories, sim.skill_catalog, sim.member_skills, sim.skill_requirements, sim.skill_endorsements
  TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.skill_categories', 'Skill category groupings (GAP-11, Simulator)', false, true),
  ('sim.skill_catalog', 'Practice sandbox skill catalog (GAP-11, Simulator)', false, true),
  ('sim.member_skills', 'Member skill competency levels (GAP-11, Simulator)', false, true),
  ('sim.skill_requirements', 'Required skills per task/role (GAP-11, Simulator)', false, true),
  ('sim.skill_endorsements', 'Peer skill endorsements (GAP-11, Simulator)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963r_pmis_gap_phase18_skills_matrix_sim_and_rls.sql completed'; END $$;
