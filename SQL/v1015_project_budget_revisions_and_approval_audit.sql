-- ============================================================================
-- v1015: Project Budget — revision history + approval audit trail
-- ============================================================================
-- Phase 13 (verify/extend) of projectplan/v966_core_pm_menu_rationalisation_plan.md found
-- taxonomy §3's "Project Setup > ... > Budget (Structure, Lines, Approved Budget, Revisions)"
-- had real gaps:
--   - Structure/Lines: project_budget_categories already exists but is only editable inside the
--     project wizard, never its own dedicated page (see the new Budget page, apps/platform).
--   - Approved Budget: projects.budget_approval_status already exists and is wired in the wizard's
--     Financial Controls step (pending/approved/rejected) — but there was no audit trail of WHO
--     approved it or WHEN. Adding that here (column naming follows project_baselines' v644
--     approved_by/approved_at precedent, but referencing public.users(id) rather than
--     auth.users(id) — this page's own uid resolution, matching its sibling
--     ProjectCostManagement.jsx, resolves to the internal public.users.id, not the raw auth id).
--   - Revisions: saveForProject() in projectBudgetCategoryService.js DELETES all budget line rows
--     and re-inserts on every save — there was no history at all, not even in the data model. This
--     adds an append-only snapshot table, written by the service right before it overwrites the
--     current lines, so nothing destructive happens without a prior version being preserved.
--
-- Not reusing project_baselines/baseline_snapshots (v644, GAP-14 S-Curve & Baselines) — that pair
-- tracks EVM progress-over-time (planned/earned/actual cost per snapshot date), a different concept
-- from budget line-item structure history. Overloading it here would conflate two distinct
-- capabilities in the one existing "Baselines" feature.
-- ============================================================================

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_approved_by UUID REFERENCES public.users(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.project_budget_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  budget_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10),
  approval_status_at_revision VARCHAR(30),
  note TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_project_budget_revisions_number UNIQUE (project_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_project_budget_revisions_project
  ON public.project_budget_revisions(project_id, revision_number DESC)
  WHERE is_deleted = FALSE;

ALTER TABLE public.project_budget_revisions ENABLE ROW LEVEL SECURITY;

-- Same access gate as the table this snapshots (project_budget_categories, v268) — a
-- SECURITY DEFINER function already scoping "can this user see/manage this project's budget",
-- not a bare `authenticated` bypass.
DROP POLICY IF EXISTS policy_project_budget_revisions_select ON public.project_budget_revisions;
CREATE POLICY policy_project_budget_revisions_select ON public.project_budget_revisions
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND can_access_project_budget(project_id));

DROP POLICY IF EXISTS policy_project_budget_revisions_insert ON public.project_budget_revisions;
CREATE POLICY policy_project_budget_revisions_insert ON public.project_budget_revisions
  FOR INSERT TO authenticated
  WITH CHECK (can_access_project_budget(project_id));

-- ── Sidebar menu wiring (rule 13 — every new feature gets a menu entry) ─────────────────────
-- New "Budget" leaf under the existing "Cost Management" group (plat_grp_pm_financial), sibling
-- to My Expenses/Expense Approvals/Financial Reports. Granted to the same role set as Financial
-- Reports (plat_pm_fin_reports) — same audience, a PM-facing financial view.

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_budget', 'Budget',
  'Project budget structure, lines, approval status, and revision history (taxonomy §3).',
  '/platform/projects/:projectId/budget',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_financial' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 5, 'universal', 'wallet', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_budget' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_fin_reports'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_budget' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Register new table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_budget_revisions', 'Append-only snapshot of a project''s budget line items, written before each overwrite so prior budget structures are never lost', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1015: project_budget_revisions created + projects.budget_approved_by/budget_approved_at added';
  RAISE NOTICE '================================================';
END $$;
