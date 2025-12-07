# Unified Login & Role Assignment System - Documentation

## Overview

This document provides an overview of the unified login and role assignment system that supports both PM Platform and Simulator platforms.

## System Architecture

### Platform Separation

The system maintains strict separation between:
- **PM Platform** (`public` schema) - Account-based, multi-tenant project management
- **Simulator Platform** (`sim` schema) - Individual-based learning platform

### Key Components

1. **Authentication Flow**
   - Single email login for both platforms
   - Platform selection after authentication
   - Platform switching for users with multiple access

2. **Account Management** (PM Platform only)
   - Multi-tenant account structure
   - Account ownership and membership
   - Project organization under accounts

3. **Role & Permission System** (PM Platform)
   - System role templates
   - Custom project roles
   - Granular permission system
   - Permission-based access control

4. **Seat Management** (PM Platform)
   - Base 30 seats per project
   - Extra seat purchases
   - Seat usage tracking

5. **Invitation System** (PM Platform)
   - Email-based invitations
   - Token-based acceptance
   - New user onboarding flow

## Database Schema

### Core Tables

- `accounts` - Organization/company entities
- `projects` - Project records (linked to accounts)
- `roles` - System and custom roles
- `permissions` - Permission catalog
- `user_roles` - User role assignments
- `project_invitations` - Pending invitations
- `project_seat_allocations` - Seat usage tracking
- `extra_seat_purchases` - Seat purchase history

### Key Functions

- `get_user_platforms()` - Get user's platform access
- `has_project_permission()` - Check user permission
- `get_user_accessible_projects()` - List user's projects
- `check_seat_availability()` - Check project seat limits

## Services

### Core Services

- `unifiedAuthService.js` - Authentication and platform switching
- `accountService.js` - Account management
- `projectRoleService.js` - Role management
- `projectMembershipService.js` - User invitations and memberships
- `seatManagementService.js` - Seat allocation and purchases
- `invitationService.js` - Invitation email handling
- `permissionChecker.js` - Permission validation utilities

## Components

### Authentication

- `PlatformSelector.jsx` - Platform selection modal
- `PlatformSwitcher.jsx` - Header platform switcher
- `PlatformContext.jsx` - Platform state management

### PM Platform

- `PMAccountSetup.jsx` - Account onboarding wizard
- `AccountSettings.jsx` - Account management page
- `ProjectUsers.jsx` - Team member management
- `ProjectRoles.jsx` - Role management page
- `InviteUserModal.jsx` - User invitation form
- `SeatUsageWidget.jsx` - Seat usage display
- `PurchaseExtraSeatsModal.jsx` - Seat purchase flow
- `RoleEditorModal.jsx` - Role creation/editing
- `PermissionMatrix.jsx` - Permission visualization

### Simulator Platform

- `SimulatorWelcome.jsx` - Simulator onboarding

### Shared

- `PermissionGate.jsx` - Declarative permission component
- `InvitationAccept.jsx` - Invitation acceptance page

## Usage Examples

### Checking Permissions

```javascript
import { hasPermission } from '../utils/permissionChecker'

const canEdit = await hasPermission(userId, projectId, 'tasks.edit')
```

### Using Permission Gate

```jsx
<PermissionGate permission="tasks.edit" projectId={projectId}>
  <EditButton />
</PermissionGate>
```

### Using Permission Hook

```javascript
import { useProjectPermissions } from '../hooks/useProjectPermissions'

const { permissions, hasPermissionCode } = useProjectPermissions(projectId)
const canEdit = hasPermissionCode('tasks.edit')
```

## Security

- Row Level Security (RLS) enabled on all tables
- Account-based data isolation
- Project-level access control
- Permission-based UI rendering
- Platform separation enforced

## Migration Notes

Run SQL migrations in order:
1. v84_accounts_and_extensions.sql
2. v85_project_invitations_seats.sql
3. v86_default_project_roles_seed.sql
4. v87_unified_auth_functions.sql
5. v88_rls_policies_comprehensive.sql

