# Fix SSO Providers 403 Error

## Problem
The SSO providers endpoint returns a 403 Forbidden error because the Row Level Security (RLS) policy requires authentication, but SSO providers need to be readable by unauthenticated users on the login page.

## Solution
Run the SQL migration to update the RLS policy.

## Steps to Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
-- Drop ALL existing policies to start fresh (idempotent - safe to run multiple times)
DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_auth_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_authenticated_read ON sso_providers;

-- Recreate admin policy (for full admin access - INSERT, UPDATE, DELETE)
CREATE POLICY policy_sso_providers_admin_all
    ON sso_providers FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- Create public read policy (allows unauthenticated/anonymous users to read active SSO providers)
-- This is necessary so users can see SSO options on the login page before authenticating
-- By explicitly specifying TO public, anon, authenticated, we ensure all users can read
CREATE POLICY policy_sso_providers_public_read
    ON sso_providers FOR SELECT
    TO public, anon, authenticated
    USING (is_active = true AND is_deleted = false);
```

5. Click **Run** (or press Ctrl+Enter)
6. Verify the success message appears

### Option 2: Using SQL File

1. Open the file: `SQL/v81_fix_sso_providers_rls.sql`
2. Copy all contents
3. Paste into Supabase SQL Editor
4. Run the query

## Verification

After running the migration:
1. Refresh your application
2. Check the browser console - the 403 error should be gone
3. The SSO login buttons should appear on the login page (if SSO providers are configured)

## Note

The application will continue to work even if this migration hasn't been run yet, as the service handles the error gracefully by returning an empty array. However, SSO providers won't be visible on the login page until the migration is applied.

