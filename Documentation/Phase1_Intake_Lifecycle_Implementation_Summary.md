# Phase 1: Project Intake Lifecycle Implementation Summary

## Implementation Date
2026-01-12

## Phase Overview
Phase 1 adds the foundational Draft → Authorised lifecycle to the PMO Project Creation form without breaking existing functionality.

---

## Changes Made

### 1. Database Changes
**File**: `SQL/v152_project_intake_lifecycle.sql`

**New Columns Added to `projects` Table**:
- `intake_status` VARCHAR(50) DEFAULT 'draft'
  - Values: 'draft', 'readiness_pending', 'authorised', 'rejected', 'suspended'
- `created_by_user_id` UUID (references users table)
- `authorised_by_user_id` UUID (references users table)
- `authorised_at` TIMESTAMP
- `rejection_reason` TEXT
- `suspended_reason` TEXT

**Constraints Added**:
- Check constraint on `intake_status` to enforce valid values

**Indexes Added**:
- `idx_projects_intake_status` - For filtering by intake status
- `idx_projects_authorised_by` - For audit queries
- `idx_projects_created_by` - For ownership queries

**Migration Safety**:
- Existing projects automatically set to 'authorised' status
- Backward compatibility maintained
- All new columns are nullable or have defaults

---

### 2. Frontend Changes
**File**: `src/pages/ProjectsCreate.jsx`

**Changes**:
1. Added `intake_status: 'draft'` to formData state (line ~30)
2. Updated submit handler to include:
   - `intake_status` field
   - `created_by_user_id` field
3. Added "Save Draft" button alongside "Create Project" button (lines ~716-732)
   - Gray button for "Save Draft"
   - Blue button for "Create Project"
   - Both buttons submit the same form with `intake_status='draft'`

**UI Changes**:
- Two submission buttons now available (visual differentiation only)
- No functional difference at this phase (both save as draft)
- Maintains all existing styling and dark theme support

---

### 3. Service Layer Changes
**File**: `src/services/projectService.js`

**Changes**:
- Updated `createProject()` function to accept and insert:
  - `intake_status` (defaults to 'draft' if not provided)
  - `created_by_user_id`

**Backward Compatibility**:
- Function still works if intake_status is not provided (uses default)
- Existing code calling this service will continue to work

---

## Files Modified

1. ✅ `SQL/v152_project_intake_lifecycle.sql` (created)
2. ✅ `src/pages/ProjectsCreate.jsx` (modified)
3. ✅ `src/services/projectService.js` (modified)
4. ✅ `projectplan/PMO_Project_Creation_Governance_Upgrade_Plan.md` (updated)

---

## Testing Instructions

### Manual Testing Required (User Actions)

#### Test 1: Run SQL Migration
```bash
# In Supabase SQL Editor, run:
SQL/v152_project_intake_lifecycle.sql

# Expected result:
# - All columns created successfully
# - Constraints and indexes added
# - Verification output shows success
# - Existing projects migrated to 'authorised' status
```

#### Test 2: Save Draft Project
1. Navigate to `/projects/new` (Create New Project page)
2. Fill in required fields:
   - Project Name: "Test Draft Project"
   - Methodology: Select any
   - Project Type: Select any
   - Initial Status: Select any
3. Click "Save Draft" button
4. Expected: Project created with `intake_status='draft'`

#### Test 3: Create Project
1. Navigate to `/projects/new`
2. Fill in required fields
3. Click "Create Project" button
4. Expected: Project created with `intake_status='draft'`

#### Test 4: Verify Database
```sql
-- Check newly created project
SELECT
    project_name,
    intake_status,
    created_by_user_id,
    authorised_by_user_id,
    authorised_at
FROM projects
WHERE project_name = 'Test Draft Project';

-- Expected result:
-- intake_status = 'draft'
-- created_by_user_id = current user's ID
-- authorised_by_user_id = NULL
-- authorised_at = NULL
```

---

## Breaking Changes

❌ **NONE** - This phase introduces no breaking changes.

- Existing projects continue to work
- New columns are nullable or have defaults
- Existing code continues to function
- UI maintains all current styling

---

## Known Limitations (Phase 1)

1. Both "Save Draft" and "Create Project" buttons currently do the same thing (save as draft)
2. No validation enforcement yet (all fields optional)
3. No readiness checking yet (comes in Phase 3)
4. No authorisation workflow yet (comes in Phase 4)
5. No audit logging yet (comes in Phase 5)

These limitations are intentional and will be addressed in subsequent phases.

---

## Next Steps

**Phase 2**: Add Governance Fields
- Add all PRD-required fields to database
- Create form sections for governance data capture
- Update UI with accordion/collapsible sections
- Fields will be optional at this stage

**Estimated Implementation**: Larger phase, will require creating multiple component files

---

## Git Commit Recommendation

```bash
git add SQL/v152_project_intake_lifecycle.sql
git add src/pages/ProjectsCreate.jsx
git add src/services/projectService.js
git add projectplan/PMO_Project_Creation_Governance_Upgrade_Plan.md
git add Documentation/Phase1_Intake_Lifecycle_Implementation_Summary.md
git commit -m "feat(phase1): add draft-authorised project lifecycle

- Add intake_status field to projects table (draft/authorised/rejected/suspended)
- Add created_by_user_id and authorised_by_user_id tracking
- Update ProjectsCreate.jsx with Save Draft button
- Update projectService to accept lifecycle fields
- Maintain backward compatibility with existing projects
- No breaking changes

Phase 1 of 6 - PMO Project Creation Governance Upgrade"
```

---

## Success Criteria

✅ SQL migration file created and documented
✅ Database columns added with proper constraints
✅ Frontend form captures intake_status
✅ Save Draft button added to UI
✅ Service layer accepts new fields
✅ No breaking changes to existing functionality
✅ Existing projects remain functional

**Status**: ✅ **PHASE 1 COMPLETE** (Pending user testing and SQL migration execution)

---

**End of Phase 1 Summary**
