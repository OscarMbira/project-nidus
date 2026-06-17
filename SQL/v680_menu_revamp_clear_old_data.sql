-- =============================================================================
-- v680: Menu Revamp – Clear old menu data + add missing roles
-- Prerequisites: v679 must be applied
-- Purpose:
--   1. Soft-delete ALL existing menu_items and role_menu_items rows so no
--      stale menus survive into the new seed (v681–v684).
--   2. Insert missing roles that exist in the plan but not yet in the DB.
-- IMPORTANT: user_menu_preferences is intentionally left untouched.
-- =============================================================================

-- ─── STEP 1: Soft-delete all existing role_menu_items ─────────────────────────
UPDATE public.role_menu_items
SET
  is_deleted  = TRUE,
  deleted_at  = NOW(),
  updated_at  = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 2: Soft-delete all existing menu_items ──────────────────────────────
UPDATE public.menu_items
SET
  is_deleted  = TRUE,
  deleted_at  = NOW(),
  updated_at  = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE;

-- ─── STEP 3: Insert missing Platform roles ────────────────────────────────────
-- These roles are referenced by the new menu structure but are not yet in the DB.

INSERT INTO public.roles (id, role_name, role_display_name, role_description, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'portfolio_manager',  'Portfolio Manager',       'Portfolio Manager – cross-project portfolio visibility',          TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'executive',          'Executive',               'Executive – read-only strategic overview, KPIs',                  TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'stakeholder',        'Stakeholder',             'Stakeholder – limited read-only + communications',                TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'viewer',             'Viewer',                  'Viewer – read-only dashboard and shared reports only',            TRUE, NOW(), NOW())
ON CONFLICT (role_name) DO UPDATE
  SET role_display_name = EXCLUDED.role_display_name,
      role_description  = EXCLUDED.role_description,
      is_active         = EXCLUDED.is_active,
      updated_at        = NOW();

-- ─── STEP 4: Insert missing Simulator roles ───────────────────────────────────

INSERT INTO public.roles (id, role_name, role_display_name, role_description, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'simulator_admin',     'Simulator Admin',         'Simulator Admin – full simulator + system administration',       TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_pmo_admin',       'Simulator PMO Admin',     'Simulator PMO Admin – full simulator PMO practice access',       TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_project_manager', 'Simulator Project Mgr',   'Simulator Project Manager – full practice project delivery',     TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_team_member',     'Simulator Team Member',   'Simulator Team Member – practice tasks and daily log',           TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'simulator_user',      'Simulator User',          'Simulator User (Learner) – scenarios, learning path, certs',     TRUE, NOW(), NOW())
ON CONFLICT (role_name) DO UPDATE
  SET role_display_name = EXCLUDED.role_display_name,
      role_description  = EXCLUDED.role_description,
      is_active         = EXCLUDED.is_active,
      updated_at        = NOW();

-- ─── STEP 5: Normalise existing role name aliases ─────────────────────────────
-- The DB uses pm_team_member / pm_team_manager / pm_project_assurance /
-- pm_quality_assurance. v681–v684 use these names directly (no rename needed).
-- This step is a no-op placeholder for documentation purposes.

-- Verification queries (run manually after applying):
-- SELECT role_name FROM public.roles WHERE is_active = TRUE ORDER BY role_name;
-- SELECT COUNT(*) FROM public.menu_items WHERE COALESCE(is_deleted,FALSE) = FALSE;   -- should be 0
-- SELECT COUNT(*) FROM public.role_menu_items WHERE COALESCE(is_deleted,FALSE) = FALSE; -- should be 0
