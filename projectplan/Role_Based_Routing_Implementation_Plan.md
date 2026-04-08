# Role-Based Routing & Access Control - Implementation Plan

## Executive Summary

Your system already has a **complete RBAC foundation** (roles, user_roles, permissions tables), but roles are not being used for routing or access control. This plan provides best-practice recommendations and implementation steps to integrate role-based routing into your registration/login flow.

---

## Current State Analysis

### ✅ What You Have:
1. **Database Schema:**
   - `roles` table with role definitions
   - `user_roles` table for role assignments
   - `permissions` table with granular permissions
   - Role hierarchy support (`role_level`, `parent_role_id`)

2. **Services:**
   - `roleService.js` with functions for role management
   - `getAvailableRoles()`, `getUserRoles()`, `assignUserRoles()`
   - `getUserSystemRoles()`, `getUserProjectRoles()`

3. **UI Components:**
   - `RoleSelection.jsx` page exists but not integrated

### ❌ What's Missing:
1. **Role Selection in Onboarding Flow** - Not integrated after organisation setup
2. **Role-Based Routing** - Users not routed based on roles
3. **Role-Based Dashboard Views** - All users see same dashboard
4. **Role-Based Access Control** - ProtectedRoute role checks disabled
5. **Default Role Assignment** - No automatic role assignment for new users

---

## Best Practice Recommendations

### 1. **Role Assignment Strategy**

**Option A: Self-Selection (Recommended for Most Cases)**
- User selects their role during onboarding
- Best for: Individual users, small teams, flexible organizations
- Pros: User autonomy, faster onboarding
- Cons: May need admin correction later

**Option B: Admin Assignment**
- Admin assigns roles after user registration
- Best for: Enterprise, strict hierarchies, compliance requirements
- Pros: Better control, compliance
- Cons: Slower onboarding, requires admin action

**Option C: Hybrid (Recommended for Enterprise)**
- Default role assigned automatically
- User can request role change
- Admin can override
- Best for: Large organizations with mixed needs

### 2. **Role Hierarchy & Routing**

**Recommended Role Structure:**
```
System Admin (Level 10)
  └─ Account Owner (Level 9)
      └─ Project Manager (Level 8)
          └─ Team Lead (Level 7)
              └─ Team Member (Level 6)
                  └─ Stakeholder (Level 5)
                      └─ Viewer (Level 4)
```

**Routing Logic:**
- **Account Owner** → Account Management Dashboard
- **Project Manager** → Project Management Dashboard
- **Team Lead** → Team Dashboard
- **Team Member** → Task Dashboard
- **Stakeholder** → Read-only Project View
- **Viewer** → Limited Read-only View

### 3. **When to Assign Roles**

**Recommended Flow:**
```
Registration → Email Confirmation → Login → Organisation Setup → 
Organisation Verification → Role Selection → Role-Based Dashboard
```

**Why After Organisation Verification?**
- Organisation context is needed for role assignment
- Some roles may be organisation-specific
- Better user experience (user understands their context)

---

## Implementation Plan

### Phase 1: Integrate Role Selection into Onboarding

**Goal:** Add role selection step after organisation verification

#### Step 1.1: Update Post-Login Router
- After organisation verification, check if user has roles
- If no roles → redirect to role selection
- If has roles → route to role-based dashboard

#### Step 1.2: Update Role Selection Page
- Make it part of onboarding flow
- Add "Skip for now" option (assigns default role)
- Store role selection completion status

#### Step 1.3: Default Role Assignment
- Create default role (e.g., "Team Member" or "Viewer")
- Auto-assign if user skips role selection
- Allow admin to change later

**Files to Modify:**
- `src/services/postLoginRouter.js`
- `src/pages/onboarding/RoleSelection.jsx`
- `src/services/roleService.js` (add default role function)

---

### Phase 2: Implement Role-Based Routing

**Goal:** Route users to appropriate dashboard based on their highest role

#### Step 2.1: Create Role Router Service
- New service: `src/services/roleRouter.js`
- Function: `getDashboardRouteByRole(userId)`
- Logic: Check user's highest role level → return appropriate route

#### Step 2.2: Update Post-Login Router
- After role check, use role router to determine dashboard
- Route mapping:
  - Account Owner → `/app/dashboard/account`
  - Project Manager → `/app/dashboard/projects`
  - Team Lead → `/app/dashboard/team`
  - Team Member → `/app/dashboard/tasks`
  - Stakeholder → `/app/dashboard/view`
  - Viewer → `/app/dashboard/view`

#### Step 2.3: Create Role-Specific Dashboards
- Create dashboard components for each role type
- Or: Single dashboard component with role-based views

**Files to Create/Modify:**
- `src/services/roleRouter.js` (new)
- `src/services/postLoginRouter.js`
- `src/pages/dashboard/AccountDashboard.jsx` (new)
- `src/pages/dashboard/ProjectManagerDashboard.jsx` (new)
- `src/pages/dashboard/TeamDashboard.jsx` (new)
- `src/pages/dashboard/TaskDashboard.jsx` (new)
- `src/pages/dashboard/ViewerDashboard.jsx` (new)

---

### Phase 3: Role-Based Access Control (RBAC)

**Goal:** Enable role checking in ProtectedRoute and add permission checks

#### Step 3.1: Re-enable Role Checks in ProtectedRoute
- Fix RLS issues (if needed)
- Re-enable role checking logic
- Add role-based route protection

#### Step 3.2: Create Permission Check Service
- New service: `src/services/permissionService.js`
- Functions:
  - `hasPermission(userId, permissionCode)`
  - `hasAnyPermission(userId, permissionCodes[])`
  - `hasAllPermissions(userId, permissionCodes[])`

#### Step 3.3: Add Permission Checks to Components
- Check permissions before showing actions
- Hide/disable UI elements based on permissions
- Show appropriate error messages

**Files to Create/Modify:**
- `src/services/permissionService.js` (new)
- `src/components/ProtectedRoute.jsx`
- Various component files (add permission checks)

---

### Phase 4: Role Management UI

**Goal:** Allow admins to manage roles and assignments

#### Step 4.1: Role Management Page
- View all roles
- Create/edit/delete custom roles
- Assign roles to users
- View role permissions

#### Step 4.2: User Role Assignment
- Admin can assign/remove roles
- Bulk role assignment
- Role assignment history

**Files to Create:**
- `src/pages/admin/RoleManagement.jsx`
- `src/pages/admin/UserRoleAssignment.jsx`
- `src/components/admin/RoleEditor.jsx`

---

## Recommended Role Definitions

### System Roles (Global)
1. **System Admin** (Level 10)
   - Full system access
   - Manage all accounts
   - System configuration

2. **Project Sponsor/Executive** (Level 9) ⭐ **DEFAULT ROLE**
   - **Automatically assigned when user creates organisation**
   - Most powerful role in the organisation
   - Can assign/invite other roles:
     - Project/Programme Manager
     - Project Board Members
     - Project Assurance
     - Quality Assurance
   - Organisation-level management
   - Strategic oversight
   - User and role management

3. **Account Owner** (Level 8)
   - Account-level management
   - Billing and subscription
   - User management
   - Organisation settings

### Project Roles (Project-Specific)
4. **Project/Programme Manager** (Level 7)
   - Full project control
   - Create/edit/delete projects
   - Manage project members
   - Budget management

5. **Project Board Member** (Level 6)
   - Executive oversight
   - Strategic governance
   - Project approval authority

6. **Project Assurance** (Level 5)
   - Quality oversight
   - Project review and audit
   - Compliance checking

7. **Quality Assurance** (Level 5)
   - Quality control
   - Testing and validation
   - Process improvement

8. **Team Lead** (Level 4)
   - Manage team tasks
   - Coordinate work packages
   - Team progress tracking

9. **Team Member** (Level 3)
   - Execute assigned tasks
   - Update task progress
   - Submit deliverables

10. **Stakeholder** (Level 2)
    - View project information
    - Access reports
    - Provide feedback

11. **Viewer** (Level 1)
    - Read-only access
    - View basic information

---

## Implementation Steps (Priority Order)

### High Priority (Core Functionality)
1. ✅ **Integrate Role Selection** into onboarding flow
2. ✅ **Create Role Router Service** for dashboard routing
3. ✅ **Update Post-Login Router** to use role-based routing
4. ✅ **Create Default Role Assignment** logic
5. ✅ **Create Role-Specific Dashboards** (or role-based views)

### Medium Priority (Access Control)
6. ✅ **Re-enable Role Checks** in ProtectedRoute
7. ✅ **Create Permission Service** for permission checks
8. ✅ **Add Permission Checks** to key components

### Low Priority (Admin Features)
9. ✅ **Create Role Management UI** for admins
10. ✅ **Create User Role Assignment UI** for admins

---

## Technical Implementation Details

### 1. Role Router Service Structure

```javascript
// src/services/roleRouter.js
export async function getDashboardRouteByRole(authUserId) {
  // Get user's highest role
  const highestRole = await getHighestRole(authUserId)
  
  // Route mapping
  const routeMap = {
    'project_sponsor': '/app/dashboard/sponsor', // Executive dashboard
    'executive': '/app/dashboard/sponsor',
    'account_owner': '/app/dashboard/account',
    'project_manager': '/app/dashboard/projects',
    'programme_manager': '/app/dashboard/projects',
    'project_board_member': '/app/dashboard/board',
    'project_assurance': '/app/dashboard/assurance',
    'quality_assurance': '/app/dashboard/quality',
    'team_lead': '/app/dashboard/team',
    'team_member': '/app/dashboard/tasks',
    'stakeholder': '/app/dashboard/view',
    'viewer': '/app/dashboard/view'
  }
  
  return routeMap[highestRole.role_name] || '/app/dashboard'
}
```

### 2. Default Role Assignment (Project Sponsor/Executive)

```javascript
// In organisationService.js - when organisation is created
export async function assignProjectSponsorRole(authUserId) {
  // Get Project Sponsor/Executive role
  const { data: sponsorRole } = await supabase
    .from('roles')
    .select('id')
    .eq('role_name', 'project_sponsor')
    .eq('is_active', true)
    .single()
  
  if (sponsorRole) {
    return await assignSystemRole(authUserId, 'project_sponsor')
  }
  
  // Fallback: try 'executive' or create if doesn't exist
  // ...
}
```

### 3. Role Selection Integration

```javascript
// In postLoginRouter.js
const orgStatus = await checkOrganisationStatusByAuthId(authUserId)

if (orgStatus.verified) {
  // Check if user has roles
  const { data: roles } = await getUserSystemRoles(authUserId)
  
  if (!roles || roles.length === 0) {
    // No roles - redirect to role selection
    return {
      route: '/onboarding/role-selection',
      reason: 'no_roles_assigned'
    }
  }
  
  // Has roles - route to role-based dashboard
  return await getDashboardRouteByRole(authUserId)
}
```

---

## Database Considerations

### Seed Default Roles
Ensure these roles exist in database:
- `account_owner` (is_default_role: false, is_system_role: true)
- `project_manager` (is_default_role: false)
- `team_lead` (is_default_role: false)
- `team_member` (is_default_role: true) ← Default for new users
- `stakeholder` (is_default_role: false)
- `viewer` (is_default_role: false)

### Migration Script
Create SQL migration to:
1. Ensure default roles exist
2. Set `team_member` as default role
3. Create role-permission mappings

---

## User Experience Flow

### New User Journey:
```
1. Register → Email Confirmation → Login
2. Organisation Setup (forced)
3. Organisation Verification
4. Role Selection (if no roles)
   - User selects role(s)
   - Or clicks "Skip" (gets default role)
5. Role-Based Dashboard
   - Account Owner → Account Dashboard
   - Project Manager → Project Dashboard
   - Team Member → Task Dashboard
   - etc.
```

### Returning User Journey:
```
1. Login
2. Check Organisation (verified)
3. Check Roles (has roles)
4. Route to Role-Based Dashboard
```

---

## Security Considerations

1. **Role Validation:**
   - Always validate roles server-side
   - Never trust client-side role checks alone
   - Use RLS policies for database-level security

2. **Permission Checks:**
   - Check permissions for every sensitive action
   - Fail securely (deny by default)
   - Log permission denials for audit

3. **Role Escalation Prevention:**
   - Users cannot assign themselves higher roles
   - Only admins can change roles
   - Audit all role changes

---

## Testing Checklist

- [ ] User without roles is redirected to role selection
- [ ] User with roles is routed to correct dashboard
- [ ] Default role is assigned when user skips selection
- [ ] Role-based dashboards show correct content
- [ ] Permission checks work correctly
- [ ] Admin can assign/remove roles
- [ ] Role changes update routing immediately
- [ ] RLS policies prevent unauthorized access

---

## Success Criteria

✅ Users are automatically assigned a default role if they skip selection
✅ Users are routed to appropriate dashboard based on their role
✅ Role-based dashboards show relevant content for each role
✅ Permission checks prevent unauthorized actions
✅ Admins can manage roles and assignments
✅ System is secure and auditable

---

## Questions for Decision

1. **Default Role:** Which role should be assigned by default?
   - Recommended: `team_member` (most common, least privilege)

2. **Role Selection:** Should it be mandatory or optional?
   - Recommended: Optional with default assignment

3. **Multiple Roles:** Should users be able to have multiple roles?
   - Recommended: Yes, route to highest role's dashboard

4. **Role Changes:** Should role changes require admin approval?
   - Recommended: Yes, for security

5. **Dashboard Strategy:** Separate dashboards or single dashboard with role-based views?
   - Recommended: Single dashboard with role-based views (easier to maintain)

---

**Status:** Ready for Implementation
**Created:** 2025-01-27
**Priority:** High (Core functionality missing)

