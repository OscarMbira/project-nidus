-- ============================================================================
-- v1025: control_accounts + deliverable_register (Platform public + lean CRUD)
-- ============================================================================
-- Lean Control Accounts (WBS hub tab) and independent Deliverable Register.
-- RLS via auth_user_can_access_project(). Display IDs via Admin trigger helpers.
-- ============================================================================

-- ── control_accounts ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.control_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id),
  display_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  code TEXT,
  wbs_node_id UUID REFERENCES public.wbs_nodes(id) ON DELETE SET NULL,
  work_package_id UUID,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  budget_amount NUMERIC(18, 2),
  currency_code TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'closed', 'on_hold')),
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_control_accounts_project
  ON public.control_accounts(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_control_accounts_wbs
  ON public.control_accounts(wbs_node_id) WHERE wbs_node_id IS NOT NULL AND is_deleted = FALSE;

ALTER TABLE public.control_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_control_accounts_select ON public.control_accounts;
CREATE POLICY policy_control_accounts_select ON public.control_accounts
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_control_accounts_insert ON public.control_accounts;
CREATE POLICY policy_control_accounts_insert ON public.control_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_control_accounts_update ON public.control_accounts;
CREATE POLICY policy_control_accounts_update ON public.control_accounts
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE ON public.control_accounts TO authenticated;
GRANT ALL ON public.control_accounts TO service_role;

DROP TRIGGER IF EXISTS trg_control_accounts_display_id ON public.control_accounts;
CREATE TRIGGER trg_control_accounts_display_id
  AFTER INSERT ON public.control_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.control_accounts', 'display_id');

-- ── deliverable_register ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.deliverable_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id),
  display_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'submitted', 'accepted', 'rework')),
  pbs_node_id UUID REFERENCES public.plan_pbs_nodes(id) ON DELETE SET NULL,
  product_description_id UUID,
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_deliverable_register_project
  ON public.deliverable_register(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_deliverable_register_status
  ON public.deliverable_register(project_id, status) WHERE is_deleted = FALSE;

ALTER TABLE public.deliverable_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_deliverable_register_select ON public.deliverable_register;
CREATE POLICY policy_deliverable_register_select ON public.deliverable_register
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_deliverable_register_insert ON public.deliverable_register;
CREATE POLICY policy_deliverable_register_insert ON public.deliverable_register
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_deliverable_register_update ON public.deliverable_register;
CREATE POLICY policy_deliverable_register_update ON public.deliverable_register
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE ON public.deliverable_register TO authenticated;
GRANT ALL ON public.deliverable_register TO service_role;

DROP TRIGGER IF EXISTS trg_deliverable_register_display_id ON public.deliverable_register;
CREATE TRIGGER trg_deliverable_register_display_id
  AFTER INSERT ON public.deliverable_register
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.deliverable_register', 'display_id');

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('control_accounts', 'Lean control accounts for WBS / cost control (v1025)', false, true),
  ('deliverable_register', 'Project deliverable register with Planned/Submitted/Accepted/Rework statuses (v1025)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1025: control_accounts + deliverable_register created';
END $$;
