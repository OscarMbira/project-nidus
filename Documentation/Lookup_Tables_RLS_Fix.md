# Lookup Tables RLS Fix

## Date
2025-12-20

## Problem Statement

When accessing `/platform/projects/new`, the page failed to load with error:
```
Failed to load page data: Failed to fetch project types: permission denied for table project_types
```

## Root Cause

Lookup/reference tables had RLS (Row Level Security) enabled but **no SELECT policies** allowing authenticated users to read them. This caused permission denied errors when trying to fetch dropdown data.

### Affected Tables
1. `project_types` - Project type lookup
2. `project_statuses` - Project status lookup
3. `methodologies` - Methodology lookup

These are reference tables that need to be readable by all authenticated users to populate form dropdowns.

## Impact

**Pages Affected:**
- `/platform/projects/new` - Cannot load project creation form
- `/platform/projects/:id/edit` - Cannot load project edit form
- Any page that needs to display project types, statuses, or methodologies

**User Experience:**
- Form shows "Failed to load page data" error
- Cannot create new projects
- Cannot edit existing projects
- Dropdowns are empty even if data exists

## Solution

Added SELECT policies to allow all authenticated users to read these lookup tables.

### SQL Migration: v143_fix_lookup_tables_rls.sql

```sql
-- PROJECT TYPES
CREATE POLICY "Allow authenticated users to read project types"
ON project_types
FOR SELECT
TO authenticated
USING (true);

-- PROJECT STATUSES
CREATE POLICY "Allow authenticated users to read project statuses"
ON project_statuses
FOR SELECT
TO authenticated
USING (true);

-- METHODOLOGIES
CREATE POLICY "Allow authenticated users to read methodologies"
ON methodologies
FOR SELECT
TO authenticated
USING (true);
```

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to: **SQL Editor**
3. Create a new query
4. Copy the contents of `SQL/v143_fix_lookup_tables_rls.sql`
5. Paste into the query editor
6. Click **Run** to execute
7. Verify success: Check that all 3 policies show as created

### Option 2: Supabase CLI

```bash
supabase db execute -f SQL/v143_fix_lookup_tables_rls.sql
```

### Verification

Run these queries to verify policies are active:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('project_types', 'project_statuses', 'methodologies');

-- Check policies exist
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('project_types', 'project_statuses', 'methodologies');
```

**Expected Results:**
- All 3 tables should have `rowsecurity = true`
- Each table should have 1 SELECT policy for authenticated users

## Technical Details

### Row Level Security (RLS)

RLS is a PostgreSQL feature that restricts which rows users can access. Supabase enables RLS by default for security, but requires explicit policies to grant access.

### Policy Explanation

```sql
CREATE POLICY "policy_name"
ON table_name
FOR SELECT              -- Only affects SELECT queries
TO authenticated        -- Applies to logged-in users
USING (true);          -- Allow all rows (no row-level filtering)
```

### Why USING (true)?

Lookup tables are reference data that all users should see:
- Project types are system-wide categories
- Project statuses are standard workflow states
- Methodologies are predefined frameworks

There's no row-level restriction needed - if you're authenticated, you can read all rows.

### Security Considerations

✅ **Safe for lookup tables** because:
- Read-only access (SELECT only)
- Reference data with no sensitive information
- No INSERT/UPDATE/DELETE policies (only admins can modify via backend)

❌ **Not safe for user data tables** like:
- `projects` - Should filter by user/organization
- `tasks` - Should filter by project membership
- `accounts` - Should filter by ownership

## Code Changes

The `ProjectsCreate` component was also updated for better error handling:

### Before
```javascript
if (typesResult.error) throw typesResult.error
// ❌ Complete page failure if query fails
```

### After
```javascript
if (typesResult.error) {
  console.error('Error fetching project types:', typesResult.error)
  // ✅ Log error but continue - show warning instead of blocking
}

// Show warning to user if data failed to load
if (hasErrors) {
  setErrors({
    submit: 'Some dropdown options failed to load. You can still create a project.'
  })
}
```

**Benefits:**
- More resilient error handling
- Detailed error logging for debugging
- Graceful degradation if queries fail
- Form still usable even with missing dropdown data

## Testing Checklist

After applying the SQL migration:

- [ ] Navigate to `/platform/projects/new`
- [ ] Page loads without errors
- [ ] Project Type dropdown populated
- [ ] Project Status dropdown populated
- [ ] Methodology dropdown populated
- [ ] Can create a new project
- [ ] Console shows no permission errors

## Prevention Strategies

### 1. **Lookup Table Convention**

For any new lookup/reference tables:

```sql
-- Always add SELECT policy for authenticated users
CREATE POLICY "Allow authenticated users to read {table_name}"
ON {table_name}
FOR SELECT
TO authenticated
USING (true);
```

### 2. **RLS Policy Checklist**

When creating new tables, ask:
- ✅ Is this a lookup/reference table? → Add SELECT for authenticated
- ✅ Is this user data? → Add filtered SELECT by user/org
- ✅ Is this sensitive data? → Add role-based SELECT policies

### 3. **Testing RLS**

Test RLS policies as a regular user (not service role):

```javascript
// Test as authenticated user (not bypass RLS)
const { data, error } = await supabase
  .from('project_types')
  .select('*')

// Should succeed after policy is added
```

## Related Tables to Check

Other lookup tables that may need similar policies:

- [ ] `project_priorities`
- [ ] `task_statuses`
- [ ] `risk_categories`
- [ ] `issue_types`
- [ ] `countries` (if used)
- [ ] Any other `*_types` or `*_statuses` tables

Run this query to find potential lookup tables:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    tablename LIKE '%_types'
    OR tablename LIKE '%_statuses'
    OR tablename LIKE '%_categories'
  )
  AND rowsecurity = true;
```

Then check if they have SELECT policies for authenticated users.

## Files Modified

1. **SQL/v143_fix_lookup_tables_rls.sql** - RLS policy migration (NEW)
2. **src/pages/ProjectsCreate.jsx** - Improved error handling
3. **Documentation/Lookup_Tables_RLS_Fix.md** - This documentation (NEW)

## Deployment Notes

- **Database changes required** - Must run SQL migration
- **No code changes required** - Error handling improvements are optional
- **No breaking changes** - Only adds permissions
- **Safe to deploy** - Read-only policies, no data modification
- **Reversible** - Can drop policies if needed (but not recommended)

## Rollback Procedure

If you need to rollback (not recommended):

```sql
DROP POLICY "Allow authenticated users to read project types" ON project_types;
DROP POLICY "Allow authenticated users to read project statuses" ON project_statuses;
DROP POLICY "Allow authenticated users to read methodologies" ON methodologies;
```

**Warning:** This will restore the permission denied errors!

## Performance Impact

- **Minimal** - Policies add negligible overhead
- **Positive** - Enables query caching since all users see same data
- **No indexes needed** - Lookup tables are small (<100 rows typically)

## Browser Compatibility

No browser-specific issues - this is a database-level fix.
