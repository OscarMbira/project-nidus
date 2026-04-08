-- ============================================================================
-- v304.3: Stakeholders table RLS policies
-- Description: Allow authenticated and anon (with JWT) users to read stakeholders
--              so the Stakeholder Register list and forms work correctly.
-- Run this in Supabase SQL Editor after v35 and before or after seed v304.2.
-- ============================================================================

-- Ensure RLS is enabled on public.stakeholders
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (avoid duplicates)
DROP POLICY IF EXISTS "stakeholders_authenticated_select" ON public.stakeholders;
DROP POLICY IF EXISTS "stakeholders_authenticated_insert" ON public.stakeholders;
DROP POLICY IF EXISTS "stakeholders_authenticated_update" ON public.stakeholders;
DROP POLICY IF EXISTS "stakeholders_authenticated_delete" ON public.stakeholders;
DROP POLICY IF EXISTS "stakeholders_select_authenticated" ON public.stakeholders;
DROP POLICY IF EXISTS "stakeholders_anon_select" ON public.stakeholders;

-- Authenticated users can read non-deleted stakeholders (for register list and view)
CREATE POLICY "stakeholders_authenticated_select"
  ON public.stakeholders
  FOR SELECT
  TO authenticated
  USING (is_deleted = false);

-- Anon role can also read non-deleted stakeholders (Supabase may use anon for some requests; protects empty list)
CREATE POLICY "stakeholders_anon_select"
  ON public.stakeholders
  FOR SELECT
  TO anon
  USING (is_deleted = false);

-- Authenticated users can insert (for add stakeholder)
CREATE POLICY "stakeholders_authenticated_insert"
  ON public.stakeholders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update (for edit stakeholder)
CREATE POLICY "stakeholders_authenticated_update"
  ON public.stakeholders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete (soft delete via is_deleted)
CREATE POLICY "stakeholders_authenticated_delete"
  ON public.stakeholders
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant so both roles can SELECT; only authenticated can write
GRANT SELECT ON public.stakeholders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stakeholders TO authenticated;
