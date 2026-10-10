-- ============================================================================
-- v1226e: Itemized expense claim line items (Simulator) — sim.project_expense_claim_items
-- Mirrors v1226d. Prerequisites: v421 (sim.project_expense_claims), v1226b (sim.expense_categories)
-- Part of v1226 itemized expense claims initiative
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.project_expense_claim_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_claim_id  UUID NOT NULL REFERENCES sim.project_expense_claims(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  category_id       UUID REFERENCES sim.expense_categories(id) ON DELETE SET NULL,
  display_order     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sim.project_expense_claim_items IS
  'v1226: Simulator mirror of public.project_expense_claim_items.';

CREATE INDEX IF NOT EXISTS idx_sim_project_expense_claim_items_claim
  ON sim.project_expense_claim_items(expense_claim_id);

ALTER TABLE sim.project_expense_claim_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_expense_claim_items TO authenticated;
GRANT ALL ON sim.project_expense_claim_items TO service_role;

DROP POLICY IF EXISTS policy_sim_project_expense_claim_items_all ON sim.project_expense_claim_items;
CREATE POLICY policy_sim_project_expense_claim_items_all ON sim.project_expense_claim_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_expense_claims c
      JOIN sim.practice_projects pp ON pp.id = c.practice_project_id
      WHERE c.id = expense_claim_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          c.submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
          OR pp.user_id = sim.get_current_user_id()
          OR public.is_pmo_admin_user()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.project_expense_claims c
      JOIN sim.practice_projects pp ON pp.id = c.practice_project_id
      WHERE c.id = expense_claim_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          c.submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
          OR pp.user_id = sim.get_current_user_id()
          OR public.is_pmo_admin_user()
        )
    )
  );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.project_expense_claim_items', 'Line items for itemized expense claims (Simulator, v1226)', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
