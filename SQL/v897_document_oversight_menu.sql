-- =============================================================================
-- v897: Document Oversight — cross-tier read-only document visibility
-- Part A: new "Document Oversight" register for Portfolio Manager / Programme Manager /
--         PMO Admin, scoped to their own branch of the hierarchy (see
--         documentOversightService.js). Routes:
--   Platform:  /platform/portfolio/document-oversight, /platform/programme/document-oversight,
--              /platform/pmo/document-oversight
--   Simulator: /simulator/pmo/document-oversight/portfolio|programme|pmo
-- Part B: extend the EXISTING "Project Documents" menu (v849) to team_lead/team_member —
--         same route, read-only for those two roles (gated client-side, not a new page).
-- Plan: projectplan/v897_document_oversight_register_plan.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Part A — Platform: portfolio/document-oversight (sibling of Portfolio Overview etc.)
-- -----------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_portfolio_document_oversight',
  'Document Oversight',
  'Read-only register of signed/signatory-tracked documents across the projects in your portfolios',
  grp.id,
  COALESCE(grp.menu_level, 1) + 1,
  90,
  '/platform/portfolio/document-oversight',
  'file-check',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS grp
WHERE grp.menu_code = 'plat_grp_portfolio'
  AND COALESCE(grp.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_portfolio_document_oversight'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('portfolio_manager', 'pmo_admin', 'system_admin', 'account_owner', 'superuser')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Part A — Platform: programme/document-oversight
-- -----------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_programme_document_oversight',
  'Document Oversight',
  'Read-only register of signed/signatory-tracked documents across the projects in your programmes',
  grp.id,
  COALESCE(grp.menu_level, 1) + 1,
  90,
  '/platform/programme/document-oversight',
  'file-check',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS grp
WHERE grp.menu_code = 'plat_grp_programme'
  AND COALESCE(grp.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_programme_document_oversight'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('programme_manager', 'pmo_admin', 'system_admin', 'account_owner', 'superuser')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Part A — Platform: pmo/document-oversight (sibling of Document Signatory / Organisational
-- Templates — reuses the same parent-resolution chain as v870).
-- -----------------------------------------------------------------------------
WITH parent AS (
  SELECT COALESCE(
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_tpl_organisational' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_tpl_library' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_pmo_field_templates' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'plat_sec_templates' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'pmo-cat-project-delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1)
  ) AS id
)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_pmo_document_oversight',
  'Document Oversight',
  'Read-only, organisation-wide register of signed/signatory-tracked project documents',
  parent.id,
  COALESCE((SELECT menu_level FROM public.menu_items WHERE id = parent.id), 1) + 1,
  22,
  '/platform/pmo/document-oversight',
  'file-check',
  'universal',
  TRUE,
  TRUE
FROM parent
WHERE parent.id IS NOT NULL
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_pmo_document_oversight'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner', 'superuser')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Part A — Simulator: sim_pmo_portfolio_document_oversight
-- -----------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pmo_portfolio_document_oversight',
  'Document Oversight',
  'Read-only register of signed/signatory-tracked practice documents across your portfolios',
  grp.id,
  COALESCE(grp.menu_level, 1) + 1,
  90,
  '/simulator/pmo/document-oversight/portfolio',
  'file-check',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS grp
WHERE grp.menu_code = 'sim_grp_pmo_portfolio'
  AND COALESCE(grp.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_pmo_portfolio_document_oversight'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('portfolio_manager', 'pmo_admin', 'system_admin', 'account_owner', 'superuser')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Part A — Simulator: sim_pmo_programme_document_oversight
-- -----------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pmo_programme_document_oversight',
  'Document Oversight',
  'Read-only register of signed/signatory-tracked practice documents across your programmes',
  grp.id,
  COALESCE(grp.menu_level, 1) + 1,
  90,
  '/simulator/pmo/document-oversight/programme',
  'file-check',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS grp
WHERE grp.menu_code = 'sim_grp_pmo_programme'
  AND COALESCE(grp.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_pmo_programme_document_oversight'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('programme_manager', 'pmo_admin', 'system_admin', 'account_owner', 'superuser')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Part A — Simulator: sim_pmo_document_oversight (org-wide, PMO tier — reuses v870's
-- sim parent-resolution chain).
-- -----------------------------------------------------------------------------
WITH parent AS (
  SELECT COALESCE(
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'sim_tpl_organisational' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'sim_tpl_library' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'sim_sec_templates' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code IN ('sim_pmo_cat_project_delivery', 'sim_pm_cat_project_delivery')
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY CASE menu_code WHEN 'sim_pmo_cat_project_delivery' THEN 0 ELSE 1 END
      LIMIT 1)
  ) AS id
)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pmo_document_oversight',
  'Document Oversight',
  'Read-only, organisation-wide register of signed/signatory-tracked practice project documents',
  parent.id,
  COALESCE((SELECT menu_level FROM public.menu_items WHERE id = parent.id), 1) + 1,
  22,
  '/simulator/pmo/document-oversight/pmo',
  'file-check',
  'universal',
  TRUE,
  TRUE
FROM parent
WHERE parent.id IS NOT NULL
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_pmo_document_oversight'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner', 'superuser')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- Part B — extend the EXISTING "Project Documents" menu (v849) to team_lead/team_member.
-- Same route/page as project_manager+ already use; read-only gating for these two roles
-- is enforced client-side (see ProjectDocumentsRegisterPage.jsx / OrganisationalTemplateDetailPage.jsx),
-- not by a separate menu item.
-- -----------------------------------------------------------------------------
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('plat_pm_project_documents', 'sim_pm_project_documents')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('team_lead', 'team_member')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Register table (rule: Database Table Registration) — no new tables created by this
-- feature (it only reads existing pm_template_nodes / process_template_document_signatories
-- / portfolios / programmes / projects), so nothing to add to database_tables here.
