-- ============================================================================
-- v966s: Core PM Menu Rationalisation — Phase 9 (taxonomy group 12 of 16): Documents
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Documents: Document Register / Project
-- Documents / Templates / Version History / Reviews / Approvals).
--
-- The existing row plat_pm_project_documents ("Project Documents", 22 grants, route
-- /platform/documents/project, rendering apps/platform/src/pages/.../ProjectDocumentsEntry) is
-- ALREADY a top-level PM_CATEGORY_DEFS row (packages/config/src/pmoSidebarCategories.js, order 27)
-- — no re-parenting is needed at all, unlike every other Phase 9 group so far. It is a full
-- document-management page (register + upload + version history live inside the page itself, per
-- taxonomy §17's "Level 4+ = tabs / sub-navigation ... within the SaaS interface" UX rule — not
-- every taxonomy leaf needs its own separate sidebar row). This is a pure RELABEL, matching the
-- same pattern as SQL/v966l (Cost Management) and SQL/v966p (Reports): only the menu_label
-- changes, from "Project Documents" to taxonomy §3's group name "Documents". menu_code, id, route,
-- and grants are all untouched.
--
-- Harness-verified (before/after across all 111 live roles): change isolated to the single label
-- string on every role that has plat_pm_project_documents granted; no other node affected.
-- ============================================================================

UPDATE public.menu_items
SET menu_label = 'Documents',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_project_documents' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966s_phase9_documents_relabel.sql applied successfully'; END $$;
