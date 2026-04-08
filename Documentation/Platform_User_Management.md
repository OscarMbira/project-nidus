# Platform User Management Guide

## Overview

This guide explains how to manage users, roles, and permissions in the Platform.

## Account Setup

### Creating an Account

1. Complete Platform onboarding (`/onboarding/platform-account-setup`)
2. Provide account details (name, type, billing email)
3. Create your first project
4. Account is automatically created and linked to your subscription

### Account Management

Access account settings at `/app/account/:accountId/settings`:
- View account information
- Update billing details
- View all projects under account
- Manage subscription

## Inviting Users

### Invitation Process

1. Navigate to Project Users page (`/app/projects/:projectId/users`)
2. Click "Invite User"
3. Enter email address and select role
4. System checks seat availability
5. Invitation email sent (if email service configured)
6. User receives invitation link
7. User accepts invitation and gains access

### Seat Limits

- **Base Seats**: 30 per project (included in subscription)
- **Extra Seats**: Can be purchased at discounted rate
- **Warning**: System warns at 80% capacity
- **Block**: Cannot invite when at 100% capacity

### Purchasing Extra Seats

1. When seat limit is reached, click "Purchase More Seats"
2. Select quantity (recommended: 10, 20, or 50)
3. Review pricing (discounted rate applies)
4. Complete payment via Paynow
5. Seats immediately available after payment

## Role Management

### System Roles

Default roles provided:
- **Project Board** (Level 10) - Executive oversight
- **Programme Manager** (Level 9) - Multi-project coordination
- **Project Manager** (Level 8) - Project management
- **Team Manager** (Level 7) - Team supervision
- **Project Assurance** (Level 6) - Quality oversight
- **Business Analyst** (Level 5) - Requirements analysis
- **Team Member** (Level 3) - Execution

### Custom Roles

Create custom roles:
1. Navigate to Project Roles (`/app/projects/:projectId/roles`)
2. Click "Create Custom Role"
3. Set role name, description, and level
4. Assign permissions
5. Save role

### Permission Assignment

Permissions are organized by category:
- Project Management
- User Management
- Role Management
- Task Management
- Risk Management
- Document Management
- Financial
- Reporting
- Billing
- Settings

## Permission System

### Permission Format

Permissions use format: `{category}.{action}`
Examples:
- `tasks.edit` - Edit tasks
- `user.invite` - Invite users
- `billing.purchase_seats` - Purchase seats

### Checking Permissions

Use `PermissionGate` component:
```jsx
<PermissionGate permission="tasks.edit" projectId={projectId}>
  <EditButton />
</PermissionGate>
```

Or use the hook:
```javascript
const { hasPermissionCode } = useProjectPermissions(projectId)
if (hasPermissionCode('tasks.edit')) {
  // Show edit button
}
```

## Best Practices

1. **Start with System Roles**: Use default roles when possible
2. **Minimal Permissions**: Grant only necessary permissions
3. **Regular Audits**: Review role assignments periodically
4. **Seat Planning**: Monitor seat usage and plan purchases
5. **Role Naming**: Use clear, descriptive role names

