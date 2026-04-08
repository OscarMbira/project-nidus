# Registration Revamp - CORRECTED Summary
## Based on User Feedback

**Date:** 2025-12-09
**Status:** Ready for Approval

---

## Critical Corrections Applied

### 1. System Roles ✅

**BEFORE (Wrong):**
- System Admin
- Account Owner
- Billing Manager

**AFTER (Correct):**
- **Account Owner** (ONLY ONE)
- ❌ System Admin → Separate admin app
- ❌ Billing Manager → Separate admin app

### 2. Account Creation Timing ✅

**BEFORE (Wrong):**
Registration → Email Verify → Onboarding → Create Account

**AFTER (Correct):**
Registration → **Create Account IMMEDIATELY** → Account Owner Assigned → Email Verify → Onboarding → Create Project

**Key Change:** Account is created FIRST, before email verification

### 3. Subscription Model ✅

**BEFORE (Wrong):**
- Subscription per account
- All projects share account subscription

**AFTER (Correct):**
- **Subscription per PROJECT**
- Each project has its own subscription
- Each project has 30 base seats + extra seats
- Account can have multiple projects, each with separate subscription

### 4. Project Role Hierarchy ✅

**BEFORE (Missing roles):**
- Project Board
- Programme Manager
- Project Manager
- Team Manager
- Project Assurance
- Team Member

**AFTER (Complete hierarchy):**
- **Project Board Member** (Executive oversight)
- **Project Sponsor/Executive** (Strategic direction)
- Programme Manager
- Project Manager
- Team Manager
- Project Assurance
- Team Member

---

## Corrected Registration Flow

### New User - Platform Registration

```
Step 1: Registration Form
├─ Full Name
├─ Email
├─ Password
└─ Platform Selection: [x] Platform

Step 2: IMMEDIATE Account Creation (Before Email Verification)
├─ Create user record
├─ Create account record (organization)
│  └─ Account Name: "John Doe's Organization" (default)
└─ ASSIGN SYSTEM ROLE: Account Owner

Step 3: Email Verification
├─ Send verification email
└─ User verifies email

Step 4: Platform Account Setup (Onboarding)
├─ Step 1: Edit Account Info (optional - already exists)
│  ├─ Account Name: "Acme Corporation"
│  ├─ Account Type: Company
│  └─ Billing Email
│
├─ Step 2: Create First Project (required)
│  ├─ Project Name: "Website Redesign"
│  ├─ Description
│  ├─ Start/End Dates
│  └─ Select Subscription Plan: [Free | Starter | Pro]
│
└─ Step 3: Confirm

Step 5: System Creates
├─ Project record (linked to account)
├─ PROJECT SUBSCRIPTION (per project, not per account)
│  ├─ project_id: new_project_id
│  ├─ account_id: existing_account_id
│  ├─ plan_type: 'free'
│  └─ status: 'active'
│
├─ ASSIGN PROJECT ROLE: Project Manager
│  └─ In this specific project only
│
└─ Create seat allocation
   ├─ project_id: new_project_id
   ├─ included_seats: 30
   └─ current_user_count: 1

Step 6: Dashboard
User now has:
├─ System Role: Account Owner (owns organization)
└─ Project Role: Project Manager (in this project)
```

---

## Database Schema Corrections

### 1. public.roles (System Roles)

**Correct State:**
```sql
-- ONLY 1 system role
id | role_name      | role_display_name | is_system_role
---|----------------|-------------------|---------------
1  | account_owner  | Account Owner     | TRUE
```

### 2. project_roles (Project Hierarchy)

**Correct State:**
```sql
-- 7 project role templates
id | role_name              | role_display_name          | role_level
---|------------------------|----------------------------|------------
1  | project_board_member   | Project Board Member       | 11
2  | project_sponsor        | Project Sponsor/Executive  | 10
3  | programme_manager      | Programme Manager          | 9
4  | project_manager        | Project Manager            | 8
5  | team_manager           | Team Manager               | 7
6  | project_assurance      | Project Assurance          | 6
7  | team_member            | Team Member                | 5
```

### 3. pm_subscriptions (Per Project!)

**Correct Schema:**
```sql
CREATE TABLE pm_subscriptions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL FK → projects.id,  -- CRITICAL: Per project
  account_id UUID NOT NULL FK → accounts.id,  -- Links to account for billing
  plan_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  base_users INTEGER DEFAULT 30,              -- 30 seats per project
  extra_seats_purchased INTEGER DEFAULT 0,
  ...
);
```

**Key Point:** One subscription PER project, not per account!

### 4. projects table

**Correct Schema:**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL FK → accounts.id,       -- All projects belong to account
  subscription_id UUID FK → platform_subscriptions.id,   -- Link to project's subscription
  project_manager_user_id UUID FK → users.id,
  project_name VARCHAR,
  ...
);
```

---

## Multi-Project Example

**Scenario:** John creates 3 projects under his account

```
Account: "Acme Corporation"
├─ Owner: John Doe (Account Owner role)
│
├─ Project 1: "Website Redesign"
│  ├─ Subscription: Free plan (30 seats)
│  ├─ John's role: Project Manager
│  └─ Team: 5 members
│
├─ Project 2: "Mobile App"
│  ├─ Subscription: Starter plan (30 seats)
│  ├─ John's role: Programme Manager
│  └─ Team: 15 members
│
└─ Project 3: "Infrastructure"
   ├─ Subscription: Professional plan (30 seats + 20 extra = 50)
   ├─ John's role: Project Sponsor
   └─ Team: 45 members

Total Seats: 30 + 30 + 50 = 110 seats (across 3 separate subscriptions)
John's Roles: Account Owner (system) + different project role in each project
```

---

## Key Differences from Previous Plan

| Aspect | Before | After (Corrected) |
|--------|--------|-------------------|
| System Roles | 3 roles | 1 role (account_owner only) |
| Account Creation | During onboarding | IMMEDIATELY at registration |
| Account Owner Assignment | During onboarding | IMMEDIATELY at registration |
| Subscription Scope | Per account | **Per PROJECT** |
| Seat Limits | Account-wide | Per project (30 base each) |
| Project Role Count | 6 templates | 7 templates (added board member, sponsor) |
| System Admin/Billing | In this app | **Separate admin app** |

---

## Implementation Impact

### Changes to Phase 2 (Registration)

**NEW Logic:**
```javascript
// In Register.jsx - after creating auth user
async function handleRegister() {
  // 1. Create auth user
  const { data: authUser } = await supabase.auth.signUp({ email, password })

  // 2. Create user record
  const { data: user } = await createUserRecord(authUser.id, fullName, email)

  // 3. CREATE ACCOUNT IMMEDIATELY
  const { data: account } = await createAccount({
    ownerUserId: user.id,
    accountName: `${fullName}'s Organization`, // Default
    accountType: 'individual'
  })

  // 4. ASSIGN ACCOUNT OWNER ROLE IMMEDIATELY
  await assignSystemRole(user.id, 'account_owner')

  // 5. Create platform access
  await createPlatformAccess(user.id, 'platform')

  // 6. Send verification email
  // (Email verification happens AFTER account creation)
}
```

### Changes to Phase 3 (Onboarding)

**NEW Logic:**
```javascript
// In PlatformAccountSetup.jsx
async function handleComplete() {
  // Account already exists - just load it
  const account = await getUserAccount(user.id)

  // Optional: Update account info
  if (accountInfoChanged) {
    await updateAccount(account.id, accountData)
  }

  // 1. Create project
  const project = await createProject({
    accountId: account.id,
    ...projectData
  })

  // 2. CREATE PROJECT SUBSCRIPTION (not account subscription)
  const subscription = await createProjectSubscription({
    projectId: project.id,        // CRITICAL: Per project
    accountId: account.id,         // For billing
    planType: selectedPlan,
    baseUsers: 30                  // 30 seats per project
  })

  // 3. Link subscription to project
  await updateProject(project.id, {
    subscriptionId: subscription.id
  })

  // 4. Assign project role
  await assignProjectRole(project.id, user.id, 'project_manager')

  // 5. Create seat allocation (per project)
  await createSeatAllocation(project.id, subscription.id)
}
```

---

## SQL Migration Updates

### v89_role_system_cleanup.sql (Updated)

```sql
-- 1. Remove wrong system roles
DELETE FROM roles WHERE role_name IN ('system_admin', 'billing_manager');

-- 2. Keep only account_owner
DELETE FROM roles WHERE role_name != 'account_owner';

-- 3. Add missing project roles
INSERT INTO project_roles (role_name, role_display_name, role_level, ...) VALUES
  ('project_board_member', 'Project Board Member', 11, ...),
  ('project_sponsor', 'Project Sponsor/Executive', 10, ...),
  ...;

-- 4. Update pm_subscriptions schema (if needed)
ALTER TABLE pm_subscriptions
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 5. Add comments
COMMENT ON TABLE pm_subscriptions IS 'Project subscriptions - ONE per project';
COMMENT ON COLUMN platform_subscriptions.project_id IS 'Each project has its own subscription';
```

---

## Testing Checklist (Updated)

### Test 1: Registration Creates Account Immediately ✅
- [ ] Register new user
- [ ] **Verify account created before email verification**
- [ ] **Verify Account Owner role assigned immediately**
- [ ] Verify email sent
- [ ] Verify can verify email after

### Test 2: Multiple Projects, Multiple Subscriptions ✅
- [ ] Create Project 1
- [ ] Verify subscription created for Project 1 (30 seats)
- [ ] Create Project 2
- [ ] Verify subscription created for Project 2 (30 seats)
- [ ] **Verify total: 60 seats (30 + 30)**
- [ ] Invite 35 users to Project 1 (should hit limit at 30)
- [ ] Invite 35 users to Project 2 (should hit limit at 30)
- [ ] **Verify subscriptions are separate**

### Test 3: Project Role Hierarchy ✅
- [ ] Verify 7 project role templates exist
- [ ] Project Board Member exists
- [ ] Project Sponsor/Executive exists
- [ ] Can assign Board Member role to user
- [ ] Can assign Sponsor role to user

### Test 4: System Roles ✅
- [ ] Verify only 1 system role exists (account_owner)
- [ ] Verify system_admin does NOT exist
- [ ] Verify billing_manager does NOT exist

---

## Success Criteria (Updated)

✅ **Account Creation:** Account created IMMEDIATELY during registration, before email verification
✅ **System Role:** Only account_owner exists (1 role total)
✅ **Project Roles:** 7 templates exist including Board Member and Sponsor
✅ **Subscription Model:** One subscription per project (not per account)
✅ **Seat Limits:** Each project has 30 base seats independently
✅ **Multi-Project:** User can create multiple projects, each with separate subscription
✅ **Admin Roles:** System Admin and Billing Manager NOT in this app

---

## Ready for Implementation

All corrections applied to:
- ✅ `projectplan/Registration_Revamp_Plan_Project_Based_Roles.md`
- ✅ Database schema definitions
- ✅ Registration flows
- ✅ Onboarding logic
- ✅ SQL migration file
- ✅ Testing checklists

**Estimated Time:** Still ~22 hours (3 days)

**Next Step:** Get user approval and proceed with Phase 1 (Database Cleanup)

---

**Status:** ✅ Corrected and Ready
**Approval Needed:** Yes
**Implementation Ready:** Yes
