# Dynamic Role System Architecture

**Date:** 2025-12-09
**Purpose:** Document the dynamic role creation system - NO HARDCODING
**Status:** Architecture Guidelines

---

## Core Principle: NO HARDCODED ROLE IDs

### ❌ WRONG (Hardcoded IDs)
```javascript
// BAD - Hardcoded role ID
await assignProjectRole(projectId, userId, 'abc-123-def-456')

// BAD - Using magic numbers
const PROJECT_MANAGER_ID = 'some-uuid-here'
await assignRole(userId, PROJECT_MANAGER_ID)
```

### ✅ CORRECT (Lookup by Name)
```javascript
// GOOD - Lookup by role name
await assignProjectRole(projectId, userId, 'project_manager')

// GOOD - Dynamic lookup
const roleName = userSelectedRole // Could be any role
await assignProjectRole(projectId, userId, roleName)
```

---

## Project Role Templates (9 Templates)

These are **starting templates** - NOT exhaustive list. More can be added anytime.

### Organization Hierarchy (9 Template Roles)

| Role Level | Role Name | Role Display Name | Purpose |
|------------|-----------|-------------------|---------|
| 12 | project_board_member | Project Board Member | Executive oversight |
| 11 | project_sponsor | Project Sponsor/Executive | Strategic direction |
| 10 | programme_manager | Programme Manager | Multi-project coordination |
| 9 | project_manager | Project Manager | Day-to-day management |
| 8 | team_manager | Team Manager | Team supervision |
| 7 | project_assurance | Project Assurance | Quality & compliance |
| 6 | quality_assurance | Quality Assurance | QA testing & validation |
| 5 | change_authority | Change Authority | Change control |
| 4 | team_member | Team Member | Task execution |

**Important:** This list will grow over time. System must support adding new templates.

---

## Role Types

### 1. Template Roles (is_template = TRUE)

**Purpose:** Pre-defined role templates available to all projects

**Characteristics:**
- `is_template = TRUE`
- `project_id = NULL`
- `is_system_default = TRUE`
- Available to all projects
- Can be used as-is or cloned for customization

**Examples:**
- Project Manager
- Team Lead
- Quality Assurance

**How to Add New Template:**
```sql
INSERT INTO project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active
) VALUES (
  'new_role_name', 'Display Name', 'Description',
  TRUE, TRUE, 13, '["permission1", "permission2"]'::jsonb, TRUE
);
```

### 2. Custom Roles (is_template = FALSE)

**Purpose:** Project-specific custom roles created by Project Managers

**Characteristics:**
- `is_template = FALSE`
- `project_id = specific_project_id`
- `is_system_default = FALSE`
- Only available in specific project
- Tailored permissions for that project

**Examples:**
- "Senior Developer" (custom for Project A)
- "Technical Architect" (custom for Project B)
- "Security Officer" (custom for Project C)

**How to Create Custom Role:**
```javascript
// Project Manager creates custom role
await createCustomProjectRole(projectId, {
  roleName: 'technical_architect',
  displayName: 'Technical Architect',
  description: 'Oversees technical architecture and decisions',
  roleLevel: 8,
  permissions: [
    'project.view',
    'architecture.design',
    'architecture.approve',
    'technical.review'
  ]
})
```

---

## Role Assignment Logic

### ALWAYS Lookup by Name, NEVER Hardcode ID

#### Example 1: Assign Template Role

```javascript
// Register.jsx - After account creation
async function assignAccountOwnerRole(userId) {
  // ✅ CORRECT - Lookup by name
  await assignSystemRole(userId, 'account_owner')

  // ❌ WRONG - Hardcoded ID
  // await assignRole(userId, '123-abc-456-def')
}

// PlatformAccountSetup.jsx - After project creation
async function assignProjectManagerRole(projectId, userId) {
  // ✅ CORRECT - Lookup by name
  await assignProjectRole(projectId, userId, 'project_manager')

  // ❌ WRONG - Hardcoded ID
  // await assignRole(userId, 'some-uuid')
}
```

#### Example 2: Assign Custom Role

```javascript
// InviteUserModal.jsx - Inviting user with custom role
async function inviteUser(email, projectId, roleName) {
  // Check if it's a template or custom role
  const isCustom = await isCustomRole(projectId, roleName)

  // ✅ CORRECT - Dynamic lookup
  await assignProjectRole(projectId, userId, roleName, isCustom)
}
```

#### Example 3: Create and Assign Custom Role

```javascript
// ProjectRoles.jsx - Create new custom role
async function createAndAssignCustomRole() {
  // 1. Create custom role
  const newRole = await createCustomProjectRole(projectId, {
    roleName: 'security_officer',
    displayName: 'Security Officer',
    description: 'Manages security compliance',
    roleLevel: 7,
    permissions: ['security.audit', 'security.approve']
  })

  // 2. Assign to user (by name, not ID)
  await assignProjectRole(projectId, userId, 'security_officer', true)

  // ❌ WRONG - Using the returned ID directly
  // await assignRole(userId, newRole.data.id)
}
```

---

## Database Schema Support

### project_roles Table Structure

```sql
CREATE TABLE project_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) NULL,  -- NULL for templates
  role_name VARCHAR NOT NULL,                    -- Unique identifier
  role_display_name VARCHAR NOT NULL,            -- Human-readable name
  role_description TEXT,
  is_system_default BOOLEAN DEFAULT FALSE,       -- System-provided template
  is_template BOOLEAN DEFAULT FALSE,              -- Template vs Custom
  role_level INTEGER,                             -- Hierarchy level
  permissions JSONB,                              -- Dynamic permissions
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_template_role UNIQUE (role_name) WHERE is_template = TRUE,
  CONSTRAINT unique_custom_role UNIQUE (project_id, role_name) WHERE is_template = FALSE
);

-- Indexes for fast lookup by name
CREATE INDEX idx_project_roles_name ON project_roles(role_name) WHERE is_active = TRUE;
CREATE INDEX idx_project_roles_template ON project_roles(is_template) WHERE is_active = TRUE;
CREATE INDEX idx_project_roles_project ON project_roles(project_id) WHERE project_id IS NOT NULL;
```

---

## Service Functions (NO HARDCODING)

### roleService.js

```javascript
/**
 * Get role by name (NEVER hardcode IDs)
 * @param {string} roleName - Role name to lookup
 * @param {boolean} isTemplate - Whether to look for template or custom role
 * @param {string} projectId - Project ID (for custom roles only)
 */
export async function getRoleByName(roleName, isTemplate = true, projectId = null) {
  const query = supabase
    .from('project_roles')
    .select('*')
    .eq('role_name', roleName)
    .eq('is_active', true)

  if (isTemplate) {
    query.eq('is_template', true)
  } else {
    query.eq('project_id', projectId).eq('is_template', false)
  }

  const { data, error } = await query.single()

  if (error) throw new Error(`Role ${roleName} not found`)

  return data
}

/**
 * Get all template roles (for role selection dropdowns)
 */
export async function getTemplateRoles() {
  const { data, error } = await supabase
    .from('project_roles')
    .select('*')
    .eq('is_template', true)
    .eq('is_active', true)
    .order('role_level', { ascending: false })

  if (error) throw error

  return data
}

/**
 * Get all roles for a project (templates + custom)
 */
export async function getProjectRoles(projectId) {
  // Get templates
  const templates = await getTemplateRoles()

  // Get custom roles for this project
  const { data: customRoles, error } = await supabase
    .from('project_roles')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_template', false)
    .eq('is_active', true)
    .order('role_level', { ascending: false })

  if (error) throw error

  return [...templates, ...customRoles]
}

/**
 * Create custom project role
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
      is_template: false,
      role_level: roleData.roleLevel,
      permissions: roleData.permissions,
      is_active: true
    })
    .select()
    .single()

  if (error) throw error

  return data
}

/**
 * Assign project role (template or custom)
 */
export async function assignProjectRole(projectId, userId, roleName, isCustom = false) {
  // Lookup role by name (NEVER hardcode ID)
  const role = await getRoleByName(roleName, !isCustom, isCustom ? projectId : null)

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
      project_role_id: role.id,  // ID from lookup, not hardcoded
      invitation_status: 'accepted',
      accepted_at: new Date().toISOString(),
      is_active: true
    })

  if (error) throw error

  return { success: true }
}
```

---

## UI Components (Dynamic Role Selection)

### InviteUserModal.jsx

```jsx
export default function InviteUserModal({ projectId }) {
  const [roles, setRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    // Load ALL available roles (templates + custom) for this project
    loadProjectRoles()
  }, [projectId])

  const loadProjectRoles = async () => {
    // ✅ CORRECT - Loads all roles dynamically
    const allRoles = await getProjectRoles(projectId)
    setRoles(allRoles)
  }

  return (
    <div>
      <label>Select Role</label>
      <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
        <option value="">Select a role...</option>

        {/* Group by template vs custom */}
        <optgroup label="Standard Roles">
          {roles.filter(r => r.is_template).map(role => (
            <option key={role.id} value={role.role_name}>
              {role.role_display_name}
            </option>
          ))}
        </optgroup>

        <optgroup label="Custom Roles">
          {roles.filter(r => !r.is_template).map(role => (
            <option key={role.id} value={role.role_name}>
              {role.role_display_name} (Custom)
            </option>
          ))}
        </optgroup>
      </select>

      <button onClick={() => inviteUser(email, projectId, selectedRole)}>
        Invite
      </button>
    </div>
  )
}
```

### ProjectRoles.jsx

```jsx
export default function ProjectRoles({ projectId }) {
  const [templateRoles, setTemplateRoles] = useState([])
  const [customRoles, setCustomRoles] = useState([])

  useEffect(() => {
    loadRoles()
  }, [projectId])

  const loadRoles = async () => {
    const allRoles = await getProjectRoles(projectId)
    setTemplateRoles(allRoles.filter(r => r.is_template))
    setCustomRoles(allRoles.filter(r => !r.is_template))
  }

  const handleCreateCustomRole = async (roleData) => {
    // Create new custom role
    await createCustomProjectRole(projectId, roleData)

    // Reload roles to show new one
    await loadRoles()
  }

  return (
    <div>
      <h2>Template Roles</h2>
      <table>
        {templateRoles.map(role => (
          <tr key={role.id}>
            <td>{role.role_display_name}</td>
            <td>{role.role_description}</td>
            <td><Badge>Template</Badge></td>
          </tr>
        ))}
      </table>

      <h2>Custom Roles</h2>
      <table>
        {customRoles.map(role => (
          <tr key={role.id}>
            <td>{role.role_display_name}</td>
            <td>{role.role_description}</td>
            <td><Badge>Custom</Badge></td>
            <td>
              <Button onClick={() => editRole(role)}>Edit</Button>
              <Button onClick={() => deleteRole(role.id)}>Delete</Button>
            </td>
          </tr>
        ))}
      </table>

      <Button onClick={() => setShowCreateModal(true)}>
        Create Custom Role
      </Button>
    </div>
  )
}
```

---

## Adding New Template Roles (Admin Operation)

### Process for Adding New Template Roles

**Scenario:** Organization wants to add "Risk Manager" as a standard template role

**Step 1: Create SQL Migration**

```sql
-- File: SQL/v90_add_risk_manager_role.sql

INSERT INTO project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active
) VALUES (
  'risk_manager', 'Risk Manager', 'Manages project risks and mitigation strategies',
  TRUE, TRUE, 7,
  '["project.view", "risks.view", "risks.create", "risks.edit", "risks.delete", "risks.assess", "reports.view"]'::jsonb,
  TRUE
)
ON CONFLICT (role_name) WHERE is_template = TRUE DO UPDATE
SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- Register in database_tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('project_roles', 'Project role templates and custom roles - SUPPORTS DYNAMIC CREATION', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
```

**Step 2: Run Migration**

```bash
# Run in Supabase or local DB
psql -d project_nidus -f SQL/v90_add_risk_manager_role.sql
```

**Step 3: Verify**

```sql
-- Check new role exists
SELECT * FROM project_roles WHERE role_name = 'risk_manager';
```

**Step 4: Use in Code**

```javascript
// No code changes needed! Just use the new role name
await assignProjectRole(projectId, userId, 'risk_manager')

// Dropdown automatically shows new role
const roles = await getTemplateRoles() // Includes risk_manager
```

---

## Migration Strategy for Future Roles

### When Organization Needs New Template Role

1. **Identify Need:** "We need a 'Security Officer' role"
2. **Design Permissions:** Define what permissions this role needs
3. **Create Migration:** Write SQL to add template
4. **Run Migration:** Execute in database
5. **Use Immediately:** No code deployment needed - just use role name

### Benefits of This Approach

✅ **Flexible:** Add new roles without code changes
✅ **Future-Proof:** System supports unlimited role growth
✅ **No Downtime:** Add roles while system is running
✅ **Backwards Compatible:** Existing roles unaffected
✅ **Simple:** Just SQL INSERT, no complex deployments

---

## Best Practices

### DO ✅

1. **Always lookup roles by name**
   ```javascript
   await assignProjectRole(projectId, userId, 'project_manager')
   ```

2. **Use descriptive role names**
   ```sql
   role_name: 'quality_assurance' (good)
   role_name: 'qa1' (bad)
   ```

3. **Load roles dynamically**
   ```javascript
   const roles = await getProjectRoles(projectId) // Fetches all
   ```

4. **Allow custom role creation**
   ```javascript
   await createCustomProjectRole(projectId, roleData)
   ```

5. **Use role_level for hierarchy**
   ```sql
   role_level: 12 (highest - board member)
   role_level: 4 (lowest - team member)
   ```

### DON'T ❌

1. **Never hardcode role IDs**
   ```javascript
   // ❌ WRONG
   const PROJECT_MANAGER_ID = '123-abc'
   await assignRole(userId, PROJECT_MANAGER_ID)
   ```

2. **Never assume fixed number of roles**
   ```javascript
   // ❌ WRONG
   if (roles.length !== 7) throw new Error('Expected 7 roles')
   ```

3. **Never hardcode role lists in UI**
   ```javascript
   // ❌ WRONG
   const ROLES = ['Project Manager', 'Team Lead', 'Team Member']

   // ✅ CORRECT
   const roles = await getTemplateRoles()
   ```

4. **Never restrict custom role creation**
   ```javascript
   // ❌ WRONG
   if (customRoles.length >= 10) throw new Error('Max 10 custom roles')

   // ✅ CORRECT
   // Allow unlimited custom roles
   ```

---

## Testing Checklist

### Role Lookup Tests

- [ ] Can lookup template role by name
- [ ] Can lookup custom role by name + project
- [ ] Throws error if role not found
- [ ] Returns correct role permissions

### Role Assignment Tests

- [ ] Can assign template role to user
- [ ] Can assign custom role to user
- [ ] Cannot assign with hardcoded ID
- [ ] Role assignment persists in database

### Custom Role Tests

- [ ] Project Manager can create custom role
- [ ] Custom role appears in project role list
- [ ] Custom role can be assigned to users
- [ ] Custom role only available in that project

### Template Role Tests

- [ ] All 9 template roles exist after migration
- [ ] Template roles available to all projects
- [ ] Can add new template role via SQL
- [ ] New template role immediately available

---

## Summary

### Key Principles

1. **NO HARDCODED ROLE IDs** - Always lookup by role_name
2. **Dynamic System** - Supports adding new templates anytime
3. **Unlimited Custom Roles** - Each project can create as many as needed
4. **Name-Based Lookup** - All operations use role names, not IDs
5. **Future-Proof** - System grows without code changes

### Role Count

- **System Roles:** 1 (account_owner)
- **Project Role Templates:** 9 (starting set, can grow)
- **Custom Roles:** Unlimited (per project)

### Implementation

- All role assignments use name lookup
- Dropdowns load roles dynamically from database
- New templates added via SQL migrations
- Custom roles created via UI by Project Managers

---

**Status:** ✅ Architecture Approved
**Implementation:** Ready to code
**Flexibility:** Maximum - supports future growth
