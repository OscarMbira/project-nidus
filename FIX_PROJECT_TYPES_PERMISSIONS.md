# Fix Project Types Saving Issue

## Problem
The "Saving..." button gets stuck when trying to create/update project types. This is caused by missing database permissions for the `pmo_admin` role.

## Solution
Run the SQL migration file `SQL/v154_pmo_admin_project_types_statuses_permissions.sql` in your Supabase database.

## Steps to Fix

### Option 1: Using Supabase SQL Editor (Recommended)
1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `SQL/v154_pmo_admin_project_types_statuses_permissions.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **Run** to execute

### Option 2: Using psql (Command Line)
```bash
psql -h your-supabase-host -U postgres -d postgres -f SQL/v154_pmo_admin_project_types_statuses_permissions.sql
```

## Verification
After running the migration, verify the policies were created:

```sql
-- Check if the policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('project_types', 'project_statuses')
  AND policyname LIKE '%pmo_admin%';
```

You should see:
- `policy_project_types_pmo_admin_all` on `project_types` table
- `policy_project_statuses_pmo_admin_all` on `project_statuses` table

## Expected Result
After running this migration, users with the `pmo_admin` role will be able to:
- ✅ INSERT new project types
- ✅ UPDATE existing project types
- ✅ DELETE (soft delete) project types
- ✅ INSERT new project statuses
- ✅ UPDATE existing project statuses
- ✅ DELETE (soft delete) project statuses

The "Saving..." button should now work correctly!

---

**Note:** Make sure you're logged in as a user with the `pmo_admin` role to test this functionality.
