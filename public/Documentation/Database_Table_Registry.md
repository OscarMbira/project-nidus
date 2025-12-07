# Database Table Registry System
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0
**Database:** PostgreSQL (via Supabase)

---

## 📋 Overview

The Database Table Registry is a central system for tracking all database tables in Project Nidus. Every table created in the system MUST be registered in the `database_tables` table. This provides documentation, metadata management, and enables advanced features like dynamic ID generation and automated maintenance.

---

## 🎯 Purpose and Benefits

### Why a Table Registry?

1. **Self-Documenting Database**
   - Complete inventory of all tables
   - Human-readable descriptions
   - Categorization and organization

2. **Metadata Management**
   - Track table purpose and usage
   - Monitor table sizes and growth
   - Identify system vs application tables

3. **Dynamic Features**
   - Future: ID generation rules per table
   - Future: Automated maintenance schedules
   - Future: Dynamic form generation

4. **Database Governance**
   - Ensure no orphaned tables
   - Track table lifecycle
   - Support database migrations

5. **Developer Documentation**
   - Quick reference for all tables
   - Understand table purposes
   - Find related tables

---

## 📊 The database_tables Table

### Schema Definition

```sql
CREATE TABLE database_tables (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Table Information
    table_name VARCHAR(100) UNIQUE NOT NULL,
    table_description TEXT NOT NULL,
    schema_name VARCHAR(100) DEFAULT 'public',

    -- Classification
    is_system_table BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    table_category VARCHAR(50),  -- 'system', 'user', 'project', 'methodology', etc.

    -- Metadata
    row_count_estimate BIGINT,
    last_analyzed_at TIMESTAMP,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);
```

### Field Descriptions

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Unique identifier for registry entry |
| `table_name` | VARCHAR(100) | Physical table name in database (UNIQUE) |
| `table_description` | TEXT | Human-readable description of table purpose |
| `schema_name` | VARCHAR(100) | Database schema (default: 'public') |
| `is_system_table` | BOOLEAN | TRUE for system/infrastructure tables |
| `is_active` | BOOLEAN | Whether table is currently in use |
| `table_category` | VARCHAR(50) | Category: system, user, project, methodology, etc. |
| `row_count_estimate` | BIGINT | Estimated row count (updated periodically) |
| `last_analyzed_at` | TIMESTAMP | When table was last analyzed |

---

## 🔧 Registering New Tables

### Mandatory Registration Rule

**IMPORTANT:** Every new table created in the system MUST be registered in `database_tables`.

### Registration Template

Add this SQL at the **end of every table creation SQL file:**

```sql
-- Register new table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('your_table_name', 'Clear description of what this table stores', false, true, 'category')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
```

### Field Guidelines

#### table_name
- **Format:** Exact physical table name
- **Example:** `'projects'`, `'user_roles'`, `'structured_mandates'`
- **Rules:** Must match actual table name exactly

#### table_description
- **Format:** Clear, concise description (1-2 sentences)
- **Example:** `'Main project records for all methodologies'`
- **Rules:** Explain what data the table stores and its purpose

#### is_system_table
- **Values:** `true` or `false`
- **TRUE for:**
  - System infrastructure tables (`audit_trails`, `session_logs`, `error_logs`)
  - System configuration tables (`database_tables`, `system_settings`)
- **FALSE for:**
  - Application/business tables (`projects`, `users`, `tasks`)
  - Methodology-specific tables (`structured_mandates`, `scrum_sprints`)

#### is_active
- **Values:** `true` or `false`
- **Default:** `true`
- **FALSE for:** Deprecated or deactivated tables (but not deleted)

#### table_category
- **Format:** Category name
- **Examples:**
  - `'system'` - System core tables
  - `'user'` - User and access management
  - `'project'` - Project core tables
  - `'structured'` - Structured PM methodology tables
  - `'scrum'` - Scrum methodology tables
  - `'kanban'` - Kanban methodology tables
  - `'cross-cutting'` - Cross-methodology tables (risks, issues, etc.)
  - `'resource'` - Resource management tables
  - `'financial'` - Financial management tables

---

## 📝 Registration Examples

### Example 1: Core Application Table

```sql
-- Create the projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(200) NOT NULL,
    -- ... other columns ...
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('projects', 'Main project records for all methodologies', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
```

---

### Example 2: System Table

```sql
-- Create the audit_trails table
CREATE TABLE audit_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    -- ... other columns ...
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('audit_trails', 'System-wide audit log for all table changes', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
```

---

### Example 3: Methodology-Specific Table

```sql
-- Create the structured_mandates table
CREATE TABLE structured_mandates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    mandate_title VARCHAR(200) NOT NULL,
    -- ... other columns ...
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('structured_mandates', 'Project mandates for Structured PM methodology', false, true, 'structured')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
```

---

### Example 4: Junction Table

```sql
-- Create the user_roles junction table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    -- ... other columns ...
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    CONSTRAINT uq_user_roles_user_role UNIQUE(user_id, role_id)
);

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('user_roles', 'User-to-role assignments for role-based access control', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
```

---

### Example 5: Bulk Registration

When creating multiple tables in one SQL file:

```sql
-- After creating all tables, register them all at once

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('scrum_sprints', 'Sprints for Scrum methodology projects', false, true, 'scrum'),
  ('scrum_user_stories', 'User stories in product/sprint backlogs', false, true, 'scrum'),
  ('scrum_daily_scrums', 'Daily scrum meeting logs', false, true, 'scrum'),
  ('scrum_retrospectives', 'Sprint retrospective records', false, true, 'scrum'),
  ('scrum_velocity_metrics', 'Team velocity tracking for sprints', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
```

---

## 🔍 Querying the Registry

### Get All Tables

```sql
-- Get all active tables
SELECT
    table_name,
    table_description,
    table_category,
    is_system_table
FROM database_tables
WHERE is_deleted = FALSE
  AND is_active = TRUE
ORDER BY table_category, table_name;
```

---

### Get Tables by Category

```sql
-- Get all Structured PM tables
SELECT table_name, table_description
FROM database_tables
WHERE table_category = 'structured'
  AND is_deleted = FALSE
  AND is_active = TRUE
ORDER BY table_name;

-- Get all system tables
SELECT table_name, table_description
FROM database_tables
WHERE is_system_table = TRUE
  AND is_deleted = FALSE
ORDER BY table_name;
```

---

### Get Table Statistics

```sql
-- Get table with row counts
SELECT
    dt.table_name,
    dt.table_description,
    dt.table_category,
    dt.row_count_estimate,
    dt.last_analyzed_at
FROM database_tables dt
WHERE dt.is_deleted = FALSE
  AND dt.is_active = TRUE
ORDER BY dt.row_count_estimate DESC NULLS LAST;
```

---

### Search Tables

```sql
-- Search table names and descriptions
SELECT table_name, table_description, table_category
FROM database_tables
WHERE (
    table_name ILIKE '%project%'
    OR table_description ILIKE '%project%'
)
AND is_deleted = FALSE
AND is_active = TRUE
ORDER BY table_name;
```

---

### Get Category Summary

```sql
-- Count tables by category
SELECT
    table_category,
    COUNT(*) as table_count,
    SUM(CASE WHEN is_system_table THEN 1 ELSE 0 END) as system_tables,
    SUM(CASE WHEN NOT is_system_table THEN 1 ELSE 0 END) as application_tables
FROM database_tables
WHERE is_deleted = FALSE
  AND is_active = TRUE
GROUP BY table_category
ORDER BY table_count DESC;
```

---

## 🔄 Updating Registry Entries

### Update Table Description

```sql
-- Update description for existing table
UPDATE database_tables
SET
    table_description = 'Updated description here',
    updated_at = NOW(),
    updated_by = auth.uid()
WHERE table_name = 'table_name_here'
  AND is_deleted = FALSE;
```

---

### Update Table Category

```sql
-- Recategorize a table
UPDATE database_tables
SET
    table_category = 'new_category',
    updated_at = NOW(),
    updated_by = auth.uid()
WHERE table_name = 'table_name_here'
  AND is_deleted = FALSE;
```

---

### Update Row Count Estimates

```sql
-- Update estimated row counts (run periodically)
DO $$
DECLARE
    table_record RECORD;
    row_count BIGINT;
BEGIN
    FOR table_record IN
        SELECT table_name FROM database_tables
        WHERE is_deleted = FALSE AND is_active = TRUE
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name)
        INTO row_count;

        UPDATE database_tables
        SET
            row_count_estimate = row_count,
            last_analyzed_at = NOW()
        WHERE table_name = table_record.table_name;
    END LOOP;
END $$;
```

---

## 📋 Table Categories Reference

### Recommended Categories

| Category | Purpose | Example Tables |
|----------|---------|----------------|
| `system` | System infrastructure | `database_tables`, `audit_trails`, `session_logs` |
| `user` | User and access management | `users`, `roles`, `permissions`, `user_roles` |
| `project` | Project core functionality | `projects`, `project_statuses`, `teams` |
| `config` | Configuration and settings | `methodologies`, `workflows`, `system_settings` |
| `structured` | Structured PM tables | `structured_mandates`, `structured_work_packages` |
| `scrum` | Scrum methodology | `scrum_sprints`, `scrum_user_stories` |
| `kanban` | Kanban methodology | `kanban_boards`, `kanban_cards` |
| `agile` | Agile methodology | `agile_iterations`, `agile_features` |
| `cross-cutting` | Cross-methodology features | `risks`, `issues`, `changes`, `quality` |
| `resource` | Resource management | `resources`, `resource_allocations`, `time_entries` |
| `financial` | Financial management | `budgets`, `cost_records`, `invoices` |
| `reporting` | Reporting and analytics | `report_definitions`, `report_schedules` |
| `integration` | External integrations | `integration_configs`, `webhook_logs` |

---

## ✅ Registration Checklist

When creating a new table, ensure:

- [ ] Table follows naming conventions (`Database_Naming_Conventions.md`)
- [ ] Table includes all audit fields (`Database_Audit_Fields.md`)
- [ ] Table has appropriate triggers for audit field maintenance
- [ ] Table has appropriate indexes
- [ ] Table registration SQL is added at end of creation script
- [ ] `table_name` matches physical table name exactly
- [ ] `table_description` clearly explains table purpose
- [ ] `is_system_table` is set correctly (true for system, false for application)
- [ ] `table_category` is appropriate and consistent
- [ ] Registration uses `ON CONFLICT` clause for idempotency

---

## 🚀 Advanced Features (Future)

### ID Generation Rules

Future enhancement: Store ID generation rules per table in registry.

```sql
-- Future column additions to database_tables
ALTER TABLE database_tables ADD COLUMN id_generation_rule VARCHAR(50);
ALTER TABLE database_tables ADD COLUMN id_prefix VARCHAR(10);
ALTER TABLE database_tables ADD COLUMN id_sequence_start BIGINT;
```

**Use Case:** Generate human-readable IDs like:
- Projects: `PROJ-0001`, `PROJ-0002`
- Tasks: `TASK-0001`, `TASK-0002`
- Risks: `RISK-0001`, `RISK-0002`

---

### Automated Maintenance

Future enhancement: Schedule maintenance tasks per table.

```sql
-- Future column additions
ALTER TABLE database_tables ADD COLUMN maintenance_schedule VARCHAR(50);
ALTER TABLE database_tables ADD COLUMN last_vacuumed_at TIMESTAMP;
ALTER TABLE database_tables ADD COLUMN auto_archive_enabled BOOLEAN;
```

**Use Case:**
- Auto-vacuum large tables weekly
- Archive old data based on retention policy
- Update statistics automatically

---

### Dynamic Form Generation

Future enhancement: Generate forms dynamically from table registry.

```sql
-- Future column additions
ALTER TABLE database_tables ADD COLUMN form_config JSONB;
ALTER TABLE database_tables ADD COLUMN display_columns TEXT[];
ALTER TABLE database_tables ADD COLUMN searchable_columns TEXT[];
```

**Use Case:**
- Auto-generate CRUD forms
- Build dynamic search interfaces
- Create admin panels automatically

---

## 📊 Registry Views

### View: Active Application Tables

```sql
CREATE VIEW v_active_application_tables AS
SELECT
    table_name,
    table_description,
    table_category,
    row_count_estimate,
    last_analyzed_at,
    created_at
FROM database_tables
WHERE is_deleted = FALSE
  AND is_active = TRUE
  AND is_system_table = FALSE
ORDER BY table_category, table_name;
```

---

### View: Active System Tables

```sql
CREATE VIEW v_active_system_tables AS
SELECT
    table_name,
    table_description,
    table_category,
    row_count_estimate,
    last_analyzed_at,
    created_at
FROM database_tables
WHERE is_deleted = FALSE
  AND is_active = TRUE
  AND is_system_table = TRUE
ORDER BY table_name;
```

---

### View: Tables by Category

```sql
CREATE VIEW v_tables_by_category AS
SELECT
    table_category,
    COUNT(*) as total_tables,
    SUM(row_count_estimate) as total_rows,
    MAX(last_analyzed_at) as last_analysis
FROM database_tables
WHERE is_deleted = FALSE
  AND is_active = TRUE
GROUP BY table_category
ORDER BY total_rows DESC NULLS LAST;
```

---

## 🔐 Security Considerations

### RLS Policy

```sql
-- Allow all authenticated users to READ the registry
CREATE POLICY policy_database_tables_read
    ON database_tables
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins can INSERT/UPDATE/DELETE registry entries
CREATE POLICY policy_database_tables_write
    ON database_tables
    FOR ALL
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

## 📚 Related Documentation

- **Database Architecture:** `Database_Architecture.md`
- **Naming Conventions:** `Database_Naming_Conventions.md`
- **Audit Fields:** `Database_Audit_Fields.md`
- **Core Tables ER Diagram:** `Core_Tables_ER_Diagram.md`
- **CLAUDE.md:** See Database Table Registration Rule

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-15 | Initial database table registry documentation |

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team

---

**Remember: Every new table MUST be registered!** 📋
