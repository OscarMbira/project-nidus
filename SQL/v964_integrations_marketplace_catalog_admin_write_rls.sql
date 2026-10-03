-- v964_integrations_marketplace_catalog_admin_write_rls.sql
-- Phase 21 (GAP-25 Integrations Marketplace) — public.integration_catalog RLS gap fix.
--
-- v645_pmis_gap_tables_tier3.sql enabled RLS on public.integration_catalog with only a SELECT
-- policy (policy_integration_catalog_read, "USING (TRUE)" for all authenticated users) — there
-- was never an INSERT/UPDATE/DELETE policy, so no one (not even a PMO admin) could write to the
-- catalog. The v963 Phase 21 marketplace build adds an admin create/edit path for catalog
-- entries (browsable reference data), which needs write access. This migration adds
-- INSERT/UPDATE/DELETE policies scoped to PMO admins, mirroring the existing
-- policy_skill_catalog / policy_vendors pattern (v644) that uses public.is_user_pmo_admin().
--
-- public.integration_connections already has a working ALL-command policy from v645 (pmo admin
-- OR connected_by = auth.uid()) — untouched here, nothing to fix there.
--
-- sim.integration_catalog is expected to already have full INSERT/UPDATE/DELETE policies for
-- any authenticated user (per v963u_sim_timesheet_report_integration_tables.sql, applied
-- separately — not present in this worktree's checkout at time of writing, so not re-verified
-- here). This migration is public-schema only; do not duplicate it for sim.
--
-- NOT YET RUN AGAINST THE LIVE DATABASE — apply manually via Supabase SQL editor / migration
-- runner per project convention.

-- Keep the existing read policy exactly as-is (idempotent re-create, no behavior change).
DROP POLICY IF EXISTS policy_integration_catalog_read ON public.integration_catalog;
CREATE POLICY policy_integration_catalog_read ON public.integration_catalog
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS policy_integration_catalog_insert ON public.integration_catalog;
CREATE POLICY policy_integration_catalog_insert ON public.integration_catalog
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_integration_catalog_update ON public.integration_catalog;
CREATE POLICY policy_integration_catalog_update ON public.integration_catalog
  FOR UPDATE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_integration_catalog_delete ON public.integration_catalog;
CREATE POLICY policy_integration_catalog_delete ON public.integration_catalog
  FOR DELETE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()));
