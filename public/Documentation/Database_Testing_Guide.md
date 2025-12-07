# Database Testing Guide
**Project:** Project Nidus - Multi-Methodology Project Management System
**Version:** 1.0
**Date:** 2025-11-15
**Purpose:** Guide for testing and validating the Project Nidus database

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Validation](#database-validation)
4. [Loading Seed Data](#loading-seed-data)
5. [Running Test Procedures](#running-test-procedures)
6. [Testing RLS Policies](#testing-rls-policies)
7. [Performance Testing](#performance-testing)
8. [Troubleshooting](#troubleshooting)
9. [Resetting the Database](#resetting-the-database)

---

## Overview

This guide provides step-by-step instructions for testing and validating the Project Nidus database. It covers:

- Running validation scripts to verify database structure
- Loading seed data for testing
- Executing test procedures to validate functionality
- Testing Row Level Security (RLS) policies
- Performance testing guidelines
- Troubleshooting common issues

---

## Prerequisites

Before running tests, ensure you have:

1. **PostgreSQL 15+** installed (or access to Supabase)
2. **Database created** and accessible
3. **All core SQL scripts run** (v01 through v09)
4. **Seed data scripts run** (v11 through v15)
5. **Test procedures created** (v17)
6. **psql** or **pgAdmin** or **Supabase SQL Editor** access

---

## Database Validation

### Step 1: Run Validation Tests

The validation script `v10_validation_tests.sql` performs comprehensive checks on your database.

**Using psql:**
```bash
psql -U your_username -d project_nidus -f SQL/v10_validation_tests.sql
```

**Using Supabase SQL Editor:**
1. Open the Supabase Dashboard
2. Navigate to SQL Editor
3. Paste the contents of `SQL/v10_validation_tests.sql`
4. Click "Run"

### Step 2: Review Validation Results

The validation script tests:

| Test | What It Checks | Expected Result |
|------|---------------|----------------|
| Test 1 | All tables exist in database_tables | 28 tables |
| Test 2 | All tables exist in PostgreSQL | 28 tables |
| Test 3 | All triggers exist | 56+ triggers |
| Test 4 | All views exist | 12 views |
| Test 5 | All functions exist | 5 functions |
| Test 6 | RLS enabled on all tables | 28 tables |
| Test 7 | RLS policies exist | 56+ policies |
| Test 8 | Indexes exist | 80+ indexes |
| Test 9 | Foreign keys exist | 40+ constraints |
| Test 10 | All tables have audit fields | 28 tables |

**Expected Output:**
```
================================================
TEST SUMMARY
================================================
Total Tests:  10
Passed:       10 ✓
Failed:       0 ✗

OVERALL RESULT: ✓✓✓ ALL TESTS PASSED ✓✓✓
================================================
```

### Step 3: Review Detailed Diagnostics

The validation script also provides:
- Tables by category
- List of all views
- List of all functions
- RLS policy count by table
- Tables missing RLS (should be empty)
- Index count by table
- Foreign key relationships

Review these sections to understand your database structure.

---

## Loading Seed Data

### Recommended Order

Load seed data in the following order:

1. **System Foundation** (`v11_seed_data_system.sql`)
   - System settings
   - Email templates

2. **RBAC** (`v12_seed_data_rbac.sql`)
   - Permissions
   - Roles
   - Role-permission assignments

3. **Methodologies** (`v13_seed_data_methodologies.sql`)
   - Methodologies (Structured PM, Scrum, Kanban, Agile Hybrid, Hybrid PM)
   - Workflows

4. **Menus** (`v14_seed_data_menus.sql`)
   - Menu structure
   - Role-menu assignments

5. **Lookups** (`v15_seed_data_lookups.sql`)
   - Project statuses
   - Project types

### Loading Seed Data

**Using psql:**
```bash
cd SQL
psql -U your_username -d project_nidus -f v11_seed_data_system.sql
psql -U your_username -d project_nidus -f v12_seed_data_rbac.sql
psql -U your_username -d project_nidus -f v13_seed_data_methodologies.sql
psql -U your_username -d project_nidus -f v14_seed_data_menus.sql
psql -U your_username -d project_nidus -f v15_seed_data_lookups.sql
```

**Using Supabase:**
1. Open each seed data file
2. Copy the contents
3. Paste into Supabase SQL Editor
4. Execute in order

### Verifying Seed Data

After loading, verify with these queries:

```sql
-- Check permissions
SELECT COUNT(*) FROM permissions WHERE is_deleted = FALSE;
-- Expected: 60+

-- Check roles
SELECT COUNT(*) FROM roles WHERE is_deleted = FALSE;
-- Expected: 7

-- Check methodologies
SELECT COUNT(*) FROM methodologies WHERE is_deleted = FALSE;
-- Expected: 5

-- Check menu items
SELECT COUNT(*) FROM menu_items WHERE is_deleted = FALSE;
-- Expected: 30+

-- Check project statuses
SELECT COUNT(*) FROM project_statuses WHERE is_deleted = FALSE;
-- Expected: 9

-- Check project types
SELECT COUNT(*) FROM project_types WHERE is_deleted = FALSE;
-- Expected: 10
```

---

## Running Test Procedures

### Test Procedures Available

The test procedures (`v17_test_procedures.sql`) provide:

1. **test_audit_triggers()** - Tests audit field automation
2. **test_soft_delete()** - Tests soft delete functionality
3. **test_foreign_keys()** - Tests foreign key constraints
4. **test_views()** - Tests views return data
5. **test_utility_functions()** - Tests utility functions
6. **test_seed_data()** - Tests seed data integrity
7. **run_all_tests()** - Runs all tests

### Running Individual Tests

```sql
-- Test audit triggers
SELECT * FROM test_audit_triggers();

-- Test soft delete
SELECT * FROM test_soft_delete();

-- Test foreign keys
SELECT * FROM test_foreign_keys();

-- Test views
SELECT * FROM test_views();

-- Test utility functions
SELECT * FROM test_utility_functions();

-- Test seed data
SELECT * FROM test_seed_data();
```

### Running All Tests

```sql
SELECT * FROM run_all_tests();
```

**Expected Results:**

All tests should return `status = 'PASS'`. Example output:

| test_name | status | message |
|-----------|--------|---------|
| INSERT Trigger - created_at | PASS | created_at was set automatically |
| UPDATE Trigger - updated_at | PASS | updated_at was updated automatically |
| Soft Delete Function | PASS | Record was soft deleted correctly |
| Foreign Key - Valid Insert | PASS | Project created with valid foreign keys |
| Foreign Key - Invalid Insert | PASS | Invalid FK correctly rejected |
| View: v_active_users | PASS | View returned X rows |
| ... | ... | ... |

### Interpreting Results

- **PASS** - Test succeeded
- **FAIL** - Test failed (investigate)
- **ERROR** - Test encountered an error (check message)

---

## Testing RLS Policies

Row Level Security (RLS) policies enforce security at the database level. Testing RLS requires multiple user contexts.

### Prerequisites

1. Supabase account with test users created
2. Users assigned to different roles
3. Test projects created

### Test Scenarios

#### Scenario 1: System Admin Access

**Test:** System Admin should have full access to all records.

```sql
-- As System Admin user
SELECT COUNT(*) FROM users;  -- Should see all users
SELECT COUNT(*) FROM projects;  -- Should see all projects
SELECT COUNT(*) FROM roles;  -- Should see all roles
```

#### Scenario 2: User Own Data Access

**Test:** Users should see their own records.

```sql
-- As regular user
SELECT * FROM users WHERE id = auth.uid();  -- Should see own record
SELECT * FROM user_preferences WHERE user_id = auth.uid();  -- Should see own preferences
```

#### Scenario 3: Project-Based Access

**Test:** Users should only see projects they're assigned to.

```sql
-- As project member
SELECT * FROM projects;  -- Should only see assigned projects
SELECT * FROM v_user_project_access WHERE user_id = auth.uid();  -- View accessible projects
```

#### Scenario 4: Role-Based Menu Access

**Test:** Users should only see menus for their role.

```sql
-- As team member
SELECT * FROM v_menu_hierarchy;  -- Should only see allowed menus
```

### RLS Testing Checklist

- [ ] System Admin can access all tables
- [ ] Users can access their own records
- [ ] Users cannot access other users' personal data
- [ ] Users can only see assigned projects
- [ ] Menu visibility respects role assignments
- [ ] Permissions are correctly enforced

---

## Performance Testing

### Basic Query Performance

Test query performance with these examples:

```sql
-- Enable timing
\timing on

-- Test project listing with details
EXPLAIN ANALYZE
SELECT * FROM v_projects_with_details
WHERE is_archived = FALSE
LIMIT 25;

-- Test user permissions view
EXPLAIN ANALYZE
SELECT * FROM v_user_permissions
WHERE user_id = 'some-uuid';

-- Test menu hierarchy
EXPLAIN ANALYZE
SELECT * FROM v_menu_hierarchy;
```

### Index Effectiveness

Check if indexes are being used:

```sql
-- Should use index on is_deleted
EXPLAIN ANALYZE
SELECT * FROM projects
WHERE is_deleted = FALSE;

-- Should use index on user_id
EXPLAIN ANALYZE
SELECT * FROM user_roles
WHERE user_id = 'some-uuid';
```

### Performance Benchmarks

| Query | Expected Time | Action if Slower |
|-------|--------------|------------------|
| SELECT FROM v_active_projects (25 rows) | < 10ms | Check indexes on projects table |
| SELECT FROM v_user_permissions (1 user) | < 20ms | Check indexes on junction tables |
| SELECT FROM v_menu_hierarchy | < 5ms | Check indexes on menu_items |

---

## Troubleshooting

### Common Issues

#### Issue: Validation Tests Fail

**Symptoms:** v10_validation_tests.sql shows failed tests.

**Solutions:**
1. Check error messages in test output
2. Verify all SQL scripts (v01-v09) ran successfully
3. Check for missing tables: `SELECT * FROM database_tables;`
4. Verify RLS enabled: Check Test 6 output

#### Issue: Seed Data Not Loading

**Symptoms:** INSERT statements fail or return 0 rows.

**Solutions:**
1. Check for unique constraint violations
2. Verify foreign key dependencies loaded first
3. Check for RLS blocking inserts (may need to disable temporarily)
4. Verify trigger functions exist

**Temporary RLS Disable (if needed for seeding):**
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Load seed data
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

#### Issue: Test Procedures Fail

**Symptoms:** run_all_tests() returns errors.

**Solutions:**
1. Check if seed data loaded correctly
2. Verify auth.uid() is available (Supabase)
3. Check for missing foreign key data
4. Review individual test output for specific errors

#### Issue: RLS Policies Too Restrictive

**Symptoms:** Users can't access data they should see.

**Solutions:**
1. Review RLS policies in v09_rls_policies.sql
2. Check user role assignments
3. Verify user_projects assignments
4. Test with System Admin role first (should always work)

---

## Resetting the Database

### Full Reset (Development Only)

**WARNING:** This will delete ALL data. Only use in development.

```sql
-- Drop all tables (cascade will drop dependent objects)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Recreate all tables
-- Run v01 through v09 again
```

### Partial Reset (Seed Data Only)

To reset seed data without dropping tables:

```sql
-- Delete seed data (careful with foreign keys)
DELETE FROM role_menu_items WHERE is_deleted = FALSE;
DELETE FROM role_permissions WHERE is_deleted = FALSE;
DELETE FROM user_menu_preferences WHERE is_deleted = FALSE;
DELETE FROM menu_items WHERE is_deleted = FALSE;
DELETE FROM workflows WHERE is_deleted = FALSE;
DELETE FROM methodologies WHERE is_deleted = FALSE;
DELETE FROM project_types WHERE is_deleted = FALSE;
DELETE FROM project_statuses WHERE is_deleted = FALSE;
DELETE FROM email_templates WHERE is_deleted = FALSE;
DELETE FROM system_settings WHERE setting_category != 'system';
DELETE FROM permissions WHERE is_deleted = FALSE;
DELETE FROM roles WHERE is_system = FALSE;

-- Reload seed data
-- Run v11 through v15 again
```

### Reset Test Data Only

```sql
-- Delete only test records
DELETE FROM projects WHERE project_code LIKE 'TEST-%';
DELETE FROM users WHERE email LIKE '%@test.example.com';
-- etc.
```

---

## Best Practices

### Testing Guidelines

1. **Always test in development first** - Never test directly in production
2. **Use version control** - Track all SQL script changes
3. **Document test results** - Keep a log of test runs and results
4. **Test RLS thoroughly** - Security is critical
5. **Monitor performance** - Use EXPLAIN ANALYZE regularly
6. **Backup before testing** - Always have a backup before major tests

### Continuous Testing

1. Run validation tests after any schema changes
2. Run test procedures after loading new seed data
3. Test RLS policies when adding new roles or permissions
4. Performance test with realistic data volumes
5. Document any issues and resolutions

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- Project Nidus Seed Data Reference (`Seed_Data_Reference.md`)

---

## Support

For issues or questions:
1. Review error messages carefully
2. Check this guide's Troubleshooting section
3. Consult PostgreSQL/Supabase documentation
4. Review the SQL scripts for comments and documentation

---

**End of Database Testing Guide**
