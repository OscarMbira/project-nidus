-- ============================================================================
-- v1226d: Itemized expense claim line items (Platform) — public.project_expense_claim_items
-- Prerequisites: v420 (project_expense_claims), v1226a (expense_categories)
-- Part of v1226 itemized expense claims initiative
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_expense_claim_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_claim_id  UUID NOT NULL REFERENCES public.project_expense_claims(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  category_id       UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  display_order     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.project_expense_claim_items IS
  'v1226: Line items for an itemized expense claim (e.g. a grocery receipt split into several '
  'purchases). The parent claim''s amount is the computed sum of its items when any exist.';

CREATE INDEX IF NOT EXISTS idx_project_expense_claim_items_claim
  ON public.project_expense_claim_items(expense_claim_id);

ALTER TABLE public.project_expense_claim_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_expense_claim_items TO authenticated;
GRANT ALL ON public.project_expense_claim_items TO service_role;

DROP POLICY IF EXISTS policy_project_expense_claim_items_all ON public.project_expense_claim_items;
CREATE POLICY policy_project_expense_claim_items_all ON public.project_expense_claim_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_expense_claims c
      WHERE c.id = expense_claim_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          c.submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
          OR public.can_access_project_budget(c.project_id)
          OR public.is_pmo_admin_user()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_expense_claims c
      WHERE c.id = expense_claim_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          c.submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
          OR public.can_access_project_budget(c.project_id)
          OR public.is_pmo_admin_user()
        )
    )
  );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_expense_claim_items', 'Line items for itemized expense claims (v1226)', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
