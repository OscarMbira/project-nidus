-- ================================================
-- File: v1171_retire_orphaned_assignment_roles_menu_code.sql
-- Description: Retire the orphaned flat menu_code='pmo_assignment_roles' row left behind by
--              v1166's first run, superseded by 'pmo-admin-assignment-roles'.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- v1166 was first written with menu_code='pmo_assignment_roles' (flat, parent_menu_id=NULL,
-- menu_level=1) and was run successfully by the user. It was then rewritten to the canonical
-- 'pmo-admin-*' sibling convention (v727's hyphenated menu_code, nested under 'pmo-cat-admin',
-- menu_level=2) as 'pmo-admin-assignment-roles' — a DIFFERENT menu_code, so the rewritten
-- file's ON CONFLICT (menu_code) upsert never touched the original row. Both rows have been
-- live since, producing a duplicate "Assignment Roles" sidebar entry. This migration retires
-- the superseded one, same pattern as v727_dedupe_administration_menus.sql.

UPDATE public.menu_items
SET is_visible = FALSE,
    is_deleted = TRUE,
    updated_at = NOW()
WHERE menu_code = 'pmo_assignment_roles';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_retired_count INTEGER;
    v_canonical_id UUID;
BEGIN
    SELECT COUNT(*) INTO v_retired_count
    FROM public.menu_items
    WHERE menu_code = 'pmo_assignment_roles' AND is_deleted = TRUE AND is_visible = FALSE;

    SELECT id INTO v_canonical_id
    FROM public.menu_items
    WHERE menu_code = 'pmo-admin-assignment-roles' AND COALESCE(is_deleted, FALSE) = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Orphaned pmo_assignment_roles row retired: % (expected 1)', v_retired_count;
    RAISE NOTICE 'Canonical pmo-admin-assignment-roles still live: %', v_canonical_id;
    RAISE NOTICE '================================================';
END $$;
