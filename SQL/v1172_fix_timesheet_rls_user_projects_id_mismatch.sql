-- ================================================
-- File: v1172_fix_timesheet_rls_user_projects_id_mismatch.sql
-- Description: Fix a pre-existing RLS bug on timesheet_entries (v628e) — and the two v1169/
--              v1170 tables that copied the same pattern — where user_projects.user_id (the
--              INTERNAL public.users.id) was compared directly against auth.uid() (the AUTH
--              id), two different UUID spaces that never match. Surfaced as
--              "new row violates row-level security policy for table timesheet_entries" the
--              first time a real user tried to create an entry through the app UI (the v1170
--              weekly grid) rather than via a SQL seed.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- user_projects.user_id REFERENCES users(id) (v03_user_access_tables.sql) — the internal id,
-- not auth.users(id). Every policy on timesheet_entries/timesheet_entry_reviews/
-- timesheet_day_locations that checks project membership via user_projects wrote
-- "up.user_id = auth.uid()", which can never be true (same bug already correctly avoided a few
-- lines later in the same policies' role-check EXISTS clause, which uses
-- get_user_id_from_auth(auth.uid()) — the fix here makes the membership check consistent with
-- that). This migration drops and recreates every affected policy with the correct resolver.

-- Prerequisites: v628e_timesheets.sql, v1169_timesheet_entry_approval_workflow.sql,
--                 v1170_weekly_timesheet_grid.sql, v104_fix_projects_rls_recursion.sql
--                 (defines get_user_id_from_auth)

-- ================================================
-- 1) timesheet_entries
-- ================================================

DROP POLICY IF EXISTS "timesheet_entries_select" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_select" ON public.timesheet_entries
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = timesheet_entries.project_id
          AND up.user_id    = get_user_id_from_auth(auth.uid())
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
  );

DROP POLICY IF EXISTS "timesheet_entries_insert" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_insert" ON public.timesheet_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = timesheet_entries.project_id
        AND up.user_id    = get_user_id_from_auth(auth.uid())
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS "timesheet_entries_update" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_update" ON public.timesheet_entries
  FOR UPDATE USING (
    (user_id = auth.uid() AND status IN ('draft', 'rejected'))
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = timesheet_entries.project_id
          AND up.user_id    = get_user_id_from_auth(auth.uid())
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
  );

-- timesheet_entries_delete has no user_projects check — unaffected, left as-is.

-- ================================================
-- 2) timesheet_entry_reviews (v1169 — inherited the same pattern)
-- ================================================

DROP POLICY IF EXISTS "timesheet_entry_reviews_select" ON public.timesheet_entry_reviews;
CREATE POLICY "timesheet_entry_reviews_select" ON public.timesheet_entry_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.timesheet_entries te
      WHERE te.id = timesheet_entry_reviews.entry_id
        AND (
          te.user_id = auth.uid()
          OR (
            EXISTS (
              SELECT 1 FROM public.user_projects up
              WHERE up.project_id = te.project_id
                AND up.user_id    = get_user_id_from_auth(auth.uid())
                AND up.is_deleted = FALSE
            )
            AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              JOIN public.roles r ON r.id = ur.role_id
              WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
                AND ur.is_active = TRUE
                AND NOT COALESCE(ur.is_deleted, FALSE)
                AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "timesheet_entry_reviews_insert" ON public.timesheet_entry_reviews;
CREATE POLICY "timesheet_entry_reviews_insert" ON public.timesheet_entry_reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.timesheet_entries te
      JOIN public.user_projects up ON up.project_id = te.project_id AND up.user_id = get_user_id_from_auth(auth.uid()) AND up.is_deleted = FALSE
      JOIN public.user_roles ur ON ur.user_id = get_user_id_from_auth(auth.uid()) AND ur.is_active = TRUE AND NOT COALESCE(ur.is_deleted, FALSE)
      JOIN public.roles r ON r.id = ur.role_id AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      WHERE te.id = timesheet_entry_reviews.entry_id
    )
  );

-- ================================================
-- 3) timesheet_day_locations (v1170 — inherited the same pattern)
-- ================================================

DROP POLICY IF EXISTS "timesheet_day_locations_select" ON public.timesheet_day_locations;
CREATE POLICY "timesheet_day_locations_select" ON public.timesheet_day_locations
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = timesheet_day_locations.project_id
          AND up.user_id    = get_user_id_from_auth(auth.uid())
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
  );

DROP POLICY IF EXISTS "timesheet_day_locations_upsert" ON public.timesheet_day_locations;
CREATE POLICY "timesheet_day_locations_upsert" ON public.timesheet_day_locations
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = timesheet_day_locations.project_id
        AND up.user_id    = get_user_id_from_auth(auth.uid())
        AND up.is_deleted = FALSE
    )
  );

-- timesheet_day_locations_update (user_id = auth.uid() only, no user_projects check) —
-- unaffected, left as-is.

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1172: timesheet_entries/timesheet_entry_reviews/timesheet_day_locations RLS '
               'policies recreated with get_user_id_from_auth() for the user_projects membership check.';
  RAISE NOTICE '================================================';
END $$;
