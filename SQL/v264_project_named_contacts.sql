-- v264: Project Named Contacts
-- Allows storing non-registered persons (named contacts) for authority/owner roles.
-- These appear alongside system users in project creation dropdowns and persist per org.
-- Also adds text fallback columns to projects for named (non-user) authority persons.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Named contacts table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_named_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  email            TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_named_contacts_org
  ON project_named_contacts(organisation_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Text fallback columns on projects
--    Used when a named (non-system) person is assigned to an authority role.
--    The paired UUID column stays NULL; the name column holds the display text.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS executive_name               TEXT,
  ADD COLUMN IF NOT EXISTS funding_authority_name       TEXT,
  ADD COLUMN IF NOT EXISTS approving_authority_name     TEXT,
  ADD COLUMN IF NOT EXISTS benefit_owner_name           TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE project_named_contacts ENABLE ROW LEVEL SECURITY;

-- Select: any authenticated user in the same org can read
CREATE POLICY "named_contacts_select"
  ON project_named_contacts FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT a.id FROM accounts a
      JOIN users u ON u.id = a.owner_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Insert: PMO Admin or authenticated org member can create contacts
CREATE POLICY "named_contacts_insert"
  ON project_named_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id IN (
      SELECT a.id FROM accounts a
      JOIN users u ON u.id = a.owner_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Update/Delete: only creator or PMO Admin
CREATE POLICY "named_contacts_update"
  ON project_named_contacts FOR UPDATE
  TO authenticated
  USING (created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "named_contacts_delete"
  ON project_named_contacts FOR DELETE
  TO authenticated
  USING (created_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Register in database_tables registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'project_named_contacts',
  'Named (non-registered) persons stored per organisation for use in project authority and owner dropdowns',
  false, true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
