-- ================================================
-- File: v1169_timesheet_entry_approval_workflow.sql
-- Description: Reason catalogs (approve/reject) + append-only review history for the
--              entry-level timesheet approval flow (TeamTimesheetsPage.jsx).
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- TeamTimesheetsPage.jsx's Approve/Reject today overwrite timesheet_entries.status/
-- reviewed_by/review_notes in place (updateTimesheetEntry) — resubmitting after a
-- rejection silently erases the prior decision, and the review note is one optional
-- free-text field. See projectprd/v1169_timesheet_entry_approval_workflow_PRD.md for
-- the full decision record (interview-settled: entry-level not period-level, predefined
-- reason catalogs not free-typed, separate catalog per decision, multi-select, full CRUD
-- management page, in-app + email notification).
--
-- timesheet_entries.status/reviewed_by/review_notes are kept as-is (still updated with
-- the latest decision) — this migration only adds new tables alongside them.

-- ================================================
-- 1) REASON CATALOGS (public only — shared reference data, same precedent as
--    assignment_roles/v1164: Simulator reads these via platformDb too, no sim mirror)
-- ================================================

CREATE TABLE IF NOT EXISTS public.timesheet_entry_approve_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.timesheet_entry_reject_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_approve_reasons_code_unique ON public.timesheet_entry_approve_reasons(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ts_approve_reasons_active ON public.timesheet_entry_approve_reasons(is_active) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_reject_reasons_code_unique ON public.timesheet_entry_reject_reasons(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ts_reject_reasons_active ON public.timesheet_entry_reject_reasons(is_active) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_ts_approve_reasons_before_insert
    BEFORE INSERT ON public.timesheet_entry_approve_reasons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();
CREATE TRIGGER trg_ts_approve_reasons_before_update
    BEFORE UPDATE ON public.timesheet_entry_approve_reasons
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

CREATE TRIGGER trg_ts_reject_reasons_before_insert
    BEFORE INSERT ON public.timesheet_entry_reject_reasons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();
CREATE TRIGGER trg_ts_reject_reasons_before_update
    BEFORE UPDATE ON public.timesheet_entry_reject_reasons
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE public.timesheet_entry_approve_reasons IS 'Predefined reasons a reviewer can select when approving a timesheet entry (v1169)';
COMMENT ON TABLE public.timesheet_entry_reject_reasons IS 'Predefined reasons a reviewer can select when rejecting a timesheet entry (v1169)';

ALTER TABLE public.timesheet_entry_approve_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_entry_reject_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_ts_approve_reasons_select_authenticated
    ON public.timesheet_entry_approve_reasons FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY policy_ts_approve_reasons_admin_all
    ON public.timesheet_entry_approve_reasons FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('System Admin', 'Superuser', 'PMO Admin')
              AND ur.is_deleted = FALSE AND r.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('System Admin', 'Superuser', 'PMO Admin')
              AND ur.is_deleted = FALSE AND r.is_deleted = FALSE
        )
    );

CREATE POLICY policy_ts_reject_reasons_select_authenticated
    ON public.timesheet_entry_reject_reasons FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY policy_ts_reject_reasons_admin_all
    ON public.timesheet_entry_reject_reasons FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('System Admin', 'Superuser', 'PMO Admin')
              AND ur.is_deleted = FALSE AND r.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('System Admin', 'Superuser', 'PMO Admin')
              AND ur.is_deleted = FALSE AND r.is_deleted = FALSE
        )
    );

-- ================================================
-- 2) REVIEW HISTORY (append-only; public + sim, mirrors timesheet_entries itself)
-- ================================================

CREATE TABLE IF NOT EXISTS public.timesheet_entry_reviews (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        uuid        NOT NULL REFERENCES public.timesheet_entries(id) ON DELETE CASCADE,
    decision        text        NOT NULL CHECK (decision IN ('approved', 'rejected')),
    reviewer_id     uuid        NOT NULL REFERENCES auth.users(id),
    reason_ids      uuid[]      NOT NULL CHECK (cardinality(reason_ids) >= 1),
    notes           text,
    decided_at      timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ts_entry_reviews_entry_id ON public.timesheet_entry_reviews(entry_id);
CREATE INDEX IF NOT EXISTS idx_ts_entry_reviews_decided_at ON public.timesheet_entry_reviews(decided_at);

COMMENT ON TABLE public.timesheet_entry_reviews IS 'Append-only history of every approve/reject decision on a timesheet entry (v1169) — never updated/overwritten, one row per decision so resubmission history is preserved.';

ALTER TABLE public.timesheet_entry_reviews ENABLE ROW LEVEL SECURITY;

-- Same visibility as timesheet_entries itself: the entry's own submitter, or a PM/TL/TM
-- on that project.
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
                AND up.user_id    = auth.uid()
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

-- Append-only: only a PM/TL/TM on the entry's project may insert a decision; no UPDATE/DELETE
-- policy exists at all (rows are immutable once written).
CREATE POLICY "timesheet_entry_reviews_insert" ON public.timesheet_entry_reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.timesheet_entries te
      JOIN public.user_projects up ON up.project_id = te.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
      JOIN public.user_roles ur ON ur.user_id = get_user_id_from_auth(auth.uid()) AND ur.is_active = TRUE AND NOT COALESCE(ur.is_deleted, FALSE)
      JOIN public.roles r ON r.id = ur.role_id AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      WHERE te.id = timesheet_entry_reviews.entry_id
    )
  );

CREATE TABLE IF NOT EXISTS sim.timesheet_entry_reviews (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        uuid        NOT NULL REFERENCES sim.timesheet_entries(id) ON DELETE CASCADE,
    decision        text        NOT NULL CHECK (decision IN ('approved', 'rejected')),
    reviewer_id     uuid        NOT NULL,
    reason_ids      uuid[]      NOT NULL CHECK (cardinality(reason_ids) >= 1),
    notes           text,
    decided_at      timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_ts_entry_reviews_entry_id ON sim.timesheet_entry_reviews(entry_id);

ALTER TABLE sim.timesheet_entry_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sim_timesheet_entry_reviews_all" ON sim.timesheet_entry_reviews
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ================================================
-- 3) REGISTER TABLES
-- ================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('timesheet_entry_approve_reasons', 'Lookup table of predefined reasons a reviewer can select when approving a timesheet entry', false, true),
  ('timesheet_entry_reject_reasons', 'Lookup table of predefined reasons a reviewer can select when rejecting a timesheet entry', false, true),
  ('timesheet_entry_reviews', 'Append-only history of approve/reject decisions on timesheet entries, preserved across resubmissions', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1169: timesheet_entry_approve_reasons, timesheet_entry_reject_reasons, '
               'timesheet_entry_reviews (public + sim) created.';
  RAISE NOTICE '================================================';
END $$;
