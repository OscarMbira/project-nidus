# Role Management & User Routing - Best Practices Guide

## Executive Summary

Based on comprehensive codebase analysis, your role system has a **solid foundation but critical implementation gaps**. This guide provides best practice recommendations and actionable solutions.

---

## Current State Assessment

### ✅ **Strengths**
- Well-designed two-tier role model (platform + project levels)
- Complete database schema with roles, permissions, and assignments
- Role services for CRUD operations
- Project role templates with custom role support
- Organisation-first registration flow

### ❌ **Critical Gaps**
1. **Role checking is DISABLED** in ProtectedRoute due to RLS policy errors
2. **Role selection is OPTIONAL** during onboarding (users can skip)
3. **No role-based routing** - all users go to same dashboard
4. **Permissions not enforced** in UI despite being defined
5. **No role definition UI** - admins can't create/manage roles
6. **Role metadata hardcoded** in components instead of database

---

## Best Practice Recommendations

### 1. **Role Definition Strategy**

**Problem:** You have no UI for administrators to define roles or configure role behavior.

**Best Practice Solution:**

Create a **Role Management Admin Panel** with these capabilities:

```
┌─────────────────────────────────────────────────────────┐
│ ROLE DEFINITION MANAGEMENT                              │
├─────────────────────────────────────────────────────────┤
│ 1. Visual Role Editor                                   │
│    - Create/edit/delete roles                           │
│    - Set role name, description, level                  │
│    - Configure default landing page                     │
│    - Assign permissions (visual matrix)                 │
│                                                          │
│ 2. Role Routing Configuration                           │
│    - Define where each role lands after login           │
│    - Set allowed route patterns                         │
│    - Configure feature flags per role                   │
│                                                          │
│ 3. Role Hierarchy Visualization                         │
│    - Show role levels and relationships                 │
│    - Prevent circular dependencies                      │
│    - Enforce privilege escalation rules                 │
└─────────────────────────────────────────────────────────┘
```

**Database Enhancement Needed:**

Add these columns to `roles` table:
```sql
ALTER TABLE roles
  ADD COLUMN default_landing_page VARCHAR(255) DEFAULT '/app/dashboard',
  ADD COLUMN allowed_routes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN feature_flags JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN is_custom_role BOOLEAN DEFAULT false;
```

**Why This Matters:**
- Eliminates hardcoded role behaviors in frontend code
- Allows business users (not just developers) to define roles
- Enables rapid role configuration changes without deployment
- Supports multi-tenancy (different orgs, different role configs)

---

### 2. **Role-Based Routing Strategy**

**Problem:** All users land on `/app/dashboard` regardless of role. No personalization.

**Best Practice Solution: Four-Layer Routing Decision Tree**

```
┌────────────────────────────────────────────────────────┐
│ Layer 1: Authentication Check                          │
│ ↓ Not logged in → /login                              │
│ ↓ Logged in ↓                                          │
├────────────────────────────────────────────────────────┤
│ Layer 2: Organisation & Verification Check             │
│ ↓ No org → /onboarding/organisation-setup             │
│ ↓ Unverified → /onboarding/verification-notice        │
│ ↓ Verified ↓                                           │
├────────────────────────────────────────────────────────┤
│ Layer 3: Role Assignment Check [CURRENTLY MISSING]     │
│ ↓ No roles → /onboarding/role-selection (REQUIRED)    │
│ ↓ Has roles ↓                                          │
├────────────────────────────────────────────────────────┤
│ Layer 4: Role-Based Destination [CURRENTLY MISSING]    │
│ ↓ Lookup primary role's default_landing_page          │
│ ↓ Route based on role hierarchy                       │
│                                                         │
│ - account_owner → /app/admin/dashboard                │
│ - project_manager → /app/projects                     │
│ - team_lead → /app/teams                              │
│ - team_member → /app/tasks/my-tasks                   │
│ - stakeholder → /app/reports                          │
│ - viewer → /app/dashboard/readonly                    │
└────────────────────────────────────────────────────────┘
```

**Implementation Example:**

```javascript
// src/services/postLoginRouter.js
export async function determinePostLoginRoute(authUserId) {
  // Layer 1: Authentication (already handled by auth system)

  // Layer 2: Organisation check
  const orgStatus = await checkOrganisationStatusByAuthId(authUserId);
  if (!orgStatus.exists) {
    return { route: '/onboarding/organisation-setup', reason: 'no_org' };
  }
  if (!orgStatus.verified) {
    return { route: '/onboarding/organisation-verification-notice', reason: 'unverified' };
  }

  // Layer 3: Role check [ADD THIS]
  const userRoles = await getUserSystemRoles(authUserId);
  if (!userRoles || userRoles.length === 0) {
    return { route: '/onboarding/role-selection', reason: 'no_roles' };
  }

  // Layer 4: Role-based routing [ADD THIS]
  const primaryRole = getPrimaryRole(userRoles); // Highest role_level
  const landingPage = primaryRole.default_landing_page || '/app/dashboard';

  return { route: landingPage, reason: 'role_based_routing', role: primaryRole.role_name };
}

function getPrimaryRole(roles) {
  // Sort by role_level descending, return highest
  return roles.sort((a, b) => b.role_level - a.role_level)[0];
}
```

**Why This Matters:**
- Personalized user experience from first login
- Reduces cognitive load (users see only what they need)
- Improves security (users don't see restricted areas)
- Better adoption rates (relevant content = engagement)

---

### 3. **Permission Enforcement Strategy**

**Problem:** Permissions are defined in database but not checked in UI. Security risk!

**Best Practice Solution: Three-Level Permission Enforcement**

```
Level 1: ROUTE PROTECTION (ProtectedRoute)
├─ Check if user's roles allow access to route
├─ Validate required permissions for route
└─ Redirect to 403 or alternative page if unauthorized

Level 2: COMPONENT VISIBILITY (usePermissions hook)
├─ Check permissions before rendering UI elements
├─ Hide/disable features based on permissions
└─ Show feedback when action is restricted

Level 3: API VALIDATION (Backend RLS + Edge Functions)
├─ RLS policies enforce row-level security
├─ Edge functions validate permissions before mutations
└─ Audit log all permission denials
```

**Implementation Pattern:**

```javascript
// 1. Create usePermissions hook
// src/hooks/usePermissions.js
export function usePermissions() {
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    async function loadPermissions() {
      // Get all permissions from all user's roles
      const allPerms = await Promise.all(
        roles.map(role => roleService.getRolePermissions(role.id))
      );
      const uniquePerms = [...new Set(allPerms.flat().map(p => p.permission_code))];
      setPermissions(uniquePerms);
    }
    if (roles.length > 0) loadPermissions();
  }, [roles]);

  return {
    hasPermission: (code) => permissions.includes(code),
    hasAnyPermission: (codes) => codes.some(c => permissions.includes(c)),
    hasAllPermissions: (codes) => codes.every(c => permissions.includes(c)),
    permissions
  };
}

// 2. Use in components
import { usePermissions } from '@/hooks/usePermissions';

function ProjectActions({ projectId }) {
  const { hasPermission } = usePermissions();

  return (
    <div>
      {hasPermission('project.edit') && (
        <Button onClick={editProject}>Edit Project</Button>
      )}
      {hasPermission('project.delete') && (
        <Button onClick={deleteProject}>Delete Project</Button>
      )}
      {hasPermission('user.invite') && (
        <Button onClick={inviteUser}>Invite Member</Button>
      )}
    </div>
  );
}

// 3. Create PermissionGuard component
export function PermissionGuard({ requires, fallback = null, children }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(requires)) {
    return fallback;
  }

  return children;
}

// Usage:
<PermissionGuard requires="billing.manage">
  <BillingSettings />
</PermissionGuard>
```

**Why This Matters:**
- Security: Users can't access unauthorized features
- UX: Clean interface without confusing disabled buttons
- Maintainability: Centralized permission logic
- Compliance: Audit trail of access denials

---

### 4. **Role Selection Flow**

**Problem:** Role selection is optional (users can skip). This breaks routing logic.

**Best Practice Solution: Make Roles Required**

**Recommended Approach:**

```javascript
// Option 1: MANDATORY SELECTION (Recommended for most cases)
// Remove "Skip" button, require at least 1 role selection

// Option 2: AUTO-ASSIGN DEFAULT (Recommended for fast onboarding)
// Automatically assign 'team_member' or 'viewer' as default
// User can change later in account settings

// Option 3: SMART DEFAULT (Recommended for enterprise)
// Based on email domain or organisation type, suggest role
// Example: @company.com executives → project_manager
//          @vendor.com → stakeholder
```

**Implementation:**

```javascript
// src/pages/onboarding/RoleSelection.jsx

// Option 1: Mandatory Selection
async function handleContinue() {
  if (selectedRoles.length === 0) {
    setError('Please select at least one role to continue');
    return;
  }

  await roleService.assignUserRoles(user.id, selectedRoles);
  navigate('/app/dashboard'); // Will route based on role
}

// Option 2: Auto-assign Default (no skip button, but preselect default)
useEffect(() => {
  async function loadDefaultRole() {
    const { data: defaultRole } = await supabase
      .from('roles')
      .select('id')
      .eq('is_default_role', true)
      .single();

    if (defaultRole) {
      setSelectedRoles([defaultRole.id]); // Pre-select
    }
  }
  loadDefaultRole();
}, []);
```

**Why This Matters:**
- Ensures all users have defined roles
- Enables reliable role-based routing
- Improves security posture
- Simplifies user management

---

### 5. **Fix RLS Policy Issues**

**Problem:** Role checking is disabled in ProtectedRoute due to 500 errors from RLS policies.

**Root Cause Analysis:**

From exploration findings:
```javascript
// ProtectedRoute.jsx (lines 38-45 - COMMENTED OUT)
// TODO: Implement role checking once we fix the RLS policies
// Currently causes 500 errors when trying to access users table
// See SQL/v83_fix_users_table_access.sql for the fix
```

**Best Practice Solution: Use Security Definer Functions**

The issue is likely **RLS recursion** - policies on `users` table trying to check roles, which queries `user_roles`, which triggers policies that query `users` again.

**Fix Pattern:**

```sql
-- v120_fix_role_lookup_rls.sql

-- Create security definer function to bypass RLS for role lookups
CREATE OR REPLACE FUNCTION get_user_roles_safe(p_user_id UUID)
RETURNS TABLE (
  role_id UUID,
  role_name VARCHAR,
  role_level INT,
  default_landing_page VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.role_name,
    r.role_level,
    r.default_landing_page
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
    AND ur.project_id IS NULL  -- Platform-level roles only
    AND r.is_active = true
  ORDER BY r.role_level DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_roles_safe(UUID) TO authenticated;
```

**Then use in frontend:**

```javascript
// roleService.js
export async function getUserRoles(userId) {
  const { data, error } = await supabase
    .rpc('get_user_roles_safe', { p_user_id: userId });

  if (error) throw error;
  return { data, error: null };
}
```

**Why This Matters:**
- Eliminates RLS recursion issues
- Maintains security (function is still controlled)
- Enables role checking in ProtectedRoute
- Improves performance (single query, no policy overhead)

---

## Recommended Implementation Phases

### Phase 1: Critical Fixes (Do First) 🔥

**Priority: HIGHEST - System currently insecure without role checking**

| Task | File | Effort | Impact |
|------|------|--------|--------|
| Fix RLS policies for user/role lookups | `SQL/v120_fix_role_lookup_rls.sql` | 4 hrs | Critical |
| Add role metadata columns to roles table | `SQL/v121_role_metadata_columns.sql` | 2 hrs | High |
| Enable role checking in ProtectedRoute | `src/components/ProtectedRoute.jsx` | 2 hrs | Critical |
| Make role selection required | `src/pages/onboarding/RoleSelection.jsx` | 1 hr | High |
| Add Layer 3 & 4 to post-login router | `src/services/postLoginRouter.js` | 3 hrs | High |

**Total Phase 1: ~12 hours**

**Success Criteria:**
- ✅ No 500 errors when accessing user data
- ✅ ProtectedRoute enforces role requirements
- ✅ All users have at least one role assigned
- ✅ Users routed to role-specific pages after login

---

### Phase 2: Role Management UI (Do Second) ⚙️

**Priority: HIGH - Enables business users to manage roles**

| Task | File | Effort | Impact |
|------|------|--------|--------|
| Create useUserRoles hook | `src/hooks/useUserRoles.js` | 2 hrs | High |
| Create usePermissions hook | `src/hooks/usePermissions.js` | 3 hrs | High |
| Build Role Management page | `src/pages/admin/RoleManagement.jsx` | 8 hrs | Medium |
| Build Role Editor component | `src/components/admin/RoleEditor.jsx` | 6 hrs | Medium |
| Build Permissions Matrix | `src/components/admin/PermissionsMatrix.jsx` | 6 hrs | Medium |
| Add to admin navigation | `src/components/navigation/AdminSidebar.jsx` | 1 hr | Low |

**Total Phase 2: ~26 hours**

**Success Criteria:**
- ✅ Admins can create custom roles via UI
- ✅ Admins can assign permissions to roles
- ✅ Admins can set default landing pages
- ✅ Changes take effect immediately

---

### Phase 3: Permission Enforcement (Do Third) 🔒

**Priority: MEDIUM - Improves security and UX**

| Task | File | Effort | Impact |
|------|------|--------|--------|
| Create PermissionGuard component | `src/components/auth/PermissionGuard.jsx` | 2 hrs | Medium |
| Add permission checks to Projects | `src/pages/app/Projects*.jsx` | 4 hrs | Medium |
| Add permission checks to Tasks | `src/pages/app/Tasks*.jsx` | 4 hrs | Medium |
| Add permission checks to Settings | `src/pages/app/AccountSettings.jsx` | 2 hrs | Medium |
| Add permission checks to Billing | `src/pages/SubscriptionDashboard.jsx` | 2 hrs | Medium |
| Update navigation menu with permissions | `src/components/navigation/*` | 3 hrs | Low |

**Total Phase 3: ~17 hours**

**Success Criteria:**
- ✅ UI hides features user lacks permission for
- ✅ Attempting unauthorized action shows clear message
- ✅ No console errors from permission checks
- ✅ Performance remains acceptable

---

### Phase 4: Testing & Documentation (Do Last) 📚

**Priority: MEDIUM - Ensures quality and maintainability**

| Task | File | Effort | Impact |
|------|------|--------|--------|
| Unit tests for role services | `src/services/__tests__/roleService.test.js` | 4 hrs | High |
| Unit tests for hooks | `src/hooks/__tests__/usePermissions.test.js` | 3 hrs | High |
| Integration tests for role flow | `src/test/integration/roleFlow.test.js` | 6 hrs | Medium |
| E2E tests for role-based routing | `src/test/e2e/roleRouting.spec.js` | 4 hrs | Medium |
| Create RBAC documentation | `Documentation/Role_Based_Access_Control_Guide.md` | 4 hrs | Medium |
| Create admin user guide | `Documentation/Role_Management_Admin_Guide.md` | 3 hrs | Low |

**Total Phase 4: ~24 hours**

**Success Criteria:**
- ✅ 80%+ test coverage for role logic
- ✅ All critical paths have E2E tests
- ✅ Documentation is clear and complete
- ✅ Examples provided for common scenarios

---

## Key Decision Points

Before implementing, please decide on these questions:

### 1. **Default Role Assignment**

**Question:** What role should users get if they skip role selection?

**Options:**
- A) `team_member` (Level 6) - Most common, balanced permissions
- B) `viewer` (Level 4) - Safest, least privilege
- C) No default - Force selection (recommended)

**Recommendation:** **Option C** - Make role selection mandatory for clarity

---

### 2. **Multiple Role Behavior**

**Question:** If user has multiple roles, how determine landing page?

**Options:**
- A) Highest `role_level` wins (e.g., 10 > 9 > 8...)
- B) User selects "primary role" in settings
- C) Last login determines (track last used role)

**Recommendation:** **Option A** - Simplest, most predictable

---

### 3. **Role Change Effect**

**Question:** When admin changes user's role, what happens?

**Options:**
- A) Takes effect immediately (may surprise user mid-session)
- B) Takes effect next login (cleaner UX)
- C) User gets notification, must acknowledge

**Recommendation:** **Option B** with **Option C** notification

---

### 4. **Simulator Role Separation**

**Question:** Should Simulator have separate role system from Platform?

**Current Issue:** `projectRoleService.js` uses `appDb` (Platform only)

**Options:**
- A) Unified roles across Platform + Simulator
- B) Separate role tables (`sim.roles`, `sim.user_roles`)
- C) Shared system roles, separate project roles

**Recommendation:** **Option C** - System roles (account_owner, admin) are shared, but Simulator projects use `sim.project_roles`

---

### 5. **Custom Role Creation**

**Question:** Who can create custom roles?

**Options:**
- A) Only `account_owner` (most restrictive)
- B) `account_owner` + `admin` (balanced)
- C) `account_owner` + `admin` + `project_manager` (most flexible)

**Recommendation:** **Option B** - Balance security and flexibility

---

## Security Best Practices

### 1. **Never Trust Client-Side Checks**

❌ **Bad:**
```javascript
if (user.role === 'admin') {
  // Allow access
}
```

✅ **Good:**
```javascript
// Frontend: Check for UI only
if (hasRole('admin')) {
  <AdminButton />
}

// Backend: RLS policy enforces
CREATE POLICY admin_only ON sensitive_table
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.role_name = 'admin'
  )
);
```

### 2. **Fail Securely**

```javascript
// Default to DENY, not ALLOW
function hasPermission(code) {
  try {
    return permissions.includes(code);
  } catch (error) {
    console.error('Permission check failed:', error);
    return false; // Deny on error
  }
}
```

### 3. **Audit Role Changes**

```sql
-- Create audit log for role assignments
CREATE TABLE role_assignment_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'assigned', 'revoked'
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP DEFAULT NOW()
);

-- Trigger on user_roles changes
CREATE TRIGGER audit_role_changes
AFTER INSERT OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION log_role_change();
```

### 4. **Prevent Privilege Escalation**

```javascript
// Users cannot assign roles higher than their own level
async function assignRoleToUser(targetUserId, roleId) {
  const currentUserRoles = await getUserRoles(auth.user.id);
  const currentUserMaxLevel = Math.max(...currentUserRoles.map(r => r.role_level));

  const roleToAssign = await getRole(roleId);

  if (roleToAssign.role_level > currentUserMaxLevel) {
    throw new Error('Cannot assign role higher than your own level');
  }

  // Proceed with assignment
}
```

---

## Migration Plan for Existing Users

**Challenge:** You likely have existing users who:
- Registered before role selection was required
- Skipped role selection during onboarding
- Have no roles assigned

**Solution:**

```sql
-- v122_assign_default_roles_to_existing_users.sql

-- Find users without any platform-level roles
WITH users_without_roles AS (
  SELECT u.id, u.email, u.created_at
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.project_id IS NULL
  WHERE ur.id IS NULL
)

-- Assign default role (team_member)
INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
SELECT
  uwr.id,
  (SELECT id FROM roles WHERE role_name = 'team_member' LIMIT 1),
  NOW(),
  NULL -- System assignment
FROM users_without_roles uwr;

-- Log for audit
INSERT INTO role_assignment_audit (user_id, role_id, action, performed_by)
SELECT
  uwr.id,
  (SELECT id FROM roles WHERE role_name = 'team_member' LIMIT 1),
  'system_migration',
  NULL
FROM users_without_roles uwr;
```

**User Communication:**

Send email to affected users:
```
Subject: Your Project Nidus Role Assignment

Hi [Name],

We've enhanced our role-based access system to provide you with a more
personalized experience.

You've been assigned the "Team Member" role based on your current usage
patterns. This role gives you access to:
- View and manage your assigned tasks
- Collaborate with team members
- Track project progress

You can request a different role by contacting your account administrator
or visiting Account Settings > Role Management.

Questions? Contact support@projectnidus.com

Thanks,
The Project Nidus Team
```

---

## Monitoring & Success Metrics

### Track These Metrics:

1. **Role Distribution**
   - How many users per role?
   - Are roles balanced or skewed?

2. **Permission Denials**
   - Which permissions are most often denied?
   - Are users attempting unauthorized actions?

3. **Role Changes**
   - How often do admins change user roles?
   - Are initial role assignments accurate?

4. **Landing Page Success**
   - Do users navigate away from landing page immediately?
   - Is role-based routing providing value?

### Create Dashboard Query:

```sql
-- Role distribution
SELECT r.role_name, COUNT(ur.user_id) as user_count
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.project_id IS NULL
GROUP BY r.role_name
ORDER BY user_count DESC;

-- Permission denial log (requires permission_denial_log table)
SELECT permission_code, COUNT(*) as denial_count
FROM permission_denial_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY permission_code
ORDER BY denial_count DESC
LIMIT 10;
```

---

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Hardcoding Role Names
```javascript
// BAD
if (user.role === 'project_manager') { ... }

// GOOD
if (hasRole('project_manager')) { ... }
```

### ❌ Pitfall 2: Checking Roles Instead of Permissions
```javascript
// BAD
if (hasRole('admin')) {
  <DeleteButton />
}

// GOOD
if (hasPermission('project.delete')) {
  <DeleteButton />
}
```

### ❌ Pitfall 3: Not Caching Role/Permission Lookups
```javascript
// BAD - Queries DB on every render
function Component() {
  const roles = getUserRoles(); // DB query
  const permissions = getPermissions(); // DB query
  ...
}

// GOOD - Cache in context
const RoleProvider = ({ children }) => {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getUserRoles().then(setRoles);
  }, []);

  return <RoleContext.Provider value={roles}>{children}</RoleContext.Provider>;
};
```

### ❌ Pitfall 4: Forgetting to Invalidate Cache on Role Change
```javascript
// When admin changes user role, invalidate that user's cache
async function assignRole(userId, roleId) {
  await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId });

  // Invalidate cache
  await invalidateUserRoleCache(userId);

  // Optionally: Send websocket event to force user re-login
  await notifyUserRoleChanged(userId);
}
```

---

## Conclusion

### Summary of Recommendations:

1. **Fix RLS policies FIRST** - Critical blocker preventing role checking
2. **Make role selection required** - Ensures all users have defined roles
3. **Add role metadata to database** - Eliminate hardcoded behaviors
4. **Implement role-based routing** - Personalize user experience
5. **Build role management UI** - Empower admins
6. **Enforce permissions in UI** - Improve security and UX
7. **Test thoroughly** - Prevent security vulnerabilities
8. **Document well** - Ensure maintainability

### Immediate Next Steps:

1. Review this guide with team
2. Make key decisions (default role, multiple role behavior, etc.)
3. Approve implementation plan
4. Begin Phase 1 (Critical Fixes)
5. Track progress with todo list

---

**Questions or Need Clarification?**

I'm ready to help implement any part of this plan. Just let me know which phase you'd like to start with!

---

**Created:** 2025-12-12
**Author:** Claude Code
**Status:** Ready for Review & Implementation
**Priority:** HIGH - Core security and UX improvements
