# Registration Flow with Role Selection - Implementation Plan

**Version:** 1.0
**Date:** 2025-12-09
**Status:** Planning
**Author:** Development Team

---

## Executive Summary

This plan addresses the missing role selection step in the current registration flow. While the system currently allows users to select platforms (Platform/Simulator) during registration, it doesn't capture the user's project role (Project Manager, Team Lead, Team Member, etc.), which is critical for proper permission setup and user experience.

## Current State Analysis

### What Works ✅
1. **Platform Selection**: Users can choose Platform, Simulator, or both during registration
2. **Email Verification**: Proper email confirmation flow
3. **User Record Creation**: Creates user records in the database
4. **Subscription Creation**: Auto-creates free subscriptions for selected platforms
5. **Separate Role Selection Page**: `RoleSelection.jsx` exists but is not part of registration

### What's Missing ❌
1. **Role Selection During Registration**: Users don't select their role during sign-up
2. **Integration with Registration Flow**: RoleSelection.jsx is a separate page, not integrated
3. **Role-Based Onboarding**: No immediate role-based experience after registration
4. **Default Role Assignment**: New users have no role until they manually select one

### User's Expectation (Based on Image)

According to the provided UI mockup, the registration flow should be:

1. **Full Name** ✅ (Currently implemented)
2. **Platform Selection** ✅ (Currently implemented)
   - Platform: Real project management for your team
   - Simulator: Practice PM skills in a risk-free environment
3. **Role Selection** ❌ (MISSING - needs to be added)
   - Project Manager
   - Team Lead
   - Team Member
   - Stakeholder
   - Viewer
4. **Email Address** ✅ (Currently implemented)
5. **Password** ✅ (Currently implemented)
6. **Confirm Password** ✅ (Currently implemented)

---

## Solution Architecture

### Option 1: Single-Page Registration with Dropdown (Recommended)

**Approach:** Add role selection dropdown to the existing Register.jsx component

**Advantages:**
- ✅ Simple, streamlined user experience
- ✅ All information collected in one place
- ✅ No page redirects or multi-step complexity
- ✅ Clean, compact dropdown UI
- ✅ Faster registration completion
- ✅ Familiar select element pattern

**Implementation:**
- Add role dropdown between platform selection and email fields
- Simple select element with role options
- Auto-assign selected role after user verification

### Option 2: Multi-Step Registration Wizard

**Approach:** Create a stepped registration flow with progress indicator

**Advantages:**
- ✅ Less overwhelming for users
- ✅ Better mobile experience
- ✅ Can collect more detailed information per step
- ✅ Professional appearance

**Disadvantages:**
- ❌ More complex implementation
- ❌ Requires navigation state management
- ❌ Higher abandonment risk (users quit mid-flow)
- ❌ Doesn't match the provided mockup

### Option 3: Post-Registration Role Selection (Current State)

**Approach:** Keep current flow, improve redirect to RoleSelection page

**Disadvantages:**
- ❌ Users can skip role selection
- ❌ Incomplete user profiles
- ❌ Poor first-time experience
- ❌ Doesn't match requirements

---

## Recommended Solution: Option 1 (Single-Page Registration with Dropdown)

We'll enhance the existing `Register.jsx` component to include a role selection dropdown.

### Key Features

1. **Dropdown Role Selection**: Simple select element between platform selection and email fields
2. **Smart Role Filtering**: Only show roles relevant to selected platform
3. **Clean UI**: Standard dropdown with role names and descriptions
4. **Single Selection**: Users select their primary role
5. **Auto-Assignment**: Assign role immediately after email verification
6. **Validation**: Ensure a role is selected before submission

---

## Detailed Implementation Plan

### Phase 1: Update Database Integration

#### Tasks:
- [ ] Verify `roles` table structure in database
- [ ] Verify `user_roles` table for role assignments
- [ ] Create database function for auto-role assignment on registration
- [ ] Test role assignment with new users

### Phase 2: Update Registration Component

#### File: `src/pages/auth/Register.jsx`

**Changes Required:**

1. **Add Role State Management** (Lines ~23)
```jsx
const [selectedRole, setSelectedRole] = useState('')
const [availableRoles, setAvailableRoles] = useState([])
```

2. **Load Available Roles** (Lines ~27)
```jsx
useEffect(() => {
  loadAvailableRoles()
}, [selectedPlatforms])

const loadAvailableRoles = async () => {
  // Fetch roles based on selected platform
  // Platform roles: pm_* roles
  // Simulator roles: sim_* roles
  const result = await getAvailableRoles()
  setAvailableRoles(result.data)
}
```

3. **Add Role Selection Dropdown UI** (After Platform Selection, before Email)
```jsx
{/* Role Selection Dropdown */}
<div>
  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    What's your role?
  </label>
  <div className="mt-1 relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Briefcase className="h-5 w-5 text-gray-400" />
    </div>
    <select
      id="role"
      name="role"
      value={selectedRole}
      onChange={(e) => setSelectedRole(e.target.value)}
      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
      required
    >
      <option value="">Select your role...</option>
      {availableRoles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.role_display_name}
        </option>
      ))}
    </select>
  </div>
  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
    Select the role that best describes your responsibilities.
  </p>
</div>
```

4. **Update Validation** (Line ~64)
```jsx
// Check if role is selected
if (!selectedRole) {
  setError('Please select your role')
  return
}
```

5. **Update Registration Handler** (Lines ~141-180)
```jsx
// After creating user record, assign role
try {
  await assignUserRole(data.user.id, selectedRole)
  console.log('Role assigned successfully')
} catch (roleError) {
  console.error('Error assigning role:', roleError)
  // Don't fail registration if role assignment fails
}
```

### Phase 3: Role Dropdown Integration

#### No separate component needed

**Implementation:**
- Use standard HTML `<select>` element
- Style consistently with other form inputs
- Include icon for visual consistency
- Dark mode support via Tailwind classes

### Phase 4: Update Role Service

#### File: `src/services/roleService.js`

**Add Function:**
```javascript
/**
 * Assign role to user during registration
 * @param {string} userId - Auth user ID
 * @param {string} roleId - Role UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function assignUserRole(authUserId, roleId) {
  try {
    // Get internal user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (userError) throw userError

    // Assign role
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userData.id,
        role_id: roleId,
        is_active: true,
        is_deleted: false,
      })

    if (error) throw error

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error assigning user role:', error)
    return {
      success: false,
      error: error.message || 'Failed to assign role',
    }
  }
}
```

### Phase 5: Update Platform-Specific Registration Pages

#### Files to Update:
- `src/pages/auth/PlatformRegister.jsx`
- `src/pages/auth/SimulatorRegister.jsx`

**Changes:**
- Add role selection (pre-filtered for platform)
- Platform register: Only show PM roles (pm_*)
- Simulator register: Only show Simulator roles (sim_*)

### Phase 6: Role Filtering Logic

#### Smart Role Display Based on Platform Selection

**Logic:**
```javascript
const getRelevantRoles = (selectedPlatforms, allRoles) => {
  const relevantRoles = []

  if (selectedPlatforms.platform) {
    // Add PM roles
    relevantRoles.push(...allRoles.filter(r => r.role_name.startsWith('pm_')))
  }

  if (selectedPlatforms.simulator) {
    // Add Simulator roles (if different from PM roles)
    relevantRoles.push(...allRoles.filter(r => r.role_name.startsWith('sim_')))
  }

  // If both platforms selected, show all roles
  if (selectedPlatforms.platform && selectedPlatforms.simulator) {
    // Show all relevant roles from both platforms
    const pmRoles = allRoles.filter(r => r.role_name.startsWith('pm_'))
    const simRoles = allRoles.filter(r => r.role_name.startsWith('sim_'))
    return [...pmRoles, ...simRoles]
  }

  // Remove duplicates
  return Array.from(new Map(relevantRoles.map(r => [r.id, r])).values())
}
```

### Phase 7: Testing

#### Test Scenarios:

1. **New User - Platform Only**
   - [ ] Register with Platform selected
   - [ ] Select Project Manager role
   - [ ] Verify email
   - [ ] Login
   - [ ] Confirm role assigned correctly
   - [ ] Confirm access to Platform features

2. **New User - Simulator Only**
   - [ ] Register with Simulator selected
   - [ ] Select Team Member role
   - [ ] Verify email
   - [ ] Login
   - [ ] Confirm role assigned correctly
   - [ ] Confirm access to Simulator features

3. **New User - Both Platforms**
   - [ ] Register with both platforms
   - [ ] Select multiple roles
   - [ ] Verify email
   - [ ] Login
   - [ ] Confirm all roles assigned
   - [ ] Confirm access to both platforms

4. **Validation Tests**
   - [ ] Try to submit without selecting role
   - [ ] Verify error message displays
   - [ ] Select role and submit successfully

5. **Edge Cases**
   - [ ] Change platform selection after selecting role
   - [ ] Verify role list updates
   - [ ] Deselect platform with selected role
   - [ ] Handle gracefully

---

## User Flow (Complete)

### Successful Registration Flow

```
1. User visits /register
2. Enters Full Name: "John Doe"
3. Selects Platform: ☑ Platform  ☐ Simulator
4. System loads Platform roles
5. User sees roles:
   - ⬜ Project Manager
   - ⬜ Team Lead
   - ⬜ Team Member
   - ⬜ Stakeholder
   - ⬜ Viewer
6. User selects: ☑ Project Manager
7. Enters Email: "john@example.com"
8. Enters Password: "********"
9. Confirms Password: "********"
10. Clicks "Create account"
11. System:
    - Creates auth user
    - Creates user record
    - Creates platform access
    - Creates free subscription
    - Assigns "Project Manager" role ← NEW
12. Email verification sent
13. User verifies email
14. Redirects to /dashboard
15. User has full Project Manager permissions ← NEW
```

---

## Role Descriptions for UI

### Platform Roles

#### Project Manager
- **Icon:** Briefcase
- **Description:** Manage projects, teams, and tasks. Full access to project planning and reporting.
- **Features:** Create projects, Assign tasks, Generate reports, Manage budgets

#### Team Lead
- **Icon:** Users
- **Description:** Lead teams and coordinate work packages. Track team progress and activities.
- **Features:** Manage team tasks, Coordinate work, Track progress, Assign work

#### Team Member
- **Icon:** User
- **Description:** Execute assigned tasks and update progress. Participate in project activities.
- **Features:** View tasks, Update progress, Submit deliverables, Report issues

#### Stakeholder
- **Icon:** Eye
- **Description:** View project information and provide feedback. Read-only project access.
- **Features:** View projects, Access reports, Provide feedback, Track status

#### Viewer
- **Icon:** Eye
- **Description:** Minimal read-only access. View basic project information.
- **Features:** View projects, View tasks, View reports, Read-only

### Simulator Roles (if different)
- Similar structure tailored for Simulator features

---

## Visual Layout (Matching Mockup)

```
┌─────────────────────────────────────────────────────────┐
│             [User Icon]                                 │
│         Create your account                             │
│     Or sign in to your existing account                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Full Name                                              │
│  [👤 John Doe                                    ]      │
│                                                         │
│  Which platforms would you like to use?                 │
│  ┌─────────────────────────────────────────┐           │
│  │ [📦] Platform                            │✓          │
│  │ Real project management for your team    │           │
│  └─────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────┐           │
│  │ [🎮] Simulator                           │           │
│  │ Practice PM skills in risk-free env     │           │
│  └─────────────────────────────────────────┘           │
│  You can select both platforms.                         │
│                                                         │
│  What's your role? ← NEW SECTION                        │
│  ┌─────────────────────────────────────────┐           │
│  │ [💼] [Project Manager            ▼]     │           │
│  └─────────────────────────────────────────┘           │
│  Select the role that best describes you.               │
│                                                         │
│  Email address                                          │
│  [📧 you@example.com                        ]          │
│                                                         │
│  Password                                               │
│  [🔒 At least 6 characters                  ]          │
│                                                         │
│  Confirm Password                                       │
│  [🔒 Confirm your password                  ]          │
│                                                         │
│          [Create account]                               │
│                                                         │
│     Already have an account? Sign in                    │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema Updates (If Needed)

### Check Existing Tables

**Required Tables:**
- ✅ `roles` - System and custom roles
- ✅ `user_roles` - User to role assignments
- ✅ `permissions` - Permission definitions
- ✅ `role_permissions` - Role to permission mappings

**Verify Column Structure:**
```sql
-- Ensure user_roles has these columns
user_roles:
  - id (UUID)
  - user_id (UUID FK → users.id)
  - role_id (UUID FK → roles.id)
  - is_active (BOOLEAN)
  - is_deleted (BOOLEAN)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
```

### Add Registration Trigger (Optional)

**Auto-create default role if none selected:**
```sql
CREATE OR REPLACE FUNCTION assign_default_role_if_none()
RETURNS TRIGGER AS $$
BEGIN
  -- If user has no roles after 5 minutes, assign default
  -- This handles edge cases where role assignment might fail
  PERFORM pg_sleep(300); -- Wait 5 minutes

  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = NEW.id
    AND is_active = true
  ) THEN
    -- Assign default "Team Member" role
    INSERT INTO user_roles (user_id, role_id, is_active)
    SELECT NEW.id, id, true
    FROM roles
    WHERE role_name = 'team_member'
    AND is_default_role = true
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Security Considerations

1. **Role Validation**
   - Verify selected roles exist and are active
   - Prevent assignment of system-only roles
   - Validate role IDs to prevent injection

2. **Permission Checks**
   - Ensure assigned roles have valid permissions
   - Check RLS policies allow role assignment
   - Audit role assignments for security

3. **Rate Limiting**
   - Prevent automated role assignment abuse
   - Limit role changes post-registration

---

## Migration Strategy for Existing Users

### For Users Without Roles

**Scenario:** Users who registered before role selection was added

**Solution:**
```javascript
// One-time migration script
async function migrateUsersWithoutRoles() {
  // Find users without roles
  const { data: usersWithoutRoles } = await supabase
    .from('users')
    .select('id')
    .not('id', 'in',
      supabase.from('user_roles').select('user_id')
    )

  // Assign default "Team Member" role
  const defaultRole = await getDefaultRole()

  for (const user of usersWithoutRoles) {
    await assignUserRole(user.id, defaultRole.id)
  }
}
```

**Manual Alternative:**
- Show modal on first login: "Please select your role"
- Redirect to RoleSelection page
- Block access until role selected

---

## Implementation Checklist

### Phase 1: Preparation
- [ ] Read and understand current registration flow
- [ ] Review role system architecture
- [ ] Check database schema and tables
- [ ] Review existing RoleSelection.jsx component
- [ ] Identify reusable components

### Phase 2: Backend
- [ ] Update roleService.js with assignUserRole function
- [ ] Create database trigger for default role (if needed)
- [ ] Test role assignment in isolation
- [ ] Verify RLS policies allow role assignment

### Phase 3: UI Components
- [ ] Add role dropdown to Register.jsx
- [ ] Style dropdown consistently with other inputs
- [ ] Add icon to dropdown
- [ ] Ensure dark mode support
- [ ] Make responsive

### Phase 4: Registration Integration
- [ ] Update Register.jsx with role selection
- [ ] Add role state management
- [ ] Add role loading logic
- [ ] Add role filtering based on platform
- [ ] Update validation logic
- [ ] Update registration handler

### Phase 5: Platform-Specific Pages
- [ ] Update PlatformRegister.jsx
- [ ] Update SimulatorRegister.jsx
- [ ] Filter roles appropriately

### Phase 6: Testing
- [ ] Test with Platform only
- [ ] Test with Simulator only
- [ ] Test with both platforms
- [ ] Test validation (no role selected)
- [ ] Test multi-role selection
- [ ] Test role assignment in database
- [ ] Test email verification flow
- [ ] Test login with assigned role
- [ ] Test permissions work correctly

### Phase 7: Documentation
- [ ] Update user documentation
- [ ] Create role description guide
- [ ] Update registration guide
- [ ] Add screenshots

### Phase 8: Deployment
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Gather user feedback

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Preparation | 1 hour |
| Phase 2: Backend | 2 hours |
| Phase 3: UI Components | 1 hour |
| Phase 4: Registration Integration | 3 hours |
| Phase 5: Platform-Specific Pages | 1 hour |
| Phase 6: Testing | 2 hours |
| Phase 7: Documentation | 1 hour |
| Phase 8: Deployment | 1 hour |
| **Total** | **12 hours (~1.5 days)** |

---

## Success Criteria

### Functional Requirements
- ✓ Role selection appears in registration form
- ✓ Role selection is positioned between platform and email fields
- ✓ Users can select one or more roles
- ✓ Role list filters based on selected platform
- ✓ Validation prevents submission without role
- ✓ Roles are assigned after user verification
- ✓ Role assignment persists in database
- ✓ Users have correct permissions after login
- ✓ Works on Platform, Simulator, and unified registration

### Non-Functional Requirements
- ✓ UI matches provided mockup design
- ✓ Dark mode support
- ✓ Mobile responsive
- ✓ Loads in < 2 seconds
- ✓ No errors in console
- ✓ Accessible (WCAG 2.1 AA)

---

## Rollback Plan

**If Issues Occur:**

1. **Database Issues**
   - Keep registration working without role assignment
   - Allow users to select roles after login
   - Use existing RoleSelection.jsx page

2. **UI Issues**
   - Revert Register.jsx to previous version
   - Deploy fixed version
   - Test thoroughly

3. **Permission Issues**
   - Assign default role temporarily
   - Fix permission logic
   - Redeploy

---

## Review Section

*(To be completed after implementation)*

### Changes Made
- List all changes
- Screenshots of new UI
- Database changes

### Challenges Encountered
- Technical issues faced
- Solutions implemented

### Lessons Learned
- What worked well
- What to improve

---

## Appendix

### A. Role Icons Mapping

```javascript
import {
  Briefcase,  // Project Manager
  Users,      // Team Lead
  User,       // Team Member
  Eye,        // Stakeholder, Viewer
  Shield,     // Admin
  Gamepad2    // Simulator roles
} from 'lucide-react'

export const roleIcons = {
  pm_project_manager: Briefcase,
  pm_team_lead: Users,
  pm_team_member: User,
  pm_stakeholder: Eye,
  pm_viewer: Eye,
  sim_learner: Gamepad2,
  sim_practitioner: Gamepad2,
}
```

### B. Role Descriptions JSON

```json
{
  "pm_project_manager": {
    "title": "Project Manager",
    "description": "Manage projects, teams, and tasks. Full access to project planning, execution, and reporting.",
    "features": [
      "Create and manage projects",
      "Assign tasks to team members",
      "Generate reports",
      "Manage project budgets"
    ]
  },
  "pm_team_lead": {
    "title": "Team Lead",
    "description": "Lead teams and manage work packages. Coordinate team activities and track progress.",
    "features": [
      "Manage team tasks",
      "Coordinate work packages",
      "Track team progress",
      "Assign work to team members"
    ]
  }
}
```

### C. Example API Call

```javascript
// During registration
const handleRegister = async (e) => {
  e.preventDefault()

  // ... validation ...

  // Create auth user
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        selected_platforms: selectedPlatforms,
        selected_roles: selectedRoles, // NEW
      },
    },
  })

  // ... create user record ...

  // Assign roles
  for (const roleId of selectedRoles) {
    await assignUserRole(data.user.id, roleId)
  }
}
```

---

**Plan Status:** ✅ Ready for Review
**Next Step:** Get user approval and proceed with implementation
**Estimated Completion:** 2 days from approval
