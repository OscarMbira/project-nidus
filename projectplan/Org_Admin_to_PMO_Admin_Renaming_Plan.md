# Org_Admin to PMO_Admin Renaming Plan

## Overview
Rename the `org_admin` role to `pmo_admin` (Project Management Office Admin) throughout the entire codebase, database, and documentation.

## Scope of Changes

### 1. Database Changes (SQL Files)
**Critical**: These changes affect data integrity and must be done carefully.

#### Files to Update:
- `SQL/v12_seed_data_rbac.sql` - Initial role definition
- `SQL/v14_seed_data_menus.sql` - Menu items for the role
- `SQL/v127_ensure_org_admin_role_exists.sql` - Role existence check
- `SQL/v128_fix_organisation_setup_issues.sql` - Organisation setup logic
- `SQL/v129_fix_menu_system_rls.sql` - RLS policies for menus
- `SQL/v130_org_admin_menu_items.sql` - Org admin specific menu items
- `SQL/v131_org_admin_rls_policies.sql` - RLS policies for org admin
- `SQL/v133_verify_and_reapply_org_admin_menus.sql` - Menu verification
- `SQL/v134_fix_users_rls_infinite_recursion.sql` - User RLS policies
- `SQL/v135_fix_user_roles_rls_infinite_recursion.sql` - User roles RLS
- `SQL/v136_fix_roles_rls_infinite_recursion.sql` - Roles RLS
- `SQL/v138_comprehensive_permissions.sql` - Permission definitions
- `SQL/v140_fix_menu_route_paths.sql` - Menu route paths
- `SQL/v80_admin_application_tables.sql` - Admin application tables

#### Database Migration Strategy:
1. Create new migration script: `v142_rename_org_admin_to_pmo_admin.sql`
2. Update the `roles` table: Change role_name from 'org_admin' to 'pmo_admin'
3. Update all references in:
   - `user_roles` table (if role_id is used, no change needed)
   - `menu_items` table (role_name references)
   - `role_permissions` table
   - Any RLS policies that hardcode 'org_admin'

### 2. Service Files

#### Files to Rename:
- `src/services/orgAdminService.js` → `src/services/pmoAdminService.js`

#### Files to Update:
- `src/services/roleService.js` - Update role checks and references
- `src/services/roleRouter.js` - Update routing logic for PMO admin
- `src/services/organisationService.js` - Update org setup role assignment

### 3. React Components & Pages

#### Files to Rename:
- `src/pages/platform-app/OrganizationAdmin.jsx` → `src/pages/platform-app/PMOAdmin.jsx`

#### Files to Update:
- `src/App.jsx` - Update route imports and definitions
- `src/components/Sidebar.jsx` - Update sidebar menu items
- `src/components/headers/PlatformAppHeader.jsx` - Update header references
- `src/components/app/dashboard/QuickActions.jsx` - Update quick actions
- `src/pages/platform-app/Dashboard.jsx` - Update dashboard references
- `src/pages/onboarding/OrganisationSetup.jsx` - Update role assignment on org creation
- `src/pages/admin/AssignRolesToProjects.jsx` - Update role assignment logic
- `src/pages/admin/SendRoleInvites.jsx` - Update role invite logic

### 4. Configuration Files

#### Files to Update:
- `src/config/pmMenuConfig.js` - Update menu configuration
- `src/hooks/useMenu.js` - Update menu hook logic

### 5. Documentation Files

#### Files to Update:
- All files in `Documentation/` folder (and their `public/Documentation/` copies)
- All relevant files in `projectplan/` folder

## Renaming Mapping

| Old Name | New Name | Context |
|----------|----------|---------|
| `org_admin` | `pmo_admin` | Database role name |
| `Org Admin` | `PMO Admin` | UI Display text |
| `Organization Admin` | `PMO Admin` | UI Display text |
| `Organisation Admin` | `PMO Admin` | UI Display text (UK spelling) |
| `orgAdminService` | `pmoAdminService` | Service file name |
| `OrganizationAdmin` | `PMOAdmin` | Component/Page name |
| `/organization-admin` | `/pmo-admin` | Route path |
| `organization-admin` | `pmo-admin` | Route path segment |

## Implementation Steps

### Phase 1: Database Migration
1. Create new migration script `v142_rename_org_admin_to_pmo_admin.sql`
2. Update role name in `roles` table
3. Update menu items that reference org_admin
4. Update RLS policies
5. Verify all foreign key relationships

### Phase 2: Service Layer
1. Rename `orgAdminService.js` to `pmoAdminService.js`
2. Update all imports of orgAdminService
3. Update roleService.js role checks
4. Update roleRouter.js routing logic
5. Update organisationService.js role assignment

### Phase 3: UI Components
1. Rename `OrganizationAdmin.jsx` to `PMOAdmin.jsx`
2. Update App.jsx route imports
3. Update Sidebar menu items
4. Update all component references
5. Update display text throughout UI

### Phase 4: Configuration
1. Update pmMenuConfig.js
2. Update useMenu.js
3. Update route paths

### Phase 5: Documentation
1. Update all documentation files
2. Update planning files
3. Create migration guide for existing users

### Phase 6: Testing
1. Test org setup flow (should assign pmo_admin role)
2. Test PMO admin menu access
3. Test PMO admin permissions
4. Test role-based routing
5. Verify no broken references

## Rollback Plan
If issues occur:
1. Database: Keep migration script reversible with DOWN migration
2. Code: Git revert to previous commit
3. Data: Backup roles and user_roles tables before migration

## Notes
- All changes must maintain backward compatibility where possible
- Existing users with org_admin role will be migrated to pmo_admin
- All menu items and permissions must be preserved
- RLS policies must continue to work correctly

