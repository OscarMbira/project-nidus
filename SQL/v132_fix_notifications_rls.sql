-- ============================================================================
-- Fix Notifications RLS Policy
-- Description: Fixes RLS policy for notifications table to use internal user ID
-- Version: v132
-- ============================================================================

-- The notifications table uses internal user_id from users table, not auth.uid()
-- The current RLS policy incorrectly uses auth.uid() which causes 500 errors

-- Drop the incorrect policy
DROP POLICY IF EXISTS policy_notifications_own_all ON notifications;

-- Create correct policy that maps auth.uid() to internal user ID
CREATE POLICY policy_notifications_own_all
    ON notifications FOR ALL
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Keep the admin policy as is (it should work)
-- But let's also update it to be more explicit
DROP POLICY IF EXISTS policy_notifications_admin_all ON notifications;

CREATE POLICY policy_notifications_admin_all
    ON notifications FOR ALL
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

DO $$
BEGIN
  RAISE NOTICE 'Notifications RLS policies fixed successfully';
END $$;

