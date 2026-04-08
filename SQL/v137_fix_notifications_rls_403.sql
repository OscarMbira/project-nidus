-- ============================================================================
-- Fix Notifications RLS Policy - 403 Forbidden Errors
-- Version: v137
-- Description: Fixes 403 errors on notifications queries (HEAD requests for count)
-- ============================================================================

-- Problem:
-- The notifications table is returning 403 (Forbidden) errors when querying
-- for unread count using HEAD requests. The RLS policy needs to be updated
-- to properly handle all query types including HEAD requests.

-- Drop existing policies
DROP POLICY IF EXISTS policy_notifications_own_all ON notifications;
DROP POLICY IF EXISTS policy_notifications_own_select ON notifications;
DROP POLICY IF EXISTS policy_notifications_own_update ON notifications;
DROP POLICY IF EXISTS policy_notifications_admin_all ON notifications;

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can SELECT their own notifications (includes HEAD for count)
CREATE POLICY policy_notifications_own_select
    ON notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Policy 2: Users can UPDATE their own notifications
CREATE POLICY policy_notifications_own_update
    ON notifications
    FOR UPDATE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Policy 3: Users can INSERT notifications (for system/other users to create notifications)
CREATE POLICY policy_notifications_insert
    ON notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy 4: Admin access (for system_admin role)
CREATE POLICY policy_notifications_admin_all
    ON notifications
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'system_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- Grant permissions
GRANT SELECT ON notifications TO authenticated;
GRANT INSERT ON notifications TO authenticated;
GRANT UPDATE ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- Verification
DO $$
DECLARE
  v_policy_count INTEGER;
  v_rls_enabled BOOLEAN;
  v_policy_name TEXT;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'notifications';
  
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'notifications';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Notifications RLS Fix Complete';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS Enabled: %', v_rls_enabled;
  RAISE NOTICE 'Policies Count: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Active Policies:';
  
  -- List all policies
  FOR v_policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - %', v_policy_name;
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Policies are now split into SELECT, UPDATE, and INSERT';
  RAISE NOTICE 'to properly handle HEAD requests for count queries.';
  RAISE NOTICE '================================================';
END $$;

