# Role Selection Implementation Guide

## Overview

This document describes the role selection feature implementation for Project Nidus, including best practices and user flow recommendations.

## Best Practice Recommendation: Post-Registration Onboarding

**Recommended Flow: After Email Confirmation**

### Why After Registration?

1. **Simpler Registration**: Keeps the signup process quick and focused
2. **Verified Users**: Only verified users proceed to role selection (more committed)
3. **Better UX**: Users can learn about roles before selecting
4. **Flexible**: Organizations can assign roles later if needed
5. **Onboarding Flow**: Can be part of a multi-step onboarding process

### User Flow

```
Registration → Email Confirmation → Role Selection → Dashboard
```

## Implementation Details

### 1. Role Service (`src/services/roleService.js`)

Provides functions for:
- `getAvailableRoles()` - Fetch all selectable roles (excludes system/admin roles)
- `getUserRoles(userId)` - Get user's current roles
- `assignUserRoles(userId, roleIds)` - Assign role(s) to user
- `hasCompletedOnboarding(userId)` - Check if user has completed onboarding

### 2. Role Selection Component (`src/pages/onboarding/RoleSelection.jsx`)

Features:
- Visual role cards with descriptions
- Multiple role selection support
- Role descriptions and feature lists
- Pre-selection of default role (if configured)
- Skip option for flexibility
- Clear visual feedback

### 3. Available Roles

Based on the system's role structure:

- **Project Manager**: Full project management capabilities
- **Team Lead**: Team coordination and task management
- **Team Member**: Task execution and progress updates
- **Stakeholder**: Read-only project access
- **Viewer**: Minimal read-only access

### 4. Integration Points

- **Email Confirmation**: Redirects to role selection after successful verification
- **Protected Routes**: Can optionally check for role assignment
- **Dashboard**: Accessible after role selection (or skip)

## Configuration

### Supabase Setup

1. Ensure `roles` table is populated with seed data
2. Configure default role in `roles` table (`is_default_role = true`)
3. Set up proper RLS policies for `user_roles` table

### Customization

To customize available roles:
1. Update `getAvailableRoles()` to filter specific roles
2. Modify `roleDescriptions` in `RoleSelection.jsx` for custom descriptions
3. Add role icons in `roleIcons` mapping

## User Experience

### Role Selection Page Features

- **Visual Cards**: Each role displayed as an interactive card
- **Descriptions**: Clear explanation of each role's responsibilities
- **Feature Lists**: Bullet points showing what each role can do
- **Multiple Selection**: Users can select multiple roles
- **Skip Option**: Allows users to proceed without selecting (roles can be assigned later)

### Best Practices Applied

1. **Progressive Disclosure**: Information shown when needed
2. **Clear Communication**: Role descriptions help users make informed choices
3. **Flexibility**: Skip option prevents blocking users
4. **Visual Feedback**: Selected roles are clearly highlighted
5. **Accessibility**: Keyboard navigation and screen reader support

## Alternative Approaches Considered

### During Registration (Not Recommended)

**Pros:**
- Everything in one flow
- Immediate role assignment

**Cons:**
- Longer registration process
- Users may not understand roles yet
- Less flexible
- Can overwhelm new users

### Hybrid Approach (Optional)

Could be implemented as:
- Optional during registration
- Required after email confirmation
- Can be skipped but recommended

## Future Enhancements

1. **Role Recommendations**: Based on user profile or organization
2. **Organization-Level Roles**: Assign roles based on organization membership
3. **Role Templates**: Pre-configured role sets for common scenarios
4. **Role Preview**: Show dashboard preview based on selected role
5. **Analytics**: Track which roles are most commonly selected

## Testing Checklist

- [ ] Role selection page loads correctly
- [ ] All available roles are displayed
- [ ] Multiple role selection works
- [ ] Role assignment saves to database
- [ ] Skip functionality works
- [ ] Redirect to dashboard after selection
- [ ] Error handling for failed assignments
- [ ] Mobile responsiveness
- [ ] Accessibility compliance

## Security Considerations

1. **Role Validation**: Only allow assignment of non-system roles
2. **User Verification**: Ensure user is authenticated before role assignment
3. **RLS Policies**: Proper row-level security on `user_roles` table
4. **Audit Trail**: Role assignments are logged in audit fields

## Support

For questions or issues:
- Check `src/services/roleService.js` for service functions
- Review `src/pages/onboarding/RoleSelection.jsx` for UI implementation
- Refer to SQL seed data for available roles

