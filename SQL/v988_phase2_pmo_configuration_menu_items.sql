-- ============================================================================
-- v988: PMO Configuration Zone — sidebar menu wiring (Platform) — Phase 2 of
-- v982 SaaS User Journey — PMO Configuration Zone
-- ============================================================================
-- projectplan/v982_phase2_pmo_configuration_zone_plan.md, task C (rule 13 — every new feature
-- gets attached to the role-based sidebar menu).
--
-- Five new top-level leaf menu_items under the existing pmo-admin/* route prefix, mirroring the
-- v422_financial_menu_items.sql pattern (parent_menu_id NULL, granted directly to
-- system_admin/pmo_admin) rather than a new taxonomy-group root — these are flat admin config
-- pages, not a deep content tree needing its own category (matches pmo_expense_thresholds'
-- existing shape exactly).
--
-- SIMULATOR SIDEBAR: intentionally not wired in this file. This session's own precedent (see
-- v981_project_setup_taxonomy_group.sql and the v966* Phase 9 series) repeatedly and explicitly
-- defers Simulator sidebar taxonomy/menu wiring to a separate follow-up initiative — "Platform
-- sidebar only -- Simulator's own taxonomy mirror remains deferred". This file follows that same,
-- already-established precedent rather than inventing a new one. The Simulator PAGES themselves
-- (routes under simulator/pmo/*) ARE built for parity per CLAUDE.md rule 34.1 — only their
-- sidebar entries are deferred, consistent with expense-thresholds/project-types/etc already
-- having live simulator/pmo/* routes with no dedicated Simulator sidebar menu_items row either
-- (confirmed by investigation: no simulator-specific menu_items row exists for
-- 'simulator/pmo/expense-thresholds' despite the route being live).
--
-- Prerequisites: public.menu_items, public.roles, public.role_menu_items.
-- ============================================================================

INSERT INTO menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, is_visible, is_active
)
VALUES
  ('pmo_configuration_home', 'PMO Configuration', 'Guided entry point into methodology, classifications, templates, workflows, authorities, roles, and reference data', NULL, 1, 64, '/platform/pmo-admin/configuration', 'layout-dashboard', TRUE, TRUE),
  ('pmo_project_classifications', 'Project Classifications', 'Define project classification/complexity levels and their governance links', NULL, 1, 65, '/platform/pmo-admin/project-classifications', 'layers', TRUE, TRUE),
  ('pmo_organisation_authorities', 'Authorities', 'Delegated authority, approval thresholds, and escalation levels', NULL, 1, 66, '/platform/pmo-admin/authorities', 'shield-check', TRUE, TRUE),
  ('pmo_approval_chains', 'Approval Chain Templates', 'Reusable, ordered approval-chain definitions for template governance', NULL, 1, 67, '/platform/pmo-admin/approval-chains', 'git-branch', TRUE, TRUE),
  ('pmo_roles_responsibilities', 'Roles & Responsibilities', 'Default RACI per role and record type, and a link to Manage Roles', NULL, 1, 68, '/platform/pmo-admin/roles-responsibilities', 'users', TRUE, TRUE)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN ('system_admin', 'pmo_admin')
  AND m.menu_code IN (
    'pmo_configuration_home', 'pmo_project_classifications', 'pmo_organisation_authorities',
    'pmo_approval_chains', 'pmo_roles_responsibilities'
  )
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v988_phase2_pmo_configuration_menu_items.sql applied successfully'; END $$;
