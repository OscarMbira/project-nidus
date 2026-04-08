# Document Governance SQL Fix Summary

## Issue Description
**Error**: `column p.programme_id does not exist`
**Root Cause**: The `projects` table does not have a direct `programme_id` foreign key. Instead, the relationship between projects and programmes is managed through a many-to-many linking table: `programme_projects`.

## Database Schema Understanding

### Projects-Programmes Relationship
```sql
-- CORRECT: Many-to-many relationship
projects (id) ←→ programme_projects (project_id, programme_id) ←→ programmes (id)

-- INCORRECT: Direct foreign key (does not exist)
projects (id, programme_id) → programmes (id)  ❌
```

## Files Fixed

### 1. SQL/v148_document_compliance_functions.sql
**Function Fixed**: `get_programme_document_compliance()`

**Original (Incorrect)**:
```sql
FROM projects p
WHERE p.programme_id = p_programme_id  -- ❌ column doesn't exist
```

**Fixed**:
```sql
FROM projects p
INNER JOIN programme_projects pp ON p.id = pp.project_id
WHERE pp.programme_id = p_programme_id  -- ✅ correct join
  AND pp.is_deleted = FALSE
```

**Function Fixed**: `calculate_programme_storage_usage()`

**Original (Incorrect)**:
```sql
FROM projects p
WHERE p.programme_id = p_programme_id  -- ❌ column doesn't exist
```

**Fixed**:
```sql
FROM projects p
INNER JOIN programme_projects pp ON p.id = pp.project_id
WHERE pp.programme_id = p_programme_id  -- ✅ correct join
  AND pp.is_deleted = FALSE
```

### 2. SQL/v149_document_governance_views.sql
**View Fixed**: `pmo_document_compliance_view`

**Original (Incorrect)**:
```sql
FROM projects p
LEFT JOIN programmes prog ON p.programme_id = prog.id  -- ❌ column doesn't exist
```

**Fixed**:
```sql
FROM projects p
LEFT JOIN programme_projects pp ON p.id = pp.project_id
  AND pp.is_deleted = FALSE
LEFT JOIN programmes prog ON pp.programme_id = prog.id  -- ✅ correct joins
  AND prog.is_deleted = FALSE
```

**View Fixed**: `programme_document_rollup_view`

**Original (Incorrect)**:
```sql
FROM programmes prog
LEFT JOIN projects p ON prog.id = p.programme_id  -- ❌ column doesn't exist
```

**Fixed**:
```sql
FROM programmes prog
LEFT JOIN programme_projects pp ON prog.id = pp.programme_id
  AND pp.is_deleted = FALSE
LEFT JOIN projects p ON pp.project_id = p.id  -- ✅ correct joins
  AND p.is_deleted = FALSE
```

## Impact Analysis

### Functions Updated (2)
1. ✅ `get_programme_document_compliance()` - Now correctly joins through programme_projects
2. ✅ `calculate_programme_storage_usage()` - Now correctly joins through programme_projects

### Views Updated (3)
1. ✅ `pmo_document_compliance_view` - Now includes programme_id via programme_projects join
2. ✅ `programme_document_rollup_view` - Now correctly aggregates across programme_projects
3. ✅ `document_audit_trail_view` - Now uses correct audit_trails schema (operation, changed_at, old_values/new_values)

### No Breaking Changes
- All function signatures remain the same
- All view columns remain the same
- Only internal SQL logic updated

## Testing Recommendations

### 1. Test Programme Compliance Function
```sql
-- Create test data
INSERT INTO programmes (programme_code, programme_name)
VALUES ('PROG-001', 'Test Programme')
RETURNING id;

-- Link project to programme (assuming project exists)
INSERT INTO programme_projects (programme_id, project_id)
VALUES ('{programme_id}', '{project_id}');

-- Test function
SELECT * FROM get_programme_document_compliance('{programme_id}');
```

### 2. Test Compliance Views
```sql
-- Test project compliance view
SELECT * FROM pmo_document_compliance_view
WHERE programme_id IS NOT NULL
LIMIT 5;

-- Test programme rollup view
SELECT * FROM programme_document_rollup_view
LIMIT 5;
```

### 3. Test Storage Calculation
```sql
-- Test programme storage usage
SELECT
    programme_id,
    programme_name,
    format_file_size(calculate_programme_storage_usage(programme_id)) as storage_used
FROM programmes
WHERE is_deleted = FALSE
LIMIT 5;
```

## Deployment Notes

### Prerequisites Verified
- ✅ `audit_trails` table schema verified in `v02_system_core_tables.sql`
- ✅ `programme_projects` linking table exists (many-to-many relationship)

### Order of Execution
1. ✅ Run `v146_document_governance_tables.sql` first (no changes needed)
2. ✅ Run `v147_document_types_seed_data.sql` second (no changes needed)
3. ✅ Run `v148_document_compliance_functions.sql` third (**UPDATED** - 3 rounds of fixes)
4. ✅ Run `v149_document_governance_views.sql` fourth (**UPDATED** - 3 rounds of fixes)
5. ✅ Run `v150_supabase_storage_setup.sql` fifth (no changes needed)

### Rollback Instructions
If issues occur, drop and recreate affected objects:
```sql
-- Drop functions
DROP FUNCTION IF EXISTS get_programme_document_compliance(UUID);
DROP FUNCTION IF EXISTS calculate_programme_storage_usage(UUID);

-- Drop views
DROP VIEW IF EXISTS pmo_document_compliance_view;
DROP VIEW IF EXISTS programme_document_rollup_view;

-- Re-run v148 and v149 with fixes
```

## Verification Queries

### Verify Functions Exist
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('get_programme_document_compliance', 'calculate_programme_storage_usage');
```

### Verify Views Exist
```sql
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('pmo_document_compliance_view', 'programme_document_rollup_view');
```

### Test View Queries
```sql
-- Should return without errors
SELECT COUNT(*) FROM pmo_document_compliance_view;
SELECT COUNT(*) FROM programme_document_rollup_view;
```

### 3. SQL/v149_document_governance_views.sql (Second & Third Fix)
**View Fixed**: `document_audit_trail_view`

**Issue 1: Type casting error**
```sql
-- Original (Incorrect):
LEFT JOIN project_documents pd ON at.record_id = pd.id::TEXT  -- ❌ type mismatch

-- Attempted Fix (Still Wrong):
LEFT JOIN project_documents pd ON at.record_id::UUID = pd.id  -- ❌ record_id is already UUID!
```

**Issue 2: Column name mismatches**
The view referenced non-existent columns in the `audit_trails` table:
- Used `at.action_type` but actual column is `at.operation`
- Used `at.changes` but actual columns are `at.old_values`, `at.new_values`, `at.changed_fields`
- Used `at.created_at` but should use `at.changed_at` for action timestamp
- Used `WHERE at.is_deleted = FALSE` but audit_trails doesn't have `is_deleted` column

**Fixed (All Issues)**:
```sql
SELECT
    at.id AS audit_id,
    at.operation AS action_type,  -- ✅ correct column name
    at.table_name,
    at.record_id,
    pd.id AS document_id,
    ...
    jsonb_build_object(  -- ✅ construct changes from separate columns
        'old_values', at.old_values,
        'new_values', at.new_values,
        'changed_fields', at.changed_fields
    ) AS changes,
    at.changed_at AS action_timestamp  -- ✅ correct timestamp column
FROM audit_trails at
LEFT JOIN project_documents pd ON at.record_id = pd.id  -- ✅ both are UUID, no casting needed
    AND at.table_name = 'project_documents'
...
WHERE at.table_name IN (...)  -- ✅ removed is_deleted check
ORDER BY at.changed_at DESC;
```

**Resolution**:
1. Discovered `audit_trails.record_id` is actually UUID (not TEXT), so no casting needed
2. Updated all column references to match actual `audit_trails` schema from v02_system_core_tables.sql
3. Combined old_values, new_values, and changed_fields into a single JSONB object for the `changes` output

---

## Status

✅ **All SQL errors fixed**
✅ **2 functions updated** (programme_projects joins)
✅ **3 views updated** (2 for programme_projects, 1 for audit_trails schema)
✅ **Schema validation complete** (verified audit_trails columns from v02_system_core_tables.sql)
✅ **Ready for deployment**

---

**Fix Completed**: 2026-01-08
**Files Updated**: v148_document_compliance_functions.sql, v149_document_governance_views.sql
**Rounds of Fixes**: 3 (programme_id error, UUID casting error, audit_trails schema mismatch)
**Breaking Changes**: None
**Testing Required**: Yes (queries above)

## Summary of All Fixes

### Round 1: Programme Relationship Fix
- **Error**: `column p.programme_id does not exist`
- **Cause**: Direct foreign key assumption instead of many-to-many relationship
- **Solution**: Added proper JOINs through `programme_projects` linking table
- **Files**: v148 (2 functions), v149 (2 views)

### Round 2: Type Casting Error
- **Error**: `operator does not exist: uuid = text`
- **Cause**: Incorrect type casting attempt
- **Solution**: Initially attempted UUID casting, then discovered both columns are UUID

### Round 3: Schema Validation
- **Error**: `column at.action_type does not exist`
- **Cause**: View used non-existent column names from audit_trails table
- **Solution**: Verified actual schema in v02_system_core_tables.sql and updated all references
- **Columns Fixed**: operation (not action_type), changed_at (not created_at), old_values/new_values (not changes)
- **Files**: v149 (1 view)
