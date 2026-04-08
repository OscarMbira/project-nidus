# Platform & Simulator Registration RLS Fix

## Issue Summary

Users were unable to log in after successfully registering and confirming their email for either **Platform** or **Simulator**. The error messages displayed were:

> "You do not have access to the Platform. Please register for Platform access first."

or

> "You do not have access to the Simulator. Please register for Simulator access first."

**Note:** This fix applies to **BOTH Platform and Simulator** systems as they share the same `user_platform_access` table and authentication flow.

## Root Cause

The `user_platform_access` table has a Row Level Security (RLS) policy that only allows INSERT operations with service role permissions:

```sql
CREATE POLICY policy_platform_access_insert_system
    ON public.user_platform_access FOR INSERT
    WITH CHECK (true);  -- Service role only
```

However, the frontend registration code (`PlatformRegister.jsx` and `unifiedSubscriptionService.js`) was attempting to insert records using the user's authenticated session (not service role), causing **403 Forbidden errors**.

### Flow of the Problem:

1. **User Registers** → Supabase creates auth user (unconfirmed)
2. **registerForPlatform() called** → Tries to INSERT into `user_platform_access` table
3. **RLS Policy blocks INSERT** → 403 Forbidden error (silent failure)
4. **User confirms email** → Email verification succeeds
5. **User tries to login** → System checks for platform access record
6. **No record found** → Login fails with "You do not have access to the Platform"

## Solution

Created two database functions with `SECURITY DEFINER` that bypass RLS policies and allow users to register themselves:

### 1. `register_user_for_platform(p_platform)`
- Allows authenticated users to register for a platform
- Bypasses RLS policies using SECURITY DEFINER
- Handles both new registrations and updates to existing records
- Returns JSON response with success/error status

### 2. `check_platform_registration(p_user_id, p_platform)`
- Checks if a user is registered for a specific platform
- Bypasses RLS policies using SECURITY DEFINER
- Returns registration status and date

## Files Modified

### 1. SQL Migration
**File:** `SQL/v123_fix_platform_registration_rls.sql`
- Created `register_user_for_platform()` function
- Created `check_platform_registration()` function
- Granted execute permissions to authenticated users

### 2. Frontend Service
**File:** `src/services/unifiedSubscriptionService.js`
- Updated `registerForPlatform()` to use database function instead of direct table insert
- Updated `hasRegisteredForPlatform()` to use database function instead of direct table query

## Implementation Steps

### Step 1: Run SQL Migration
Execute the SQL migration file in your Supabase SQL Editor:

```bash
# Navigate to Supabase project → SQL Editor
# Copy and run: SQL/v123_fix_platform_registration_rls.sql
```

### Step 2: Test the Fix
1. **New User Registration:**
   - Register a new user for Platform
   - Confirm email via confirmation link
   - Try to log in
   - Should successfully redirect to organisation setup

2. **Existing Users (Already Broken):**
   - If you have users stuck in this error state, run this SQL to fix them:

   ```sql
   -- Find users with auth accounts but no platform access
   SELECT au.id, au.email
   FROM auth.users au
   LEFT JOIN public.user_platform_access upa
     ON au.id = upa.user_id AND upa.platform = 'platform'
   WHERE upa.id IS NULL
     AND au.email_confirmed_at IS NOT NULL;

   -- Fix them by calling the function for each user
   -- Replace 'USER_ID_HERE' with actual user IDs from above query
   SELECT public.register_user_for_platform('platform')
   FROM auth.users
   WHERE id = 'USER_ID_HERE';
   ```

## Verification

After implementing the fix, verify that:

1. ✅ New users can register without errors
2. ✅ Platform access records are created during registration
3. ✅ Email confirmation completes successfully
4. ✅ Users can log in after email confirmation
5. ✅ No 403 errors in browser console during registration
6. ✅ Users are redirected to organisation setup after login

## Testing Checklist

### Platform Testing
- [ ] Run SQL migration (`v123_fix_platform_registration_rls.sql`)
- [ ] Test new Platform registration at `/platform/register`
- [ ] Confirm email via confirmation link
- [ ] Test login at `/platform/login` with new account
- [ ] Verify platform access record exists in database
- [ ] Check browser console for 403 errors (should be none)
- [ ] Verify user is redirected to organisation setup

### Simulator Testing
- [ ] Test new Simulator registration at `/simulator/register`
- [ ] Confirm email via confirmation link
- [ ] Test login at `/simulator/login` with new account
- [ ] Verify simulator access record exists in database
- [ ] Check browser console for 403 errors (should be none)
- [ ] Verify user is redirected to simulator dashboard

## Database Function Details

### register_user_for_platform()

**Parameters:**
- `p_platform`: VARCHAR(20) - Must be 'platform', 'simulator', or 'admin'

**Returns:** JSONB
```json
{
  "success": true,
  "message": "Successfully registered for platform",
  "record_id": "uuid-here",
  "action": "created"  // or "updated"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

### check_platform_registration()

**Parameters:**
- `p_user_id`: UUID - User's auth ID
- `p_platform`: VARCHAR(20) - Platform to check

**Returns:** JSONB
```json
{
  "registered": true,
  "registration_date": "2025-12-13T10:30:00Z"
}
```

## Rollback Plan

If issues occur, rollback by:

1. **Revert Frontend Changes:**
```javascript
// In unifiedSubscriptionService.js
// Restore original direct table insert code
export async function registerForPlatform(userId, platform) {
  const { data, error } = await platformDb
    .from('user_platform_access')
    .upsert({
      user_id: userId,
      platform: platform,
      has_registered: true,
      registration_date: new Date().toISOString(),
      first_access_at: new Date().toISOString(),
      last_access_at: new Date().toISOString(),
      access_count: 1,
    }, { onConflict: 'user_id,platform' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

2. **Drop Database Functions:**
```sql
DROP FUNCTION IF EXISTS public.register_user_for_platform(VARCHAR);
DROP FUNCTION IF EXISTS public.check_platform_registration(UUID, VARCHAR);
```

3. **Add RLS Policy for User Inserts (Alternative Fix):**
```sql
-- Allow users to insert their own platform access records
CREATE POLICY policy_platform_access_insert_own
    ON public.user_platform_access FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

## Notes

- The database functions use `SECURITY DEFINER` which means they run with the permissions of the function creator (typically a superuser or service role)
- This is safe because the functions validate that only authenticated users can register themselves
- The functions include proper error handling and return structured JSON responses
- All changes are backward compatible with existing code

## Related Files

### Platform Files
- `src/pages/auth/PlatformRegister.jsx` - Calls `registerForPlatform()` with `PLATFORMS.PLATFORM`
- `src/pages/auth/PlatformLogin.jsx` - Verifies platform access and attempts recovery

### Simulator Files
- `src/pages/auth/SimulatorRegister.jsx` - Calls `registerForPlatform()` with `PLATFORMS.SIMULATOR`
- `src/pages/auth/SimulatorLogin.jsx` - Verifies simulator access and attempts recovery

### Shared Files
- `src/pages/auth/EmailConfirmation.jsx` - Checks platform registration for both systems
- `src/services/unifiedAuthService.js` - Authentication and platform access checking (shared)
- `src/services/unifiedSubscriptionService.js` - Platform registration service functions (shared)
- `SQL/v123_fix_platform_registration_rls.sql` - Database functions for both platforms

## Created By

- **Date:** 2025-12-13
- **Author:** Claude Code
- **Issue:** Platform Login Error after successful registration
- **Fix Version:** v123
