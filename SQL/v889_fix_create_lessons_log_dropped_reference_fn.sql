-- =============================================================================
-- v889: Fix create_lessons_log_for_project() calling a dropped function
-- Error: function generate_lessons_log_reference() does not exist (42883)
--
-- Root cause: v756b migrated public.lessons_logs.log_reference to the Admin ID
-- Generation engine — it replaced the old BEFORE INSERT trigger
-- (trg_lessons_logs_before_insert_reference) with an AFTER INSERT trigger
-- (trg_lessons_logs_admin_display_id) that assigns log_reference via
-- admin.generate_display_id() whenever the column is left blank, and dropped
-- public.generate_lessons_log_reference() in the same pass.
--
-- create_lessons_log_for_project() (v169 / v305.2) was never updated for that
-- swap — it still calls the dropped function, so BOTH the app's own "Create
-- Lessons Log" flow and any seed/migration calling this RPC fail with 42883.
-- Same class of bug already fixed for lessons_reports in v882 (see
-- lessonsReportService.js generateReportReference() comment).
--
-- Fix: insert with log_reference = '' and let the existing
-- trg_lessons_logs_admin_display_id AFTER INSERT trigger assign the real
-- reference — don't hand-mint it here (rule 16.2).
-- Prerequisites: v169 (lessons_logs table), v305.2 (this function's prior
--   version), v756b (admin display-ID trigger + drop of the old function).
-- Idempotent: CREATE OR REPLACE.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_lessons_log_for_project(p_project_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Skip when no user (e.g. seed data, migrations); lessons_logs.author_id is NOT NULL
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_log_id
    FROM public.lessons_logs
    WHERE project_id = p_project_id
      AND is_deleted = FALSE;

    IF v_log_id IS NOT NULL THEN
        RETURN v_log_id;
    END IF;

    -- log_reference left blank: trg_lessons_logs_admin_display_id (v756b) assigns
    -- the real reference via admin.generate_display_id() after insert.
    INSERT INTO public.lessons_logs (
        project_id,
        log_reference,
        author_id,
        owner_id,
        created_by,
        is_active
    )
    VALUES (
        p_project_id,
        '',
        p_user_id,
        p_user_id,
        p_user_id,
        TRUE
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_lessons_log_for_project(UUID, UUID) IS 'Creates lessons log when project is initiated; returns NULL when p_user_id is null (e.g. seed inserts). log_reference is assigned by trg_lessons_logs_admin_display_id (v756b), not generated here.';

DO $$
BEGIN
  RAISE NOTICE 'v889_fix_create_lessons_log_dropped_reference_fn.sql applied';
END $$;
