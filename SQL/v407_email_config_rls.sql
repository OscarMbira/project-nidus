-- ============================================================================
-- v407: RLS policies for email_configurations
--       Allows PMO Admins to manage SMTP settings via the platform UI.
--       Prerequisites: v49_email_integration.sql, v403 (is_user_pmo_admin).
-- ============================================================================

-- Enable RLS if not already on
ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS policy_email_config_pmo_admin_all  ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_role   ON public.email_configurations;

-- PMO admins (and above) can SELECT / INSERT / UPDATE / DELETE
CREATE POLICY policy_email_config_pmo_admin_all
  ON public.email_configurations
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- Service role (Edge Functions) has unrestricted access
CREATE POLICY policy_email_config_service_role
  ON public.email_configurations
  FOR ALL
  TO service_role
  USING      (true)
  WITH CHECK (true);

-- Verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'email_configurations'
       AND policyname = 'policy_email_config_pmo_admin_all'
  ) THEN
    RAISE NOTICE '[VERIFY] policy_email_config_pmo_admin_all: OK';
  ELSE
    RAISE WARNING '[VERIFY] policy_email_config_pmo_admin_all: MISSING';
  END IF;
END $$;
