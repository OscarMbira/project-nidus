-- ============================================================================
-- v535: Fix check_seat_availability – remove blocking UPDATE
-- ============================================================================
-- Root cause of stuck "Sending..." button:
--   The v85 version of check_seat_availability calls calculate_project_seat_usage
--   (PERFORM), which does an UPDATE on project_seat_allocations. That UPDATE
--   acquires a ROW EXCLUSIVE lock. If a previous hung request still holds the
--   lock the next UPDATE waits indefinitely – the Supabase fetch() never
--   resolves and setSending(false) is never called.
--
-- Fix: make check_seat_availability read-only. Seat counts are already kept
-- up-to-date by the trigger (update_seat_count_on_role_change) that fires on
-- user_roles INSERT/UPDATE/DELETE. No manual refresh is needed here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_seat_availability(p_project_id UUID)
RETURNS TABLE (
    has_available_seats BOOLEAN,
    current_count       INTEGER,
    total_seats         INTEGER,
    available_seats     INTEGER,
    usage_percentage    DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Read-only: seat counts are maintained by triggers on user_roles.
    -- Removing the previous PERFORM calculate_project_seat_usage() call
    -- eliminates the UPDATE-lock that caused indefinite hangs.
    RETURN QUERY
    SELECT
        (psa.available_seats > 0)                                      AS has_available_seats,
        psa.current_user_count                                         AS current_count,
        psa.total_seats,
        psa.available_seats,
        CASE
            WHEN psa.total_seats > 0
                THEN ROUND((psa.current_user_count::DECIMAL / psa.total_seats * 100), 2)
            ELSE 0
        END                                                            AS usage_percentage
    FROM project_seat_allocations psa
    WHERE psa.project_id = p_project_id;
END;
$$;

COMMENT ON FUNCTION public.check_seat_availability(UUID) IS
  'Read-only seat availability check (v535). Seat counts are maintained by triggers; '
  'the previous UPDATE call is removed to prevent lock-wait hangs during invitation sending.';

DO $$
BEGIN
    RAISE NOTICE 'v535: check_seat_availability replaced with read-only version.';
    RAISE NOTICE '      Apply this in Supabase SQL Editor to fix stuck Sending... button.';
END $$;
