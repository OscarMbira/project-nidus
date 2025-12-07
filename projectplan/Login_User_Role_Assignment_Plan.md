# Login and User Role Assignment System - Implementation Plan

## Executive Summary
This plan outlines the comprehensive implementation of a multi-tenant login and role assignment system that allows Programme/Project Managers to:
1. Subscribe to the PM Platform
2. Create project-specific roles
3. Register up to 30 project users without additional subscription
4. Purchase additional user seats at a discounted rate
5. Assign roles to project users

## Context
- **Document Reference**: `Documents/Proposed Login Flow`
- **Existing Infrastructure**:
  - PM subscriptions (v82_pm_subscriptions.sql)
  - User access tables (v03_user_access_tables.sql)
  - Project core tables (v04_project_core_tables.sql)
  - Role service (roleService.js)
- **Database**: PostgreSQL 15+ (Supabase)
- **Payment Provider**: Paynow (replacing Stripe references)

## System Architecture

### Key Concepts
1. **Account (Organization)** - Top-level entity owned by a Programme/Project Manager
2. **Subscription** - Billing relationship tied to an Account
3. **Project** - Work units within an Account
4. **Project Roles** - Project-specific roles with custom permissions
5. **Project Memberships** - User assignments to projects with roles
6. **Seat Management** - Track and enforce user limits per project

---

## Database Schema Design

### New Tables Required

#### 1. accounts
**Purpose**: Organization/company entity owned by Programme/Project Manager

```sql
- id (UUID, PK)
- owner_user_id (UUID, FK → users.id) -- Programme/Project Manager
- account_name (VARCHAR) -- Company/Organization name
- account_code (VARCHAR, UNIQUE) -- Short code
- billing_email (VARCHAR)
- account_type (VARCHAR) -- 'individual', 'company', 'enterprise'
- is_active (BOOLEAN)
- created_at, updated_at, audit fields
```

#### 2. project_roles
**Purpose**: Project-specific roles with custom permissions

```sql
- id (UUID, PK)
- project_id (UUID, FK → projects.id)
- role_name (VARCHAR) -- e.g., 'Project Board', 'Team Manager'
- role_description (TEXT)
- is_system_default (BOOLEAN) -- Pre-defined roles
- permissions (JSONB) -- Array of permission keys
- role_level (INTEGER) -- Hierarchy level
- is_active (BOOLEAN)
- created_at, updated_at, audit fields
```

#### 3. project_memberships
**Purpose**: User-to-project assignments with roles

```sql
- id (UUID, PK)
- project_id (UUID, FK → projects.id)
- user_id (UUID, FK → users.id)
- role_id (UUID, FK → project_roles.id)
- invited_by_user_id (UUID, FK → users.id)
- invitation_status (VARCHAR) -- 'pending', 'accepted', 'expired', 'declined'
- invitation_token (VARCHAR, UNIQUE)
- invitation_sent_at (TIMESTAMP)
- invitation_expires_at (TIMESTAMP)
- accepted_at (TIMESTAMP)
- is_active (BOOLEAN)
- created_at, updated_at, audit fields
```

#### 4. project_seat_allocations
**Purpose**: Track seat usage and limits per project

```sql
- id (UUID, PK)
- project_id (UUID, FK → projects.id)
- account_id (UUID, FK → accounts.id)
- subscription_id (UUID, FK → pm_subscriptions.id)
- included_seats (INTEGER) -- Default 30
- extra_seats_purchased (INTEGER) -- Additional seats bought
- total_seats (INTEGER, COMPUTED) -- included + extra
- current_user_count (INTEGER, COMPUTED) -- Active memberships
- available_seats (INTEGER, COMPUTED) -- total - current
- last_calculated_at (TIMESTAMP)
- created_at, updated_at
```

#### 5. extra_seat_purchases
**Purpose**: Track additional seat purchases beyond base limit

```sql
- id (UUID, PK)
- project_id (UUID, FK → projects.id)
- account_id (UUID, FK → accounts.id)
- seats_purchased (INTEGER)
- price_per_seat (DECIMAL)
- total_amount (DECIMAL)
- currency (VARCHAR)
- payment_provider (VARCHAR) -- 'paynow'
- payment_reference (VARCHAR)
- payment_status (VARCHAR) -- 'pending', 'completed', 'failed'
- purchased_by_user_id (UUID, FK → users.id)
- purchased_at (TIMESTAMP)
- created_at, updated_at
```

#### 6. permission_definitions
**Purpose**: System-wide permission catalog

```sql
- id (UUID, PK)
- permission_key (VARCHAR, UNIQUE) -- 'project.view', 'tasks.edit'
- permission_name (VARCHAR)
- permission_description (TEXT)
- permission_category (VARCHAR) -- 'project', 'tasks', 'users', 'billing'
- is_system_permission (BOOLEAN)
- is_active (BOOLEAN)
- created_at, updated_at
```

---

## Implementation Phases

### Phase 1: Database Foundation
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create SQL file: `v84_multi_tenant_accounts.sql`
  - Create `accounts` table
  - Create `project_roles` table
  - Create `project_memberships` table
  - Create `project_seat_allocations` table
  - Create `extra_seat_purchases` table
  - Create `permission_definitions` table
  - Add indexes for performance
  - Enable RLS policies
  - Create database triggers for seat count calculations

- [ ] Create SQL file: `v85_default_project_roles_seed.sql`
  - Seed default project roles (system defaults):
    - Project Board (Executive oversight)
    - Project Director (Strategic direction)
    - Programme Manager (Multi-project coordination)
    - Project Manager (Day-to-day management)
    - Team Manager/Lead (Team supervision)
    - Project Assurance (Quality oversight)
    - Quality Assurance (Quality validation)
    - Business Analyst (Requirements)
    - Project Member (Execution)

- [ ] Create SQL file: `v86_permission_definitions_seed.sql`
  - Seed permission definitions:
    - project.view, project.edit, project.delete
    - project.manage_users, project.manage_roles
    - project.view_billing, project.manage_billing
    - tasks.view, tasks.create, tasks.edit, tasks.delete
    - risks.view, risks.create, risks.edit
    - documents.view, documents.upload, documents.delete
    - reports.view, reports.export
    - settings.view, settings.edit

- [ ] Update `projects` table schema
  - Add `account_id` (FK → accounts.id)
  - Add `project_manager_user_id` (FK → users.id)
  - Migration script for existing projects

- [ ] Update `pm_subscriptions` table schema
  - Add `account_id` (FK → accounts.id)
  - Add `base_included_users_per_project` (INTEGER, default 30)
  - Add `extra_user_discount_rate` (DECIMAL) -- e.g., 0.20 for 20% off
  - Migration script for existing subscriptions

---

### Phase 2: Backend Services
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create `src/services/accountService.js`
  - `createAccount(ownerUserId, accountData)`
  - `getAccountById(accountId)`
  - `getAccountByOwnerId(userId)`
  - `updateAccount(accountId, updates)`
  - `getAccountProjects(accountId)`
  - `getAccountSubscription(accountId)`

- [ ] Create `src/services/projectRoleService.js`
  - `getProjectRoles(projectId)`
  - `createProjectRole(projectId, roleData)`
  - `updateProjectRole(roleId, updates)`
  - `deleteProjectRole(roleId)` -- with safeguards
  - `getDefaultProjectRoles()` -- system defaults
  - `cloneRolesFromTemplate(projectId, templateId)`

- [ ] Create `src/services/projectMembershipService.js`
  - `inviteUserToProject(projectId, invitationData)`
  - `acceptInvitation(token)`
  - `declineInvitation(token)`
  - `getProjectMembers(projectId)`
  - `updateMemberRole(membershipId, newRoleId)`
  - `removeMemberFromProject(membershipId)`
  - `resendInvitation(membershipId)`
  - `checkSeatAvailability(projectId)`

- [ ] Create `src/services/seatManagementService.js`
  - `getProjectSeatAllocation(projectId)`
  - `calculateSeatUsage(projectId)`
  - `purchaseExtraSeats(projectId, seatCount, paymentData)`
  - `getSeatPurchaseHistory(projectId)`
  - `canAddMoreUsers(projectId)` -- validation

- [ ] Create `src/services/invitationService.js`
  - `generateInvitationToken()`
  - `sendInvitationEmail(email, invitationData)`
  - `validateInvitationToken(token)`
  - `expireOldInvitations()` -- cleanup job

- [ ] Update `src/services/pmSubscriptionService.js`
  - Add account integration
  - Add seat limit configuration
  - Add extra seat pricing

---

### Phase 3: Authentication & Registration Flows
**Status**: ⬜ Pending

#### Tasks:
- [ ] Update `src/pages/auth/Register.jsx`
  - Add account creation during PM platform registration
  - Collect account/organization name
  - Auto-create account on successful registration
  - Link subscription to account

- [ ] Create `src/pages/onboarding/PMAccountSetup.jsx`
  - Multi-step onboarding for Programme/Project Managers
  - Step 1: Account information (name, type)
  - Step 2: First project creation
  - Step 3: Default role customization
  - Step 4: Team invitation (optional)

- [ ] Create `src/pages/auth/InvitationAccept.jsx`
  - Accept invitation flow for non-paying users
  - If new user: set password form
  - If existing user: confirm and accept
  - Auto-login after acceptance
  - Redirect to project dashboard

- [ ] Update `src/pages/auth/Login.jsx`
  - Add project picker after login (if multiple projects)
  - Store selected project in session
  - Redirect to appropriate dashboard

---

### Phase 4: Project User Management UI
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create `src/pages/app/ProjectUsers.jsx`
  - Table listing all project members
  - Columns: Name, Email, Role, Status, Last Login, Actions
  - Seat usage indicator (e.g., "24 / 30 seats used")
  - Progress bar for seat usage visualization
  - "Invite User" button
  - Bulk actions (remove, change role)
  - Filter by role, status
  - Search by name/email

- [ ] Create `src/components/app/InviteUserModal.jsx`
  - Form fields: Name, Email, Role (dropdown)
  - Real-time seat availability check
  - Warning if approaching seat limit
  - Error handling if seat limit exceeded
  - Success confirmation with invitation link

- [ ] Create `src/components/app/PurchaseExtraSeatsModal.jsx`
  - Seat calculator (current, desired, cost)
  - Pricing display with discount
  - Paynow checkout integration
  - Payment confirmation
  - Auto-update seat allocation on success

- [ ] Create `src/components/app/SeatUsageWidget.jsx`
  - Visual seat usage indicator
  - Total seats, used seats, available seats
  - Warning states (>80%, 100%)
  - Quick link to purchase more seats
  - Usage history chart

---

### Phase 5: Project Role Management UI
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create `src/pages/app/ProjectRoles.jsx`
  - Table listing all project roles
  - System roles vs. custom roles distinction
  - Role level hierarchy visualization
  - Add/Edit/Delete custom roles
  - Assign permissions matrix

- [ ] Create `src/components/app/RoleEditorModal.jsx`
  - Role name, description, level
  - Permission checkboxes grouped by category
  - Visual permission inheritance (if using hierarchy)
  - Preview of users with this role
  - Validation (prevent deleting role in use)

- [ ] Create `src/components/app/PermissionMatrix.jsx`
  - Grid view: Roles (columns) × Permissions (rows)
  - Quick role comparison
  - Bulk permission assignment
  - Export role definitions

---

### Phase 6: Subscription & Billing Integration
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create `src/services/paynowService.js`
  - Initialize Paynow client
  - Create checkout session for subscription
  - Create checkout session for extra seats
  - Handle payment webhooks
  - Verify payment status

- [ ] Create `src/pages/checkout/SubscriptionCheckout.jsx`
  - Plan selection (Starter, Professional, Enterprise)
  - Display base seat limits (30 users)
  - Extra seat pricing information
  - Redirect to Paynow
  - Handle return from Paynow

- [ ] Create `src/pages/checkout/ExtraSeatsCheckout.jsx`
  - Current seat allocation display
  - Seat quantity selector
  - Price calculation with discount
  - Redirect to Paynow
  - Handle payment confirmation

- [ ] Create webhook endpoint: `src/api/webhooks/paynow.js`
  - Validate webhook signature
  - Handle subscription events (created, updated, cancelled)
  - Handle extra seat purchase events
  - Update database records
  - Send confirmation emails

---

### Phase 7: Access Control & Permissions
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create `src/utils/permissionChecker.js`
  - `getUserProjectPermissions(userId, projectId)`
  - `hasPermission(userId, projectId, permissionKey)`
  - `hasAnyPermission(userId, projectId, permissionKeys[])`
  - `hasAllPermissions(userId, projectId, permissionKeys[])`
  - Cache permission checks for performance

- [ ] Create `src/hooks/useProjectPermissions.js`
  - React hook for permission checking
  - `const { hasPermission, loading } = useProjectPermissions(projectId)`
  - Auto-refresh on role changes

- [ ] Create `src/components/auth/PermissionGate.jsx`
  - Declarative permission-based rendering
  - `<PermissionGate permission="tasks.edit">...</PermissionGate>`
  - Fallback UI for unauthorized access

- [ ] Update `src/components/ProtectedRoute.jsx`
  - Add project-level permission checks
  - Redirect to appropriate error page
  - Support multi-level auth (account → project → permission)

---

### Phase 8: RLS Policies & Security
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create SQL file: `v87_project_membership_rls.sql`
  - RLS policies for `accounts` table
  - RLS policies for `project_roles` table
  - RLS policies for `project_memberships` table
  - RLS policies for `project_seat_allocations` table
  - RLS policies for `extra_seat_purchases` table
  - Secure functions for permission checks

- [ ] Implement row-level security rules:
  - Users can only see accounts they own or are members of
  - Users can only see projects they're members of
  - Only account owners can manage subscriptions
  - Only users with `project.manage_users` can invite
  - Only users with `project.manage_roles` can edit roles
  - Only users with `project.manage_billing` can purchase seats

---

### Phase 9: Email Notifications
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create email templates:
  - `templates/email/project-invitation.html`
  - `templates/email/invitation-accepted.html`
  - `templates/email/seat-limit-warning.html`
  - `templates/email/seat-purchase-confirmation.html`
  - `templates/email/role-changed.html`

- [ ] Update `src/services/emailService.js`
  - `sendProjectInvitation(email, invitationData)`
  - `sendInvitationAcceptedNotification(projectManager, userData)`
  - `sendSeatLimitWarning(accountOwner, projectData)`
  - `sendSeatPurchaseConfirmation(purchaser, purchaseData)`
  - `sendRoleChangedNotification(user, roleData)`

---

### Phase 10: Testing
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create unit tests:
  - `tests/services/accountService.test.js`
  - `tests/services/projectRoleService.test.js`
  - `tests/services/projectMembershipService.test.js`
  - `tests/services/seatManagementService.test.js`
  - `tests/utils/permissionChecker.test.js`

- [ ] Create integration tests:
  - Full invitation flow (invite → accept → login)
  - Seat limit enforcement
  - Extra seat purchase flow
  - Role assignment and permission checks
  - Subscription-to-account linking

- [ ] Create E2E tests:
  - Programme Manager signup journey
  - First project creation
  - User invitation and acceptance
  - Seat limit exceeded scenario
  - Extra seat purchase

---

### Phase 11: Documentation
**Status**: ⬜ Pending

#### Tasks:
- [ ] Create `Documentation/Multi_Tenant_Architecture.md`
  - System overview
  - Entity relationship diagram
  - Data flow diagrams

- [ ] Create `Documentation/Project_User_Management_Guide.md`
  - How to invite users
  - How to manage roles
  - How to purchase extra seats
  - Best practices

- [ ] Create `Documentation/Permission_System_Guide.md`
  - Permission catalog
  - How to create custom roles
  - Permission inheritance
  - Security considerations

- [ ] Create `Documentation/Subscription_Seat_Management.md`
  - Seat limits per plan
  - Extra seat pricing
  - Billing FAQ
  - Upgrade/downgrade flows

---

## User Flows

### Flow 1: Programme/Project Manager Subscription Sign-up
1. User visits marketing site
2. Clicks "Start Free Trial" or "Subscribe"
3. Fills registration form:
   - Full name, email, password
   - Account/Organization name
   - Platform selection (PM Platform)
   - Preferred plan (Starter/Professional/Enterprise)
4. Email verification sent
5. User verifies email
6. Redirected to Paynow checkout (if paid plan)
7. Payment completed
8. Account created
9. PM subscription created and linked to account
10. Onboarding flow starts:
    - Create first project
    - Customize default roles (optional)
    - Invite team members (optional)
11. Dashboard redirect

### Flow 2: Non-Paying User Invitation (Within Seat Limit)
1. Project Manager opens "Project Users" page
2. Clicks "Invite User"
3. Enters: Name, Email, Role
4. System checks seat availability
5. If available:
   - Creates pending membership record
   - Generates invitation token
   - Sends invitation email
6. Invited user receives email
7. Clicks invitation link
8. If new user:
   - Set password form
   - Accept invitation
9. If existing user:
   - Confirm and accept
10. User logged in
11. Redirected to project dashboard
12. Can access project based on assigned role

### Flow 3: Extra Seat Purchase (Beyond 30 Users)
1. Project Manager tries to invite 31st user
2. System shows "Seat Limit Exceeded" error
3. Modal appears: "Purchase Extra Seats"
4. Manager selects quantity (e.g., 10 seats)
5. System calculates: 10 × $X (discounted price) = $Y
6. Clicks "Purchase"
7. Redirected to Paynow checkout
8. Payment completed
9. System updates `extra_seats_purchased` in database
10. Manager receives confirmation email
11. Can now invite more users up to new limit (40 total)

### Flow 4: Project Role Assignment
1. Project Manager opens "Project Roles" page
2. Views default roles (system roles)
3. Creates custom role:
   - Role name: "Technical Lead"
   - Description: "Leads technical team"
   - Permissions: Select from matrix
4. Saves custom role
5. Returns to "Project Users" page
6. Selects user
7. Clicks "Change Role"
8. Selects "Technical Lead" from dropdown
9. Confirms
10. User's permissions updated immediately
11. User receives notification email

---

## Data Model Relationships

```
accounts (1) ──< (many) pm_subscriptions
accounts (1) ──< (many) projects
accounts (1) ──< (many) users (via owner_user_id)

projects (1) ──< (many) project_roles
projects (1) ──< (many) project_memberships
projects (1) ──── (1) project_seat_allocations
projects (1) ──< (many) extra_seat_purchases

users (1) ──< (many) project_memberships
project_roles (1) ──< (many) project_memberships

project_roles (1) ──< (many) permissions (JSONB array)
```

---

## Seat Limit Logic

### Default Limits by Plan
- **Free**: 1 project, 5 team members
- **Starter**: 10 projects, 30 team members per project
- **Professional**: Unlimited projects, 30 team members per project (base)
- **Enterprise**: Unlimited projects, custom team limits

### Seat Calculation
```javascript
total_seats = included_seats + extra_seats_purchased
current_user_count = COUNT(active project_memberships)
available_seats = total_seats - current_user_count

can_invite = available_seats > 0
```

### Extra Seat Pricing (Example)
- Base plan: $29/month (30 users)
- Extra seat: $0.80/user/month (70% discount from $2.67 per user)
- 10 extra seats: $8/month additional

---

## Permission System Architecture

### Permission Categories
1. **Project Management**: view, edit, delete, archive
2. **User Management**: view, invite, remove, change_role
3. **Role Management**: view, create, edit, delete
4. **Task Management**: view, create, edit, delete, assign
5. **Risk Management**: view, create, edit, delete
6. **Document Management**: view, upload, download, delete
7. **Reporting**: view, export, schedule
8. **Billing**: view, manage, purchase_seats
9. **Settings**: view, edit

### Default Role Permission Matrix

| Permission | Project Board | Programme Manager | Project Manager | Team Lead | Project Member |
|------------|---------------|-------------------|-----------------|-----------|----------------|
| project.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| project.edit | ✓ | ✓ | ✓ | - | - |
| project.manage_users | ✓ | ✓ | ✓ | - | - |
| project.manage_roles | ✓ | ✓ | - | - | - |
| project.manage_billing | ✓ | - | - | - | - |
| tasks.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| tasks.edit | - | ✓ | ✓ | ✓ | ✓ |
| risks.view | ✓ | ✓ | ✓ | ✓ | - |
| reports.export | ✓ | ✓ | ✓ | - | - |

---

## Security Considerations

1. **Rate Limiting**
   - Max 10 invitations per hour per user
   - Max 5 extra seat purchases per day per account

2. **Token Expiration**
   - Invitation tokens expire after 7 days
   - Email verification tokens expire after 24 hours

3. **Audit Logging**
   - Log all invitation sends/accepts
   - Log all role changes
   - Log all seat purchases
   - Log all permission checks (for security analysis)

4. **Row-Level Security**
   - Users can only access projects they're members of
   - Account owners have full access to their accounts
   - Project Managers can only manage their projects

5. **Payment Security**
   - Use Paynow's secure checkout (PCI compliant)
   - Verify webhook signatures
   - Store minimal payment info (reference IDs only)

---

## API Endpoints Summary

### Account Management
- `POST /api/accounts` - Create account
- `GET /api/accounts/:id` - Get account details
- `PATCH /api/accounts/:id` - Update account
- `GET /api/accounts/:id/projects` - List account projects
- `GET /api/accounts/:id/subscription` - Get account subscription

### Project Users
- `GET /api/projects/:id/members` - List project members
- `POST /api/projects/:id/members/invite` - Invite user
- `PATCH /api/projects/:id/members/:memberId` - Update member
- `DELETE /api/projects/:id/members/:memberId` - Remove member
- `POST /api/projects/:id/members/:memberId/resend` - Resend invitation

### Project Roles
- `GET /api/projects/:id/roles` - List project roles
- `POST /api/projects/:id/roles` - Create custom role
- `PATCH /api/projects/:id/roles/:roleId` - Update role
- `DELETE /api/projects/:id/roles/:roleId` - Delete role
- `GET /api/projects/:id/roles/default` - Get default roles

### Seat Management
- `GET /api/projects/:id/seats` - Get seat allocation
- `POST /api/projects/:id/seats/purchase` - Purchase extra seats
- `GET /api/projects/:id/seats/history` - Purchase history

### Invitations
- `GET /api/invitations/:token` - Get invitation details
- `POST /api/invitations/:token/accept` - Accept invitation
- `POST /api/invitations/:token/decline` - Decline invitation

### Permissions
- `GET /api/permissions` - List all permissions
- `GET /api/projects/:id/permissions/:userId` - Get user permissions
- `POST /api/permissions/check` - Check permission

---

## Migration Strategy for Existing Users

### For Existing Projects
1. Create default account for each project owner
2. Link existing projects to accounts
3. Create default project roles for each project
4. Create project memberships for existing team members
5. Assign default role to all members
6. Calculate and set initial seat allocations

### Migration Script Steps
```sql
-- 1. Create accounts for existing project owners
INSERT INTO accounts (owner_user_id, account_name, ...)
SELECT DISTINCT project_owner_id, 'Default Account', ...
FROM projects;

-- 2. Link projects to accounts
UPDATE projects
SET account_id = (
  SELECT id FROM accounts WHERE owner_user_id = projects.project_owner_id
);

-- 3. Create default roles for each project
INSERT INTO project_roles (project_id, role_name, is_system_default, ...)
SELECT id, 'Project Member', true, ...
FROM projects;

-- 4. Continue migration...
```

---

## Timeline Estimate

| Phase | Tasks | Complexity | Dependencies |
|-------|-------|------------|--------------|
| Phase 1 | Database Foundation | High | None |
| Phase 2 | Backend Services | High | Phase 1 |
| Phase 3 | Auth & Registration | Medium | Phase 1, 2 |
| Phase 4 | User Management UI | Medium | Phase 2, 3 |
| Phase 5 | Role Management UI | Medium | Phase 2, 3 |
| Phase 6 | Billing Integration | High | Phase 2, Paynow setup |
| Phase 7 | Access Control | High | Phase 2, 5 |
| Phase 8 | RLS & Security | High | Phase 1, 7 |
| Phase 9 | Email Notifications | Low | Phase 2 |
| Phase 10 | Testing | Medium | All phases |
| Phase 11 | Documentation | Low | All phases |

---

## Success Criteria

### Functional Requirements
✓ Programme/Project Manager can subscribe to PM Platform
✓ Account is created and linked to subscription
✓ First project can be created with default roles
✓ Project Manager can invite up to 30 users without extra cost
✓ Invited users receive email with set password link
✓ New users can accept invitation and access project
✓ Existing users can accept invitation using current account
✓ System enforces 30-user seat limit
✓ Project Manager can purchase extra seats via Paynow
✓ Extra seat purchases update available seat count
✓ Project Manager can create custom project roles
✓ Project Manager can assign roles to users
✓ Users can only access features permitted by their role
✓ All actions respect RLS policies

### Non-Functional Requirements
✓ Page load time < 2 seconds
✓ Permission checks cached for performance
✓ Invitation emails sent within 30 seconds
✓ Payment processing completes within 10 seconds
✓ System supports 1000+ concurrent users
✓ Database queries optimized with proper indexes
✓ All sensitive data encrypted at rest
✓ PCI compliance via Paynow integration
✓ Comprehensive audit trail for security events

---

## Rollback Plan

### If Critical Issues Occur
1. **Database Issues**
   - Keep backup of schema before migration
   - Create rollback SQL scripts for each version
   - Test rollback on staging first

2. **Payment Integration Issues**
   - Maintain manual seat upgrade option
   - Fallback to admin-managed seat allocation
   - Queue failed payments for retry

3. **User Access Issues**
   - Emergency bypass for RLS policies (admin only)
   - Temporary role override for critical users
   - Audit all emergency access

---

## Post-Launch Monitoring

### Key Metrics to Track
1. **Adoption Metrics**
   - Number of accounts created per day
   - Number of projects per account
   - Average team size per project

2. **Usage Metrics**
   - Seat utilization rate (used/total)
   - Invitation acceptance rate
   - Extra seat purchase conversion rate

3. **Performance Metrics**
   - API response times
   - Permission check latency
   - Database query performance

4. **Financial Metrics**
   - Extra seat revenue per month
   - Average seats per project
   - Churn rate by plan type

---

## Review Section
*(To be completed after implementation)*

### Changes Made
- List all major changes
- Deviations from plan
- Unexpected challenges

### Lessons Learned
- What went well
- What could be improved
- Future enhancements

### Technical Debt
- Known issues to address
- Performance optimizations needed
- Refactoring opportunities

---

## Appendix

### A. Default Project Roles Definition
```json
[
  {
    "role_name": "Project Board",
    "role_level": 10,
    "permissions": ["project.view", "project.edit", "project.manage_billing", ...]
  },
  {
    "role_name": "Project Manager",
    "role_level": 8,
    "permissions": ["project.view", "project.edit", "project.manage_users", ...]
  },
  // ... more roles
]
```

### B. Email Template Variables
```
Invitation Email:
- {{inviter_name}}
- {{project_name}}
- {{role_name}}
- {{invitation_link}}
- {{expiry_date}}
```

### C. Environment Variables Required
```env
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_RETURN_URL=https://yourdomain.com/checkout/success
PAYNOW_RESULT_URL=https://yourdomain.com/api/webhooks/paynow

BASE_SEAT_LIMIT=30
EXTRA_SEAT_PRICE=0.80
INVITATION_EXPIRY_DAYS=7
```

---

**Plan Created**: 2025-11-27
**Plan Version**: 1.0
**Status**: Awaiting Approval
**Next Action**: Review and approve plan before implementation
