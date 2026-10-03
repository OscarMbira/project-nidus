-- ================================================
-- File: v1166_assignment_roles_menu_and_access.sql
-- Description: Sidebar menu entry + role grants for the new Assignment Roles
--              management page (apps/platform/src/pages/platform-app/AssignmentRoles.jsx,
--              route /platform/pmo-admin/assignment-roles)
-- Version: 1.1 — corrected to match the canonical 'pmo-admin-*' sibling menu-item
--          convention (hyphenated menu_code, nested under 'pmo-cat-admin', menu_level 2)
--          established by v727_dedupe_administration_menus.sql for Project Types/Statuses/
--          Funding Sources/Budget Categories. Deliberately diverges from v727's PMO-admin-only
--          role grant for those siblings — Assignment Roles is explicitly also granted to
--          Project Manager and Team Manager per the user's request.
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1164_create_assignment_roles_table.sql, v727_dedupe_administration_menus.sql
--                 (defines the 'pmo-cat-admin' parent category)

-- ── Menu item — nested under the same 'pmo-cat-admin' parent as its siblings ──────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-admin-assignment-roles', 'Assignment Roles',
       'Role options (Lead, Contributor, Reviewer, etc.) offered when assigning a resource',
       '/platform/pmo-admin/assignment-roles',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 95, 'universal', 'user-cog', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── Role grants: PMO Admin / Project Manager / Team Manager (+ broader admin/delivery tier) ──
-- Deliberate exception to v727's PMO-admin-only convention for sibling reference-data pages —
-- explicitly requested for this page.

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'pmo-admin-assignment-roles'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager',
    'team_lead', 'pm_team_lead', 'team_member', 'pm_team_member'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_menu_id UUID;
    v_grant_count INTEGER;
BEGIN
    SELECT id INTO v_menu_id FROM public.menu_items WHERE menu_code = 'pmo-admin-assignment-roles' AND COALESCE(is_deleted, FALSE) = FALSE;

    SELECT COUNT(*) INTO v_grant_count
    FROM public.role_menu_items
    WHERE menu_item_id = v_menu_id AND can_view = TRUE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Assignment Roles menu item: %', v_menu_id;
    RAISE NOTICE 'Roles granted access: %', v_grant_count;
    RAISE NOTICE '================================================';
END $$;
