# Organisation Role Assignment Fix

## Overview
Fixed role assignment error during organisation creation that was preventing organisation creators from being assigned a system role.

## Issue

### Problem
Organisation creation was failing to assign a role to the creator with the following errors:

```
Error assigning system role: Error: System role 'project_sponsor' not found
Error assigning system role: Error: System role 'executive' not found
Failed to assign Project Sponsor role. User may need to be assigned manually.
```

### Root Cause
The `organisationService.js` was attempting to assign non-existent roles:
1. First tried to assign `project_sponsor` (doesn't exist in database)
2. Fallback tried to assign `executive` (doesn't exist in database)

These role names were never created in the database seed data.

## Solution

### Available System Roles
Based on `SQL/v12_seed_data_rbac.sql`, the actual system roles in the database are:

| Role Name | Display Name | Level | Description |
|-----------|--------------|-------|-------------|
| `system_admin` | System Admin | 100 | Full system access with all permissions |
| `org_admin` | Organization Admin | 80 | Organization-level administrator |
| `project_manager` | Project Manager | 60 | Manages projects, teams, and tasks |
| `team_lead` | Team Lead | 40 | Leads teams and manages team tasks |
| `team_member` | Team Member | 20 | Basic project and task participation |
| `stakeholder` | Stakeholder | 10 | Read-only access to projects |
| `viewer` | Viewer | 5 | Minimal read-only access |

### Correct Role Assignment
For an organisation creator, the most appropriate role is **`org_admin` (Organization Admin)** because:

1. ✅ **System Role**: It's defined as a system-level role (`is_system_role = true`)
2. ✅ **Appropriate Permissions**: Organization-level administrator with most permissions (excluding system-level settings)
3. ✅ **Semantic Fit**: Someone creating an organisation should be an organization admin
4. ✅ **High Authority**: Level 80 - second highest after system admin

### Code Changes

**File:** `src/services/organisationService.js`

**Before:**
```javascript
// Assign Project Sponsor/Executive role to organisation creator
try {
  const roleResult = await assignSystemRole(authUser.id, 'project_sponsor');
  if (!roleResult.success) {
    // Try alternative role name
    const altRoleResult = await assignSystemRole(authUser.id, 'executive');
    if (!altRoleResult.success) {
      console.warn('Failed to assign Project Sponsor role. User may need to be assigned manually.');
    }
  }
} catch (roleError) {
  console.error('Error assigning Project Sponsor role:', roleError);
  // Don't throw - organisation is created, role can be assigned later
}
```

**After:**
```javascript
// Assign Organization Admin role to organisation creator
try {
  const roleResult = await assignSystemRole(authUser.id, 'org_admin');
  if (!roleResult.success) {
    console.warn('Failed to assign Organization Admin role. User may need to be assigned manually.');
  }
} catch (roleError) {
  console.error('Error assigning Organization Admin role:', roleError);
  // Don't throw - organisation is created, role can be assigned later
}
```

## Testing

### Test Steps

1. **Clear Previous Test Data** (if needed):
   ```sql
   -- Remove test organisations
   DELETE FROM accounts WHERE company_name = 'Test Company';
   ```

2. **Test Organisation Creation:**
   - Navigate to `/onboarding/organisation-setup`
   - Fill in organisation details:
     - Organisation Name: "Test Organisation"
     - Legal Company Name: "Test Company Ltd"
     - Organisation Type: "Company"
     - Country: Select any active country
     - Contact Person: Your name
     - Email: Your email
   - Click "Create Organisation"

3. **Verify Success:**
   - Organisation should be created successfully
   - No role assignment errors in browser console
   - Success message: "Organisation created successfully! Check your email..."

4. **Verify Role Assignment in Database:**
   ```sql
   -- Check user role assignment
   SELECT
     u.email,
     r.role_name,
     r.role_display_name,
     ur.is_active
   FROM user_roles ur
   JOIN users u ON ur.user_id = u.id
   JOIN roles r ON ur.role_id = r.id
   WHERE u.email = 'your-test-email@example.com'
   AND ur.is_active = TRUE;
   -- Expected: org_admin role assigned
   ```

### Expected Results

✅ **Console Output:**
```
Organisation created successfully
```

✅ **Database Verification:**
- User has `org_admin` role in `user_roles` table
- Role is active (`is_active = TRUE`)
- No error logs

❌ **Before Fix (Errors):**
```
Error assigning system role: Error: System role 'project_sponsor' not found
Error assigning system role: Error: System role 'executive' not found
```

## Organization Admin Permissions

The `org_admin` role has the following permissions (from `v12_seed_data_rbac.sql`):

### ✅ Granted Permissions
- **Projects:** Full CRUD + manage members, settings, budget, export
- **Tasks:** Full CRUD + assign, update status, comment, view all
- **Teams:** Full CRUD + manage members, assign roles
- **Users:** Full CRUD + manage roles, activate/deactivate
- **Reports:** Full access + export, schedule
- **Documents:** Full CRUD + version management
- **Time Tracking:** Full access + approve
- **Settings:** Read access + most update permissions (roles, methodologies, workflows, templates, menus)
- **System Monitoring:** Audit logs, integrations

### ❌ Excluded Permissions (System Admin Only)
- `system.settings` - Manage System Settings
- `system.backup` - Manage Backups
- `system.maintenance` - System Maintenance
- `settings.manage_permissions` - Manage Permission Definitions

This permission set is ideal for organisation creators who need to manage their organisation but shouldn't have access to platform-wide system settings.

## Impact

### What Changed
- Organisation creators now correctly receive `org_admin` role
- Role assignment happens automatically during organisation creation
- No manual intervention required

### What Didn't Change
- Organisation creation flow (still same steps)
- Email verification requirement (still required)
- Database structure (no migrations needed)
- Other role assignments (not affected)

## Related Files

### Modified
- `src/services/organisationService.js` - Updated role assignment logic

### Reference
- `SQL/v12_seed_data_rbac.sql` - System roles seed data
- `SQL/v86_default_project_roles_seed.sql` - Project roles seed data
- `src/services/roleService.js` - Role assignment service
- `Documentation/Role_Management_Best_Practices_Guide.md` - Role system documentation

## Future Considerations

### Alternative Approaches Considered

1. **Create `project_sponsor` Role**
   - ❌ Rejected: Semantically unclear what this role means
   - ❌ Would need to define permissions from scratch
   - ❌ `org_admin` already exists with appropriate permissions

2. **Create `executive` Role**
   - ❌ Rejected: Too vague for a system role
   - ❌ `org_admin` is more specific and clear

3. **Use `system_admin` Role**
   - ❌ Rejected: Too powerful - includes system-level settings
   - ❌ Organisation creators shouldn't manage platform-wide settings
   - ✅ `org_admin` is correctly scoped

### Potential Enhancements

1. **Role Selection During Registration:**
   - Allow users to choose their role during onboarding
   - Default to `org_admin` but allow selection of lower-level roles
   - Useful for users joining existing organisations

2. **Multi-Organization Support:**
   - Users may create/own multiple organisations
   - Each organisation could have different role assignments
   - Track role per organisation, not just per user

3. **Role Hierarchy Enforcement:**
   - Prevent lower-level roles from creating organisations
   - Only `org_admin` and `system_admin` can create organisations
   - Enforce at API level

## Troubleshooting

### Issue: Role Still Not Assigned

**Possible Causes:**
1. Role seed data not run (`v12_seed_data_rbac.sql`)
2. Role exists but `is_active = FALSE`
3. Role exists but `is_system_role = FALSE`

**Solutions:**
```sql
-- Verify org_admin role exists and is active
SELECT id, role_name, is_active, is_system_role
FROM roles
WHERE role_name = 'org_admin';

-- If missing, run seed data:
-- Execute SQL/v12_seed_data_rbac.sql

-- If inactive, activate it:
UPDATE roles
SET is_active = TRUE
WHERE role_name = 'org_admin';
```

### Issue: Permission Denied Errors After Role Assignment

**Possible Causes:**
1. Role-permission mappings not created
2. RLS policies blocking access

**Solutions:**
```sql
-- Verify role has permissions assigned
SELECT COUNT(*) as permission_count
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.role_name = 'org_admin'
AND rp.is_active = TRUE;
-- Should return 50+ permissions

-- If missing, run seed data:
-- Execute SQL/v12_seed_data_rbac.sql (includes permission mappings)
```

---

**Created:** 2025-12-13
**Author:** Claude Code
**Version:** 1.0
**Status:** Production Ready
**Impact:** Critical (fixes organisation creation flow)
