-- ============================================================================
-- v391: sim.practice_team_functional_roles (Simulator / v345)
-- Prerequisites: v240 (practice_teams, practice_team_members)
-- PostgreSQL 15+ (Supabase)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_team_functional_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_team_id UUID NOT NULL REFERENCES sim.practice_teams(id) ON DELETE CASCADE,
  role_label VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_practice_team_functional_roles_team_label UNIQUE (practice_team_id, role_label)
);

CREATE INDEX IF NOT EXISTS idx_practice_team_functional_roles_team_id
  ON sim.practice_team_functional_roles(practice_team_id) WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION sim.seed_practice_team_functional_roles_for_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sim.practice_team_functional_roles (practice_team_id, role_label, sort_order, is_active)
  VALUES
    (NEW.id, 'Developer', 10, TRUE),
    (NEW.id, 'Tester', 20, TRUE),
    (NEW.id, 'Designer', 30, TRUE),
    (NEW.id, 'Analyst', 40, TRUE),
    (NEW.id, 'Scrum Master', 50, TRUE),
    (NEW.id, 'Tech Lead', 60, TRUE),
    (NEW.id, 'Business Analyst', 70, TRUE),
    (NEW.id, 'Other', 100, TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_practice_teams_seed_functional_roles ON sim.practice_teams;
CREATE TRIGGER trg_practice_teams_seed_functional_roles
  AFTER INSERT ON sim.practice_teams
  FOR EACH ROW
  EXECUTE PROCEDURE sim.seed_practice_team_functional_roles_for_team();

INSERT INTO sim.practice_team_functional_roles (practice_team_id, role_label, sort_order, is_active)
SELECT pt.id, v.role_label, v.sort_order, TRUE
FROM sim.practice_teams pt
CROSS JOIN (
  VALUES
    ('Developer', 10),
    ('Tester', 20),
    ('Designer', 30),
    ('Analyst', 40),
    ('Scrum Master', 50),
    ('Tech Lead', 60),
    ('Business Analyst', 70),
    ('Other', 100)
) AS v(role_label, sort_order)
WHERE COALESCE(pt.is_deleted, FALSE) = FALSE
ON CONFLICT (practice_team_id, role_label) DO NOTHING;

ALTER TABLE sim.practice_team_functional_roles ENABLE ROW LEVEL SECURITY;

-- Read: practice project owner or team lead or member of practice project
CREATE POLICY practice_team_functional_roles_select ON sim.practice_team_functional_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_teams pt
      WHERE pt.id = practice_team_functional_roles.practice_team_id
        AND (
          pt.user_id = auth.uid()
          OR pt.team_lead_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sim.practice_project_memberships pm
            WHERE pm.practice_project_id = pt.practice_project_id
              AND pm.user_id = auth.uid()
              AND pm.is_active = TRUE
          )
        )
        AND COALESCE(pt.is_deleted, FALSE) = FALSE
    )
  );

-- Manage: team lead or practice team owner (creator)
CREATE POLICY practice_team_functional_roles_manage ON sim.practice_team_functional_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_teams pt
      WHERE pt.id = practice_team_functional_roles.practice_team_id
        AND COALESCE(pt.is_deleted, FALSE) = FALSE
        AND (pt.team_lead_user_id = auth.uid() OR pt.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_teams pt
      WHERE pt.id = practice_team_functional_roles.practice_team_id
        AND COALESCE(pt.is_deleted, FALSE) = FALSE
        AND (pt.team_lead_user_id = auth.uid() OR pt.user_id = auth.uid())
    )
  );

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('sim.practice_team_functional_roles', 'Functional role labels per practice team (v345)', FALSE, TRUE, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
