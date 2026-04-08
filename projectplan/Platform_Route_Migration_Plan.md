# Platform Route Migration Plan
## Change `/app/*` to `/platform/*` Routes

**Date:** December 16, 2025
**Status:** Planning Phase
**Impact:** High - Affects 69 references across 24 files

---

## Objective

Migrate all Platform application routes from `/app/*` to `/platform/*` for better clarity and consistency with folder structure, while maintaining backward compatibility and ensuring zero downtime.

---

## Scope Analysis

### Total Impact
- **Files Affected:** 24 files
- **References Found:** 69 instances
- **Route Prefixes to Change:** `/app/` → `/platform/`

### Affected File Categories

| Category | Files | Priority |
|----------|-------|----------|
| **App.jsx (Route Definitions)** | 1 | CRITICAL |
| **Services (Auth, Routing)** | 5 | CRITICAL |
| **Components (Navigation)** | 4 | HIGH |
| **Pages (Dashboard, Auth)** | 11 | HIGH |
| **Context & Hooks** | 2 | MEDIUM |
| **Config Files** | 1 | MEDIUM |

---

## Detailed File Breakdown

### CRITICAL FILES (Must Change First)

#### 1. Route Definitions
- `src/App.jsx` - Main route definitions
  - All `/app/*` route paths
  - Protected route wrappers

#### 2. Authentication & Routing Services
- `src/services/postLoginRouter.js` - Post-login redirect logic (3 refs)
- `src/services/roleRouter.js` - Role-based routing (16 refs)
- `src/services/registrationEmailService.js` - Email verification links (1 ref)
- `src/services/unifiedAuthService.js` - Auth redirects
- `src/services/organisationRoleService.js` - Role checks (1 ref)

#### 3. Layout & Navigation
- `src/components/Layout.jsx` - Route detection logic (1 ref)
- `src/components/headers/PlatformAppHeader.jsx` - Logo link (1 ref)
- `src/components/Sidebar.jsx` - Menu highlighting (1 ref)
- `src/components/PlatformSelector.jsx` - Platform switching (1 ref)

### HIGH PRIORITY FILES

#### 4. Dashboard Pages
- `src/pages/platform-app/Dashboard.jsx` - Navigation calls (3 refs)
- `src/pages/Dashboard.jsx` - Legacy dashboard (2 refs)
- `src/pages/Settings.jsx` - Settings page (1 ref)

#### 5. Authentication Pages
- `src/pages/auth/Login.jsx` - Login redirect (4 refs)
- `src/pages/auth/Register.jsx` - Registration redirect (1 ref)
- `src/pages/auth/PlatformLogin.jsx` - Platform login (1 ref)
- `src/pages/auth/InvitationAccept.jsx` - Invitation acceptance (2 refs)

#### 6. Onboarding Pages
- `src/pages/onboarding/OrganisationSetup.jsx` - Org setup redirect (1 ref)
- `src/pages/onboarding/OrganisationVerificationNotice.jsx` - Verification (1 ref)
- `src/pages/onboarding/PlatformAccountSetup.jsx` - Account setup (1 ref)

#### 7. Admin Pages
- `src/pages/admin/RoleAssignment.jsx` - Role management (1 ref)
- `src/pages/app/ProjectUsers.jsx` - Project users (2 refs)
- `src/pages/app/ProjectRoles.jsx` - Project roles (2 refs)

### MEDIUM PRIORITY FILES

#### 8. Context & Hooks
- `src/hooks/useMenu.js` - Menu fallback paths (6 refs)
- `src/context/PlatformContext.jsx` - Platform context (1 ref)

#### 9. Configuration
- `src/config/pmMenuConfig.js` - Menu configuration (15 refs)

---

## Migration Strategy

### Phase 1: Core Route Infrastructure (CRITICAL)
**Order of Execution:**

1. ✅ **Update App.jsx**
   - Change all route path definitions
   - Update route path attributes
   - Keep old routes as redirects temporarily

2. ✅ **Update Layout.jsx**
   - Change `isPlatformApp` detection from `/app/` to `/platform/`
   - Ensure header shows correctly

3. ✅ **Update Services**
   - postLoginRouter.js - All redirect paths
   - roleRouter.js - All role-based routes
   - registrationEmailService.js - Email verification links
   - organisationRoleService.js - Any route checks

### Phase 2: Navigation Components (HIGH)
**Order of Execution:**

4. ✅ **Update Headers**
   - PlatformAppHeader.jsx - Logo link

5. ✅ **Update Sidebar**
   - Sidebar.jsx - Active route detection

6. ✅ **Update Platform Selector**
   - PlatformSelector.jsx - Platform switch links

### Phase 3: Page Components (HIGH)
**Order of Execution:**

7. ✅ **Update Dashboard Pages**
   - platform-app/Dashboard.jsx - All navigation calls
   - Dashboard.jsx (legacy)
   - Settings.jsx

8. ✅ **Update Auth Pages**
   - Login.jsx - Default redirect
   - Register.jsx
   - PlatformLogin.jsx
   - InvitationAccept.jsx

9. ✅ **Update Onboarding Pages**
   - OrganisationSetup.jsx
   - OrganisationVerificationNotice.jsx
   - PlatformAccountSetup.jsx

10. ✅ **Update Admin Pages**
    - RoleAssignment.jsx
    - app/ProjectUsers.jsx
    - app/ProjectRoles.jsx

### Phase 4: Configuration & Context (MEDIUM)
**Order of Execution:**

11. ✅ **Update Hooks**
    - useMenu.js - Fallback paths

12. ✅ **Update Context**
    - PlatformContext.jsx

13. ✅ **Update Config**
    - pmMenuConfig.js - All menu paths

### Phase 5: Backward Compatibility (FINAL)
**Order of Execution:**

14. ✅ **Add Redirect Routes**
    - Create `/app/*` → `/platform/*` redirects in App.jsx
    - Ensure old bookmarks still work

15. ✅ **Testing & Verification**
    - Test all critical user flows
    - Verify redirects work
    - Check console for errors

---

## Implementation Checklist

### Pre-Migration
- [ ] Create backup branch
- [ ] Document current working state
- [ ] Identify all test scenarios

### Migration Tasks

#### Critical Infrastructure
- [ ] Update App.jsx route definitions
- [ ] Update Layout.jsx route detection
- [ ] Update postLoginRouter.js redirects
- [ ] Update roleRouter.js role-based routes
- [ ] Update registrationEmailService.js email links

#### Navigation Components
- [ ] Update PlatformAppHeader.jsx links
- [ ] Update Sidebar.jsx active detection
- [ ] Update PlatformSelector.jsx switches

#### Page Components - Dashboard
- [ ] Update platform-app/Dashboard.jsx navigation
- [ ] Update Dashboard.jsx (legacy)
- [ ] Update Settings.jsx links

#### Page Components - Auth
- [ ] Update Login.jsx redirects
- [ ] Update Register.jsx redirects
- [ ] Update PlatformLogin.jsx redirects
- [ ] Update InvitationAccept.jsx links

#### Page Components - Onboarding
- [ ] Update OrganisationSetup.jsx redirect
- [ ] Update OrganisationVerificationNotice.jsx
- [ ] Update PlatformAccountSetup.jsx redirect

#### Page Components - Admin
- [ ] Update RoleAssignment.jsx links
- [ ] Update app/ProjectUsers.jsx navigation
- [ ] Update app/ProjectRoles.jsx navigation

#### Context & Config
- [ ] Update useMenu.js fallback paths
- [ ] Update PlatformContext.jsx
- [ ] Update pmMenuConfig.js menu paths

#### Backward Compatibility
- [ ] Add `/app/*` → `/platform/*` redirects
- [ ] Test old URL redirects
- [ ] Document URL change in user guide

### Post-Migration
- [ ] Test login flow
- [ ] Test registration flow
- [ ] Test organisation setup
- [ ] Test dashboard access
- [ ] Test navigation between pages
- [ ] Test role-based routing
- [ ] Test email verification links
- [ ] Test backward compatibility redirects
- [ ] Update documentation
- [ ] Notify users of URL changes

---

## Risk Assessment

### High Risk Areas
1. **Authentication Flow** - Login/register redirects
2. **Role-Based Routing** - Role detection and routing
3. **Email Links** - Verification/invitation links
4. **Bookmarks** - User saved bookmarks will break

### Mitigation Strategies
1. ✅ **Redirect Old URLs** - Keep `/app/*` routes as redirects
2. ✅ **Incremental Updates** - Change one file category at a time
3. ✅ **Test After Each Phase** - Verify functionality after each phase
4. ✅ **Rollback Plan** - Keep git commit history for easy rollback

---

## Testing Plan

### Critical User Flows to Test

1. **Login Flow**
   - [ ] Login as org_admin
   - [ ] Should redirect to `/platform/dashboard`
   - [ ] Old `/app/dashboard` bookmark should redirect

2. **Registration Flow**
   - [ ] Register new user
   - [ ] Complete organisation setup
   - [ ] Should redirect to `/platform/dashboard`

3. **Navigation**
   - [ ] Click all sidebar menu items
   - [ ] Verify correct `/platform/*` URLs
   - [ ] Verify active states work

4. **Role-Based Access**
   - [ ] Login with different roles
   - [ ] Verify correct dashboard routing
   - [ ] Test role-based menu visibility

5. **Email Verification**
   - [ ] Receive verification email
   - [ ] Click verification link
   - [ ] Should contain `/platform/*` URLs

6. **Backward Compatibility**
   - [ ] Navigate to `/app/dashboard`
   - [ ] Should redirect to `/platform/dashboard`
   - [ ] Test all old `/app/*` routes

---

## Rollback Plan

If critical issues are found:

1. **Immediate Rollback**
   ```bash
   git revert HEAD
   git push origin feature/platform-route-migration
   ```

2. **Partial Rollback**
   - Revert specific file changes
   - Keep working changes
   - Fix issue and retry

3. **Communication**
   - Notify users of temporary rollback
   - Document issues found
   - Plan fix implementation

---

## Success Criteria

✅ All routes use `/platform/*` prefix
✅ No broken links or navigation
✅ All user flows work correctly
✅ Role-based routing works
✅ Email links use new URLs
✅ Old URLs redirect correctly
✅ No console errors
✅ Tests pass

---

## Estimated Time

- **Planning:** 30 minutes ✅ DONE
- **Implementation:** 2-3 hours
- **Testing:** 1 hour
- **Documentation:** 30 minutes
- **Total:** 4-5 hours

---

## Notes

- This is a breaking change for users with bookmarks
- Consider adding a banner notification about URL changes
- Update any external documentation or links
- Monitor error logs after deployment

---

**Status:** Ready to begin implementation
**Next Step:** Execute Phase 1 - Core Route Infrastructure
