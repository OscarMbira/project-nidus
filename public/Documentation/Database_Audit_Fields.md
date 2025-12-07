# Database Audit Fields & Triggers
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0
**Database:** PostgreSQL (via Supabase)

---

## 📋 Overview

This document defines the standard audit fields required on ALL tables in Project Nidus, along with the trigger strategy for automatically maintaining these fields. These audit fields provide comprehensive tracking for compliance, security, debugging, and data integrity.

---

## 🎯 Purpose

### Why Audit Fields?

1. **Compliance:** Meet regulatory requirements (GDPR, SOC2, etc.)
2. **Security:** Track who did what and when
3. **Debugging:** Trace data changes and issues
4. **Data Recovery:** Enable soft deletes and undelete functionality
5. **Audit Trail:** Complete history of all data modifications
6. **Accountability:** Link all changes to specific users
7. **Analytics:** Understand data lifecycle and usage patterns

---

## 📊 Standard Audit Fields

### Required Fields on ALL Tables

Every table in the system MUST include these standard audit fields:

```sql
-- Primary Key
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

-- Creation Tracking
created_at TIMESTAMP DEFAULT NOW(),
created_by UUID REFERENCES users(id),

-- Update Tracking
updated_at TIMESTAMP DEFAULT NOW(),
updated_by UUID REFERENCES users(id),

-- Soft Delete Tracking
is_deleted BOOLEAN DEFAULT FALSE,
deleted_at TIMESTAMP,
deleted_by UUID REFERENCES users(id)
```

---

## 🔍 Field Descriptions

### Primary Key: `id`

**Type:** `UUID`
**Purpose:** Unique identifier for each record

**Characteristics:**
- Uses UUID v4 for security (not sequential)
- Automatically generated on insert
- Impossible to guess or predict
- Distributed system friendly (no collisions)
- Better for security than sequential integers

**Example:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Why UUID instead of INTEGER?**
- Security: Sequential integers expose record counts and allow enumeration attacks
- Distribution: UUIDs work across multiple database instances without conflicts
- Privacy: Harder to correlate records across systems

---

### Creation Timestamp: `created_at`

**Type:** `TIMESTAMP`
**Purpose:** When the record was created

**Characteristics:**
- Automatically set on INSERT
- Never changes after creation
- Uses server time (NOW())
- Timezone-aware (stored in UTC)

**Example:**
```sql
created_at TIMESTAMP DEFAULT NOW()
```

**Usage:**
```sql
-- Find recently created projects
SELECT * FROM projects
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

### Creation User: `created_by`

**Type:** `UUID`
**Purpose:** Who created the record

**Characteristics:**
- References `users(id)`
- Set automatically via trigger
- Never changes after creation
- NULL for system-created records

**Example:**
```sql
created_by UUID REFERENCES users(id)
```

**Usage:**
```sql
-- Find all projects created by a specific user
SELECT p.*, u.name as creator_name
FROM projects p
JOIN users u ON p.created_by = u.id
WHERE u.email = 'john@example.com';
```

---

### Update Timestamp: `updated_at`

**Type:** `TIMESTAMP`
**Purpose:** When the record was last modified

**Characteristics:**
- Initially set to creation time
- Automatically updated on every UPDATE
- Uses server time (NOW())
- Timezone-aware (stored in UTC)

**Example:**
```sql
updated_at TIMESTAMP DEFAULT NOW()
```

**Usage:**
```sql
-- Find recently modified projects
SELECT * FROM projects
WHERE updated_at >= NOW() - INTERVAL '24 hours'
  AND updated_at > created_at  -- Exclude never-updated records
ORDER BY updated_at DESC;
```

---

### Update User: `updated_by`

**Type:** `UUID`
**Purpose:** Who last modified the record

**Characteristics:**
- References `users(id)`
- Updated automatically via trigger on every UPDATE
- Initially NULL (or same as created_by)
- NULL for system-updated records

**Example:**
```sql
updated_by UUID REFERENCES users(id)
```

**Usage:**
```sql
-- Find who last modified a project
SELECT p.name, u.name as last_modified_by, p.updated_at
FROM projects p
LEFT JOIN users u ON p.updated_by = u.id
WHERE p.id = 'project-uuid-here';
```

---

### Soft Delete Flag: `is_deleted`

**Type:** `BOOLEAN`
**Purpose:** Mark record as deleted without removing data

**Characteristics:**
- Default: FALSE (not deleted)
- Set to TRUE when "deleting" record
- Enables "undelete" functionality
- Preserves data for compliance/audit

**Example:**
```sql
is_deleted BOOLEAN DEFAULT FALSE
```

**Why Soft Delete?**
- Compliance: GDPR requires audit trail
- Recovery: Users can undo accidental deletions
- Relationships: Foreign key constraints remain valid
- History: Audit trail remains complete
- Analytics: Understand deletion patterns

**Usage:**
```sql
-- Get active (non-deleted) projects
SELECT * FROM projects
WHERE is_deleted = FALSE;

-- Get deleted projects (for admin/recovery)
SELECT * FROM projects
WHERE is_deleted = TRUE;
```

---

### Deletion Timestamp: `deleted_at`

**Type:** `TIMESTAMP`
**Purpose:** When the record was deleted

**Characteristics:**
- NULL for active records
- Set when is_deleted = TRUE
- Used for retention policies
- Enables automatic cleanup

**Example:**
```sql
deleted_at TIMESTAMP
```

**Usage:**
```sql
-- Find recently deleted projects (within 30 days)
SELECT * FROM projects
WHERE is_deleted = TRUE
  AND deleted_at >= NOW() - INTERVAL '30 days';

-- Find old deleted records for permanent removal
SELECT * FROM projects
WHERE is_deleted = TRUE
  AND deleted_at < NOW() - INTERVAL '2 years';
```

---

### Deletion User: `deleted_by`

**Type:** `UUID`
**Purpose:** Who deleted the record

**Characteristics:**
- References `users(id)`
- Set when is_deleted = TRUE
- NULL for active records
- Tracks accountability

**Example:**
```sql
deleted_by UUID REFERENCES users(id)
```

**Usage:**
```sql
-- Find who deleted a project
SELECT p.name, u.name as deleted_by_user, p.deleted_at
FROM projects p
LEFT JOIN users u ON p.deleted_by = u.id
WHERE p.id = 'project-uuid-here'
  AND p.is_deleted = TRUE;
```

---

## ⚙️ Automatic Trigger System

### Overview

We use PostgreSQL triggers to automatically maintain audit fields. This ensures:
- Consistency: Fields are always updated
- Accuracy: No manual errors
- Security: Application can't bypass auditing
- Simplicity: Developers don't manage manually

### Trigger Strategy

**Two trigger functions are needed:**

1. **Set Created Fields** - Fires BEFORE INSERT
   - Sets `created_at` to NOW()
   - Sets `created_by` to current user
   - Sets `updated_at` to NOW()

2. **Update Audit Fields** - Fires BEFORE UPDATE
   - Sets `updated_at` to NOW()
   - Sets `updated_by` to current user

---

## 🔧 Trigger Function: Set Created Fields

This trigger function sets the audit fields when a new record is created.

```sql
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS trigger_set_created_fields() CASCADE;

-- Create function to set created fields on INSERT
CREATE OR REPLACE FUNCTION trigger_set_created_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Set created timestamp
    NEW.created_at := NOW();

    -- Set created_by to current authenticated user
    -- Uses Supabase auth.uid() function
    NEW.created_by := auth.uid();

    -- Initialize updated_at to same as created_at
    NEW.updated_at := NOW();

    -- updated_by is NULL initially (will be set on first update)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION trigger_set_created_fields() IS
'Automatically sets created_at, created_by, and initial updated_at on INSERT';
```

### Usage Example

```sql
-- Create trigger on projects table
CREATE TRIGGER trg_projects_before_insert
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();
```

---

## 🔧 Trigger Function: Update Audit Fields

This trigger function updates the audit fields when a record is modified.

```sql
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS trigger_update_audit_fields() CASCADE;

-- Create function to update audit fields on UPDATE
CREATE OR REPLACE FUNCTION trigger_update_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Always update the updated_at timestamp
    NEW.updated_at := NOW();

    -- Set updated_by to current authenticated user
    -- Uses Supabase auth.uid() function
    NEW.updated_by := auth.uid();

    -- Prevent modification of created fields
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION trigger_update_audit_fields() IS
'Automatically updates updated_at and updated_by on UPDATE, protects created fields';
```

### Usage Example

```sql
-- Create trigger on projects table
CREATE TRIGGER trg_projects_before_update
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();
```

---

## 🗑️ Soft Delete Implementation

### Soft Delete Function

Instead of DELETE statements, use an UPDATE to set soft delete fields.

```sql
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS soft_delete_record(UUID, TEXT) CASCADE;

-- Create reusable soft delete function
CREATE OR REPLACE FUNCTION soft_delete_record(
    table_name TEXT,
    record_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET
            is_deleted = TRUE,
            deleted_at = NOW(),
            deleted_by = auth.uid()
        WHERE id = $1
          AND is_deleted = FALSE',
        table_name
    ) USING record_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION soft_delete_record(TEXT, UUID) IS
'Soft deletes a record by setting is_deleted=TRUE and audit fields';
```

### Usage Example

```sql
-- Soft delete a project
SELECT soft_delete_record('projects', 'project-uuid-here');

-- Or use direct UPDATE
UPDATE projects
SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    deleted_by = auth.uid()
WHERE id = 'project-uuid-here';
```

---

## 🔄 Undelete/Restore Function

Enable recovery of soft-deleted records.

```sql
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS restore_deleted_record(UUID, TEXT) CASCADE;

-- Create restore function
CREATE OR REPLACE FUNCTION restore_deleted_record(
    table_name TEXT,
    record_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET
            is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL
        WHERE id = $1
          AND is_deleted = TRUE',
        table_name
    ) USING record_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION restore_deleted_record(TEXT, UUID) IS
'Restores a soft-deleted record by setting is_deleted=FALSE';
```

### Usage Example

```sql
-- Restore a deleted project
SELECT restore_deleted_record('projects', 'project-uuid-here');

-- Or use direct UPDATE
UPDATE projects
SET
    is_deleted = FALSE,
    deleted_at = NULL,
    deleted_by = NULL
WHERE id = 'project-uuid-here'
  AND is_deleted = TRUE;
```

---

## 📋 Complete Table Example

### Example: Creating a Table with Audit Fields

```sql
-- Create projects table with all audit fields
CREATE TABLE projects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys
    methodology_id UUID REFERENCES methodologies(id),
    status_id UUID REFERENCES project_statuses(id),

    -- Business Data
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,

    -- Audit Fields (REQUIRED ON ALL TABLES)
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Create trigger to set created fields
CREATE TRIGGER trg_projects_before_insert
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

-- Create trigger to update audit fields
CREATE TRIGGER trg_projects_before_update
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- Create indexes for performance
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX idx_projects_is_deleted ON projects(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE is_deleted = TRUE;

-- Add table comments
COMMENT ON TABLE projects IS 'Main project records for all methodologies';
COMMENT ON COLUMN projects.id IS 'Unique project identifier (UUID)';
COMMENT ON COLUMN projects.created_at IS 'When the project was created';
COMMENT ON COLUMN projects.created_by IS 'User who created the project';
COMMENT ON COLUMN projects.updated_at IS 'When the project was last modified';
COMMENT ON COLUMN projects.updated_by IS 'User who last modified the project';
COMMENT ON COLUMN projects.is_deleted IS 'Soft delete flag (TRUE = deleted)';
COMMENT ON COLUMN projects.deleted_at IS 'When the project was deleted';
COMMENT ON COLUMN projects.deleted_by IS 'User who deleted the project';
```

---

## 🔍 Querying with Audit Fields

### Best Practices

**Always filter out deleted records in application queries:**

```sql
-- ✅ CORRECT - Filter deleted records
SELECT * FROM projects
WHERE is_deleted = FALSE;

-- ❌ WRONG - Includes deleted records
SELECT * FROM projects;
```

### Common Query Patterns

#### 1. Get Active Records Only

```sql
SELECT * FROM projects
WHERE is_deleted = FALSE
ORDER BY created_at DESC;
```

#### 2. Get Recently Created Records

```sql
SELECT * FROM projects
WHERE is_deleted = FALSE
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

#### 3. Get Recently Modified Records

```sql
SELECT * FROM projects
WHERE is_deleted = FALSE
  AND updated_at >= NOW() - INTERVAL '24 hours'
  AND updated_at > created_at  -- Only records that were actually updated
ORDER BY updated_at DESC;
```

#### 4. Get Deleted Records (Admin View)

```sql
SELECT
    p.*,
    u_created.name as created_by_name,
    u_deleted.name as deleted_by_name
FROM projects p
LEFT JOIN users u_created ON p.created_by = u_created.id
LEFT JOIN users u_deleted ON p.deleted_by = u_deleted.id
WHERE p.is_deleted = TRUE
ORDER BY p.deleted_at DESC;
```

#### 5. Get Audit History for a Record

```sql
SELECT
    p.id,
    p.name,
    u_created.name as created_by,
    p.created_at,
    u_updated.name as last_updated_by,
    p.updated_at,
    CASE
        WHEN p.is_deleted THEN u_deleted.name
        ELSE NULL
    END as deleted_by,
    p.deleted_at
FROM projects p
LEFT JOIN users u_created ON p.created_by = u_created.id
LEFT JOIN users u_updated ON p.updated_by = u_updated.id
LEFT JOIN users u_deleted ON p.deleted_by = u_deleted.id
WHERE p.id = 'project-uuid-here';
```

---

## 🛡️ Row Level Security (RLS) Integration

### Audit Fields in RLS Policies

Audit fields should be considered in RLS policies:

```sql
-- Policy: Users can only see non-deleted projects they have access to
CREATE POLICY policy_projects_user_access
    ON projects
    FOR SELECT
    USING (
        is_deleted = FALSE
        AND id IN (
            SELECT project_id
            FROM user_projects
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can only update non-deleted projects
CREATE POLICY policy_projects_user_update
    ON projects
    FOR UPDATE
    USING (
        is_deleted = FALSE
        AND id IN (
            SELECT project_id
            FROM user_projects
            WHERE user_id = auth.uid()
              AND role_id IN (
                  SELECT id FROM roles WHERE name IN ('Project Manager', 'Admin')
              )
        )
    );

-- Policy: Only admins can see deleted projects
CREATE POLICY policy_projects_admin_view_deleted
    ON projects
    FOR SELECT
    USING (
        is_deleted = TRUE
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.name = 'System Admin'
        )
    );
```

---

## 📊 Views for Active Records

Create views to simplify querying active records:

```sql
-- View for active (non-deleted) projects
CREATE VIEW v_active_projects AS
SELECT * FROM projects
WHERE is_deleted = FALSE;

-- View for active tasks
CREATE VIEW v_active_tasks AS
SELECT * FROM tasks
WHERE is_deleted = FALSE;

-- View for active users
CREATE VIEW v_active_users AS
SELECT * FROM users
WHERE is_deleted = FALSE;
```

**Usage:**
```sql
-- Much simpler queries
SELECT * FROM v_active_projects
WHERE status_id = 'active-status-uuid';

-- Instead of
SELECT * FROM projects
WHERE is_deleted = FALSE
  AND status_id = 'active-status-uuid';
```

---

## 🧹 Data Retention & Cleanup

### Automatic Cleanup Strategy

Permanently remove old deleted records after retention period:

```sql
-- Function to permanently delete old records
CREATE OR REPLACE FUNCTION cleanup_old_deleted_records(
    table_name TEXT,
    retention_days INTEGER DEFAULT 730  -- 2 years default
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    EXECUTE format(
        'DELETE FROM %I
         WHERE is_deleted = TRUE
           AND deleted_at < NOW() - INTERVAL ''%s days''',
        table_name,
        retention_days
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (if available)
-- Or run manually/via application scheduler

-- Example: Clean up old deleted projects
SELECT cleanup_old_deleted_records('projects', 730);  -- 2 years
```

### Retention Policy Example

```sql
-- Archive old deleted projects before permanent deletion
INSERT INTO projects_archive
SELECT * FROM projects
WHERE is_deleted = TRUE
  AND deleted_at < NOW() - INTERVAL '2 years';

-- Then permanently delete
DELETE FROM projects
WHERE is_deleted = TRUE
  AND deleted_at < NOW() - INTERVAL '2 years';
```

---

## ✅ Implementation Checklist

### For Every New Table

- [ ] Include all 8 audit fields (id, created_at, created_by, updated_at, updated_by, is_deleted, deleted_at, deleted_by)
- [ ] Create BEFORE INSERT trigger using `trigger_set_created_fields()`
- [ ] Create BEFORE UPDATE trigger using `trigger_update_audit_fields()`
- [ ] Create index on `is_deleted` for active records
- [ ] Create index on `created_at` (DESC) for recent records
- [ ] Create index on `updated_at` (DESC) for modified records
- [ ] Add table and column comments
- [ ] Configure RLS policies to consider is_deleted
- [ ] Create view for active records (optional but recommended)
- [ ] Register table in `database_tables` registry

### SQL Template

```sql
-- 1. Create table with audit fields
CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Business columns here
    ...
    -- Audit fields (copy-paste this section)
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- 2. Create triggers
CREATE TRIGGER trg_table_name_before_insert
    BEFORE INSERT ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_table_name_before_update
    BEFORE UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_audit_fields();

-- 3. Create indexes
CREATE INDEX idx_table_name_is_deleted ON table_name(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_table_name_created_at ON table_name(created_at DESC);
CREATE INDEX idx_table_name_updated_at ON table_name(updated_at DESC);

-- 4. Create active view
CREATE VIEW v_active_table_name AS
SELECT * FROM table_name WHERE is_deleted = FALSE;

-- 5. Add comments
COMMENT ON TABLE table_name IS 'Description of table purpose';
COMMENT ON COLUMN table_name.created_at IS 'When record was created';
COMMENT ON COLUMN table_name.created_by IS 'User who created record';
-- etc.

-- 6. Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('table_name', 'Description', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();
```

---

## 🔐 Security Considerations

### 1. Trigger Security

Triggers use `SECURITY DEFINER` to ensure they run with creator privileges, not the invoking user. This prevents privilege escalation.

### 2. Supabase auth.uid()

The `auth.uid()` function returns the currently authenticated user's UUID from the JWT token. This is secure and can't be spoofed.

### 3. Preventing Manual Audit Field Changes

The update trigger **overwrites** any manual changes to `created_at` and `created_by` to prevent tampering:

```sql
-- Even if application tries to change created_at, trigger prevents it
NEW.created_at := OLD.created_at;
NEW.created_by := OLD.created_by;
```

### 4. NULL Values

`created_by`, `updated_by`, and `deleted_by` will be NULL if:
- No user is authenticated (system operations)
- Operation happens outside normal authentication context

This is acceptable for system-level operations but should be minimized.

---

## 📚 Related Documentation

- **Database Architecture:** `Database_Architecture.md`
- **Naming Conventions:** `Database_Naming_Conventions.md`
- **Design Principles:** `Database_Design_Principles.md` (to be created)
- **Supabase Auth:** `Supabase_Setup_Guide.md`

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-15 | Initial audit fields and trigger documentation |

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team

---

**Remember: Every table needs audit fields, every table needs triggers!** 🔒
