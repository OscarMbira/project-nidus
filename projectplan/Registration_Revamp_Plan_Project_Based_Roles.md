# Registration Flow Revamp - Project-Based Roles
## Aligned with Unified_Login_System_Plan.md

**Version:** 1.0
**Date:** 2025-12-09
**Status:** Planning
**Author:** Development Team

---

## Executive Summary

This plan revamps the registration flow to align with the Unified Login System architecture, focusing on **account and project-based roles** instead of system-wide roles. Users do NOT select roles during registration. Roles are assigned based on their relationship to projects and accounts.

### Key Principles

1. **No Role Selection During Registration** - Registration collects only basic info and platform preference
2. **Account Created First** - Account (organization) is created IMMEDIATELY during registration, before email verification
3. **Account Owner Assigned Immediately** - User who creates account gets Account Owner role right away
4. **Project-Based Roles** - Roles are assigned per project, not globally (Project Board Member, Sponsor, Manager, etc.)
5. **Same User, Multiple Roles** - A user can have different roles in different projects
6. **Subscription Per Project** - Each project has its own subscription with 30 base seats + extra seats
7. **One System Role Only** - Only "Account Owner" role exists in this app (System Admin and Billing Manager in separate admin app)

---

## Current State Issues

### What's Wrong Now ❌

1. **RoleSelection.jsx During Onboarding** - Assigns system-wide roles (wrong approach)
2. **System Roles in public.roles** - Used as if they're project roles (confusion)
3. **No Account Creation Flow** - Missing account setup for Platform users
4. **No Project Role Assignment** - No mechanism for project-specific roles
5. **Registration asks for roles** - User shouldn't select roles during signup

### What Should Happen ✅

1. **Registration = Basic Info Only** - Name, email, password, platform selection
2. **Automatic Role Assignment** - Based on account/project relationship
3. **Account Owners** - First user to create account gets Account Owner (system role)
4. **Project Roles** - Assigned when user creates/joins projects
5. **Multi-Project Support** - Same user can have different roles in different projects

---

## Role System Architecture (Correct Understanding)

### Two Distinct Role Systems

#### 1. System Roles (public.roles - System-Wide)

**Purpose:** Control system-level access, not project access

**Roles:**
- **Account Owner** - Owns the account/organization (auto-assigned to account creator)

**Important Notes:**
- ❌ **System Admin** - NOT in this application (separate admin app with different URL for security)
- ❌ **Billing Manager** - NOT in this application (separate admin app)

**Assignment:**
- **Account Owner:** Automatic when user creates an account during registration

**Stored In:** `public.user_roles` linking to `public.roles`

#### 2. Project Roles (project_roles - Project-Specific)

**Purpose:** Control access within specific projects

**Template Roles (Pre-defined - Organization Hierarchy):**
- Project Board Member (Executive oversight and governance)
- Project Sponsor/Executive (Project sponsorship and strategic direction)
- Programme Manager (Multi-project coordination)
- Project Manager (Day-to-day project management)
- Team Manager (Team supervision)
- Project Assurance (Quality and compliance oversight)
- Quality Assurance (Quality validation and testing)
- Change Authority (Change control and approval)
- Team Member (Task execution and delivery)

**Important:** These are templates. System supports dynamic creation of additional project roles.

**Custom Roles:**
- Created by Project Managers
- Project-specific permissions
- Tailored to organization needs

**Assignment:**
- **Project Creator:** Gets "Project Manager" role in their first project
- **Invited Users:** Get role assigned by inviter (e.g., "Team Member", "Team Manager")
- **Multi-Project:** Same user can be "Project Manager" in Project A and "Team Member" in Project B

**Stored In:** `project_memberships` linking `user_id` + `project_id` + `project_role_id`

### Key Difference

| Aspect | System Roles | Project Roles |
|--------|-------------|---------------|
| **Scope** | System-wide | Project-specific |
| **Assignment** | Automatic/Manual (rare) | Through project membership |
| **Table** | `user_roles` | `project_memberships` |
| **Example** | "Account Owner" | "Project Manager in Project A" |
| **Quantity** | 1 per user typically | Many (one per project) |

---

## Correct Registration Flow (Per Unified Plan)

### Flow 1: New User - Platform Only

```
Step 1: Registration Form
├─ Full Name: "John Doe"
├─ Email: "john@company.com"
├─ Password: "********"
├─ Confirm Password: "********"
├─ Platform Selection:
│  └─ [x] Platform - Manage real projects
│     [ ] Simulator - Practice and learn
└─ [Create Account Button]

Step 2: User Record Creation (IMMEDIATE - Before Email Verification)
├─ System creates:
│  ├─ Auth user record (Supabase Auth)
│  ├─ User record (public.users)
│  │  └─ is_verified: false (will be set to true after email verification)
│  └─ Platform access record (user_platform_access)
│     └─ platform: 'platform', has_registered: true
│
└─ NO Account created yet (prevents unverified accounts)
   └─ NO Role assigned yet

Step 3: Email Verification
├─ Confirmation email sent
├─ User clicks verification link
└─ Email verified ✓

Step 4: Account Creation (AFTER Email Verification)
├─ System creates (in EmailConfirmation.jsx after successful verification):
│  ├─ Account record (public.accounts) ← CREATED AFTER VERIFICATION
│  │  ├─ owner_user_id: current_user_id
│  │  └─ account_name: "John Doe's Organization" (default, can change later)
│  │
│  └─ ASSIGN SYSTEM ROLE: Account Owner
│     └─ INSERT INTO user_roles (user_id, role_id)
│        VALUES (current_user_id, 'account_owner_role_id')
│
└─ Redirect to Onboarding
   └─ Redirect to: /onboarding/platform-account-setup

Step 5: Platform Account Setup Wizard (Multi-Step)

   5a. Account Information (OPTIONAL - Account Already Created with Default Name)
   ├─ Account Name: "Acme Corporation" (edit existing default name)
   ├─ Account Type: [Individual | Company | Enterprise]
   └─ Billing Email: "billing@acme.com"
   └─ [Skip] option available (account already exists, can edit later)

   5b. Create First Project (REQUIRED)
   ├─ Project Name: "Website Redesign"
   ├─ Project Description: "..."
   ├─ Start Date: "2025-01-15"
   ├─ End Date: "2025-06-30"
   └─ Subscription Plan: [Free | Starter | Professional]

   5c. Review & Confirm
   └─ Show summary of project + subscription

Step 6: System Creates (On Wizard Completion)
├─ Project record (public.projects)
│  ├─ account_id: existing_account_id (created in Step 4 after verification)
│  └─ project_manager_user_id: current_user_id
│
├─ Project subscription (public.pm_subscriptions) ← PER PROJECT
│  ├─ project_id: new_project_id
│  ├─ account_id: existing_account_id
│  ├─ plan_type: 'free' (or selected plan)
│  └─ status: 'active'
│
├─ ASSIGN PROJECT ROLE: Project Manager
│  └─ INSERT INTO project_memberships (project_id, user_id, project_role_id)
│     VALUES (new_project_id, current_user_id, 'project_manager_role_id')
│
└─ Create seat allocation (project_seat_allocations)
   ├─ project_id: new_project_id
   ├─ subscription_id: new_subscription_id
   ├─ included_seats: 30 (base for free plan)
   └─ current_user_count: 1

Step 7: Redirect to Dashboard
└─ Redirect to: /app/dashboard
   └─ User now has:
      ├─ System Role: Account Owner (assigned in Step 4 after email verification)
      ├─ Account: "Acme Corporation" (owns the organization, created in Step 4)
      └─ Project Role: Project Manager (in first project, assigned in Step 6)
```

### Flow 2: New User - Simulator Only

```
Step 1-3: Same as Platform (Registration, Verification, Record Creation)

Step 4: Redirect to Onboarding
└─ Redirect to: /onboarding/simulator-welcome

Step 5: Simulator Welcome
├─ Welcome message
├─ Platform introduction
├─ Optional skill assessment
└─ Feature highlights

Step 6: System Creates
└─ No account, no project, no roles
   (Simulator is individual-based, not team-based)

Step 7: Redirect to Dashboard
└─ Redirect to: /simulator/dashboard
   └─ User starts learning journey
```

### Flow 3: New User - Both Platforms

```
Step 1-3: Same (Registration, Verification, Records for BOTH platforms)

Step 4: Choose Onboarding Path
└─ Modal: "Which platform would you like to set up first?"
   ├─ [Set up Platform] → PM Account Setup
   └─ [Start with Simulator] → Simulator Welcome

Step 5-7: Follow chosen path first

Step 8: Option to set up other platform
└─ "Ready to set up [other platform]?" [Yes] [Later]
```

### Flow 4: Invited User Joining Project

```
Step 1: Receive Invitation Email
└─ From: project-manager@company.com
   Subject: "You've been invited to join Project XYZ"
   Link: /invitations/accept/[token]

Step 2: Click Invitation Link
└─ If NOT logged in:
   ├─ If email exists → Redirect to login
   └─ If email new → Show registration form (pre-filled email)

Step 3: Accept Invitation Page
├─ Project: "Website Redesign"
├─ Role: "Team Member"
├─ Invited by: "John Doe"
└─ [Accept Invitation] [Decline]

Step 4: System Creates (On Accept)
└─ INSERT INTO project_memberships
   ├─ project_id: invited_project_id
   ├─ user_id: current_user_id
   ├─ project_role_id: 'team_member_role_id' (from invitation)
   └─ invitation_status: 'accepted'

Step 5: Redirect to Project
└─ Redirect to: /app/projects/[project_id]
   └─ User now has:
      ├─ System Role: NONE (not account owner)
      └─ Project Role: Team Member (in this project only)
```

---

## Database Schema Alignment

### Tables Used (Existing)

#### 1. public.users
```sql
- id (UUID, PK)
- auth_user_id (UUID, FK → auth.users)
- email (VARCHAR)
- full_name (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at
```

#### 2. public.accounts
```sql
- id (UUID, PK)
- owner_user_id (UUID, FK → users.id)  ← Account Owner
- account_name (VARCHAR)
- account_code (VARCHAR, UNIQUE)
- account_type (VARCHAR)
- billing_email (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at
```

#### 3. public.roles (System Roles Only)
```sql
- id (UUID, PK)
- role_name (VARCHAR) ← 'account_owner' ONLY
- role_display_name (VARCHAR)
- role_level (INTEGER)
- is_system_role (BOOLEAN) ← TRUE
- is_active (BOOLEAN)
```

**IMPORTANT:** Only 1 system role in this table:
1. **account_owner** - Owns the account/organization

**REMOVED from this application:**
- ❌ system_admin (separate admin app)
- ❌ billing_manager (separate admin app)

All project roles (Project Manager, Team Lead, etc.) are in `project_roles`, NOT here.

#### 4. public.user_roles (System Role Assignments)
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- role_id (UUID, FK → roles.id) ← Links to system roles only
- assigned_by (UUID, FK → users.id)
- is_active (BOOLEAN)
- created_at, updated_at
```

**Usage:** Only for assigning Account Owner, Billing Manager, System Admin

#### 5. project_roles (Project Role Templates)
```sql
- id (UUID, PK)
- project_id (UUID, FK → projects.id, NULLABLE) ← NULL for templates
- role_name (VARCHAR) ← 'project_board_member', 'project_sponsor', etc.
- role_description (TEXT)
- is_system_default (BOOLEAN) ← TRUE for templates
- is_template (BOOLEAN) ← TRUE for templates, FALSE for custom
- permissions (JSONB) ← Array of permission codes
- role_level (INTEGER)
- is_active (BOOLEAN)
- created_at, updated_at
```

**Templates (is_template = TRUE - Organization Hierarchy):**
- Project Board Member (Executive oversight)
- Project Sponsor/Executive (Strategic direction)
- Programme Manager (Multi-project coordination)
- Project Manager (Day-to-day management)
- Team Manager (Team supervision)
- Project Assurance (Quality and compliance oversight)
- Quality Assurance (Quality validation and testing)
- Change Authority (Change control and approval)
- Team Member (Execution)

**Custom Roles (is_template = FALSE, project_id = specific project):**
- Created by Project Managers for their specific projects
- Project-specific permissions
- Tailored to organization needs
- Unlimited custom roles can be created

**Important:** Role templates are starting point. System allows:
1. Using templates as-is
2. Cloning templates and customizing permissions
3. Creating completely new custom roles
4. **NO HARDCODED ROLE IDs** - Always lookup by role_name

#### 6. project_memberships (THE KEY TABLE)
```sql
- id (UUID, PK)
- project_id (UUID, FK → projects.id)
- user_id (UUID, FK → users.id)
- project_role_id (UUID, FK → project_roles.id) ← THE PROJECT ROLE
- invited_by_user_id (UUID, FK → users.id)
- invitation_status (VARCHAR) ← 'pending', 'accepted', 'expired', 'declined'
- invitation_token (VARCHAR, UNIQUE)
- invitation_sent_at (TIMESTAMP)
- invitation_expires_at (TIMESTAMP)
- accepted_at (TIMESTAMP)
- is_active (BOOLEAN)
- created_at, updated_at
```

**This is where project roles are assigned:**
- User A in Project 1 as Project Manager
- User A in Project 2 as Team Member
- User B in Project 1 as Team Manager
- User C in Project 1 as Project Board Member

#### 7. public.projects
```sql
- id (UUID, PK)
- account_id (UUID, FK → accounts.id) ← REQUIRED (all projects belong to account)
- project_manager_user_id (UUID, FK → users.id)
- subscription_id (UUID, FK → platform_subscriptions.id) ← Link to project subscription
- project_name (VARCHAR)
- project_code (VARCHAR)
- project_description (TEXT)
- start_date (DATE)
- end_date (DATE)
- status (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at
```

**Important:** Each project has its own subscription (see platform_subscriptions below)

---

## Role Assignment Logic

### Who Gets What Roles and When?

#### Scenario 1: First User Creates Account

**User:** John Doe
**Action:** Registers for Platform, completes PM Account Setup

**System Assigns:**
1. **System Role:** Account Owner
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   VALUES (john_user_id, account_owner_role_id);
   ```

2. **Project Role:** Project Manager (in first project)
   ```sql
   INSERT INTO project_memberships (project_id, user_id, project_role_id, invitation_status)
   VALUES (first_project_id, john_user_id, project_manager_role_id, 'accepted');
   ```

**Result:**
- John is Account Owner (can manage account, billing, subscriptions)
- John is Project Manager in "Website Redesign" project
- John can create more projects and will be Project Manager in those too

#### Scenario 2: Account Owner Invites Team Member

**User:** Jane Smith (doesn't have account yet)
**Action:** John invites jane@company.com to "Website Redesign" project as "Team Member"

**System Creates:**
1. **Invitation Record:**
   ```sql
   INSERT INTO project_memberships (
     project_id, user_id, project_role_id,
     invited_by_user_id, invitation_status, invitation_token
   ) VALUES (
     project_id, NULL, -- user_id filled after acceptance
     team_member_role_id, john_user_id, 'pending', 'unique_token_xyz'
   );
   ```

2. **Email Sent:** Invitation to jane@company.com

**Jane's Flow:**
1. Clicks invitation link
2. If no account → Registers (simple form: name, password)
3. If has account → Logs in
4. Accepts invitation
5. System updates:
   ```sql
   UPDATE project_memberships
   SET user_id = jane_user_id,
       invitation_status = 'accepted',
       accepted_at = NOW()
   WHERE invitation_token = 'unique_token_xyz';
   ```

**Result:**
- Jane has NO system role (not Account Owner)
- Jane has Project Role: Team Member (in "Website Redesign" project only)
- Jane can only access this one project
- Jane cannot create new projects (no Account Owner role)

#### Scenario 3: User Invited to Multiple Projects

**User:** Jane Smith (already member of Project A)
**Action:** Another PM invites Jane to Project B as "Project Assurance"

**System Creates:**
```sql
INSERT INTO project_memberships (
  project_id, user_id, project_role_id, invitation_status
) VALUES (
  project_b_id, jane_user_id, project_assurance_role_id, 'accepted'
);
```

**Result:**
- Jane in Project A: Team Member
- Jane in Project B: Project Assurance
- Same user, different roles in different projects ✓

#### Scenario 4: Multiple Projects Under Same Account

**User:** John Doe (Account Owner)
**Action:** Creates a second project

**System Creates:**
1. **New Project:**
   ```sql
   INSERT INTO projects (account_id, project_name, project_manager_user_id)
   VALUES (johns_account_id, 'Mobile App Development', john_user_id);
   ```

2. **New Project Subscription (PER PROJECT):**
   ```sql
   INSERT INTO platform_subscriptions (project_id, account_id, plan_type, status)
   VALUES (new_project_id, johns_account_id, 'free', 'active');
   ```

3. **Project Membership:**
   ```sql
   INSERT INTO project_memberships (project_id, user_id, project_role_id)
   VALUES (new_project_id, john_user_id, project_manager_role_id);
   ```

4. **Seat Allocation (PER PROJECT):**
   ```sql
   INSERT INTO project_seat_allocations (project_id, subscription_id, included_seats)
   VALUES (new_project_id, new_subscription_id, 30);
   ```

**Result:**
- John is Account Owner (system role - once per account)
- John is Project Manager in Project 1 (30 seats for Project 1)
- John is Project Manager in Project 2 (30 seats for Project 2)
- Each project has its own subscription and seat limits
- Total: 60 seats available (30 per project)

---

## Updated Component Structure

### Files to Modify

#### 1. src/pages/auth/Register.jsx

**Remove:**
- ❌ Role selection dropdown
- ❌ Role assignment logic
- ❌ Import of roleService for role assignment

**Keep:**
- ✅ Full name, email, password fields
- ✅ Platform selection (Platform/Simulator/Both)
- ✅ Email verification
- ✅ Platform access record creation
- ✅ User record creation (public.users)
- ❌ NO Account creation (moved to after email verification)
- ❌ NO Role assignment (moved to after email verification)

**Flow After Registration:**
```javascript
// After email verification (in EmailConfirmation.jsx)
// 1. Create account and assign Account Owner role (for Platform users)
// 2. Redirect based on platform selection:
if (selectedPlatforms.platform && !selectedPlatforms.simulator) {
  navigate('/onboarding/platform-account-setup')
} else if (selectedPlatforms.simulator && !selectedPlatforms.platform) {
  navigate('/onboarding/simulator-welcome')
} else if (selectedPlatforms.platform && selectedPlatforms.simulator) {
  navigate('/onboarding/platform-choice')
}
```

#### 2. src/pages/auth/PlatformRegister.jsx

**Similar changes:** Remove role selection, redirect to PM onboarding

#### 3. src/pages/auth/SimulatorRegister.jsx

**Similar changes:** Remove role selection, redirect to Simulator onboarding

#### 4. src/pages/onboarding/PMAccountSetup.jsx

**Enhance with Role Assignment:**

```javascript
// Step 1: Account Information (OPTIONAL - Account already created)
// Load existing account and allow editing
const [account, setAccount] = useState(null)
useEffect(() => {
  loadAccount() // Load existing account created after email verification
}, [])

// Step 2: First Project (REQUIRED)
const [projectData, setProjectData] = useState({
  projectName: '',
  projectDescription: '',
  startDate: '',
  endDate: ''
})

// Step 3: Completion
const handleComplete = async () => {
  // 1. Update account (if information changed)
  if (accountDataChanged) {
    await updateAccount(account.id, accountData)
  }

  // 2. Create first project
  const project = await createProject({
    ...projectData,
    accountId: account.id, // Use existing account
    projectManagerUserId: user.id
  })

  // 3. ASSIGN PROJECT ROLE: Project Manager in first project
  await assignProjectRole(project.id, user.id, 'project_manager')

  // 4. Create project subscription (per project)
  await createProjectSubscription(project.id, account.id)

  // 5. Redirect to dashboard
  navigate('/app/dashboard')
}
```

#### 5. src/pages/onboarding/RoleSelection.jsx

**Decision:** ❌ DELETE or REPURPOSE

**Option A:** Delete entirely (recommended)
- No longer needed
- Confuses the role system
- Replaced by automatic role assignment

**Option B:** Repurpose for project role selection
- When creating new projects, owner can select their role
- When inviting users, select which role to assign
- Not during registration

**Recommendation:** Option A - Delete

#### 6. src/pages/onboarding/PlatformChoice.jsx (NEW)

**For users with both platforms:**

```jsx
export default function PlatformChoice() {
  return (
    <div>
      <h1>Which platform would you like to set up first?</h1>

      <div className="platform-options">
        <div onClick={() => navigate('/onboarding/platform-account-setup')}>
          <Briefcase />
          <h2>Platform</h2>
          <p>Set up your account and create your first project</p>
          <Button>Set up Platform</Button>
        </div>

        <div onClick={() => navigate('/onboarding/simulator-welcome')}>
          <Gamepad2 />
          <h2>Simulator</h2>
          <p>Start your learning journey</p>
          <Button>Start with Simulator</Button>
        </div>
      </div>

      <p>You can set up the other platform later from your profile</p>
    </div>
  )
}
```

#### 7. src/services/roleService.js

**Update functions:**

```javascript
/**
 * Assign system role to user (Account Owner only)
 * IMPORTANT: Always looks up role by name, never hardcodes ID
 */
export async function assignSystemRole(userId, roleName) {
  // Get role ID by name (NEVER hardcode IDs)
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('role_name', roleName)
    .eq('is_system_role', true)
    .single()

  if (!role) throw new Error(`System role ${roleName} not found`)

  // Get internal user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  // Assign role
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: user.id,
      role_id: role.id,
      assigned_by: user.id, // Self-assigned during registration
      is_active: true
    })

  if (error) throw error

  return { success: true }
}

/**
 * Assign project role to user (Project Manager, Team Member, etc.)
 * IMPORTANT: Always looks up role by name, never hardcodes ID
 * Supports both template roles and custom project-specific roles
 */
export async function assignProjectRole(projectId, userId, roleName, useCustomRole = false) {
  // Get project role ID by name (NEVER hardcode IDs)
  const query = supabase
    .from('project_roles')
    .select('id')
    .eq('role_name', roleName)

  if (useCustomRole) {
    // Look for custom role specific to this project
    query.eq('project_id', projectId).eq('is_template', false)
  } else {
    // Look for template role
    query.eq('is_template', true)
  }

  const { data: role } = await query.single()

  if (!role) {
    throw new Error(`Project role ${roleName} not found${useCustomRole ? ' for this project' : ' in templates'}`)
  }

  // Get internal user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  // Create project membership
  const { error } = await supabase
    .from('project_memberships')
    .insert({
      project_id: projectId,
      user_id: user.id,
      project_role_id: role.id,
      invitation_status: 'accepted', // Auto-accepted for project creator
      accepted_at: new Date().toISOString(),
      is_active: true
    })

  if (error) throw error

  return { success: true }
}

/**
 * Create custom project role
 * IMPORTANT: Allows dynamic creation of new roles without hardcoding
 */
export async function createCustomProjectRole(projectId, roleData) {
  const { data, error } = await supabase
    .from('project_roles')
    .insert({
      project_id: projectId,
      role_name: roleData.roleName,
      role_display_name: roleData.displayName,
      role_description: roleData.description,
      is_system_default: false,
      is_template: false, // Custom role, not template
      role_level: roleData.roleLevel || 3,
      permissions: roleData.permissions || [],
      is_active: true
    })
    .select()
    .single()

  if (error) throw error

  return { success: true, data }
}

/**
 * Get user's project roles (all projects they're member of)
 */
export async function getUserProjectRoles(userId) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  const { data, error } = await supabase
    .from('project_memberships')
    .select(`
      id,
      project_id,
      projects:project_id (
        project_name,
        project_code
      ),
      project_roles:project_role_id (
        role_name,
        role_display_name,
        permissions
      ),
      is_active
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error) throw error

  return { success: true, data }
}

/**
 * Get user's system roles (Account Owner, Billing Manager)
 */
export async function getUserSystemRoles(userId) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      id,
      roles:role_id (
        role_name,
        role_display_name,
        role_level
      ),
      is_active
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error) throw error

  return { success: true, data }
}
```

---

## Database Cleanup Required

### 1. Clean public.roles Table

**Current State:** May contain PM roles like "Project Manager", "Team Lead", etc.

**Required State:** Should only contain:
```sql
-- Keep only system role
DELETE FROM roles WHERE role_name NOT IN ('account_owner');

-- Verify only this remains:
SELECT * FROM roles WHERE is_system_role = TRUE;
-- Should return:
-- 1. account_owner

-- Remove system_admin and billing_manager (separate admin app)
DELETE FROM roles WHERE role_name IN ('system_admin', 'billing_manager');
```

### 2. Seed project_roles Table

**Add template roles if not present:**

```sql
-- Insert project role templates (Organization Hierarchy)
-- Note: These are templates. System supports dynamic creation of additional roles.
INSERT INTO project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active
) VALUES
  ('project_board_member', 'Project Board Member', 'Executive oversight and governance',
   TRUE, TRUE, 12,
   '["project.view", "project.edit", "reports.view", "reports.export", "governance.manage"]'::jsonb,
   TRUE),

  ('project_sponsor', 'Project Sponsor/Executive', 'Project sponsorship and strategic direction',
   TRUE, TRUE, 11,
   '["project.view", "project.edit", "reports.view", "strategic.approve", "budget.approve"]'::jsonb,
   TRUE),

  ('programme_manager', 'Programme Manager', 'Multi-project coordination',
   TRUE, TRUE, 10,
   '["project.view", "project.edit", "project.manage_users", "reports.view", "programme.manage"]'::jsonb,
   TRUE),

  ('project_manager', 'Project Manager', 'Day-to-day project management',
   TRUE, TRUE, 9,
   '["project.view", "project.edit", "project.manage_users", "tasks.create", "tasks.edit", "risks.manage", "budget.manage"]'::jsonb,
   TRUE),

  ('team_manager', 'Team Manager', 'Team supervision and coordination',
   TRUE, TRUE, 8,
   '["project.view", "tasks.view", "tasks.edit", "tasks.assign", "team.view", "team.manage"]'::jsonb,
   TRUE),

  ('project_assurance', 'Project Assurance', 'Quality and compliance oversight',
   TRUE, TRUE, 7,
   '["project.view", "tasks.view", "risks.view", "quality.manage", "compliance.check", "reports.view", "audit.conduct"]'::jsonb,
   TRUE),

  ('quality_assurance', 'Quality Assurance', 'Quality validation and testing',
   TRUE, TRUE, 6,
   '["project.view", "tasks.view", "quality.test", "quality.validate", "defects.manage", "reports.view"]'::jsonb,
   TRUE),

  ('change_authority', 'Change Authority', 'Change control and approval',
   TRUE, TRUE, 5,
   '["project.view", "changes.view", "changes.approve", "changes.reject", "impact.assess", "reports.view"]'::jsonb,
   TRUE),

  ('team_member', 'Team Member', 'Task execution and delivery',
   TRUE, TRUE, 4,
   '["project.view", "tasks.view", "tasks.update", "documents.view", "documents.upload"]'::jsonb,
   TRUE)
ON CONFLICT (role_name) WHERE is_template = TRUE DO UPDATE
SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- Add comment explaining dynamic role support
COMMENT ON TABLE project_roles IS 'Project role templates and custom roles. Templates (is_template=TRUE) are pre-defined. Custom roles can be created dynamically per project. NEVER hardcode role IDs - always lookup by role_name.';
```

### 3. Create Migration SQL File

**File:** `SQL/v89_role_system_cleanup.sql`

```sql
-- Registration Flow Revamp - Role System Cleanup
-- Date: 2025-12-09
-- Purpose: Clean up role tables to match project-based role architecture

-- =====================================================
-- STEP 1: Backup existing data (just in case)
-- =====================================================

CREATE TABLE IF NOT EXISTS roles_backup AS
SELECT * FROM roles;

CREATE TABLE IF NOT EXISTS user_roles_backup AS
SELECT * FROM user_roles;

-- =====================================================
-- STEP 2: Clean public.roles (Keep only system roles)
-- =====================================================

-- Delete non-system roles (these should be in project_roles)
DELETE FROM roles
WHERE is_system_role = FALSE
   OR role_name NOT IN ('system_admin', 'account_owner', 'billing_manager');

-- Ensure system role exists (ONLY account_owner)
INSERT INTO roles (
  role_name, role_display_name, role_description,
  role_level, is_system_role, is_default_role, is_active
) VALUES
  ('account_owner', 'Account Owner', 'Account and organization owner',
   90, TRUE, FALSE, TRUE)
ON CONFLICT (role_name) DO NOTHING;

-- Remove system_admin and billing_manager (separate admin application)
DELETE FROM roles WHERE role_name IN ('system_admin', 'billing_manager');
COMMENT ON TABLE roles IS 'System-wide role: ONLY account_owner (system_admin and billing_manager are in separate admin app)';


-- =====================================================
-- STEP 3: Ensure project_roles table has templates
-- =====================================================

-- Check if project_roles table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'project_roles') THEN
    RAISE EXCEPTION 'project_roles table does not exist. Run v85 migration first.';
  END IF;
END $$;

-- Insert project role templates
INSERT INTO project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active
) VALUES
  ('project_board', 'Project Board', 'Executive oversight and strategic direction',
   TRUE, TRUE, 10,
   '["project.view", "project.edit", "reports.view", "reports.export"]'::jsonb,
   TRUE),

  ('programme_manager', 'Programme Manager', 'Multi-project coordination',
   TRUE, TRUE, 9,
   '["project.view", "project.edit", "project.manage_users", "reports.view", "reports.export"]'::jsonb,
   TRUE),

  ('project_manager', 'Project Manager', 'Day-to-day project management',
   TRUE, TRUE, 8,
   '["project.view", "project.edit", "project.manage_users", "tasks.create", "tasks.edit", "tasks.delete", "risks.manage", "documents.upload"]'::jsonb,
   TRUE),

  ('team_manager', 'Team Manager', 'Team supervision and coordination',
   TRUE, TRUE, 7,
   '["project.view", "tasks.view", "tasks.edit", "tasks.assign", "team.view", "documents.view"]'::jsonb,
   TRUE),

  ('project_assurance', 'Project Assurance', 'Quality oversight',
   TRUE, TRUE, 6,
   '["project.view", "tasks.view", "risks.view", "quality.manage", "reports.view", "documents.view"]'::jsonb,
   TRUE),

  ('team_member', 'Team Member', 'Task execution and delivery',
   TRUE, TRUE, 5,
   '["project.view", "tasks.view", "tasks.update", "documents.view", "documents.upload"]'::jsonb,
   TRUE)
ON CONFLICT (role_name) WHERE is_template = TRUE DO UPDATE
SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- =====================================================
-- STEP 4: Register table in database_tables registry
-- =====================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_roles', 'Project-specific roles with custom permissions', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

-- =====================================================
-- STEP 5: Verification Queries
-- =====================================================

-- Verify system roles (should return exactly 1 row)
SELECT role_name, role_display_name, is_system_role
FROM roles
WHERE is_active = TRUE
ORDER BY role_level DESC;
-- Expected: account_owner

-- Verify project role templates (should return 9 rows)
SELECT role_name, role_display_name, is_template, role_level
FROM project_roles
WHERE is_template = TRUE
  AND is_active = TRUE
ORDER BY role_level DESC;
-- Expected: project_board_member, project_sponsor, programme_manager,
--           project_manager, team_manager, project_assurance,
--           quality_assurance, change_authority, team_member

-- =====================================================
-- STEP 6: Add helpful comments
-- =====================================================

COMMENT ON TABLE roles IS 'System-wide role: ONLY account_owner (system_admin and billing_manager in separate admin app)';
COMMENT ON TABLE project_roles IS 'Project-specific role templates (organization hierarchy) and custom roles';
COMMENT ON TABLE user_roles IS 'Assigns system role to users (Account Owner only)';
COMMENT ON TABLE project_memberships IS 'Assigns project roles to users per project (e.g., Project Manager in Project A, Team Member in Project B)';
COMMENT ON TABLE platform_subscriptions IS 'Project subscriptions (ONE subscription PER project, not per account)';
COMMENT ON COLUMN projects.subscription_id IS 'Each project has its own subscription with seat limits';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
```

---

## Implementation Checklist

### Phase 1: Database Cleanup ✅
- [x] Create `SQL/v91_role_system_cleanup.sql` (created as v91 since v89 and v90 exist)
- [ ] Run migration in local/dev environment (requires manual execution)
- [ ] Verify only 1 system role in `public.roles` (account_owner) (requires manual verification)
- [ ] Remove system_admin and billing_manager roles (included in migration)
- [ ] Verify 9 project role templates in `project_roles` (requires manual verification)
- [x] Add all required project roles (board member, sponsor, QA, change authority, etc.) (included in migration)
- [ ] Update pm_subscriptions schema (add project_id if missing) (check if needed)
- [x] Add comments explaining dynamic role support (included in migration)
- [ ] Test role queries work correctly (requires manual testing)
- [ ] Verify role lookups work by name (not hardcoded IDs) (requires manual verification)

### Phase 2: Update Registration Pages ✅
- [x] Update `src/pages/auth/Register.jsx`
  - [x] Remove role selection dropdown (if exists) - No role selection in current implementation
  - [x] Account creation moved to AFTER email verification (not immediately)
  - [x] Account Owner role assignment moved to AFTER email verification
  - [x] Keep platform selection
  - [x] Update redirect logic after verification
- [x] Update `src/pages/auth/PlatformRegister.jsx`
  - [x] Remove role selection (if exists) - No role selection in current implementation
  - [x] Account creation moved to AFTER email verification
  - [x] Account Owner role assignment moved to AFTER email verification
  - [x] Redirect to Platform onboarding
- [x] Update `src/pages/auth/SimulatorRegister.jsx`
  - [x] Remove role selection (if exists) - No role selection in current implementation
  - [x] No account creation (Simulator is individual-based)
  - [x] Redirect to Simulator onboarding

### Phase 3: Update/Create Onboarding Pages ✅
- [x] Update `src/pages/onboarding/PMAccountSetup.jsx`
  - [x] Add multi-step wizard (Account → Project → Confirm)
  - [x] Account already created (load existing account, allow editing)
  - [x] Add project creation logic
  - [x] System role (Account Owner) already assigned after email verification
  - [x] Add project role assignment (Project Manager)
  - [x] Add project subscription creation (per project)
- [ ] Delete `src/pages/onboarding/RoleSelection.jsx` (no longer needed) - Keep for now, may be used elsewhere
- [x] Create `src/pages/onboarding/PlatformChoice.jsx` (for users with both)
- [x] Update `src/pages/onboarding/SimulatorWelcome.jsx` (verify no role assignment) - Verified: No role assignment in SimulatorWelcome.jsx (Simulator is individual-based, no roles needed)

### Phase 4: Update Role Services ✅
- [x] Update `src/services/roleService.js`
  - [x] Add `assignSystemRole(authUserId, roleName)`
  - [x] Add `assignProjectRole(projectId, authUserId, roleName, useCustomRole)`
  - [x] Add `getUserProjectRoles(authUserId)`
  - [x] Add `getUserSystemRoles(authUserId)`
  - [x] Keep old `assignUserRoles()` for backward compatibility
- [x] Update `src/services/projectRoleService.js`
  - [x] Verify project role methods - Updated to use project_roles table with backward compatibility
  - [x] Add methods for template roles - getDefaultRoleTemplates() updated to use project_roles
- [x] Update `src/services/accountService.js`
  - [x] Verify account creation - Already implemented and working
  - [x] Add subscription linking - getAccountSubscription() already exists and uses database function

### Phase 5: Update Invitation Flow ✅
- [ ] Update `src/pages/auth/InvitationAccept.jsx`
  - [ ] Verify project role assignment on acceptance
  - [ ] Handle new vs existing users
  - [ ] NO system role assignment
- [ ] Update `src/services/invitationService.js`
  - [ ] Ensure project roles used
  - [ ] Update email templates

### Phase 6: Update Project User Management ✅
- [ ] Update `src/components/app/InviteUserModal.jsx`
  - [ ] Load project role templates (not system roles)
  - [ ] Show project-specific role dropdown
  - [ ] Assign correct project role on invitation
- [ ] Update `src/pages/app/ProjectUsers.jsx`
  - [ ] Display project roles, not system roles
  - [ ] Show user's role per project

### Phase 7: Update Routing ✅
- [x] Update `src/App.jsx`
  - [x] Add route for `/onboarding/platform-account-setup`
  - [x] Add route for `/onboarding/platform-choice`
  - [x] Add route for `/onboarding/simulator-welcome` - Already exists
  - [x] Keep route for `/onboarding/role-selection` (may be used elsewhere)

### Phase 8: Testing ✅
- [ ] Test Flow 1: New user → Platform only
  - [ ] Registration form submits
  - [ ] Account created IMMEDIATELY
  - [ ] Account Owner role assigned IMMEDIATELY
  - [ ] Email verification sent
  - [ ] User verifies email
  - [ ] Redirects to Platform Account Setup
  - [ ] Account info pre-filled (can edit)
  - [ ] Creates first project
  - [ ] Creates project subscription (per project)
  - [ ] Assigns Project Manager (project role)
  - [ ] Creates seat allocation (30 base seats per project)
  - [ ] Lands on dashboard
  - [ ] Verify database records (account, user_roles, project, pm_subscriptions, project_memberships, project_seat_allocations)
- [ ] Test Flow 2: New user → Simulator only
  - [ ] Registration completes
  - [ ] Redirects to Simulator Welcome
  - [ ] No account created
  - [ ] No roles assigned
  - [ ] Lands on simulator dashboard
- [ ] Test Flow 3: New user → Both platforms
  - [ ] Registration completes
  - [ ] Shows platform choice modal
  - [ ] Can choose either path
  - [ ] Other platform accessible later
- [ ] Test Flow 4: User invitation
  - [ ] PM invites user to project
  - [ ] User accepts invitation
  - [ ] Gets project role (Team Member)
  - [ ] NO system role assigned
  - [ ] Can access only that project
- [ ] Test Flow 5: Multi-project user
  - [ ] User invited to Project A as Team Member
  - [ ] User invited to Project B as Project Manager
  - [ ] User has different roles in different projects
  - [ ] Permissions work correctly per project

### Phase 9: Documentation ✅
- [ ] Update `projectplan/Unified_Login_System_Plan.md`
  - [ ] Note registration flow revamp
  - [ ] Document role system clearly
  - [ ] Update flows with current implementation
- [ ] Create `Documentation/Role_System_Architecture.md`
  - [ ] Explain system vs project roles
  - [ ] Document when each is assigned
  - [ ] Provide examples
- [ ] Create `Documentation/Registration_and_Onboarding_Guide.md`
  - [ ] Document new registration flow
  - [ ] Document PM Account Setup wizard
  - [ ] Document invitation flow

### Phase 10: Deployment ✅
- [ ] Deploy to staging
- [ ] Run database migrations
- [ ] Test all flows in staging
- [ ] Fix any issues
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Timeline Estimate

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| Phase 1 | Database Cleanup | 2 hours |
| Phase 2 | Update Registration Pages | 2 hours |
| Phase 3 | Update/Create Onboarding Pages | 4 hours |
| Phase 4 | Update Role Services | 2 hours |
| Phase 5 | Update Invitation Flow | 1 hour |
| Phase 6 | Update Project User Management | 2 hours |
| Phase 7 | Update Routing | 1 hour |
| Phase 8 | Testing | 4 hours |
| Phase 9 | Documentation | 2 hours |
| Phase 10 | Deployment | 2 hours |
| **TOTAL** | **22 hours (~3 days)** |

---

## Success Criteria

### Registration Flow ✅
- [ ] No role selection during registration
- [ ] Only: name, email, password, platform selection
- [ ] Account created IMMEDIATELY (before email verification)
- [ ] Account Owner role assigned IMMEDIATELY
- [ ] Email verification works
- [ ] Redirects to correct onboarding

### Platform Onboarding ✅
- [ ] Multi-step wizard works
- [ ] Account already exists (created during registration)
- [ ] Can edit account info (optional)
- [ ] Creates first project
- [ ] Creates project subscription (PER PROJECT)
- [ ] Links subscription to project (not account)
- [ ] Account Owner already assigned (during registration)
- [ ] Assigns Project Manager (project role in this project)
- [ ] Creates seat allocation (per project, 30 base seats)

### Role System ✅
- [ ] Only 1 system role in database (account_owner)
- [ ] 9 project role templates exist (board member, sponsor, QA, change authority, etc.)
- [ ] System supports creating unlimited custom project roles
- [ ] System role assigned during registration (Account Owner)
- [ ] Project roles assigned through project membership
- [ ] Users can have different roles in different projects
- [ ] Each project has its own subscription and seat limits
- [ ] **NO HARDCODED ROLE IDs** - all role assignments use name lookup
- [ ] Custom roles can be created dynamically per project

### Invitation Flow ✅
- [ ] Project Managers can invite users
- [ ] Invited users get project roles (not system roles)
- [ ] New users can register via invitation
- [ ] Existing users can accept invitations
- [ ] Project memberships created correctly

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database migration fails | Low | High | Test thoroughly in dev, have rollback script |
| Existing data conflicts | Medium | Medium | Backup tables, careful cleanup scripts |
| Role assignment logic errors | Medium | High | Comprehensive testing, clear separation |
| User confusion about roles | Medium | Medium | Clear UI labels, help text, documentation |
| Onboarding flow issues | Low | Medium | Test all scenarios, provide skip options |

---

## Rollback Plan

If issues occur:

### Database Rollback
```sql
-- Restore from backup
DROP TABLE roles;
CREATE TABLE roles AS SELECT * FROM roles_backup;

DROP TABLE user_roles;
CREATE TABLE user_roles AS SELECT * FROM user_roles_backup;
```

### Code Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin feature/registration-revamp
```

### Gradual Rollout
- Deploy to 10% of users first
- Monitor for errors
- Gradually increase to 100%

---

## Documentation to Create

1. **Role System Architecture** - Explain system vs project roles
2. **Registration Guide** - How registration works now
3. **PM Onboarding Guide** - Step-by-step account setup
4. **Invitation Guide** - How to invite and manage users
5. **Admin Guide** - Managing accounts and subscriptions

---

## Review Section

*(To be completed after implementation)*

### Changes Made
- List of all files modified
- Database changes summary
- Role assignment logic

### Challenges Encountered
- Any issues faced
- Solutions implemented

### Lessons Learned
- What worked well
- What to improve next time

---

**Plan Created:** 2025-12-09
**Plan Version:** 1.0
**Status:** Ready for Approval
**Next Action:** Get user approval and proceed with implementation
