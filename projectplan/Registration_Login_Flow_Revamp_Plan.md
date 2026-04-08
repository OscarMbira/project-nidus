# Registration & Login Flow Revamp - Implementation Plan

## Overview
This plan outlines changes to enhance the registration and login flow to ensure:
1. **Single-platform registration** - Users can only register for ONE system at a time (Platform OR Simulator, not both)
2. Platform selection is determined by the homepage header button clicked (Platform button → Platform registration, Simulator button → Simulator registration)
3. Email-based signup with mandatory email confirmation
4. Forced organisation setup on first login
5. **Temporary:** Direct dashboard access after organisation verification (subscription routing disabled for development/testing)
6. **Future:** Automatic dashboard routing based on organisation and subscription status (to be activated later)

**Note:** This single-platform approach prepares for future separation of the two systems, avoiding the need for redevelopment.

**Development Mode:** Subscription-based routing is currently **DISABLED**. After organisation verification, users go directly to the full-featured dashboard for testing. This will be activated when ready for production.

---

## Current Flow Analysis

### Current Registration Flow:
1. User signs up via `Register.jsx`, `PlatformRegister.jsx`, or `SimulatorRegister.jsx`
2. Platform selection happens during signup (can select Platform, Simulator, or both)
3. Email confirmation sent
4. After confirmation, user may be redirected to various onboarding pages
5. Organisation setup is optional/separate

### Current Homepage Navigation:
- Main homepage (`/`) has Platform and Simulator buttons in header
- Platform homepage (`/platform`) has "Sign Up" button → `/register` or `/platform/register`
- Simulator homepage (`/simulator`) has "Get started" button → `/simulator/register`

### Current Login Flow:
1. User logs in via `Login.jsx`
2. Checks for organisation existence
3. If no org → redirects to organisation setup
4. If org exists but not verified → redirects to verification notice
5. If org verified → checks platform access and redirects

### Issues with Current Flow:
- Users can register for both platforms simultaneously (creates complexity for future separation)
- Organisation setup is not clearly forced on first login
- Dashboard routing logic is complex and scattered
- No clear distinction between first-time and returning users
- Email confirmation flow could be clearer

---

## Proposed New Flow

### Phase 1: Single-Platform Signup Process

**Goal:** Implement single-platform registration where users can only register for ONE system at a time, determined by the homepage button they click.

#### Changes Required:

1. **Update Homepage Header Buttons**
   - **Platform button** (`/platform` or from main homepage) → Routes to `/platform/register`
   - **Simulator button** (`/simulator` or from main homepage) → Routes to `/simulator/register`
   - Ensure buttons clearly indicate which system they're registering for

2. **Update Signup Pages** (`PlatformRegister.jsx`, `SimulatorRegister.jsx`)
   - **REMOVE** platform selection checkboxes/options from signup forms
   - Platform is **automatically determined** by the route:
     - `/platform/register` → Automatically registers for Platform only
     - `/simulator/register` → Automatically registers for Simulator only
   - Keep: Email, Password, Confirm Password, Full Name (optional)
   - Ensure email confirmation is always required (Supabase config)
   - After signup, show success message: "Please check your email to confirm your account"
   - Register user for the **specific platform** based on route (via `registerForPlatform` service)
   - Ensure platform access is saved to `user_platform_access` table for the correct platform only

3. **Update Generic Register Page** (`Register.jsx`)
   - **Option A:** Remove this page entirely and redirect to platform selection
   - **Option B:** Keep as a landing page that redirects based on referrer or shows platform selection
   - **Recommended:** Redirect to platform selection page if accessed directly

2. **Update Email Confirmation Page** (`EmailConfirmation.jsx`)
   - After successful email confirmation:
     - Create user record in `users` table (if not exists)
     - Mark user as verified
     - Ensure platform access is properly set up (single platform from signup route)
     - **Redirect to `/login`** (not to dashboard or onboarding)
     - Show success message: "Email confirmed! Please log in to continue"
   - Ensure only ONE platform is registered (the one from the registration route)

3. **Supabase Configuration**
   - Ensure `email_confirmation_enabled = true` in Supabase Auth settings
   - Ensure `email_redirect_to` points to `/auth/confirm-email`

---

### Phase 2: Enhanced Login Flow with Organisation Check

**Goal:** After login, force organisation setup on first time, then route to appropriate dashboard.

#### Changes Required:

1. **Update Login Page** (`Login.jsx`)
   - After successful authentication:
     - Check if user has an organisation
     - **First-time user (no organisation):**
       - Redirect to `/onboarding/organisation-setup` (forced, cannot skip)
     - **Returning user (organisation exists):**
       - If organisation not verified → redirect to `/onboarding/organisation-verification-notice`
       - If organisation verified → **TEMPORARILY:** Redirect directly to `/app/dashboard` (full features, no restrictions)
       - **FUTURE:** Proceed to dashboard routing based on subscription (Phase 3) - to be activated later

2. **Update ProtectedRoute Component** (`ProtectedRoute.jsx`)
   - Add logic to check organisation status before allowing access to protected routes
   - If no organisation and trying to access protected route → redirect to organisation setup
   - If organisation not verified → redirect to verification notice
   - Only allow dashboard access if organisation is verified

3. **Create Post-Login Router Service** (New file: `src/services/postLoginRouter.js`)
   - Centralized logic for determining where to route user after login
   - **Development Mode:** Returns `/app/dashboard` directly (subscription checks disabled)
   - **Future Production Mode:** Checks:
     - Organisation existence
     - Organisation verification status
     - Subscription status (trial vs paid) - **DISABLED FOR NOW**
     - Returns appropriate route path
   - Add feature flag or environment variable to toggle subscription routing

---

### Phase 3: Dashboard Routing Based on Subscription

**Goal:** Route users to appropriate dashboard based on their subscription type (free trial vs paid).

**STATUS: DISABLED FOR DEVELOPMENT** - Will be activated when ready for production.

#### Changes Required (To be implemented later):

1. **Update Dashboard Component** (`src/pages/Dashboard.jsx`)
   - **Currently:** Show full dashboard with all features (no restrictions)
   - **Future:** Check user's subscription status on load
   - **Future:** If user has active trial project → show trial dashboard UI
   - **Future:** If user has paid subscription → show full dashboard UI
   - **Future:** If user has no projects → show "Create Project" prompt

2. **Create Dashboard Router Logic** (in `postLoginRouter.js`)
   - **Currently:** Return `/app/dashboard` directly (bypass subscription checks)
   - **Future:** After organisation verification check:
     - Check for active trial projects → route to `/app/dashboard` (trial view)
     - Check for paid subscriptions → route to `/app/dashboard` (paid view)
     - If no projects/subscriptions → route to `/onboarding/project-type-selection`
   - Add feature flag: `ENABLE_SUBSCRIPTION_ROUTING` (default: false)

3. **Update FreeTrialDashboard** (`src/pages/dashboard/FreeTrialDashboard.jsx`)
   - **Currently:** Not used (full dashboard shown instead)
   - **Future:** Ensure it's accessible at `/app/dashboard` when user has trial
   - **Future:** Show trial expiry information
   - **Future:** Provide upgrade button

---

### Phase 4: Project Creation Flow

**Goal:** Allow users to create subscription-based projects from the dashboard.

#### Changes Required:

1. **Update Project Creation** (`ProjectsCreate.jsx`)
   - Check organisation verification status
   - If verified, show project type selection:
     - Free Trial (if available)
     - Paid Subscription (redirect to subscription selection)
   - If not verified, redirect to verification notice

2. **Update Project Type Selection** (`ProjectTypeSelection.jsx`)
   - Make accessible from dashboard
   - Show clear options: Trial vs Paid
   - Handle routing to appropriate setup pages

---

## Implementation Steps

### Step 1: Implement Single-Platform Signup (Priority: High)
- [x] **REMOVE** platform selection checkboxes/options from signup pages
- [x] Update `PlatformRegister.jsx` to automatically register for Platform only (no selection UI)
- [x] Update `SimulatorRegister.jsx` to automatically register for Simulator only (no selection UI)
- [x] Determine platform from route (`/platform/register` = Platform, `/simulator/register` = Simulator)
- [x] Ensure platform registration happens during signup (via `registerForPlatform` for single platform)
- [x] Ensure email confirmation is mandatory
- [x] Update success messages to be clearer
- [x] Verify only ONE platform access is saved to database
- [x] Update homepage header buttons to route to correct registration pages
- [x] Handle `Register.jsx` - either remove or redirect to platform selection

**Files to Modify:**
- `src/pages/auth/PlatformRegister.jsx` (remove platform selection, auto-register for Platform)
- `src/pages/auth/SimulatorRegister.jsx` (remove platform selection, auto-register for Simulator)
- `src/pages/auth/Register.jsx` (update to redirect or show platform selection)
- `src/components/homepage/MainHeader.jsx` (ensure buttons route correctly)
- `src/components/homepage/PlatformHeader.jsx` (ensure signup button routes to `/platform/register`)
- `src/components/homepage/SimulatorHeader.jsx` (ensure signup button routes to `/simulator/register`)

### Step 2: Update Email Confirmation (Priority: High)
- [x] Ensure single platform access is preserved after email confirmation
- [x] Verify only ONE platform is registered (not both)
- [x] Update redirect to go to `/login` instead of dashboard
- [x] Ensure user record is created properly
- [x] Verify platform registration from signup route is maintained

**Files to Modify:**
- `src/pages/auth/EmailConfirmation.jsx`

### Step 3: Enhance Login Flow (Priority: High)
- [x] Add organisation check after successful login
- [x] Implement forced redirect to organisation setup for first-time users
- [x] Update login success handling

**Files to Modify:**
- `src/pages/auth/Login.jsx`
- Create: `src/services/postLoginRouter.js`

### Step 4: Update Protected Routes (Priority: High)
- [x] Add organisation verification check to ProtectedRoute
- [x] Ensure proper redirects for unverified organisations
- [x] Update route protection logic

**Files to Modify:**
- `src/components/ProtectedRoute.jsx`

### Step 5: Dashboard Routing (Priority: Low - DISABLED FOR NOW)
- [x] Create post-login router service with feature flag
- [x] **TEMPORARILY:** Route directly to `/app/dashboard` (no subscription checks)
- [ ] **FUTURE:** Update dashboard to check subscription status (when enabled)
- [ ] **FUTURE:** Implement routing based on trial vs paid (when enabled)
- [x] Add environment variable or config flag: `ENABLE_SUBSCRIPTION_ROUTING = false`

**Files to Modify:**
- `src/pages/Dashboard.jsx` (currently shows full features, no restrictions)
- `src/services/postLoginRouter.js` (bypass subscription checks for now)
- `src/pages/dashboard/FreeTrialDashboard.jsx` (not used currently)

### Step 6: Project Creation Updates (Priority: Medium)
- [x] Update project creation to check organisation status
- [ ] Add subscription-based project creation flow (FUTURE - when subscription routing enabled)
- [ ] Update project type selection page (FUTURE - when subscription routing enabled)

**Files to Modify:**
- `src/pages/ProjectsCreate.jsx`
- `src/pages/onboarding/ProjectTypeSelection.jsx`

---

## User Flow Diagrams

### New User Flow (Platform) - Development Mode:
```
1. User clicks "Platform" button on homepage header
2. User is taken to /platform homepage
3. User clicks "Sign Up" button
4. User is taken to /platform/register
5. Enters: Email, Password, Confirm Password, Full Name (optional)
6. Clicks "Sign Up" (Platform is automatically selected - no UI selection)
7. Platform access registered in database (Platform only)
8. Receives email confirmation message
9. Clicks email confirmation link
10. Email confirmed → Platform access preserved → Redirected to /login
11. Logs in with email/password
12. System checks: No organisation exists
13. Redirected to /onboarding/organisation-setup (FORCED)
14. Completes organisation setup
15. Receives verification email
16. Verifies organisation
17. Redirected to /app/dashboard (FULL FEATURES, NO RESTRICTIONS - for testing)
```

### New User Flow (Platform) - Future Production Mode:
```
1-16. Same as above
17. Redirected to /onboarding/project-type-selection (when subscription routing enabled)
18. Chooses Trial or Paid
19. Sets up project
20. Redirected to /app/dashboard (appropriate view based on subscription)
```

### New User Flow (Simulator):
```
1. User clicks "Simulator" button on homepage header
2. User is taken to /simulator homepage
3. User clicks "Get started" button
4. User is taken to /simulator/register
5. Enters: Email, Password, Confirm Password, Full Name (optional)
6. Clicks "Sign Up" (Simulator is automatically selected - no UI selection)
7. Simulator access registered in database (Simulator only)
8. Receives email confirmation message
9. Clicks email confirmation link
10. Email confirmed → Simulator access preserved → Redirected to /login
11. Logs in with email/password
12. System checks: No organisation exists
13. Redirected to /onboarding/organisation-setup (FORCED)
14. Completes organisation setup
15. Receives verification email
16. Verifies organisation
17. Redirected to appropriate simulator onboarding flow
18. Sets up simulator project/scenario
19. Redirected to simulator dashboard
```

### Returning User Flow - Development Mode:
```
1. User visits /login
2. Logs in with email/password
3. System checks: Organisation exists and verified
4. Redirected directly to /app/dashboard (FULL FEATURES, NO RESTRICTIONS - for testing)
5. User can create new projects from dashboard (all features available)
```

### Returning User Flow - Future Production Mode:
```
1. User visits /login
2. Logs in with email/password
3. System checks: Organisation exists and verified
4. System checks subscription status (when enabled):
   - Has trial project → /app/dashboard (trial view)
   - Has paid subscription → /app/dashboard (paid view)
   - No projects → /onboarding/project-type-selection
5. User can create new projects from dashboard
```

---

## Technical Details

### Database Checks Required:
1. **Organisation Check:**
   ```sql
   SELECT * FROM accounts 
   WHERE owner_user_id = (SELECT id FROM users WHERE auth_user_id = $auth_user_id)
   ```

2. **Subscription Check:**
   ```sql
   SELECT * FROM platform_subscriptions 
   WHERE project_id IN (
     SELECT id FROM projects WHERE account_id = $account_id
   )
   AND status = 'active'
   ```

3. **Trial Check:**
   ```sql
   SELECT * FROM projects 
   WHERE account_id = $account_id 
   AND is_trial = true 
   AND trial_expires_at > NOW()
   ```

### Service Functions Needed:

1. **`postLoginRouter.js`:**
   - `getPostLoginRoute(userId)` - Returns the route user should be sent to after login
   - `checkOrganisationStatus(userId)` - Checks if user has organisation
   - `checkSubscriptionStatus(accountId)` - Checks subscription type (DISABLED FOR NOW)
   - `getDashboardRoute(accountId)` - Returns appropriate dashboard route
   - **Feature Flag:** `ENABLE_SUBSCRIPTION_ROUTING` (default: false)
   - **Current Behavior:** Always returns `/app/dashboard` (full features)
   - **Future Behavior:** Returns route based on subscription when flag is enabled

2. **Update `organisationService.js`:**
   - Ensure `createOrganisation` properly handles first-time setup
   - Ensure verification flow works correctly

3. **Platform Detection from Route:**
   - In `PlatformRegister.jsx`: Detect route is `/platform/register` → register for Platform only
   - In `SimulatorRegister.jsx`: Detect route is `/simulator/register` → register for Simulator only
   - Use `useLocation()` or `window.location.pathname` to determine platform
   - Pass platform to `registerForPlatform(userId, PLATFORMS.PLATFORM)` or `registerForPlatform(userId, PLATFORMS.SIMULATOR)`

---

## Testing Checklist

### Signup Flow:
- [ ] User clicks Platform button → routes to `/platform/register`
- [ ] User clicks Simulator button → routes to `/simulator/register`
- [ ] User can sign up with email and password (no platform selection UI)
- [ ] Platform is automatically determined by registration route
- [ ] Only ONE platform is registered (Platform OR Simulator, not both)
- [ ] Platform access is registered in database during signup (single platform)
- [ ] Email confirmation is sent
- [ ] User cannot login before email confirmation
- [ ] After email confirmation, user is redirected to login
- [ ] Single platform access is preserved after email confirmation
- [ ] User cannot register for the other platform with the same email (or can they? - needs clarification)

### Login Flow (First Time):
- [ ] User logs in after email confirmation
- [ ] User is forced to organisation setup (cannot skip)
- [ ] Organisation setup form works correctly
- [ ] Verification email is sent after organisation creation

### Login Flow (Returning User):
- [ ] User with verified organisation is routed to dashboard
- [ ] User with unverified organisation is routed to verification notice
- [ ] Dashboard shows FULL FEATURES (no restrictions) - for testing
- [ ] User can create projects from dashboard (all features available)
- [ ] **FUTURE:** Dashboard shows appropriate view (trial vs paid) when subscription routing enabled

### Edge Cases:
- [ ] User tries to access protected route without organisation → redirected
- [ ] User tries to skip organisation setup → prevented
- [ ] User with expired trial → shown upgrade options
- [ ] User with multiple projects → dashboard shows all

---

## Migration Considerations

### Existing Users:
- Users who already have organisations: No changes needed
- Users who signed up but didn't complete organisation setup: Will be forced to complete on next login
- **Users with BOTH platform and simulator access:** 
  - These users will retain access to both platforms
  - New registrations will only allow single-platform access
  - Consider migration strategy if needed (e.g., prompt user to choose primary platform)

### Data Integrity:
- No data loss expected
- Existing organisations remain intact
- Existing subscriptions remain active

---

## Rollout Plan

1. **Phase 1-2 (Signup & Login):** Implement first, test thoroughly
2. **Phase 3 (Dashboard Routing):** Implement after Phase 1-2 is stable
3. **Phase 4 (Project Creation):** Implement last, as it depends on previous phases

---

## Success Criteria

✅ User can only register for ONE platform at a time (Platform OR Simulator, not both)
✅ Platform selection is determined by homepage button click and registration route
✅ No platform selection UI in signup forms (platform is automatic based on route)
✅ Email confirmation is mandatory
✅ Single platform access is preserved after email confirmation
✅ First-time users are forced to create organisation
✅ Returning users with verified organisations go directly to dashboard
✅ **DEVELOPMENT MODE:** Dashboard shows FULL FEATURES with NO RESTRICTIONS (for testing)
✅ **FUTURE:** Dashboard correctly shows trial vs paid views (when subscription routing enabled)
✅ Users can create projects from dashboard (all features available for testing)
✅ System is prepared for future separation of Platform and Simulator systems
✅ Subscription routing can be easily enabled via feature flag when ready

---

## Questions for Approval

1. ✅ **RESOLVED:** Single-platform registration - users can only register for ONE system at a time
2. ✅ **RESOLVED:** Platform selection determined by homepage button click (no UI selection in signup)
3. ✅ **RESOLVED:** Subscription routing DISABLED - users go directly to full-featured dashboard after organisation verification (for testing)
4. What should happen if a user tries to register for the other platform with the same email?
   - **Option A:** Allow it (same user, different platform access)
   - **Option B:** Prevent it (one email = one platform only)
   - **Option C:** Show message: "You already have an account. Please log in to access the other platform."
5. **FUTURE:** What should happen if a user has both trial and paid projects? Show both in dashboard? (When subscription routing is enabled)
6. Should there be a way to skip organisation setup for testing purposes, or is it always mandatory?
7. Should we keep the generic `Register.jsx` page, or remove it entirely?
8. **When ready to activate subscription routing:** Should we use an environment variable, config file, or feature flag system?

---

**Status:** Amended - Single-Platform Registration + Subscription Routing Disabled
**Created:** 2025-01-27
**Last Updated:** 2025-01-27
**Amendment 1:** Maintained platform selection (Platform, Simulator, or both) during signup
**Amendment 2:** Changed to single-platform registration only - users can register for ONE system at a time based on homepage button selection. This prepares for future system separation.
**Amendment 3:** Subscription routing DISABLED for development. After organisation verification, users go directly to full-featured dashboard (no restrictions) for testing. Will be activated when ready for production.

