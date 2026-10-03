-- ============================================================================
-- v946c: Reusable role-grant-group helper for the Industry Capability Content Taxonomy
-- initiative (projectplan/v946_industry_capability_content_taxonomy_plan.md)
-- ============================================================================
-- Every phase (v947 FIN onward) needs to grant its new category/register menu_items to the same
-- broad delivery-team role set v934 first used for the original 28 Local Register Engine items.
-- Repeating that role-name list as inline SQL in every phase's migration is exactly the kind of
-- hardcoding rule 25.1 exists to prevent — even though it's SQL, not React, an admin should be
-- able to see and adjust "which roles get delivery-team-level menu access" from the DB, not by
-- someone editing a WHERE clause buried in a migration file.
--
-- This migration creates a small reference table holding named role-grant groups, seeds the one
-- group needed so far ('delivery_team', the exact 13 roles v934/v947/v948/v949 already used),
-- and a reusable function that grants a menu_code pattern to every role in a named group. Every
-- phase from here on calls this function instead of repeating the role list.
-- ============================================================================

-- ── 1. Reference table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.menu_role_grant_groups (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code            VARCHAR(50) NOT NULL,
  role_name_normalized  VARCHAR(100) NOT NULL,
  description           TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_role_grant_groups_group_role
  ON public.menu_role_grant_groups(group_code, role_name_normalized);

COMMENT ON TABLE public.menu_role_grant_groups IS
  'Named, reusable role sets for bulk menu_items role grants (e.g. "delivery_team") — DB-driven '
  'so migrations/Admin can grant a menu_code pattern to a named group without repeating a role '
  'name list in every SQL file. See public.grant_menu_role_group().';

ALTER TABLE public.menu_role_grant_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_menu_role_grant_groups_select ON public.menu_role_grant_groups;
CREATE POLICY policy_menu_role_grant_groups_select ON public.menu_role_grant_groups
  FOR SELECT TO authenticated, anon USING (TRUE);

GRANT SELECT ON public.menu_role_grant_groups TO authenticated, anon;
GRANT ALL ON public.menu_role_grant_groups TO service_role;

-- ── 2. Seed the 'delivery_team' group — the exact role set v934 established ────────────

INSERT INTO public.menu_role_grant_groups (group_code, role_name_normalized, description)
VALUES
  ('delivery_team', 'pmo_admin', 'Broad delivery-team role set for Local Register Engine / industry content menu grants (v934 precedent)'),
  ('delivery_team', 'org_admin', NULL),
  ('delivery_team', 'system_admin', NULL),
  ('delivery_team', 'super_admin', NULL),
  ('delivery_team', 'account_owner', NULL),
  ('delivery_team', 'portfolio_manager', NULL),
  ('delivery_team', 'programme_manager', NULL),
  ('delivery_team', 'project_manager', NULL),
  ('delivery_team', 'team_manager', NULL),
  ('delivery_team', 'pm_portfolio_manager', NULL),
  ('delivery_team', 'pm_programme_manager', NULL),
  ('delivery_team', 'pm_project_manager', NULL),
  ('delivery_team', 'pm_team_manager', NULL)
ON CONFLICT (group_code, role_name_normalized) DO NOTHING;

-- ── 3. Reusable grant function ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.grant_menu_role_group(
  p_menu_code_pattern TEXT,
  p_group_code TEXT DEFAULT 'delivery_team'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
  SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
  FROM public.menu_items mi
  CROSS JOIN public.roles r
  JOIN public.menu_role_grant_groups g
    ON g.group_code = p_group_code
   AND g.role_name_normalized = lower(replace(r.role_name, ' ', '_'))
  WHERE mi.menu_code LIKE p_menu_code_pattern
    AND COALESCE(mi.is_deleted, FALSE) = FALSE
    AND COALESCE(r.is_deleted, FALSE) = FALSE
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.grant_menu_role_group(TEXT, TEXT) IS
  'Grants every role in a named menu_role_grant_groups group view+use access to every menu_items '
  'row matching a LIKE pattern. Usage: SELECT public.grant_menu_role_group(''fin_cat_%'');';

GRANT EXECUTE ON FUNCTION public.grant_menu_role_group(TEXT, TEXT) TO authenticated, service_role;

-- Register new table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('menu_role_grant_groups', 'Named, reusable role sets for bulk menu_items role grants (e.g. delivery_team)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v946c: menu_role_grant_groups table + grant_menu_role_group() function created, delivery_team group seeded';
END $$;
