# Project Role Assignment & Member Invitation Implementation

## Overview

This document describes the implementation of project role assignment during project creation and project member invitation features.

## Features Implemented

### 1. Project Creation with Role Assignment (Project Sponsor/Executive)

**Location:** `src/pages/ProjectsCreate.jsx`

**Features:**
- Project Sponsor/Executive can assign roles during project creation
- Assignable roles:
  - Project Manager
  - Programme Manager
  - Project Board Members
  - Change Authority
  - Project Assurance
  - Quality Assurance
- UI includes:
  - Collapsible role assignment section
  - User selection dropdown (from organisation users)
  - Role selection dropdown
  - List of assigned roles with remove option
  - Visual feedback for assignments

**Service:** `src/services/projectRoleAssignmentService.js`
- `assignProjectRolesDuringCreation()` - Assigns roles to users for a project
- `getAvailableProjectRoles()` - Gets roles that can be assigned during creation
- `isProjectManager()` - Checks if user is Project Manager for a project

### 2. Project Member Invitation (Project Managers)

**Location:** `src/pages/projects/ProjectMemberInvitation.jsx`

**Features:**
- Project Managers can invite Team Managers & Project Members
- Invitation flow:
  1. Project Manager enters email and selects role
  2. System checks seat availability
  3. Creates invitation record
  4. Sends invitation email with signup link
  5. User signs up → email confirmation → role assignment
- UI includes:
  - Invitation form (email, role, optional message)
  - Pending invitations list
  - Project members list
  - Seat limit warnings

**Route:** `/app/projects/:projectId/invite`

**Service Integration:**
- Uses `projectMembershipService.js` for invitations
- Uses `projectRoleAssignmentService.js` for role validation
- Checks seat availability before sending invitations

### 3. Enhanced Invitation Email Flow

**Updated Files:**
- `src/services/organisationRoleService.js` - Updated email template
- `src/pages/auth/PlatformRegister.jsx` - Handles invitation token
- `src/pages/auth/EmailConfirmation.jsx` - Accepts invitation after email confirmation

**Flow:**
1. Invitation email sent with signup link: `/platform/register?invitation=TOKEN`
2. User clicks link → Registration page (email pre-filled)
3. User signs up → Email confirmation sent
4. User confirms email → Invitation automatically accepted → Role assigned
5. User logs in → Access granted with assigned role

## Technical Details

### Role Assignment During Project Creation

```javascript
// In ProjectsCreate.jsx
if (isSponsor && roleAssignments.length > 0) {
  const roleResult = await assignProjectRolesDuringCreation(
    project.id,
    roleAssignments.map(ra => ({
      userId: ra.userId,
      roleName: ra.roleName
    })),
    user.id
  )
}
```

### Project Member Invitation

```javascript
// In ProjectMemberInvitation.jsx
const result = await inviteUserToProject(projectId, {
  email: inviteEmail,
  roleId: inviteRoleId,
  message: inviteMessage || null
});
```

### Role Validation

- **Project Sponsor** can assign:
  - Project Manager
  - Programme Manager
  - Project Board Members
  - Change Authority
  - Project Assurance
  - Quality Assurance

- **Project Manager** can invite:
  - Team Manager
  - Team Member

## Database Tables Used

1. **user_roles** - Stores role assignments (with project_id for project-specific roles)
2. **project_invitations** - Stores pending project invitations
3. **projects** - Updated with `project_manager_user_id` when Project Manager is assigned
4. **organisation_invitations** - For organisation-level invitations

## User Flows

### Flow 1: Project Sponsor Creates Project with Roles

1. Project Sponsor navigates to "Create Project"
2. Fills in project details
3. Clicks "Assign Roles" button
4. Selects users and assigns roles:
   - Project Manager (required)
   - Board Members (optional)
   - Change Authority (optional)
   - Assurance roles (optional)
5. Clicks "Create Project"
6. Project created with roles assigned
7. Assigned users receive notifications

### Flow 2: Project Manager Invites Team Members

1. Project Manager navigates to project detail page
2. Clicks "Invite Members" or navigates to `/app/projects/:id/invite`
3. Enters email address
4. Selects role (Team Manager or Team Member)
5. Adds optional message
6. Clicks "Send Invitation"
7. System checks seat availability
8. If available: Invitation sent
9. If not: Shows "Purchase Extra Seats" message
10. Invited user receives email with signup link
11. User signs up → confirms email → role assigned → can access project

## Access Control

### Project Sponsor/Executive
- Can create projects
- Can assign roles during project creation
- Can manage organisation users (via Role Assignment page)

### Project Manager
- Can invite team members to their projects
- Can only invite Team Manager and Team Member roles
- Must be assigned as Project Manager for the project

## Error Handling

1. **Seat Limit Exceeded:**
   - Shows error message
   - Suggests purchasing extra seats
   - Prevents invitation from being sent

2. **Role Assignment Failures:**
   - Logged but don't block project creation
   - Roles can be assigned later via Role Assignment page

3. **Invalid Invitation Token:**
   - User redirected to login
   - Error message displayed
   - Option to request new invitation

## Files Created/Modified

### Created:
- `src/services/projectRoleAssignmentService.js` - Project role assignment service
- `src/pages/projects/ProjectMemberInvitation.jsx` - Project member invitation page

### Modified:
- `src/pages/ProjectsCreate.jsx` - Added role assignment UI and logic
- `src/services/organisationRoleService.js` - Updated email template with signup link
- `src/pages/auth/PlatformRegister.jsx` - Added invitation token handling
- `src/pages/auth/EmailConfirmation.jsx` - Added invitation acceptance after email confirmation
- `src/App.jsx` - Added route for Project Member Invitation page

## Testing Checklist

- [ ] Project Sponsor can create project with role assignments
- [ ] Roles are correctly assigned to users in user_roles table
- [ ] Project Manager is set in projects.project_manager_user_id
- [ ] Project Manager can access invitation page
- [ ] Project Manager can invite team members
- [ ] Seat limit is checked before sending invitations
- [ ] Invitation emails are sent with correct signup links
- [ ] Users can sign up via invitation link
- [ ] Roles are assigned after email confirmation
- [ ] Users can access project after role assignment
- [ ] Non-Project Managers cannot access invitation page
- [ ] Non-Project Sponsors cannot assign roles during creation

## Future Enhancements

1. **Bulk Invitations:**
   - Invite multiple users at once
   - CSV upload for bulk invitations

2. **Role Templates:**
   - Save common role combinations
   - Quick assignment of multiple roles

3. **Invitation Management:**
   - Resend invitations
   - Cancel pending invitations
   - View invitation history

4. **Notifications:**
   - Email notifications for role assignments
   - In-app notifications for new invitations

---

**Status:** ✅ Implementation Complete
**Last Updated:** 2025-01-27

