-- ============================================================================
-- v1051: Documents taxonomy expansion (Platform PM sidebar)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 Documents: Document Register /
-- Project Documents / Templates / Version History / Reviews / Approvals.
--
-- Live audit found (2026-09-12):
--   - The sidebar's single flat "Documents" item (plat_pm_project_documents, relabelled from
--     "Project Documents" in v966s) is the project's document CAPTURE/RETIRE register —
--     ProjectDocumentsEntry -> pmo-module's ProjectDocumentsRegisterPage (v849, template-cascade
--     based). It already covers BOTH "Document Register" and "Project Documents" as ONE page
--     (same underlying data — captured process documents ARE this project's documents), so it
--     is relabelled "Document Register" here rather than duplicated into two leaves for the
--     same route.
--   - Templates — NOT a gap: "Organizational Templates" / "Project Templates" already exist as
--     their own top-level PM sidebar categories, directly serving this leaf. Left untouched.
--   - Version History — genuine gap. There is no numbered version history anywhere in this
--     app's ACTIVE document system: pm_template_nodes only tracks a binary is_current (captured)
--     vs archived flag. A separate, older "Document Governance" system (document_types /
--     document_governance_stages / project_documents / document_versions) DOES model real
--     versioning, but a live count confirmed ZERO rows across every project (fully superseded,
--     never reached a menu item at all) — reviving it would surface a dead page for every real
--     user. New page DocumentVersionHistoryPage.jsx built instead, surfacing the ACTIVE system's
--     own capture/retire trail (listArchivedProjectProcessTemplateCopies) as this project's
--     document history, with a Restore action — real data, no new unused table.
--   - Reviews / Approvals — NOT wired this round. No approval/review workflow exists anywhere in
--     this app that actually works end-to-end (the legacy system's approval modal,
--     DocumentStatusModal.jsx, is built but was never imported/used anywhere, and that whole
--     legacy system has zero live data anyway). Designing a real review/approval workflow is a
--     genuine new feature needing its own requirements pass, not a menu-item audit fix — left
--     off the sidebar deliberately rather than wiring something that doesn't work.
-- ============================================================================

-- 1. Turn the existing flat leaf into the Documents group parent, relabelled to disambiguate
--    from the group's own name (same "Governance" -> "Governance Setup" disambiguation pattern
--    used in v1046).
UPDATE public.menu_items
SET menu_label = 'Document Register',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_project_documents' AND COALESCE(is_deleted, FALSE) = FALSE;

-- 2. Create the new "Documents" top-level group, as a sibling of the other taxonomy §3
--    categories, then re-parent the existing leaf underneath it.
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_documents', 'Documents',
  'Project document register and version history (taxonomy §3).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items WHERE menu_code = 'plat_pm_project_documents' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level FROM public.menu_items WHERE menu_code = 'plat_pm_project_documents' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT sort_order FROM public.menu_items WHERE menu_code = 'plat_pm_project_documents' AND COALESCE(is_deleted, FALSE) = FALSE),
  'universal', 'file-text', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_documents' AND COALESCE(is_deleted, FALSE) = FALSE
);

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_documents' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_documents' AND COALESCE(is_deleted, FALSE) = FALSE),
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_project_documents' AND COALESCE(is_deleted, FALSE) = FALSE;

-- 3. Add "Version History" as the second child.
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_doc_history', 'Version History',
  'Documents previously captured for this project, then retired — with the option to restore.',
  '/platform/documents/history',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_documents' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_documents' AND COALESCE(is_deleted, FALSE) = FALSE),
  20, 'universal', 'history', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_doc_history' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 4. Grant Version History to every role already granted plat_pm_project_documents.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_project_documents'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_pm_documents', 'plat_pm_doc_history')
  AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1051: Documents converted to a group (Document Register + Version History)';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order
--   FROM public.menu_items WHERE menu_code IN ('plat_pm_documents', 'plat_pm_project_documents', 'plat_pm_doc_history')
--   ORDER BY menu_level, sort_order;
