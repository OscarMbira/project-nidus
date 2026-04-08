# Role Assignment & Invitation Implementation

## Overview

This document describes the implementation of role assignment and invitation features for Project Sponsor/Executive users.

## Key Features

### 1. Default Role Assignment
- **Project Sponsor/Executive** is automatically assigned when a user creates an organisation
- This is the most powerful role in the organisation
- Implemented in `src/services/organisationService.js`

### 2. Role Assignment Service
- New service: `src/services/organisationRoleService.js`
- Functions:
  - `getAssignableRoles()` - Get roles that Project Sponsor can assign
  - `isProjectSponsor()` - Check if user is Project Sponsor
  - `assignRoleToUser()` - Assign role to existing user
  - `inviteUserWithRole()` - Invite new user with specific role
  - `getOrganisationUsers()` - Get all users in organisation with their roles
  - `removeRoleFromUser()` - Remove role from user

### 3. Assignable Roles
Project Sponsor can assign/invite these roles:
- **Project/Programme Manager** - Full project control
- **Project Board Members** - Executive oversight
- **Project Assurance** - Quality oversight
- **Quality Assurance** - Quality control

### 4. Role Assignment UI
- New page: `src/pages/admin/RoleAssignment.jsx`
- Features:
  - Invite new users with specific roles
  - Assign roles to existing users
  - View all organisation users and their roles
  - Remove roles from users
  - Accessible at `/app/admin/role-assignment`

### 5. Database Schema
- New table: `organisation_invitations`
- SQL migration: `SQL/v120_organisation_invitations.sql`
- Stores:
  - Invitation details (email, role, token)
  - Status tracking (pending, accepted, declined, expired)
  - Expiration dates
  - Inviter information

## User Flow

### For Project Sponsor/Executive:

1. **After Organisation Creation:**
   - User automatically receives Project Sponsor/Executive role
   - Can access Role Assignment page

2. **Inviting New Users:**
   - Navigate to `/app/admin/role-assignment`
   - Click "Invite New User"
   - Enter email, select role, add optional message
   - System sends invitation email with acceptance link

3. **Assigning Roles to Existing Users:**
   - Click "Assign Role to Existing User"
   - Select user from dropdown
   - Select role to assign
   - Role is immediately assigned

4. **Managing Users:**
   - View all organisation users and their roles
   - Remove roles by clicking X button on role badge
   - See user status and activity

### For Invited Users:

1. **Receiving Invitation:**
   - Receives email with invitation link
   - Link includes token for acceptance

2. **Accepting Invitation:**
   - Clicks link in email
   - If new user: Creates account and sets password
   - If existing user: Role is assigned immediately
   - Redirected to dashboard

## Technical Details

### Role Assignment Logic

```javascript
// Check if user is Project Sponsor
const isSponsor = await isProjectSponsor(authUserId);

// Get assignable roles
const roles = await getAssignableRoles();

// Assign role to existing user
await assignRoleToUser(targetAuthUserId, roleName, inviterAuthUserId);

// Invite new user with role
await inviteUserWithRole(email, roleName, inviterAuthUserId, message);
```

### Database Tables

**organisation_invitations:**
- `id` - UUID primary key
- `organisation_id` - References accounts
- `invited_email` - Email of invited user
- `role_id` - Role to be assigned
- `role_name` - Denormalized role name
- `invitation_token` - Unique token for acceptance
- `invitation_status` - pending, accepted, declined, expired
- `invitation_expires_at` - Expiration timestamp

### Email Templates

Two email templates are generated:
1. **Role Assignment Email** - Sent when role is assigned to existing user
2. **Role Invitation Email** - Sent when new user is invited

Both templates include:
- Role name
- Organisation name
- Inviter name
- Action button/link
- Expiration notice (for invitations)

## Security Considerations

1. **Access Control:**
   - Only Project Sponsor/Executive can access Role Assignment page
   - Service functions verify Project Sponsor status before operations

2. **Role Validation:**
   - Only assignable roles can be assigned by Project Sponsor
   - System roles (like System Admin) cannot be assigned

3. **Invitation Tokens:**
   - Unique tokens generated for each invitation
   - Tokens expire after 7 days
   - Tokens are validated before acceptance

4. **RLS Policies:**
   - Database-level security via Row Level Security
   - Users can only see their own organisation's data

## API Endpoints

All functionality is handled through service functions:
- No REST API endpoints required
- Direct database access via Supabase client
- Service layer handles all business logic

## Future Enhancements

1. **Bulk Invitations:**
   - Invite multiple users at once
   - CSV upload for bulk invitations

2. **Role Templates:**
   - Predefined role combinations
   - Quick assignment of multiple roles

3. **Invitation Management:**
   - View pending invitations
   - Resend invitations
   - Cancel invitations

4. **Role History:**
   - Track role assignment history
   - Audit log for role changes

5. **Permission Customization:**
   - Customize permissions per role
   - Project-specific role variations

## Testing Checklist

- [ ] Project Sponsor role assigned on organisation creation
- [ ] Role Assignment page accessible only to Project Sponsor
- [ ] Can invite new users with roles
- [ ] Can assign roles to existing users
- [ ] Can remove roles from users
- [ ] Invitation emails sent correctly
- [ ] Invitation tokens work correctly
- [ ] Expired invitations are rejected
- [ ] Only assignable roles can be assigned
- [ ] Users can see their assigned roles

## Files Modified/Created

### Created:
- `src/services/organisationRoleService.js`
- `src/pages/admin/RoleAssignment.jsx`
- `SQL/v120_organisation_invitations.sql`
- `Documentation/Role_Assignment_Implementation.md`

### Modified:
- `src/services/organisationService.js` - Added Project Sponsor role assignment
- `src/App.jsx` - Added route for Role Assignment page
- `projectplan/Role_Based_Routing_Implementation_Plan.md` - Updated with new requirements

## Migration Instructions

1. Run SQL migration:
   ```sql
   -- Run SQL/v120_organisation_invitations.sql
   ```

2. Verify roles exist:
   ```sql
   SELECT * FROM roles WHERE role_name IN (
     'project_sponsor',
     'programme_manager',
     'project_manager',
     'project_board_member',
     'project_assurance',
     'quality_assurance'
   );
   ```

3. Test role assignment:
   - Create a new organisation
   - Verify Project Sponsor role is assigned
   - Access Role Assignment page
   - Test invitation and assignment flows

## Support

For issues or questions:
1. Check service logs for errors
2. Verify database migrations are applied
3. Ensure email service is configured (for invitations)
4. Check RLS policies are correct

---

**Status:** ✅ Implementation Complete
**Last Updated:** 2025-01-27

