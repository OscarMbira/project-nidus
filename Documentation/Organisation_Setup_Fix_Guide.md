# Organisation Setup Fix Guide

## Issues Fixed

This guide addresses the following errors encountered during organisation setup:

1. **Countries Table Error (403 Forbidden)**
   - Error: `permission denied for table countries`
   - Symptom: Country dropdown shows "No countries available. Please check database connection."

2. **Org Admin Role Error (406 Not Acceptable)**
   - Error: `Role 'org_admin' not found`
   - Symptom: Warning "Failed to assign Organization Admin role. User may need to be assigned manually."

## Solution

Run the comprehensive fix script that addresses all issues at once.

### Step-by-Step Instructions

#### Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your "Project Nidus" project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

#### Step 2: Run the Master Fix Script

1. Open the file: `SQL/v128_fix_organisation_setup_issues.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

#### Step 3: Verify Success

After running the script, you should see output like:

```
================================================
Organisation Setup Fix Complete
================================================
COUNTRIES:
  Active Countries: 50+
  RLS Policies: 3

ROLES:
  org_admin exists: true
  Total active roles: 10+
  RLS Policies: 2
================================================
```

✅ **Success Indicators:**
- Active Countries > 0
- org_admin exists: true
- No warnings displayed

#### Step 4: Test in Application

1. Refresh your browser
2. Navigate to `/onboarding/organisation-setup`
3. Verify:
   - ✅ Country dropdown loads with countries
   - ✅ No red error message
   - ✅ Can select a country
4. Fill in the form and submit
5. Verify:
   - ✅ Organisation created successfully
   - ✅ No "org_admin not found" error

## What the Fix Does

### 1. Countries Table Fix

- **Drops and recreates RLS policies** with correct permissions
- **Grants SELECT permission** to authenticated and anonymous users
- **Activates 50+ common countries** (US, UK, Canada, etc.)

### 2. Roles Table Fix

- **Creates RLS policies** allowing users to read active roles
- **Grants SELECT permission** to authenticated and anonymous users
- **Ensures org_admin role exists** and is active

### 3. Critical Roles Creation

The fix ensures these roles exist:

| Role Name      | Display Name        | Level | System Role |
|----------------|---------------------|-------|-------------|
| org_admin      | Organization Admin  | 80    | No          |
| account_owner  | Account Owner       | 90    | Yes         |
| system_admin   | System Admin        | 100   | Yes         |

## Alternative Individual Fixes

If you prefer to run fixes separately, use these scripts in order:

1. `SQL/v126_fix_countries_rls_policies.sql` - Fixes countries table
2. `SQL/v127_ensure_org_admin_role_exists.sql` - Creates org_admin role
3. `SQL/v128_fix_organisation_setup_issues.sql` - Master fix (includes both)

**Recommendation:** Use v128 (master fix) as it handles all issues comprehensively.

## Troubleshooting

### Issue: Still getting "permission denied" after running fix

**Solution:**
1. Check if RLS is enabled: Run in SQL Editor:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename IN ('countries', 'roles');
   ```
2. Both should show `rowsecurity: true`
3. If issues persist, temporarily disable RLS for testing:
   ```sql
   ALTER TABLE countries DISABLE ROW LEVEL SECURITY;
   ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
   ```
   ⚠️ **Warning:** Only use this temporarily. Re-run v128 after testing.

### Issue: Countries dropdown still empty

**Solution:**
1. Check if countries are active:
   ```sql
   SELECT COUNT(*) FROM countries WHERE is_active = TRUE;
   ```
2. Should return 50+
3. If 0, manually activate countries:
   ```sql
   UPDATE countries SET is_active = TRUE
   WHERE code IN ('US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IN', 'SG');
   ```

### Issue: "org_admin not found" persists

**Solution:**
1. Check if role exists:
   ```sql
   SELECT * FROM roles WHERE role_name = 'org_admin';
   ```
2. If not found, manually create it:
   ```sql
   INSERT INTO roles (role_name, role_display_name, role_level, is_system_role, is_active)
   VALUES ('org_admin', 'Organization Admin', 80, false, true);
   ```

## Security Notes

- **RLS Enabled:** Both tables have Row Level Security enabled for protection
- **Public Read Access:** Anonymous users can read countries and roles (required for registration)
- **Admin-Only Write:** Only system admins can modify countries and roles
- **Authenticated Write:** Authenticated users can insert user_roles (self-assignment during registration)

## Related Files

- `SQL/v121_create_countries_table.sql` - Original countries table creation
- `SQL/v125_activate_common_countries.sql` - Country activation script
- `SQL/v126_fix_countries_rls_policies.sql` - Countries RLS fix
- `SQL/v127_ensure_org_admin_role_exists.sql` - Org admin role creation
- `SQL/v128_fix_organisation_setup_issues.sql` - Master fix script (recommended)

## Support

If issues persist after running these fixes:

1. Check browser console for additional errors
2. Verify Supabase connection in `.env` file
3. Ensure you're using the correct Supabase project
4. Check that SQL migrations have been run in order (v121, v125, v126, v127, v128)

## Next Steps

After fixing these issues, you can proceed with:

1. ✅ Creating organisations
2. ✅ Assigning org_admin role to users
3. ✅ Setting up projects
4. ✅ Managing subscriptions

Your organisation setup flow should now work end-to-end!
