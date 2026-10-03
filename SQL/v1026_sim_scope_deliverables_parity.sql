-- ============================================================================
-- v1026: Simulator Scope & Deliverables parity (menu + tables)
-- ============================================================================

-- ── Sim tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.control_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id UUID,
  display_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  code TEXT,
  wbs_node_id UUID,
  work_package_id UUID,
  owner_user_id UUID,
  budget_amount NUMERIC(18, 2),
  currency_code TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'closed', 'on_hold')),
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_control_accounts_project
  ON sim.control_accounts(practice_project_id) WHERE is_deleted = FALSE;

ALTER TABLE sim.control_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_control_accounts_all ON sim.control_accounts;
CREATE POLICY sim_control_accounts_all ON sim.control_accounts
  FOR ALL TO authenticated
  USING (
    practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON sim.control_accounts TO authenticated;
GRANT ALL ON sim.control_accounts TO service_role;

DROP TRIGGER IF EXISTS trg_sim_control_accounts_display_id ON sim.control_accounts;
CREATE TRIGGER trg_sim_control_accounts_display_id
  AFTER INSERT ON sim.control_accounts
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.control_accounts', 'display_id');

CREATE TABLE IF NOT EXISTS sim.deliverable_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id UUID,
  display_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'submitted', 'accepted', 'rework')),
  pbs_node_id UUID,
  product_description_id UUID,
  owner_user_id UUID,
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_deliverable_register_project
  ON sim.deliverable_register(practice_project_id) WHERE is_deleted = FALSE;

ALTER TABLE sim.deliverable_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_deliverable_register_all ON sim.deliverable_register;
CREATE POLICY sim_deliverable_register_all ON sim.deliverable_register
  FOR ALL TO authenticated
  USING (
    practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON sim.deliverable_register TO authenticated;
GRANT ALL ON sim.deliverable_register TO service_role;

DROP TRIGGER IF EXISTS trg_sim_deliverable_register_display_id ON sim.deliverable_register;
CREATE TRIGGER trg_sim_deliverable_register_display_id
  AFTER INSERT ON sim.deliverable_register
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.deliverable_register', 'display_id');

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.control_accounts', 'Sim lean control accounts (v1026)', false, true),
  ('sim.deliverable_register', 'Sim deliverable register (v1026)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

-- ── Sim menu group ────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'sim_pm_scope_deliverables', 'Scope & Deliverables',
  'Practice scope statement, PBS, WBS, and deliverable register.',
  NULL, NULL, 1, 47, 'universal', 'layers', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'sim_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE
);

UPDATE public.menu_items
SET parent_menu_id = (
      SELECT id FROM public.menu_items
      WHERE menu_code = 'sim_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1
    ),
    menu_level = 2,
    menu_label = 'Scope Statement',
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'sim_pp_scope_statement' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (
      SELECT id FROM public.menu_items
      WHERE menu_code = 'sim_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1
    ),
    menu_level = 2,
    menu_label = 'Work Breakdown Structure',
    sort_order = 30,
    updated_at = NOW()
WHERE menu_code = 'sim_pp_wbs' AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'sim_pp_pbs', 'Product Breakdown Structure',
  'Practice product breakdown structure.',
  '/simulator/practice-projects/__PRACTICE__/scope/pbs',
  (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, 20, 'universal', 'git-branch', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pp_pbs' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'sim_pp_deliverable_register', 'Deliverable Register',
  'Practice deliverable register.',
  '/simulator/practice-projects/__PRACTICE__/scope/deliverable-register',
  (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, 40, 'universal', 'package-check', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pp_deliverable_register' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'sim_pp_scope_statement'
JOIN public.menu_items dst ON dst.menu_code IN (
  'sim_pm_scope_deliverables', 'sim_pp_pbs', 'sim_pp_deliverable_register'
) AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1026: Simulator Scope & Deliverables parity applied';
END $$;
