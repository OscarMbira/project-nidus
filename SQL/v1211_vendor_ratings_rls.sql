-- =============================================================================
-- v1211: Let procurement roles save vendor ratings
-- =============================================================================
-- Rate a Vendor failed with "new row violates row-level security policy for
-- table vendor_ratings". The same people who can save a vendor (v1209) may
-- read and write that vendor's ratings.
-- =============================================================================

ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_ratings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vendor_ratings', r.policyname);
  END LOOP;
END $$;

CREATE POLICY policy_vendor_ratings ON public.vendor_ratings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.id = vendor_ratings.vendor_id
        AND public.auth_user_can_manage_vendors(v.account_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.id = vendor_ratings.vendor_id
        AND public.auth_user_can_manage_vendors(v.account_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_ratings TO authenticated;
