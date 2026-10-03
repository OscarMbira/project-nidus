-- ============================================================================
-- v1052: Project Closure — Final Acceptance (existing fields, form-only fix) +
-- new Archive register (Project Archive Items)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 Project Closure: Closure Checklist /
-- Final Acceptance / Outstanding Items / Handover / Lessons Learned / Benefits Transition /
-- Archive / Closure Report.
--
-- Live audit found (2026-09-12):
--   - Closure Checklist / Outstanding Items / Handover / Benefits Transition / Closure Report /
--     Lessons Learned — all already genuinely covered by the existing "Closing a Project" hub
--     (ClosingProject.jsx) and "Lessons Log" — no menu changes needed (earlier v966ai/v966q notes
--     were overly cautious about Closure Report specifically; ClosingProject.jsx already links
--     to a full End Project Report Create/View/Edit/Compare flow).
--   - Final Acceptance — public.project_closures (v30, 2023) already has
--     deliverables_acceptance_status / outstanding_deliverables / board_approval_date columns,
--     but ProjectClosureForm.jsx never exposed them. Companion frontend change adds these fields
--     to the existing "Approval & Final Acceptance" tab — no new table, no new menu item, no SQL
--     needed for this leaf.
--   - Archive — genuinely missing. Two existing "archive"-named things were found and confirmed
--     NOT a fit: plat_pm_archives ("Archives / On Hold", actually the on-hold projects list) and
--     plat_archived_projects ("Archived Projects", lives in a disconnected DB branch outside the
--     live PM_CATEGORY_DEFS tree). Decision (explicit): Archive here means a project-level record
--     of key documents/items marked archived for long-term reference after closure — a simple,
--     PM-curated log, not an automatic live query across RAID/Change Control/Documents (those
--     tables have no "archived" concept of their own).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_archive_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('document', 'raid', 'change', 'report', 'benefits', 'governance', 'other')),
  reference_url TEXT,
  archived_date DATE NOT NULL DEFAULT CURRENT_DATE,
  archived_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_project_archive_items_project ON public.project_archive_items(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_archive_items_category ON public.project_archive_items(category) WHERE is_deleted = FALSE;

ALTER TABLE public.project_archive_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_archive_items_project_access ON public.project_archive_items;
CREATE POLICY project_archive_items_project_access ON public.project_archive_items
  FOR ALL
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

-- Register new table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_archive_items', 'Project closure: PM-curated log of documents/records marked archived for long-term reference (taxonomy §3, Project Closure > Archive)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── Menu item ─────────────────────────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_closure_archive', 'Archive',
  'Key documents and records marked archived for long-term reference after project closure.',
  '/platform/closure/archive',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_closure' AND COALESCE(is_deleted, FALSE) = FALSE),
  20, 'universal', 'archive', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_closure_archive' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant to every role already granted the Project Closure group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_project_closure'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_closure_archive' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1052: project_archive_items table + Archive menu item created; Final Acceptance is a form-only change (no SQL)';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items WHERE menu_code = 'plat_pm_closure_archive';
--   SELECT * FROM public.project_archive_items LIMIT 1;
