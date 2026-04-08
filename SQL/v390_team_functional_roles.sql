-- ============================================================================
-- v390: team_functional_roles — lookup labels per team (Team Lead / v345)
-- Prerequisites: v04 (teams, team_members), project_memberships, users, roles
-- PostgreSQL 15+ (Supabase)
-- Date: 2026-04-05
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_functional_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role_label VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_functional_roles_team_label UNIQUE (team_id, role_label)
);

CREATE INDEX IF NOT EXISTS idx_team_functional_roles_team_id
  ON team_functional_roles(team_id) WHERE is_active = TRUE;

COMMENT ON TABLE team_functional_roles IS
  'Preferred functional role labels per team (Developer, Tester, …); member_role on team_members may still be custom text.';

-- Seed defaults when a team is created
CREATE OR REPLACE FUNCTION seed_team_functional_roles_for_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_functional_roles (team_id, role_label, sort_order, is_active)
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

DROP TRIGGER IF EXISTS trg_teams_seed_functional_roles ON teams;
CREATE TRIGGER trg_teams_seed_functional_roles
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE PROCEDURE seed_team_functional_roles_for_team();

-- Backfill existing teams (idempotent per team/label)
INSERT INTO team_functional_roles (team_id, role_label, sort_order, is_active)
SELECT t.id, v.role_label, v.sort_order, TRUE
FROM teams t
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
WHERE COALESCE(t.is_deleted, FALSE) = FALSE
ON CONFLICT (team_id, role_label) DO NOTHING;

-- RLS
ALTER TABLE team_functional_roles ENABLE ROW LEVEL SECURITY;

-- Project members can read labels for teams in their project
CREATE POLICY team_functional_roles_member_read ON team_functional_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN project_memberships pm ON pm.project_id = t.project_id
      JOIN users u ON u.id = pm.user_id
      WHERE t.id = team_functional_roles.team_id
        AND u.auth_user_id = auth.uid()
        AND pm.is_active = TRUE
        AND COALESCE(t.is_deleted, FALSE) = FALSE
    )
  );

-- Team lead (teams.team_lead_user_id → users.id)
CREATE POLICY team_functional_roles_lead_all ON team_functional_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN users lead ON lead.id = t.team_lead_user_id
      WHERE t.id = team_functional_roles.team_id
        AND lead.auth_user_id = auth.uid()
        AND COALESCE(t.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN users lead ON lead.id = t.team_lead_user_id
      WHERE t.id = team_functional_roles.team_id
        AND lead.auth_user_id = auth.uid()
        AND COALESCE(t.is_deleted, FALSE) = FALSE
    )
  );

-- PMO Admin
CREATE POLICY team_functional_roles_pmo_all ON team_functional_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND r.role_name = 'pmo_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND r.role_name = 'pmo_admin'
    )
  );

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('team_functional_roles', 'Functional role labels per project team (v345)', FALSE, TRUE, 'project')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
