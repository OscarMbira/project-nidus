# Database Design Principles
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0
**Database:** PostgreSQL (via Supabase)

---

## 📋 Overview

This document outlines the core database design principles for Project Nidus. These principles ensure consistency, maintainability, scalability, security, and data integrity across the entire database schema.

**All developers MUST follow these principles when creating or modifying database objects.**

---

## 🎯 Core Design Principles

### Principle 1: Normalization (3NF Minimum)

**Requirement:** All tables must be in at least Third Normal Form (3NF)

#### What is 3NF?

1. **First Normal Form (1NF):**
   - No repeating groups
   - Each cell contains atomic (indivisible) values
   - Each record is unique

2. **Second Normal Form (2NF):**
   - Meets 1NF requirements
   - No partial dependencies (non-key attributes depend on entire primary key)

3. **Third Normal Form (3NF):**
   - Meets 2NF requirements
   - No transitive dependencies (non-key attributes depend only on primary key, not on other non-key attributes)

#### Examples

**❌ BAD - Not Normalized:**
```sql
CREATE TABLE projects_bad (
    id UUID PRIMARY KEY,
    project_name VARCHAR(200),
    owner_name VARCHAR(200),          -- Denormalized: user data repeated
    owner_email VARCHAR(255),          -- Denormalized: user data repeated
    team_members TEXT                  -- Violates 1NF: repeating group as CSV
);
```

**✅ GOOD - Proper 3NF:**
```sql
-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    project_name VARCHAR(200),
    owner_user_id UUID REFERENCES users(id)  -- Normalized: reference to users
);

-- Users table (separate entity)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(200),
    email VARCHAR(255)
);

-- Team membership (separate relationship table)
CREATE TABLE team_members (
    id UUID PRIMARY KEY,
    team_id UUID REFERENCES teams(id),
    user_id UUID REFERENCES users(id)
);
```

#### Benefits of Normalization

- ✅ Eliminates data redundancy
- ✅ Prevents update anomalies
- ✅ Ensures data consistency
- ✅ Reduces storage requirements
- ✅ Makes queries more efficient

#### When to Denormalize

Only denormalize for **proven** performance reasons after measuring:
- Reporting tables/views
- Read-heavy caching tables
- Calculated/aggregate data

**Document the reason for any denormalization!**

---

### Principle 2: UUID Primary Keys

**Requirement:** All tables MUST use UUID primary keys

#### Why UUIDs?

1. **Security:**
   - Not sequential - can't enumerate records
   - Impossible to guess
   - Doesn't leak information about record count

2. **Distributed Systems:**
   - No collision risk across databases
   - Can generate IDs client-side
   - Supports distributed architecture

3. **Privacy:**
   - Harder to correlate records across systems
   - Better for GDPR compliance

#### Standard UUID Primary Key Pattern

```sql
CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- other columns...
);
```

#### UUID Extension

Ensure the UUID extension is enabled:

```sql
-- Enable UUID extension (run once per database)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### Comparisons

**❌ BAD - Sequential Integer:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Exposes count, sequential, guessable
    email VARCHAR(255)
);
```

**✅ GOOD - UUID:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- Secure, distributed-friendly
    email VARCHAR(255)
);
```

---

### Principle 3: Standard Audit Fields

**Requirement:** ALL tables MUST include standard audit fields

#### Required Audit Fields (8 fields)

```sql
-- Audit Fields (REQUIRED ON ALL TABLES)
created_at TIMESTAMP DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_at TIMESTAMP DEFAULT NOW(),
updated_by UUID REFERENCES users(id),
is_deleted BOOLEAN DEFAULT FALSE,
deleted_at TIMESTAMP,
deleted_by UUID REFERENCES users(id)
```

Plus the primary key:
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
```

#### Benefits

- ✅ Complete audit trail
- ✅ Who did what, when
- ✅ Soft delete support
- ✅ Compliance (GDPR, SOC2)
- ✅ Debugging and troubleshooting

See: `Database_Audit_Fields.md` for complete documentation

---

### Principle 4: Soft Deletes

**Requirement:** Use soft deletes, not hard deletes

#### Soft Delete Pattern

```sql
-- Mark record as deleted
UPDATE projects
SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    deleted_by = auth.uid()
WHERE id = 'project-uuid';
```

#### Why Soft Deletes?

1. **Data Recovery:** Users can undo accidental deletions
2. **Audit Trail:** Complete history of all data
3. **Compliance:** GDPR requires audit trail
4. **Relationships:** Foreign key constraints remain valid
5. **Analytics:** Understand deletion patterns

#### Querying with Soft Deletes

**Always filter out deleted records:**

```sql
-- ✅ CORRECT - Filter deleted records
SELECT * FROM projects
WHERE is_deleted = FALSE;

-- ❌ WRONG - Includes deleted records
SELECT * FROM projects;
```

#### Create Views for Convenience

```sql
CREATE VIEW v_active_projects AS
SELECT * FROM projects
WHERE is_deleted = FALSE;

-- Now queries are simpler
SELECT * FROM v_active_projects;
```

---

### Principle 5: Appropriate Data Types

**Requirement:** Use PostgreSQL-appropriate data types

#### Common Data Types

| Use Case | Type | Example |
|----------|------|---------|
| **Unique ID** | UUID | `id UUID` |
| **Short text** | VARCHAR(n) | `email VARCHAR(255)` |
| **Long text** | TEXT | `description TEXT` |
| **Boolean** | BOOLEAN | `is_active BOOLEAN` |
| **Timestamp** | TIMESTAMP | `created_at TIMESTAMP` |
| **Date only** | DATE | `birth_date DATE` |
| **Time only** | TIME | `start_time TIME` |
| **Integer** | INTEGER | `count INTEGER` |
| **Large integer** | BIGINT | `row_count BIGINT` |
| **Decimal** | DECIMAL(p,s) | `amount DECIMAL(15,2)` |
| **JSON** | JSONB | `metadata JSONB` |
| **Array** | TYPE[] | `tags TEXT[]` |
| **IP Address** | INET | `ip_address INET` |

#### VARCHAR vs TEXT

**Use TEXT for:**
- Long, variable-length content
- No length limit needed
- Descriptions, notes, comments

**Use VARCHAR(n) for:**
- Short, constrained fields
- Email addresses: `VARCHAR(255)`
- Names: `VARCHAR(200)`
- Codes: `VARCHAR(50)`

#### Decimal for Money

**Always use DECIMAL for monetary values:**

```sql
-- ✅ CORRECT - No rounding errors
budget_amount DECIMAL(15, 2)  -- 15 total digits, 2 after decimal

-- ❌ WRONG - Floating point has rounding errors
budget_amount FLOAT  -- NEVER use for money!
```

#### JSONB for Flexible Data

Use JSONB for:
- Custom fields
- Configuration settings
- Flexible metadata
- Integration data

```sql
custom_fields JSONB,
settings JSONB,
metadata JSONB
```

**JSONB vs JSON:**
- Use **JSONB** (binary) - faster, indexable, better
- Avoid **JSON** (text) - slower, legacy

---

### Principle 6: Explicit Nullability

**Requirement:** Explicitly specify NULL or NOT NULL for every column

#### Rules

1. **Primary keys:** Always `NOT NULL` (implicit with PRIMARY KEY)
2. **Foreign keys:** Usually `NOT NULL` unless optional relationship
3. **Required fields:** `NOT NULL`
4. **Optional fields:** `NULL` (can be implicit, but explicit is better)

#### Examples

```sql
CREATE TABLE projects (
    -- Primary key (NOT NULL implicit)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Required fields
    project_name VARCHAR(200) NOT NULL,
    project_code VARCHAR(50) NOT NULL,
    status_id UUID NOT NULL REFERENCES project_statuses(id),

    -- Optional fields
    description TEXT,  -- NULL allowed (implicit)
    end_date DATE,     -- NULL allowed
    budget_amount DECIMAL(15, 2),  -- NULL allowed

    -- Owner is required
    owner_user_id UUID NOT NULL REFERENCES users(id),

    -- Sponsor is optional
    sponsor_user_id UUID REFERENCES users(id),  -- NULL allowed

    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),  -- Can be NULL for system operations
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);
```

#### Benefits of Explicit Nullability

- ✅ Clear intent
- ✅ Self-documenting schema
- ✅ Prevents accidental NULLs
- ✅ Better query optimization

---

### Principle 7: Sensible Defaults

**Requirement:** Provide DEFAULT values where appropriate

#### When to Use Defaults

1. **Boolean flags:** Always provide defaults
2. **Timestamps:** Use `DEFAULT NOW()`
3. **Status fields:** Default to initial state
4. **Counts/Numbers:** Default to 0 or NULL as appropriate
5. **Active flags:** Default to TRUE

#### Examples

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,

    -- Defaults for booleans
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Defaults for timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Default for text
    language_code VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(100) DEFAULT 'UTC',

    -- Default for numeric
    login_attempts INTEGER DEFAULT 0,
    percentage_complete DECIMAL(5,2) DEFAULT 0
);
```

#### Benefits

- ✅ Simpler INSERT statements
- ✅ Consistency across records
- ✅ Prevents NULL when default is more appropriate

---

### Principle 8: Proper Indexing

**Requirement:** Create appropriate indexes for performance

#### Always Index

1. **Primary keys** (automatic)
2. **Foreign keys** (manual)
3. **Unique constraints** (automatic)
4. **Frequently filtered columns**
5. **Frequently sorted columns**
6. **Frequently joined columns**

#### Index Naming Convention

```
idx_tablename_columnname[_columnname2...]
```

#### Common Index Patterns

```sql
-- Foreign key indexes (ALWAYS)
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_user_id);

-- Frequently filtered columns
CREATE INDEX idx_projects_status_id ON projects(status_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- Sort columns (DESC for descending sorts)
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_activity_logs_occurred_at ON activity_logs(occurred_at DESC);

-- Composite indexes (order matters!)
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status_id);

-- Partial indexes (with WHERE clause)
CREATE INDEX idx_projects_active ON projects(status_id) WHERE is_deleted = FALSE;

-- Full-text search
CREATE INDEX idx_projects_name_search ON projects USING gin(to_tsvector('english', project_name));

-- JSONB indexes
CREATE INDEX idx_projects_custom_fields ON projects USING gin(custom_fields);
```

#### Index Guidelines

1. **Don't over-index:** Indexes slow down writes
2. **Index foreign keys:** Always (for joins)
3. **Index WHERE clauses:** If frequently filtered
4. **Index ORDER BY:** If frequently sorted
5. **Composite indexes:** Most selective column first
6. **Partial indexes:** Use WHERE clause to reduce index size

---

### Principle 9: Constraint Types

**Requirement:** Use appropriate constraints for data integrity

#### Primary Key Constraints

```sql
-- Naming: pk_tablename
ALTER TABLE projects
    ADD CONSTRAINT pk_projects PRIMARY KEY (id);
```

#### Foreign Key Constraints

```sql
-- Naming: fk_tablename_referenced_table
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_projects
    FOREIGN KEY (project_id) REFERENCES projects(id);

-- With CASCADE behavior
ALTER TABLE team_members
    ADD CONSTRAINT fk_team_members_teams
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
```

#### Unique Constraints

```sql
-- Naming: uq_tablename_columnname
ALTER TABLE users
    ADD CONSTRAINT uq_users_email
    UNIQUE (email);

-- Composite unique constraint
ALTER TABLE user_projects
    ADD CONSTRAINT uq_user_projects_user_project
    UNIQUE (user_id, project_id);

-- Partial unique constraint (with WHERE)
CREATE UNIQUE INDEX idx_projects_code_unique
    ON projects(project_code)
    WHERE is_deleted = FALSE;
```

#### Check Constraints

```sql
-- Naming: chk_tablename_description
ALTER TABLE projects
    ADD CONSTRAINT chk_projects_dates
    CHECK (end_date >= start_date);

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_progress
    CHECK (percentage_complete >= 0 AND percentage_complete <= 100);

ALTER TABLE users
    ADD CONSTRAINT chk_users_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

#### Benefits of Constraints

- ✅ Data integrity at database level
- ✅ Can't be bypassed by application bugs
- ✅ Self-documenting schema
- ✅ Better query optimization

---

### Principle 10: Timestamps vs Dates

**Requirement:** Use TIMESTAMP for tracking, DATE for calendar dates

#### When to Use TIMESTAMP

Use TIMESTAMP for:
- Audit fields (`created_at`, `updated_at`, `deleted_at`)
- Event timestamps (`logged_in_at`, `sent_at`, `completed_at`)
- Any time tracking when exact time matters

```sql
-- ✅ CORRECT - Audit fields
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW(),
deleted_at TIMESTAMP,
last_login_at TIMESTAMP,
completed_at TIMESTAMP
```

#### When to Use DATE

Use DATE for:
- Calendar dates without time component
- Birth dates, start dates, end dates
- Deadlines (when time doesn't matter)

```sql
-- ✅ CORRECT - Calendar dates
birth_date DATE,
start_date DATE,
end_date DATE,
due_date DATE
```

#### Why This Matters

**❌ BAD - Using DATE for audit fields:**
```sql
created_at DATE  -- Lost time information!
```

**Problem:** You lose time-of-day information, making debugging and sorting difficult.

**✅ GOOD:**
```sql
created_at TIMESTAMP  -- Preserves exact time
```

#### Timezone Considerations

PostgreSQL TIMESTAMP is timezone-aware when you use `TIMESTAMP WITH TIME ZONE` (or `TIMESTAMPTZ`).

Supabase stores timestamps in UTC by default, which is best practice.

```sql
-- Both are acceptable (Supabase uses UTC internally)
created_at TIMESTAMP DEFAULT NOW()
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 🔧 Common Patterns

### Pattern 1: Status Lookup Tables

```sql
-- Status lookup table
CREATE TABLE project_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status_code VARCHAR(50) UNIQUE NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    status_description TEXT,
    status_color VARCHAR(7),
    status_order INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Main table referencing status
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(200) NOT NULL,
    status_id UUID NOT NULL REFERENCES project_statuses(id),
    -- ... other columns
);

-- Index the foreign key
CREATE INDEX idx_projects_status_id ON projects(status_id);
```

---

### Pattern 2: Many-to-Many Relationships

```sql
-- First entity
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    -- ... audit fields
);

-- Second entity
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(100) NOT NULL,
    -- ... audit fields
);

-- Junction table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    -- Additional junction-specific fields
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    -- Unique constraint
    CONSTRAINT uq_user_roles_user_role UNIQUE(user_id, role_id)
);

-- Indexes on junction table
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

---

### Pattern 3: Hierarchical Data

```sql
-- Self-referencing for hierarchy
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_code VARCHAR(50) UNIQUE NOT NULL,
    menu_label VARCHAR(100) NOT NULL,
    parent_menu_id UUID REFERENCES menu_items(id),  -- Self-reference
    menu_level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    -- ... other columns
    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Index for hierarchy queries
CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_menu_id);
CREATE INDEX idx_menu_items_sort_order ON menu_items(sort_order);
```

---

### Pattern 4: Audit Trail Table

```sql
CREATE TABLE audit_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    user_id UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    changed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    -- Minimal audit (no is_deleted for audit table)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_audit_trails_table_name ON audit_trails(table_name);
CREATE INDEX idx_audit_trails_record_id ON audit_trails(record_id);
CREATE INDEX idx_audit_trails_user_id ON audit_trails(user_id);
CREATE INDEX idx_audit_trails_changed_at ON audit_trails(changed_at DESC);

-- Partition by month for performance
-- (Partitioning setup would go here)
```

---

## ✅ Design Checklist

Before finalizing any table design:

### Structure
- [ ] Table name follows naming conventions (snake_case, plural)
- [ ] UUID primary key with default `uuid_generate_v4()`
- [ ] All 8 audit fields included
- [ ] Foreign keys reference correct tables
- [ ] Table is in 3NF (no redundancy)

### Data Types
- [ ] Appropriate PostgreSQL types used
- [ ] VARCHAR lengths are appropriate
- [ ] DECIMAL used for money (not FLOAT)
- [ ] TIMESTAMP used for audit fields
- [ ] DATE used for calendar dates
- [ ] BOOLEAN used for flags
- [ ] JSONB used for flexible data

### Constraints
- [ ] NOT NULL specified where required
- [ ] Foreign key constraints defined
- [ ] Unique constraints where needed
- [ ] Check constraints for validation
- [ ] Appropriate CASCADE behavior

### Indexes
- [ ] Indexes on all foreign keys
- [ ] Indexes on frequently filtered columns
- [ ] Indexes on sort columns
- [ ] Partial indexes use WHERE clause
- [ ] Index naming follows convention

### Defaults
- [ ] Booleans have DEFAULT values
- [ ] Timestamps use DEFAULT NOW()
- [ ] Appropriate defaults for other fields

### Triggers
- [ ] BEFORE INSERT trigger for created fields
- [ ] BEFORE UPDATE trigger for updated fields
- [ ] Trigger naming follows convention

### Documentation
- [ ] Table comment explains purpose
- [ ] Column comments for complex fields
- [ ] Table registered in `database_tables`

---

## 🚫 Anti-Patterns to Avoid

### 1. Storing Delimited Lists

**❌ BAD:**
```sql
CREATE TABLE projects_bad (
    id UUID PRIMARY KEY,
    team_members TEXT  -- 'user1,user2,user3' - BAD!
);
```

**✅ GOOD:**
```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY,
    team_id UUID REFERENCES teams(id),
    user_id UUID REFERENCES users(id)
);
```

---

### 2. EAV (Entity-Attribute-Value) Pattern

**❌ BAD:**
```sql
CREATE TABLE project_attributes (
    project_id UUID,
    attribute_name VARCHAR(100),
    attribute_value TEXT
);
-- Makes queries complex and slow
```

**✅ BETTER:**
```sql
-- Use JSONB for truly flexible data
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    project_name VARCHAR(200),
    custom_fields JSONB
);
```

---

### 3. Generic "Data" Tables

**❌ BAD:**
```sql
CREATE TABLE data (
    id UUID PRIMARY KEY,
    type VARCHAR(50),
    data JSONB
);
-- No structure, no constraints, no relationships
```

**✅ GOOD:**
```sql
-- Separate tables for each entity type
CREATE TABLE projects (...);
CREATE TABLE tasks (...);
CREATE TABLE risks (...);
```

---

### 4. Nullable Booleans

**❌ BAD:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    is_active BOOLEAN  -- NULL means what?
);
```

**✅ GOOD:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);
```

---

### 5. Using Abbreviations

**❌ BAD:**
```sql
CREATE TABLE prj (  -- What is prj?
    id UUID PRIMARY KEY,
    nm VARCHAR(200),  -- What is nm?
    desc TEXT,        -- Abbreviated
    usr_id UUID       -- Hard to read
);
```

**✅ GOOD:**
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    project_name VARCHAR(200),
    description TEXT,
    owner_user_id UUID
);
```

---

## 📚 Related Documentation

- **Database Architecture:** `Database_Architecture.md`
- **Naming Conventions:** `Database_Naming_Conventions.md`
- **Audit Fields:** `Database_Audit_Fields.md`
- **Core Tables:** `Core_Tables_ER_Diagram.md`
- **Table Registry:** `Database_Table_Registry.md`

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-15 | Initial database design principles documentation |

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team

---

**Remember: Consistent principles lead to maintainable databases!** 🏗️
