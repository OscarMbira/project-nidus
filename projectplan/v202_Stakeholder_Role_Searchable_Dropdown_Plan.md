# Stakeholder Role Searchable Dropdown Implementation Plan

## Overview
Convert the "Role" field in the Stakeholders section of the Project Mandate form from a plain text input to a searchable dropdown that fetches data from a database table.

**Current State:** Plain text input field with placeholder "Role/Title..."
**Target State:** Searchable dropdown populated from `stakeholder_roles` lookup table

---

## Implementation Tasks

### Phase 1: Database Setup

- [ ] **1.1 Create `stakeholder_roles` lookup table**
  - Table: `stakeholder_roles`
  - Fields:
    - `id` (UUID, primary key)
    - `role_name` (VARCHAR, unique, not null) - e.g., "CEO", "Project Sponsor", "Business Analyst"
    - `role_code` (VARCHAR, unique) - e.g., "CEO", "PS", "BA"
    - `role_category` (VARCHAR) - e.g., "Executive", "Project Team", "Business"
    - `description` (TEXT) - Brief description of the role
    - `is_active` (BOOLEAN, default true)
    - `display_order` (INTEGER) - For sorting
    - `created_at` (TIMESTAMP)
    - `updated_at` (TIMESTAMP)
    - `created_by` (UUID, FK to users)
    - `is_deleted` (BOOLEAN, default false)

- [ ] **1.2 Create RLS policies**
  - SELECT: Allow authenticated users to read active roles
  - INSERT/UPDATE/DELETE: Restrict to admin users

- [ ] **1.3 Seed initial data**
  - Common stakeholder roles:
    - Executive: CEO, CFO, CTO, CIO, COO
    - Project: Project Sponsor, Project Manager, Business Analyst, Technical Lead
    - Business: Product Owner, Business Owner, Subject Matter Expert
    - Operations: Operations Manager, IT Manager, Department Head
    - External: Customer Representative, Vendor Representative, Consultant

---

### Phase 2: Service Layer

- [ ] **2.1 Create `stakeholderRoleService.js`**
  ```javascript
  // Functions:
  - getActiveRoles() - Fetch all active roles for dropdown
  - searchRoles(query) - Search roles by name
  - getRoleById(id) - Get single role
  - createRole(data) - Admin only
  - updateRole(id, data) - Admin only
  - deleteRole(id) - Soft delete, admin only
  ```

---

### Phase 3: Frontend Implementation

- [ ] **3.1 Update `StakeholdersListSimple.jsx`**
  - Import existing `SearchableSelect` component
  - Add state for roles: `const [roles, setRoles] = useState([])`
  - Add useEffect to fetch roles on mount
  - Replace text input (lines 128-138) with SearchableSelect
  - Allow custom entry option (user can still type if role not in list)

- [ ] **3.2 Component changes**
  ```jsx
  // Before (line 128-138):
  <input
    type="text"
    value={newStakeholder.stakeholder_role}
    onChange={(e) => setNewStakeholder(prev => ({ ...prev, stakeholder_role: e.target.value }))}
    placeholder="Role/Title..."
    className="..."
  />

  // After:
  <SearchableSelect
    options={roles}
    value={newStakeholder.stakeholder_role}
    onChange={(value) => setNewStakeholder(prev => ({ ...prev, stakeholder_role: value }))}
    placeholder="Select or type role..."
    searchPlaceholder="Search roles..."
    allowCustom={true}  // Allow user to type custom role
  />
  ```

---

### Phase 4: Simulator Feature Parity

- [ ] **4.1 Create same table in `sim` schema**
  - `sim.stakeholder_roles` with same structure
  - Same seed data

- [ ] **4.2 Update Simulator stakeholder components**
  - Apply same changes to Simulator mandate forms if applicable

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `SQL/v256_stakeholder_roles_table.sql` | Create | Database table and seed data |
| `src/services/stakeholderRoleService.js` | Create | Service for fetching roles |
| `src/components/mandate/StakeholdersListSimple.jsx` | Modify | Replace text input with searchable dropdown |
| `src/components/ui/SearchableSelect.jsx` | Modify (if needed) | Add `allowCustom` prop support |
| `SQL/v257_sim_stakeholder_roles_table.sql` | Create | Simulator schema table |

---

## Seed Data (Sample Roles)

| Role Name | Role Code | Category |
|-----------|-----------|----------|
| Chief Executive Officer | CEO | Executive |
| Chief Financial Officer | CFO | Executive |
| Chief Technology Officer | CTO | Executive |
| Chief Information Officer | CIO | Executive |
| Chief Operating Officer | COO | Executive |
| Project Sponsor | PS | Project |
| Project Manager | PM | Project |
| Programme Manager | PGM | Project |
| Business Analyst | BA | Project |
| Technical Lead | TL | Project |
| Solution Architect | SA | Project |
| Product Owner | PO | Business |
| Business Owner | BO | Business |
| Subject Matter Expert | SME | Business |
| Process Owner | PRO | Business |
| Department Head | DH | Operations |
| IT Manager | ITM | Operations |
| Operations Manager | OPM | Operations |
| Customer Representative | CR | External |
| Vendor Representative | VR | External |
| Consultant | CON | External |
| End User | EU | User |
| System Administrator | SYS | Technical |
| Quality Assurance Lead | QA | Quality |

---

## Acceptance Criteria

1. Role field displays as searchable dropdown
2. User can search/filter roles by typing
3. User can select from dropdown list
4. User can optionally type a custom role not in the list
5. Selected role value is stored correctly
6. Existing stakeholder data continues to work (backward compatible)
7. Simulator has same functionality

---

## Estimated Effort

- Phase 1 (Database): 1 SQL file
- Phase 2 (Service): 1 service file
- Phase 3 (Frontend): 1-2 component modifications
- Phase 4 (Simulator): 1 SQL file + component check

---

## Notes

- The existing `SearchableSelect` component may need an `allowCustom` prop to let users type custom values not in the list
- The field should be backward compatible - existing text values should still display correctly
- Consider adding role management UI for PMO Admin in future iteration
