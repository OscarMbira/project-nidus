-- ============================================================================
-- v420: Expense claims + approval steps + thresholds (Platform)
-- Prerequisites: projects, accounts, users, is_pmo_admin_user (v258)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expense_approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  threshold_name VARCHAR(100) NOT NULL,
  min_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(15, 2),
  required_approval_level INTEGER NOT NULL DEFAULT 3 CHECK (required_approval_level BETWEEN 1 AND 3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_thresholds_account ON public.expense_approval_thresholds(account_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.project_expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitted_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expense_type VARCHAR(40) NOT NULL DEFAULT 'other',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description TEXT,
  receipt_url TEXT,
  vendor_name VARCHAR(300),
  claim_status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (claim_status IN (
      'draft', 'submitted', 'pending_l1', 'pending_l2', 'pending_l3',
      'fully_approved', 'rejected', 'paid', 'processed'
    )),
  current_approval_level INTEGER,
  total_approval_levels INTEGER,
  approval_chain JSONB DEFAULT '[]'::jsonb,
  is_reimbursable BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_expense_claims_project ON public.project_expense_claims(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_expense_claims_submitter ON public.project_expense_claims(submitted_by_user_id);

CREATE TABLE IF NOT EXISTS public.expense_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_claim_id UUID NOT NULL REFERENCES public.project_expense_claims(id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL CHECK (approval_level BETWEEN 1 AND 3),
  approver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  approver_role_name VARCHAR(100),
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'escalated')),
  comments TEXT,
  actioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_approval_steps_claim ON public.expense_approval_steps(expense_claim_id);

ALTER TABLE public.expense_approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approval_steps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_approval_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_expense_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_approval_steps TO authenticated;

-- Thresholds: PMO + account owners
DROP POLICY IF EXISTS policy_expense_thresholds_select ON public.expense_approval_thresholds;
CREATE POLICY policy_expense_thresholds_select ON public.expense_approval_thresholds
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      public.is_pmo_admin_user()
      OR account_id IN (SELECT id FROM public.accounts a INNER JOIN public.users u ON u.id = a.owner_user_id WHERE u.auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS policy_expense_thresholds_maintain ON public.expense_approval_thresholds;
CREATE POLICY policy_expense_thresholds_maintain ON public.expense_approval_thresholds
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_user() AND COALESCE(is_deleted, FALSE) = FALSE)
  WITH CHECK (public.is_pmo_admin_user());

-- Claims: submitter, project access, or PMO
DROP POLICY IF EXISTS policy_project_expense_claims_all ON public.project_expense_claims;
CREATE POLICY policy_project_expense_claims_all ON public.project_expense_claims
  FOR ALL TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
      OR public.can_access_project_budget(project_id)
      OR public.is_pmo_admin_user()
    )
  )
  WITH CHECK (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
      OR public.can_access_project_budget(project_id)
      OR public.is_pmo_admin_user()
    )
  );

-- Steps: visible if can see parent claim (via join in app) — allow if approver or PMO or claim access
DROP POLICY IF EXISTS policy_expense_approval_steps_all ON public.expense_approval_steps;
CREATE POLICY policy_expense_approval_steps_all ON public.expense_approval_steps
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
          OR approver_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_expense_claims c
      WHERE c.id = expense_claim_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          public.can_access_project_budget(c.project_id)
          OR public.is_pmo_admin_user()
          OR approver_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
        )
    )
  );

CREATE OR REPLACE FUNCTION public.resolve_expense_approval_chain(p_project_id UUID, p_submitter_user_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_levels JSONB := '[]'::jsonb;
BEGIN
  -- Simplified chain: L1 PM, L2 Programme (if any), L3 PMO — resolved by application; this returns placeholder structure
  v_levels := jsonb_build_array(
    jsonb_build_object('level', 1, 'approver_role', 'project_manager'),
    jsonb_build_object('level', 2, 'approver_role', 'programme_manager'),
    jsonb_build_object('level', 3, 'approver_role', 'pmo_admin')
  );
  RETURN v_levels;
END;
$$;

COMMENT ON FUNCTION public.resolve_expense_approval_chain IS 'v349: Returns default approval level skeleton; app resolves approver_user_id.';

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('project_expense_claims', 'Project expense claims with hierarchical approval', FALSE, TRUE, 'financial'),
  ('expense_approval_steps', 'Audit trail for expense claim approvals', FALSE, TRUE, 'financial'),
  ('expense_approval_thresholds', 'Per-account amount thresholds for approval levels', FALSE, TRUE, 'financial')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
