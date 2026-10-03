-- =============================================================================
-- v1012: Remove stale, redundant RLS policies on menu_items / role_menu_items
-- =============================================================================
-- Root cause of the persistent "Menu unavailable: canceling statement due to statement
-- timeout" / HTTP 500 errors loading the sidebar: menu_items and role_menu_items have
-- accumulated MULTIPLE overlapping SELECT policies across several migrations (v09, v129,
-- v514), each using a DIFFERENT policy name, so none of them ever actually replaced an
-- earlier one — Postgres just evaluates ALL of them and OR's the results together for a
-- permissive policy set. Reproduced live (service-role bypasses RLS so this wasn't visible
-- there; anon key surfaced it immediately):
--
--   SELECT id FROM menu_items LIMIT 1;   -- as anon/authenticated
--   -> ERROR 42501: permission denied for table users
--
-- The chain: menu_items' still-active v09 policy (policy_menu_items_user_read) subqueries
-- role_menu_items; role_menu_items' still-active v514 policy (role_menu_items_read_by_
-- user_roles) subqueries public.users. If that inner subquery hits any permission issue,
-- the exception propagates all the way up through the OUTER menu_items query and the whole
-- SELECT fails — even though v129's separate, simpler, already-correct policies
-- (policy_menu_items_select_authenticated/_public, policy_role_menu_items_select_
-- authenticated: just `is_active = TRUE AND is_deleted = FALSE`) would have allowed the row
-- on their own. Postgres must evaluate every applicable permissive policy to compute the OR,
-- so a broken policy anywhere in the set can take down a query that didn't need it.
--
-- Both menu_items and role_menu_items are shared, org-wide REFERENCE/CONFIGURATION tables
-- (which menu items exist, which roles can see which item) — not user data, not
-- tenant-scoped. The real "which of these does the current user's role actually grant"
-- filtering already happens entirely in application code (useMenu.js: fetch role_menu_items
-- rows for the resolved role_ids, then hydrate menu_items by id), not via row-level
-- restriction on these two tables. v129's simple policies already reflect that design
-- correctly and are kept as the sole remaining SELECT policy on each table. The v09
-- (auth.uid() compared directly against user_roles.user_id — the internal public.users.id
-- space, not the auth-user-id space; a real logic bug on top of everything else) and v514
-- policies below are dropped as redundant and actively dangerous.
-- =============================================================================

DROP POLICY IF EXISTS policy_menu_items_user_read ON public.menu_items;
DROP POLICY IF EXISTS policy_menu_items_admin_all ON public.menu_items;

DROP POLICY IF EXISTS policy_role_menu_items_auth_read ON public.role_menu_items;
DROP POLICY IF EXISTS policy_role_menu_items_admin_all ON public.role_menu_items;
DROP POLICY IF EXISTS role_menu_items_read_by_user_roles ON public.role_menu_items;

-- Sanity check: each table should now carry exactly the v129 policy/policies (plus
-- menu_items' anon-read policy) and nothing else.
DO $$
DECLARE
  v_menu_items_count INTEGER;
  v_role_menu_items_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_menu_items_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menu_items';
  SELECT COUNT(*) INTO v_role_menu_items_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_menu_items';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1012: stale menu_items/role_menu_items RLS policies dropped';
  RAISE NOTICE 'menu_items policies remaining: %', v_menu_items_count;
  RAISE NOTICE 'role_menu_items policies remaining: %', v_role_menu_items_count;
  RAISE NOTICE '================================================';
END $$;
