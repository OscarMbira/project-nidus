-- ============================================================
-- v316: Grant table-level permissions on organisation_branding
-- "permission denied for table" means the authenticated role
-- lacks GRANT privileges entirely (separate from RLS policies).
-- ============================================================

-- Grant to authenticated role (all logged-in users)
-- RLS policies still control row-level access on top of this
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.organisation_branding
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.organisation_branding_history
  TO authenticated;

-- Grant usage on sequences if any (belt-and-suspenders)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Also grant to anon for public logo reads (logos render for all visitors)
GRANT SELECT ON public.organisation_branding TO anon;
