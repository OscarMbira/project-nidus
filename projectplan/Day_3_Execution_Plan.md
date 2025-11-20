# Phase 1 - Day 3: Core Tables Schema Design & SQL Scripts
**Date:** 2025-11-15
**Status:** In Progress
**Estimated Time:** 6-8 hours

---

## 📋 Overview

Create complete SQL scripts for all 28 core tables designed on Day 2. This includes creating versioned SQL files for extensions, trigger functions, table definitions, indexes, views, and Row Level Security (RLS) policies.

---

## 🎯 Day 3 Objectives

1. Create PostgreSQL extensions and utility functions
2. Create trigger functions for audit field automation
3. Create all 28 core table definitions with audit fields
4. Create indexes and constraints for performance and integrity
5. Create views for active records and common queries
6. Create RLS policies for security
7. Test all SQL scripts to verify syntax and functionality

---

## 📝 Tasks Breakdown

### Task 1: Create Extensions and Trigger Functions
**Priority:** Critical
**Estimated Time:** 60 minutes
**File:** `SQL/v01_extensions_and_functions.sql`

**Objectives:**
- Enable required PostgreSQL extensions
- Create trigger functions for audit field automation
- Create utility functions (soft delete, restore)

**Deliverables:**
1. Enable `uuid-ossp` extension
2. Create `trigger_set_created_fields()` function
3. Create `trigger_update_audit_fields()` function
4. Create `soft_delete_record()` function
5. Create `restore_deleted_record()` function

**Template:**
```sql
-- ================================================
-- File: v01_extensions_and_functions.sql
-- Description: PostgreSQL extensions and trigger functions
-- Version: 1.0
-- Date: 2025-11-15
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function: Set created fields
CREATE OR REPLACE FUNCTION trigger_set_created_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Implementation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ... other functions
```

---

### Task 2: Create System Core Tables (8 tables)
**Priority:** Critical
**Estimated Time:** 90 minutes
**File:** `SQL/v02_system_core_tables.sql`

**Tables to Create:**
1. `database_tables` - Table registry
2. `audit_trails` - System-wide audit log
3. `session_logs` - User session tracking
4. `system_settings` - System configuration
5. `email_templates` - Email templates
6. `notifications` - User notifications
7. `activity_logs` - Activity feed
8. `error_logs` - Error tracking

**For Each Table:**
- Complete table definition with all columns
- All 8 audit fields
- Appropriate data types
- NOT NULL constraints where needed
- DEFAULT values
- CHECK constraints for validation
- Triggers (BEFORE INSERT, BEFORE UPDATE)
- Comments on table and key columns
- Table registration in `database_tables`

---

### Task 3: Create User & Access Tables (7 tables)
**Priority:** Critical
**Estimated Time:** 90 minutes
**File:** `SQL/v03_user_access_tables.sql`

**Tables to Create:**
1. `users` - User accounts
2. `roles` - System roles
3. `permissions` - Available permissions
4. `user_roles` - User-role assignments (many-to-many)
5. `role_permissions` - Role-permission assignments (many-to-many)
6. `user_preferences` - User settings
7. `user_projects` - User-project assignments (many-to-many)

**Special Considerations:**
- `users` table links to Supabase auth.users
- Junction tables have unique constraints
- Cascade delete behavior on junction tables

---

### Task 4: Create Project Core Tables (8 tables)
**Priority:** Critical
**Estimated Time:** 90 minutes
**File:** `SQL/v04_project_core_tables.sql`

**Tables to Create:**
1. `projects` - Main project records
2. `project_methodologies` - Methodology selection
3. `project_configurations` - Project settings
4. `project_statuses` - Status lookup
5. `project_types` - Type lookup
6. `project_phases` - Phases/Stages/Sprints
7. `teams` - Team definitions
8. `team_members` - Team membership

**Special Considerations:**
- `projects` is the core entity with many relationships
- Lookup tables (statuses, types) need initial data
- CHECK constraints for date validation
- JSONB fields for flexible configuration

---

### Task 5: Create Configuration & Menu Tables (5 tables)
**Priority:** Critical
**Estimated Time:** 60 minutes
**File:** `SQL/v05_configuration_menu_tables.sql`

**Tables to Create:**
1. `methodologies` - Available methodologies
2. `workflows` - Workflow definitions
3. `menu_items` - Navigation menu
4. `role_menu_items` - Role-based menu access
5. `user_menu_preferences` - User menu customization

**Special Considerations:**
- Self-referencing in `menu_items` (parent_menu_id)
- JSONB for workflow definitions
- Initial seed data needed for methodologies

---

### Task 6: Create Indexes
**Priority:** High
**Estimated Time:** 45 minutes
**File:** `SQL/v06_indexes.sql`

**Index Types to Create:**
- Foreign key indexes (ALL foreign keys)
- Frequently filtered column indexes
- Sort column indexes (with DESC where appropriate)
- Partial indexes (with WHERE clause for is_deleted)
- Unique indexes (for unique constraints)
- Full-text search indexes (GIN on name/description fields)
- JSONB indexes (GIN on JSONB columns)

**Naming Convention:**
```sql
idx_tablename_columnname[_columnname2...]
```

---

### Task 7: Create Constraints
**Priority:** High
**Estimated Time:** 30 minutes
**File:** `SQL/v07_constraints.sql`

**Constraint Types:**
- Primary key constraints (named `pk_tablename`)
- Foreign key constraints (named `fk_tablename_referenced`)
- Unique constraints (named `uq_tablename_columnname`)
- Check constraints (named `chk_tablename_description`)

**Note:** Many constraints will already be inline in table definitions, but this file adds any additional complex constraints.

---

### Task 8: Create Views
**Priority:** Medium
**Estimated Time:** 45 minutes
**File:** `SQL/v08_views.sql`

**Views to Create:**
- `v_active_projects` - Non-deleted projects
- `v_active_users` - Non-deleted users
- `v_active_tasks` - Non-deleted tasks (if tasks created)
- `v_user_permissions` - User permissions with role expansion
- `v_project_summary` - Project with related data
- `v_tables_by_category` - Table registry summary

**Benefits:**
- Simplify common queries
- Hide is_deleted filtering
- Provide pre-joined data

---

### Task 9: Create RLS Policies
**Priority:** Critical
**Estimated Time:** 60 minutes
**File:** `SQL/v09_rls_policies.sql`

**For Each Table:**
1. Enable RLS: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
2. Create SELECT policy (who can read)
3. Create INSERT policy (who can create)
4. Create UPDATE policy (who can modify)
5. Create DELETE policy (who can delete/soft-delete)

**Common Policy Patterns:**
- Users can see their own data
- Users can see projects they're assigned to
- Admins can see everything
- Public tables (if any)

**Example:**
```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users see projects they have access to
CREATE POLICY policy_projects_user_access
    ON projects FOR SELECT
    USING (
        id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
        )
    );

-- Admin full access
CREATE POLICY policy_projects_admin_access
    ON projects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );
```

---

### Task 10: Create Seed Data (Optional)
**Priority:** Low
**Estimated Time:** 30 minutes
**File:** `SQL/v10_seed_data.sql`

**Initial Data:**
- Default project statuses (Draft, Active, On Hold, Completed, Cancelled)
- Default project types (Internal, Client, R&D)
- Default methodologies (Structured PM, Scrum, Kanban, Agile, Hybrid)
- Default roles (System Admin, Project Manager, Team Member, Viewer)
- Default permissions (project.create, project.read, project.update, etc.)

**Note:** Only create if time permits, can be done later.

---

## 📁 SQL File Structure

```
SQL/
├── v01_extensions_and_functions.sql    (Extensions + Trigger Functions)
├── v02_system_core_tables.sql          (8 system tables)
├── v03_user_access_tables.sql          (7 user/access tables)
├── v04_project_core_tables.sql         (8 project tables)
├── v05_configuration_menu_tables.sql   (5 config tables)
├── v06_indexes.sql                     (All indexes)
├── v07_constraints.sql                 (Additional constraints)
├── v08_views.sql                       (Convenience views)
├── v09_rls_policies.sql                (Row Level Security)
└── v10_seed_data.sql                   (Optional initial data)
```

---

## 🎯 Success Criteria

By end of Day 3:

- [ ] All PostgreSQL extensions enabled
- [ ] All trigger functions created and tested
- [ ] All 28 core tables created with:
  - [ ] Correct column definitions
  - [ ] All 8 audit fields
  - [ ] Appropriate data types
  - [ ] NOT NULL constraints
  - [ ] DEFAULT values
  - [ ] Triggers attached
  - [ ] Comments added
  - [ ] Registered in `database_tables`
- [ ] All foreign key indexes created
- [ ] All unique indexes created
- [ ] All check constraints created
- [ ] Convenience views created
- [ ] RLS enabled on all tables
- [ ] RLS policies created for all tables
- [ ] All SQL scripts are syntactically correct
- [ ] Scripts tested on development database

---

## 📋 SQL Script Standards

### File Header Template

```sql
-- ================================================
-- File: v0X_filename.sql
-- Description: Brief description of what this file creates
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - Extension uuid-ossp must be enabled
-- - Previous version scripts must be run first

-- ================================================
-- SECTION: Description
-- ================================================
```

### Table Creation Template

```sql
-- ================================================
-- TABLE: table_name
-- Description: What this table stores
-- Category: system/user/project/config
-- ================================================

CREATE TABLE table_name (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys
    related_id UUID REFERENCES related_table(id),

    -- Business Columns
    column_name VARCHAR(200) NOT NULL,
    another_column TEXT,

    -- Audit Fields (REQUIRED)
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_table_name_validation CHECK (condition)
);

-- Triggers
CREATE TRIGGER trg_table_name_before_insert
    BEFORE INSERT ON table_name
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_table_name_before_update
    BEFORE UPDATE ON table_name
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE table_name IS 'Description of table purpose';
COMMENT ON COLUMN table_name.column_name IS 'Description of column';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('table_name', 'Description', false, true, 'category')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
```

---

## ✅ Quality Checklist

### Before Creating Each SQL File

- [ ] Review Day 2 documentation for table definitions
- [ ] Follow naming conventions exactly
- [ ] Include all 8 audit fields
- [ ] Add appropriate constraints
- [ ] Use correct PostgreSQL data types
- [ ] Include DEFAULT values where appropriate

### For Each Table

- [ ] Table name is snake_case and plural
- [ ] UUID primary key with uuid_generate_v4()
- [ ] All 8 audit fields included
- [ ] Foreign keys reference correct tables
- [ ] NOT NULL specified where needed
- [ ] DEFAULT values provided
- [ ] CHECK constraints for validation
- [ ] Both triggers created (INSERT and UPDATE)
- [ ] Table comment added
- [ ] Key column comments added
- [ ] Table registered in database_tables

### For Each SQL File

- [ ] File header with version and description
- [ ] Organized into logical sections
- [ ] Comments explain complex logic
- [ ] Syntax is valid PostgreSQL
- [ ] File is executable in order (dependencies first)
- [ ] File uses transactions where appropriate

---

## 🔄 Execution Flow

### Order of Execution

```
1. v01_extensions_and_functions.sql   (Foundation - must run first)
2. v02_system_core_tables.sql         (System tables - includes database_tables)
3. v03_user_access_tables.sql         (User tables - users referenced everywhere)
4. v04_project_core_tables.sql        (Project tables - references users)
5. v05_configuration_menu_tables.sql  (Config tables - references users, roles)
6. v06_indexes.sql                    (Indexes - after all tables exist)
7. v07_constraints.sql                (Additional constraints)
8. v08_views.sql                      (Views - after all tables exist)
9. v09_rls_policies.sql               (RLS - after all tables exist)
10. v10_seed_data.sql                 (Seed data - after everything)
```

### Testing Process

For each file:
1. Review SQL syntax
2. Run on local PostgreSQL (if available)
3. OR run on Supabase development database
4. Verify no errors
5. Verify tables created correctly
6. Verify triggers work
7. Verify constraints enforced

---

## ⚠️ Important Reminders

### Copyright-Safe Naming
- ✅ Use `structured_` prefix (NOT `prince2_`)
- ✅ Use `scrum_` prefix
- ✅ Use `kanban_` prefix
- ❌ NEVER use trademarked names in table/column names

### Supabase Requirements
- Must enable RLS on ALL tables
- Must use auth.uid() in triggers and policies
- Must use SECURITY DEFINER on trigger functions
- Storage and auth tables managed by Supabase (don't create)

### Database Design Principles
- Normalization (3NF minimum)
- UUID primary keys
- 8 audit fields on ALL tables
- Soft deletes (is_deleted flag)
- Appropriate indexes
- Meaningful comments

---

## 📊 Expected Deliverables

| File | Tables/Objects | Lines (est.) | Purpose |
|------|----------------|--------------|---------|
| v01 | 1 ext + 4 functions | ~200 | Foundation |
| v02 | 8 tables | ~800 | System core |
| v03 | 7 tables | ~700 | User & access |
| v04 | 8 tables | ~900 | Project core |
| v05 | 5 tables | ~500 | Configuration |
| v06 | ~80 indexes | ~400 | Performance |
| v07 | ~20 constraints | ~100 | Data integrity |
| v08 | ~8 views | ~200 | Convenience |
| v09 | ~28 tables × 4 policies | ~800 | Security |
| v10 | Seed data | ~200 | Initial data |
| **Total** | **28 tables + supporting objects** | **~4,800 lines** | **Complete core schema** |

---

## 🎓 Learning Objectives

By completing Day 3, you will have:
- Created production-ready PostgreSQL schemas
- Implemented audit trail automation with triggers
- Created comprehensive RLS policies
- Understood PostgreSQL data types and constraints
- Practiced SQL best practices
- Created maintainable, versioned SQL scripts

---

## 📚 Reference Documentation

- `Documentation/Database_Architecture.md` - Overall architecture
- `Documentation/Database_Naming_Conventions.md` - Naming standards
- `Documentation/Database_Audit_Fields.md` - Audit field specifications
- `Documentation/Core_Tables_ER_Diagram.md` - Complete table schemas
- `Documentation/Database_Design_Principles.md` - Design guidelines
- `Documentation/PostgreSQL_Supabase_Considerations.md` - Platform features

---

## 🚀 Ready to Execute

**Current Status:** ⏳ Ready to begin

**Next Action:** Start Task 1 - Create Extensions and Trigger Functions

---

**Time Started:** [To be filled]
**Time Completed:** [To be filled]
**Actual Time Taken:** [To be filled]

---

**Let's build the foundation!** 🏗️
