-- =============================================================================
-- v1077: Document Signatory — PM sidebar menu wiring (Platform)
-- PRD/plan: projectprd/v1067_project_team_document_signatory_scoping_PRD.md
--           projectplan/v1067_project_team_document_signatory_scoping_plan.md
--
-- New leaf under Project Setup (plat_pm_project_setup), alongside Project Details /
-- Project Mandate / Project Brief / Business Case / Project Charter / PIDs / Benefits
-- Review Plans. Route: /pm/initiation/document-signatory (SQL/v1075's page).
--
-- This is a NEW, separate menu item — the existing PMO admin page/menu item
-- (plat_tpl_signatory_requirements) and its v880b grants are untouched.
-- =============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'plat_pm_s_document_signatory',
  'Document Signatory',
  'Configure who must sign each document type for this project, or for a team you lead.',
  '/pm/initiation/document-signatory',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 80, 'universal', 'shield-check', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_s_document_signatory' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grants: Project Manager — copy from Project Details (same convention as v1061's
-- Regional & Format Settings Project Setup leaf). Covers whichever role(s) already hold
-- Project Details access (project_manager and any equivalent).
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (src.role_id, dst.id)
    src.role_id,
    dst.id AS menu_item_id
  FROM public.role_menu_items src
  JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_project_details'
  JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_s_document_signatory' AND COALESCE(dst.is_deleted, FALSE) = FALSE
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
  ORDER BY src.role_id, dst.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Grants: Team Manager/Lead — explicit, since this invitation-tier role (roles.role_name =
-- 'pm_team_manager', confirmed in SQL/v580_ensure_pm_invitation_roles.sql) does not hold
-- Project Details access today and so would not be covered by the copy above.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name = 'pm_team_manager'
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND m.menu_code = 'plat_pm_s_document_signatory'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Simulator
-- ---------------------------------------------------------------------------
-- NOTE: Simulator's PM sidebar has no "Project Setup" grouping today (confirmed via
-- SQL/v1064_working_days_holidays_menu.sql's own comment: "Simulator: rename only (no
-- Project Setup root in sim menus today)"), and this session had no live-DB read access
-- to confirm the exact menu_code Simulator's sibling Project Brief / Benefits Review Plan
-- items are parented under. Rather than guess a parent and risk an orphaned/misplaced
-- item, this is inserted FLAT (no parent) — visible, functional, and trivially correctable
-- with a single UPDATE ... SET parent_menu_id once the right Simulator parent is confirmed.
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'sim_pm_s_document_signatory',
  'Document Signatory',
  'Configure who must sign each document type for this practice project, or for a team you lead.',
  '/simulator/pm/initiation/document-signatory',
  NULL, 1, 80, 'universal', 'shield-check', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'sim_pm_s_document_signatory' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('project_manager', 'Project Manager', 'pm_team_manager')
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND m.menu_code = 'sim_pm_s_document_signatory'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1077: Document Signatory menu wired — Platform under Project Setup, Simulator flat pending parent confirmation (see comment above)';
END $$;
