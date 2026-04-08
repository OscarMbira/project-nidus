# Registration Flow Alignment Analysis

**Date:** 2025-12-09
**Purpose:** Analyze alignment between registration plans and unified system architecture

---

## Plans Comparison

### 1. Unified_Login_System_Plan.md (Master Plan - ✅ Complete)

**Registration Flow (Lines 72-96):**
```
1. User visits homepage
2. Clicks "Sign Up"
3. Registration form shows:
   - Full name, email, password
   - Platform selection checkboxes:
     [ ] Platform - Manage real projects
     [ ] Simulator - Practice and learn
4. User submits registration
5. Email verification sent
6. User verifies email
7. System creates:
   - Auth user record
   - User record (public.users)
   - Platform access records
   - Free tier subscriptions
8. User redirected to onboarding:
   - If PM only: PM account setup
   - If Simulator only: Skill assessment
   - If both: Choose which to setup first
```

**Key Point:** ❌ NO role selection during registration - roles assigned later

### 2. Dual_Subscription_Registration_Plan.md

**Focus:**
- Platform selection (Platform/Simulator)
- Subscription creation
- Platform access tracking

**Key Point:** ❌ NO role selection mentioned

### 3. Login_User_Role_Assignment_Plan.md

**Focus:**
- PROJECT-SPECIFIC roles for Platform
- Role assignment through project invitations
- Project memberships with roles

**Key Point:** ✅ Mentions roles, but these are **project roles**, NOT system roles
- Assigned when invited to projects
- Not during initial registration

### 4. Registration_Flow_With_Role_Selection_Plan.md (New Plan)

**Proposed Flow:**
```
1. Full Name
2. Platform Selection
3. Role Selection ← NEW (Dropdown)
4. Email Address
5. Password
6. Confirm Password
```

**Key Point:** ✅ Adds role selection during registration

---

## Role System Architecture

### Two Types of Roles in the System:

#### 1. System Roles (`public.roles` + `user_roles`)
**Purpose:** General user identity - "What type of user am I?"

**Examples:**
- Project Manager
- Team Lead
- Team Member
- Stakeholder
- Viewer

**Assignment:**
- Currently via `RoleSelection.jsx` during onboarding
- Stored in `user_roles` table
- System-wide, not project-specific

**Usage:**
- Determines default capabilities
- Influences onboarding flow
- Used for general categorization

#### 2. Project Roles (`project_roles` + `project_memberships`)
**Purpose:** Project-specific permissions - "What can I do in THIS project?"

**Examples:**
- Project Board
- Programme Manager
- Project Manager (project-level)
- Team Manager
- Project Assurance
- Custom roles

**Assignment:**
- When invited to a project
- Stored in `project_memberships`
- Project-specific with custom permissions

**Usage:**
- Controls access to project features
- Permission-based access control
- Can have different roles in different projects

---

## Current Implementation vs. User Request

### Current Flow (Per Unified Plan):
```
Registration → Email Verify → Onboarding (with RoleSelection.jsx) → Dashboard
```

### User's Screenshot Shows:
```
Registration (with role dropdown) → Email Verify → Dashboard
```

### User's Request:
> "the system is not taking any flow for the user to choose the roles. Check the current signup and registration flow and create the best flow for this application."

---

## Alignment Issues Identified

### Issue 1: Role Selection Timing

**Unified Plan Says:**
- Role selection during onboarding (separate step)
- After email verification
- Via RoleSelection.jsx page

**User Screenshot Shows:**
- Role selection during registration (same form)
- Before email verification
- Via dropdown in registration form

**Recommendation:** ✅ **Move role selection to registration form**
- Simpler user experience
- One less step in onboarding
- Matches user's expectations from screenshot
- Assign role after email verification

### Issue 2: Role Type Clarity

**Question:** Are we selecting **system roles** or **project roles**?

**Answer:** **System Roles**
- Project roles are assigned later through invitations
- System roles define the user's general identity
- This should be clear in the UI

**Recommendation:** ✅ **Clarify this is a system role**
- Label: "What's your role?" → "What best describes you?"
- Help text explains this is general, not project-specific
- Users will receive project-specific roles when invited

### Issue 3: Platform-Specific Roles

**Current Plan:**
- Filter roles by platform (pm_* vs sim_*)

**Issue:**
- Platform users will receive project roles later
- Simulator users don't have formal roles (progress-based)
- System roles should be platform-agnostic

**Recommendation:** ✅ **Show relevant system roles based on platform**

| Platform Selected | Show Roles |
|------------------|------------|
| Platform only | PM-related system roles |
| Simulator only | General/learning roles |
| Both | All relevant system roles |

### Issue 4: Role Assignment Timing

**Current Flow:**
1. Register with role selected
2. Email verification
3. Role NOT assigned yet
4. Onboarding
5. Role assigned

**Issue:** User selected role but it's not in database until later

**Recommendation:** ✅ **Assign role immediately after email verification**
- Store selected role ID during registration (in auth metadata)
- Assign to user_roles table after email verification
- Skip RoleSelection.jsx onboarding step if already assigned

---

## Recommended Changes to Align

### Change 1: Update Registration Form

**File:** `src/pages/auth/Register.jsx`

**Add:**
1. Role dropdown between platform selection and email
2. Load roles filtered by selected platform
3. Validate role selection before submission
4. Store selected role ID in registration metadata

**Code Location:** After line 399 (after platform selection)

### Change 2: Update Registration Handler

**File:** `src/pages/auth/Register.jsx`

**Modify:**
1. Include selected_role in Supabase signup metadata
2. After email verification, assign role to user_roles table
3. Skip RoleSelection step in onboarding if role already assigned

**Code Location:** Lines 141-180 (registration handler)

### Change 3: Update Onboarding Flow

**Files:**
- `src/pages/onboarding/PMAccountSetup.jsx`
- `src/pages/onboarding/SimulatorWelcome.jsx`

**Check:**
1. If user already has role assigned, skip RoleSelection step
2. If no role, show RoleSelection.jsx as fallback
3. Ensure onboarding doesn't duplicate role assignment

### Change 4: Update Role Service

**File:** `src/services/roleService.js`

**Verify:**
1. `assignUserRole()` function exists ✅ (Already added)
2. Function handles auth_user_id correctly ✅
3. Function creates user_roles record ✅

### Change 5: Update Documentation

**File:** `projectplan/Unified_Login_System_Plan.md`

**Document:**
1. Note modification to registration flow
2. Add role selection to registration step
3. Update onboarding flow to skip role selection if present
4. Clarify system roles vs project roles

---

## Modified Registration Flow (Aligned)

### New Flow:
```
1. User visits /register
2. Enters Full Name: "John Doe"
3. Selects Platform: ☑ Platform  ☐ Simulator
4. System loads relevant roles in dropdown
5. User selects Role: "Project Manager" (from dropdown)
6. Enters Email: "john@example.com"
7. Enters Password: "********"
8. Confirms Password: "********"
9. Clicks "Create account"
10. System:
    - Creates auth user with metadata: { selected_role: roleId }
    - Creates user record in public.users
    - Creates platform access record
    - Creates free subscription
    - Sends email verification
11. User verifies email
12. System (after verification):
    - Retrieves selected_role from metadata
    - Assigns role to user_roles table
13. User redirected to onboarding:
    - If Platform: PMAccountSetup (account creation)
    - If Simulator: SimulatorWelcome (skill assessment)
    - SKIP RoleSelection step (already done)
14. User lands on dashboard with role assigned
```

---

## Implementation Steps

### Step 1: Add Role Dropdown to Register.jsx ✅

**Changes:**
- Import `getAvailableRoles` and `assignUserRole` from roleService
- Add state: `selectedRole`, `availableRoles`, `loadingRoles`
- Add `useEffect` to load roles when platform changes
- Add role dropdown UI after platform selection
- Add validation for role selection
- Store selected role in signup metadata

### Step 2: Assign Role After Email Verification

**Options:**

**Option A: In registration handler (immediate)**
```javascript
// After creating user record
await assignUserRole(data.user.id, selectedRole)
```

**Option B: After email verification (recommended)**
```javascript
// Store in metadata during signup
options: {
  data: {
    full_name: fullName,
    selected_platforms: selectedPlatforms,
    selected_role: selectedRole, // ← Store for later
  },
}

// Then create a Supabase function/trigger that assigns role after verification
```

**Recommendation:** Option A (immediate assignment)
- Simpler implementation
- Role available immediately
- Works even if user doesn't verify email right away
- Can still use the app with role assigned

### Step 3: Update Onboarding Pages

**Add check:**
```javascript
// In PMAccountSetup.jsx and SimulatorWelcome.jsx
const { data: userRoles } = await getUserRoles(user.id)

if (userRoles && userRoles.length > 0) {
  // User already has role assigned, skip RoleSelection step
  // Continue with account/skill assessment
} else {
  // Redirect to RoleSelection.jsx as fallback
}
```

### Step 4: Update RoleSelection.jsx

**Add note:**
```jsx
// At top of component
{!isFromRegistration && (
  <p className="text-sm text-gray-600 dark:text-gray-400">
    Note: If you selected a role during registration, you can skip this step.
  </p>
)}
```

---

## Testing Checklist

After implementation:

### Test 1: Registration with Platform Only
- [ ] Register with Platform selected
- [ ] Roles dropdown shows PM roles
- [ ] Select "Project Manager"
- [ ] Complete registration
- [ ] Verify email
- [ ] Check role assigned in database
- [ ] Login and verify role persists

### Test 2: Registration with Simulator Only
- [ ] Register with Simulator selected
- [ ] Roles dropdown shows Simulator/general roles
- [ ] Select appropriate role
- [ ] Complete registration
- [ ] Verify role assignment

### Test 3: Registration with Both Platforms
- [ ] Select both platforms
- [ ] Roles dropdown shows all relevant roles
- [ ] Select role
- [ ] Complete registration
- [ ] Verify role assignment

### Test 4: Validation
- [ ] Try to submit without selecting role
- [ ] Verify error message appears
- [ ] Select role and submit successfully

### Test 5: Onboarding
- [ ] After registration, go to onboarding
- [ ] Verify RoleSelection step is skipped
- [ ] Verify role is already assigned

---

## Alignment Status

### Before Changes:
- ❌ Role selection not in registration form
- ❌ Separate onboarding step required
- ❌ Not aligned with user's screenshot
- ❌ More steps for user

### After Changes:
- ✅ Role selection in registration form
- ✅ One less onboarding step
- ✅ Aligned with user's screenshot
- ✅ Streamlined user experience
- ✅ Still maintains separation of system vs project roles
- ✅ Compatible with unified login system

---

## Conclusion

**Recommendation:** ✅ **Proceed with Registration Flow modification**

The proposed change to add role selection dropdown in the registration form:
1. **Aligns** with user's expectations (from screenshot)
2. **Simplifies** the user experience (fewer steps)
3. **Maintains** the distinction between system and project roles
4. **Integrates** smoothly with the unified login system
5. **Requires** minimal changes to existing code

**Next Steps:**
1. Implement role dropdown in Register.jsx
2. Assign role after user creation
3. Update onboarding to skip RoleSelection if already assigned
4. Test all scenarios
5. Update Unified plan documentation

---

**Status:** Ready to implement
**Estimated Time:** 2-3 hours
**Risk:** Low
**Impact:** Improved user experience
