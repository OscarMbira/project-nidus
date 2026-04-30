-- =============================================================================
-- v514_sidebar_revamp_role_permissions_grant.sql
-- Purpose: Grants and RLS alignment for sidebar revamp access
-- =============================================================================

-- Ensure authenticated can read sidebar and menu metadata.
GRANT SELECT ON public.menu_items TO authenticated;
GRANT SELECT ON public.role_menu_items TO authenticated;
GRANT SELECT ON public.sidebar_config TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;

-- Keep RLS enabled.
ALTER TABLE public.role_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidebar_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('sim.sidebar_config') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON sim.sidebar_config TO authenticated';
    EXECUTE 'ALTER TABLE sim.sidebar_config ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- role_menu_items: user reads rows for roles they hold.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'role_menu_items'
      AND policyname = 'role_menu_items_read_by_user_roles'
  ) THEN
    CREATE POLICY role_menu_items_read_by_user_roles
    ON public.role_menu_items
    FOR SELECT
    TO authenticated
    USING (
      role_id IN (
        SELECT ur.role_id
        FROM public.user_roles ur
        JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- sidebar_config rows are globally readable for authenticated users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sidebar_config'
      AND policyname = 'sidebar_config_read_authenticated'
  ) THEN
    CREATE POLICY sidebar_config_read_authenticated
    ON public.sidebar_config
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('sim.sidebar_config') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'sim'
        AND tablename = 'sidebar_config'
        AND policyname = 'sim_sidebar_config_read_authenticated'
    ) THEN
      CREATE POLICY sim_sidebar_config_read_authenticated
      ON sim.sidebar_config
      FOR SELECT
      TO authenticated
      USING (true);
    END IF;
  END IF;
END $$;
