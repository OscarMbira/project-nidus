# Auto-Logout on Browser Close Feature

## Overview
The application now automatically logs out users when they close their browser. This enhances security by ensuring sessions don't persist indefinitely.

## Implementation Date
2025-11-27

## Changes Made

### 1. Supabase Client Configuration
**File:** `src/services/supabase/supabaseClient.js`

**Changed:**
- `storage: window.localStorage` → `storage: window.sessionStorage`

**Impact:**
- Auth sessions are now stored in sessionStorage instead of localStorage
- sessionStorage is cleared automatically when the browser/tab closes
- Both `appDb` (public schema) and `simDb` (sim schema) now use sessionStorage

### 2. Login Page Updates
**File:** `src/pages/auth/Login.jsx`

**Changed:**
- Removed "Remember Me" checkbox (no longer applicable)
- Added security notice: "🔒 You will be logged out when browser closes"

**Impact:**
- Clearer user expectations about session behavior
- Simplified login form

### 3. Startup Cleanup
**File:** `src/main.jsx`

**Added:**
- Automatic cleanup of old localStorage auth data on app startup
- One-time migration for existing users

**Impact:**
- Existing users will be logged out once (migration)
- Clean transition from localStorage to sessionStorage

## User Experience

### Before
- ✅ Users stayed logged in even after closing browser
- ❌ Required manual logout for security
- ❌ Sessions persisted indefinitely

### After
- ✅ Automatic logout when browser closes
- ✅ Enhanced security (no persistent sessions)
- ✅ Clean session management
- ⚠️ Users must login again after closing browser

## How It Works

### Session Storage vs Local Storage

| Feature | localStorage | sessionStorage |
|---------|--------------|----------------|
| **Persistence** | Permanent (until cleared) | Session-based |
| **Scope** | All tabs/windows | Per tab/window |
| **Cleared When** | Manual clear only | Browser/tab close |
| **Security** | Lower (persists) | Higher (auto-clear) |

### Session Lifecycle

1. **User Logs In**
   - Supabase creates auth session
   - Session stored in `sessionStorage`
   - Key: `project-nidus-auth`

2. **User Navigates App**
   - Session remains active
   - Auto-refreshes as needed
   - Works across routes

3. **User Closes Browser**
   - Browser clears `sessionStorage`
   - Session is destroyed
   - User logged out automatically

4. **User Reopens Browser**
   - No session exists
   - User redirected to login page
   - Must login again

## Testing Instructions

### Test 1: Basic Auto-Logout
1. Login to the application
2. Navigate to any protected route (e.g., /dashboard)
3. Close the browser completely
4. Reopen browser and go to application URL
5. **Expected:** Redirected to login page

### Test 2: Tab Close (Multi-Tab Behavior)
1. Login to the application
2. Open application in another tab
3. Close one tab (not all)
4. **Expected:** Other tab remains logged in (sessionStorage is per-tab)

### Test 3: Browser Restart
1. Login to the application
2. Close all browser windows/tabs
3. Restart browser
4. Navigate to application
5. **Expected:** Must login again

### Test 4: Page Refresh
1. Login to the application
2. Refresh the page (F5 or Ctrl+R)
3. **Expected:** Remains logged in (sessionStorage persists during refresh)

### Test 5: Migration from Old Auth
1. Clear browser storage
2. Manually add localStorage item: `localStorage.setItem('project-nidus-auth', 'test')`
3. Reload application
4. Check browser console
5. **Expected:** See "Migrating auth from localStorage to sessionStorage..."
6. **Expected:** localStorage auth cleared automatically

## Security Benefits

### ✅ Improved Security
- No persistent sessions on shared computers
- Automatic cleanup after browser close
- Reduced risk of unauthorized access

### ✅ Compliance
- Better alignment with security best practices
- Suitable for environments with shared devices
- GDPR-friendly (no long-term session storage)

### ✅ User Protection
- Protects users who forget to logout
- Ideal for public/shared computers
- Forces re-authentication on browser restart

## Known Behaviors

### Multi-Tab Behavior
- Each tab has its **own session**
- Closing one tab doesn't affect others
- Closing all tabs/browser clears all sessions

### Browser Crash
- Session is lost on crash (expected)
- User must login again
- No data loss (server-side data safe)

### Developer Mode
- sessionStorage visible in DevTools
- Can manually clear for testing
- Key: `project-nidus-auth`

## Rollback Instructions

If you need to revert to persistent sessions (not recommended):

**File:** `src/services/supabase/supabaseClient.js`

Change both clients:
```javascript
storage: window.localStorage, // Revert to localStorage
```

**File:** `src/pages/auth/Login.jsx`
- Re-add "Remember Me" checkbox
- Remove security notice

**File:** `src/main.jsx`
- Remove cleanup function (or keep for safety)

## Future Enhancements

### Potential Additions:
1. **Optional "Remember Me" Feature**
   - Allow users to opt-in to persistent sessions
   - Store in localStorage when checked
   - Default to sessionStorage

2. **Session Timeout Warning**
   - Warn users before session expires
   - Option to extend session
   - Countdown timer

3. **Multiple Device Management**
   - View active sessions
   - Revoke sessions remotely
   - Session history

4. **Biometric Re-authentication**
   - Quick login after browser restart
   - WebAuthn support
   - Fingerprint/Face ID

## Technical Notes

### Supabase Integration
- Uses standard Supabase `persistSession: true`
- Only the storage mechanism changed
- All Supabase features still work
- Auth refresh tokens still function

### Performance Impact
- **None** - sessionStorage is as fast as localStorage
- Same API, different scope
- No additional overhead

### Browser Compatibility
- ✅ All modern browsers support sessionStorage
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Mobile browsers (iOS, Android)

## Support

### Common Issues

**Issue:** "I get logged out too quickly"
- **Cause:** Browser/tab closing triggers logout
- **Solution:** Keep browser open or re-login

**Issue:** "I have to login on every tab"
- **Cause:** sessionStorage is per-tab
- **Solution:** This is expected behavior for security

**Issue:** "Migration message appears on every load"
- **Cause:** Possible bug in cleanup script
- **Solution:** Check browser console for errors

## Conclusion

The auto-logout feature significantly improves application security by ensuring sessions don't persist after browser closure. While users need to login more frequently, the security benefits outweigh the minor inconvenience.

**Status:** ✅ Implemented and Active
**Version:** 1.0
**Date:** 2025-11-27
