# Database Naming Conventions
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0
**Database:** PostgreSQL (via Supabase)

---

## 📋 Overview

This document defines the comprehensive naming conventions for all database objects in Project Nidus. These conventions ensure consistency, readability, maintainability, and copyright safety across the entire database schema.

---

## 🎯 Core Principles

### 1. Consistency
- All names follow the same pattern within their category
- Predictable naming makes code more maintainable
- Easy to understand the purpose of any object from its name

### 2. Copyright Safety
- **NEVER** use trademarked names in database objects
- Use generic, descriptive terms: `structured` NOT `prince2`
- See: `projectplan/Copyright_Safe_Naming_Strategy.md`

### 3. PostgreSQL Compatibility
- All names are lowercase with underscores (snake_case)
- Avoid PostgreSQL reserved words
- Maximum name length: 63 characters (PostgreSQL limit)
- Use only alphanumeric characters and underscores

### 4. Descriptive Names
- Names should clearly indicate purpose
- Avoid abbreviations unless universally understood
- Favor clarity over brevity

### 5. Methodology Prefixes
- Use clear prefixes to distinguish methodology-specific tables
- Core tables have no prefix
- Methodology tables use descriptive prefixes

---

## 📊 Table Naming Conventions

### Format
```
[prefix_]table_name
```

### Rules
1. **Always lowercase**
2. **Always plural** (tables contain multiple records)
3. **Always snake_case** (words separated by underscores)
4. **Descriptive names** (clearly indicate content)
5. **No abbreviations** unless universally understood
6. **Copyright-safe** (no trademarked terms)

### Core Tables (No Prefix)

Core tables are methodology-agnostic and used across the entire system.

```sql
-- ✅ CORRECT - Core system tables
users
roles
permissions
user_roles
role_permissions
projects
teams
team_members
tasks
resources

-- ❌ WRONG
User                    -- Not lowercase, not plural
user                    -- Singular
Users                   -- Not lowercase
user_accounts           -- Redundant (account implied)
```

### System Tables (No Prefix)

System-level functionality tables.

```sql
-- ✅ CORRECT - System tables
database_tables
audit_trails
session_logs
system_settings
email_templates
notifications
activity_logs
error_logs

-- ❌ WRONG
sys_audit_trails        -- Unnecessary prefix
AuditTrails            -- Not snake_case
audit_trail            -- Singular
```

### Methodology-Specific Tables

Use descriptive prefixes to clearly identify methodology.

#### Structured PM Tables
```sql
-- ✅ CORRECT - Use "structured_" prefix
structured_mandates
structured_project_briefs
structured_initiation_documents
structured_business_cases
structured_project_plans
structured_work_packages
structured_stage_boundaries
structured_quality_registers
structured_risk_registers
structured_issue_registers
structured_lessons_learned
structured_closure_reports

-- ❌ WRONG - Trademark violations
prince2_mandates               -- NEVER use trademarked names
prince2_pids                   -- Trademark + abbreviation
p2_initiation_documents        -- Trademark abbreviation

-- ❌ WRONG - Poor naming
project_initiation_documents   -- Which methodology?
pid                            -- Too abbreviated, unclear
```

#### Agile Scrum Tables
```sql
-- ✅ CORRECT - Use "scrum_" prefix
scrum_product_backlogs
scrum_sprint_backlogs
scrum_sprints
scrum_user_stories
scrum_epics
scrum_daily_standup_logs
scrum_sprint_reviews
scrum_sprint_retrospectives
scrum_velocity_metrics
scrum_burndown_data

-- ❌ WRONG
agile_sprint_backlogs          -- "scrum_" is clearer than "agile_"
sprint_backlogs                -- Missing methodology prefix
ScrumSprints                   -- Not snake_case
scrum_sprint                   -- Singular
```

#### Kanban Tables
```sql
-- ✅ CORRECT - Use "kanban_" prefix
kanban_boards
kanban_columns
kanban_swimlanes
kanban_cards
kanban_wip_limits
kanban_flow_metrics
kanban_cycle_time_data
kanban_cumulative_flow_data

-- ❌ WRONG
kb_boards                      -- Too abbreviated
kanban_board                   -- Singular
KanbanBoards                   -- Not snake_case
boards                         -- Missing methodology prefix
```

### Many-to-Many Junction Tables

Junction tables connect two entities in a many-to-many relationship.

**Format:** `table1_table2` (alphabetical order if no clear hierarchy)

```sql
-- ✅ CORRECT - Junction tables
user_roles              -- Users have many roles, roles have many users
user_projects           -- Users work on many projects
role_permissions        -- Roles have many permissions
team_members            -- Teams have many members
task_assignments        -- Tasks assigned to many resources
project_stakeholders    -- Projects have many stakeholders

-- ❌ WRONG
roles_users             -- Wrong order (user comes before role)
user_to_role            -- Unnecessary "to"
user_role_mapping       -- Unnecessary "mapping"
```

### Lookup/Reference Tables

Tables containing reference data or configuration.

```sql
-- ✅ CORRECT - Lookup tables (plural)
project_statuses
project_types
task_statuses
priority_levels
countries
currencies
time_zones
methodologies

-- ❌ WRONG
project_status          -- Singular
status_lookup           -- Unnecessary "lookup" suffix
ref_project_statuses    -- Unnecessary "ref_" prefix
```

### Historical/Archive Tables

Tables storing historical data.

**Format:** `table_name_history` or `table_name_archive`

```sql
-- ✅ CORRECT - History tables
audit_trails            -- Already implies history
project_history
task_history
user_session_history

-- ❌ WRONG
hist_projects           -- Abbreviation
projects_hist           -- Inconsistent position
old_projects            -- Not descriptive
```

---

## 🔤 Column Naming Conventions

### Format
```
column_name
```

### Rules
1. **Always lowercase**
2. **Always snake_case**
3. **Descriptive names**
4. **Singular** (each column holds one value per row)
5. **Boolean columns** start with `is_`, `has_`, `can_`, `should_`
6. **Date/Time columns** end with `_at` for timestamps, `_date` for dates

### Primary Keys

**Format:** `id` (not `table_name_id`)

```sql
-- ✅ CORRECT - Primary keys
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    ...
);

-- ❌ WRONG
CREATE TABLE projects (
    project_id UUID PRIMARY KEY,  -- Don't prefix in home table
    ProjectID UUID PRIMARY KEY,   -- Not snake_case
    ID UUID PRIMARY KEY,          -- Not lowercase
);
```

### Foreign Keys

**Format:** `table_name_id` (singular table name + `_id`)

```sql
-- ✅ CORRECT - Foreign keys
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    assigned_to_user_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    status_id UUID REFERENCES task_statuses(id)
);

-- ❌ WRONG
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    project UUID,              -- Missing _id suffix
    projectId UUID,            -- Not snake_case
    ProjectID UUID,            -- Not snake_case
    assigned_user UUID,        -- Unclear, inconsistent
);
```

### Standard Data Columns

```sql
-- ✅ CORRECT - Text columns
name VARCHAR(200)
title VARCHAR(200)
description TEXT
notes TEXT
email VARCHAR(255)
phone_number VARCHAR(20)

-- ❌ WRONG
Name VARCHAR(200)          -- Not lowercase
user_name VARCHAR(200)     -- Redundant in users table
desc TEXT                  -- Abbreviated
```

### Boolean Columns

**Prefixes:** `is_`, `has_`, `can_`, `should_`, `allow_`, `enable_`

```sql
-- ✅ CORRECT - Boolean columns
is_active BOOLEAN DEFAULT TRUE
is_deleted BOOLEAN DEFAULT FALSE
is_public BOOLEAN DEFAULT FALSE
has_budget BOOLEAN DEFAULT FALSE
can_edit BOOLEAN DEFAULT FALSE
should_notify BOOLEAN DEFAULT TRUE
allow_comments BOOLEAN DEFAULT TRUE
enable_notifications BOOLEAN DEFAULT TRUE

-- ❌ WRONG
active BOOLEAN              -- Missing is_ prefix
deleted BOOLEAN             -- Missing is_ prefix
public BOOLEAN              -- Reserved word + missing is_
Active BOOLEAN              -- Not lowercase
```

### Date and Time Columns

**Formats:**
- Timestamps: `_at` suffix
- Dates only: `_date` suffix
- Times only: `_time` suffix

```sql
-- ✅ CORRECT - Timestamp columns
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
deleted_at TIMESTAMP
published_at TIMESTAMP
started_at TIMESTAMP
completed_at TIMESTAMP
due_at TIMESTAMP

-- ✅ CORRECT - Date only columns
birth_date DATE
start_date DATE
end_date DATE
due_date DATE
planned_date DATE

-- ✅ CORRECT - Time only columns
start_time TIME
end_time TIME

-- ❌ WRONG
create_date TIMESTAMP       -- Inconsistent suffix (should be created_at)
creation_date TIMESTAMP     -- Verbose
dateCreated TIMESTAMP       -- Not snake_case
created TIMESTAMP           -- Missing _at suffix
```

### Numeric Columns

```sql
-- ✅ CORRECT - Numeric columns
budget_amount DECIMAL(15, 2)
actual_cost DECIMAL(15, 2)
estimated_hours DECIMAL(8, 2)
total_count INTEGER
sequence_number INTEGER
sort_order INTEGER
percentage_complete DECIMAL(5, 2)

-- ❌ WRONG
budget DECIMAL(15, 2)       -- Not specific enough (budget what?)
cost DECIMAL(15, 2)         -- Not specific enough
hours DECIMAL(8, 2)         -- Not specific enough
percent DECIMAL(5, 2)       -- Abbreviated, unclear
```

### JSONB Columns

Store flexible, unstructured data.

```sql
-- ✅ CORRECT - JSONB columns
metadata JSONB
settings JSONB
configuration JSONB
custom_fields JSONB
properties JSONB

-- ❌ WRONG
json_data JSONB             -- Type in name is redundant
meta JSONB                  -- Abbreviated
```

### Array Columns

```sql
-- ✅ CORRECT - Array columns (plural)
tags TEXT[]
categories TEXT[]
assigned_user_ids UUID[]

-- ❌ WRONG
tag TEXT[]                  -- Singular
tag_array TEXT[]            -- Type in name
```

---

## 🔑 Index Naming Conventions

### Format
```
idx_tablename_columnname[_columnname2...]
```

### Rules
1. Start with `idx_` prefix
2. Include table name (can be abbreviated if clear)
3. Include column name(s)
4. Use snake_case

### Single Column Indexes

```sql
-- ✅ CORRECT - Single column indexes
CREATE INDEX idx_projects_status_id ON projects(status_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- ❌ WRONG
CREATE INDEX project_status ON projects(status_id);           -- Missing idx_ prefix
CREATE INDEX idx_status ON projects(status_id);               -- Missing table name
CREATE INDEX ProjectStatusIndex ON projects(status_id);       -- Not snake_case
```

### Composite Indexes

```sql
-- ✅ CORRECT - Composite indexes
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status_id);
CREATE INDEX idx_users_email_active ON users(email, is_active);
CREATE INDEX idx_projects_type_status ON projects(type_id, status_id);

-- ❌ WRONG
CREATE INDEX idx_tasks_project ON tasks(project_id, status_id);  -- Incomplete name
CREATE INDEX idx_tasks ON tasks(project_id, status_id);          -- Missing columns
```

### Partial Indexes

Include `_active` or condition description.

```sql
-- ✅ CORRECT - Partial indexes
CREATE INDEX idx_projects_status_active
    ON projects(status_id)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_users_email_active
    ON users(email)
    WHERE is_active = TRUE;

-- ❌ WRONG
CREATE INDEX idx_projects_status ON projects(status_id) WHERE is_deleted = FALSE;
-- (Missing _active suffix to indicate partial index)
```

### Unique Indexes

Include `_unique` suffix or use `uniq_` prefix.

```sql
-- ✅ CORRECT - Unique indexes
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
CREATE UNIQUE INDEX uniq_users_email ON users(email);

-- Both formats acceptable, choose one and be consistent
```

### Full-Text Search Indexes

```sql
-- ✅ CORRECT - Full-text search indexes
CREATE INDEX idx_projects_name_fts
    ON projects
    USING gin(to_tsvector('english', name));

CREATE INDEX idx_tasks_description_fts
    ON tasks
    USING gin(to_tsvector('english', description));

-- ❌ WRONG
CREATE INDEX idx_projects_search ON projects USING gin(...);  -- Not specific
```

---

## 🔒 Constraint Naming Conventions

### Primary Key Constraints

**Format:** `pk_tablename`

```sql
-- ✅ CORRECT - Primary key constraints
ALTER TABLE projects ADD CONSTRAINT pk_projects PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);

-- ❌ WRONG
ALTER TABLE projects ADD CONSTRAINT projects_pk PRIMARY KEY (id);  -- Inconsistent
ALTER TABLE projects ADD CONSTRAINT PK_Projects PRIMARY KEY (id);  -- Not snake_case
```

### Foreign Key Constraints

**Format:** `fk_tablename_referenced_table`

```sql
-- ✅ CORRECT - Foreign key constraints
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_projects
    FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_users
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_roles
    FOREIGN KEY (role_id) REFERENCES roles(id);

-- ❌ WRONG
ALTER TABLE tasks
    ADD CONSTRAINT tasks_project_fk  -- Inconsistent format
    FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE tasks
    ADD CONSTRAINT fk_project_id      -- Missing table name
    FOREIGN KEY (project_id) REFERENCES projects(id);
```

### Unique Constraints

**Format:** `uq_tablename_columnname[_columnname2...]`

```sql
-- ✅ CORRECT - Unique constraints
ALTER TABLE users
    ADD CONSTRAINT uq_users_email
    UNIQUE (email);

ALTER TABLE database_tables
    ADD CONSTRAINT uq_database_tables_table_name
    UNIQUE (table_name);

ALTER TABLE projects
    ADD CONSTRAINT uq_projects_code
    UNIQUE (project_code);

-- ❌ WRONG
ALTER TABLE users
    ADD CONSTRAINT users_email_unique  -- Inconsistent format
    UNIQUE (email);
```

### Check Constraints

**Format:** `chk_tablename_description`

```sql
-- ✅ CORRECT - Check constraints
ALTER TABLE projects
    ADD CONSTRAINT chk_projects_dates
    CHECK (end_date >= start_date);

ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_progress
    CHECK (percentage_complete >= 0 AND percentage_complete <= 100);

ALTER TABLE users
    ADD CONSTRAINT chk_users_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ❌ WRONG
ALTER TABLE projects
    ADD CONSTRAINT date_check           -- Not descriptive
    CHECK (end_date >= start_date);

ALTER TABLE projects
    ADD CONSTRAINT chk_dates            -- Missing table name
    CHECK (end_date >= start_date);
```

---

## ⚙️ Function Naming Conventions

### Format
```
functionname_description
```

### Rules
1. **All lowercase**
2. **Snake_case**
3. **Verb-based** (action-oriented)
4. **Descriptive**

### Standard Functions

```sql
-- ✅ CORRECT - Function names
CREATE FUNCTION get_user_permissions(user_uuid UUID)
CREATE FUNCTION calculate_project_progress(project_uuid UUID)
CREATE FUNCTION validate_email(email_address VARCHAR)
CREATE FUNCTION update_project_status(project_uuid UUID, new_status_id UUID)
CREATE FUNCTION archive_completed_projects()
CREATE FUNCTION send_notification(user_uuid UUID, message TEXT)

-- ❌ WRONG
CREATE FUNCTION GetUserPermissions(user_uuid UUID)        -- Not snake_case
CREATE FUNCTION user_permissions(user_uuid UUID)          -- Not verb-based
CREATE FUNCTION fn_get_user_perms(user_uuid UUID)         -- Prefix + abbreviated
CREATE FUNCTION getUserPermissions(user_uuid UUID)        -- camelCase
```

### Trigger Functions

**Format:** `trigger_tablename_action`

```sql
-- ✅ CORRECT - Trigger functions
CREATE FUNCTION trigger_users_update_timestamp()
CREATE FUNCTION trigger_projects_audit_trail()
CREATE FUNCTION trigger_tasks_set_defaults()
CREATE FUNCTION trigger_audit_trails_insert()

-- ❌ WRONG
CREATE FUNCTION users_trigger()              -- Not descriptive
CREATE FUNCTION update_timestamp()           -- Missing table name
CREATE FUNCTION fn_trigger_users_update()    -- Unnecessary prefix
```

---

## 🔔 Trigger Naming Conventions

### Format
```
trg_tablename_when_action
```

**When:** `before` or `after`
**Action:** `insert`, `update`, `delete`, `insert_update`, etc.

### Rules
1. Start with `trg_` prefix
2. Include table name
3. Include timing (`before` or `after`)
4. Include action (`insert`, `update`, `delete`)

### Standard Triggers

```sql
-- ✅ CORRECT - Trigger names
CREATE TRIGGER trg_users_before_insert
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_users_set_defaults();

CREATE TRIGGER trg_projects_after_update
    AFTER UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION trigger_projects_audit_trail();

CREATE TRIGGER trg_tasks_before_insert_update
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_tasks_update_timestamp();

-- ❌ WRONG
CREATE TRIGGER users_insert                   -- Missing trg_ prefix and timing
CREATE TRIGGER before_insert_users             -- Inconsistent order
CREATE TRIGGER UserInsertTrigger               -- Not snake_case
CREATE TRIGGER trg_insert                      -- Missing table name
```

### Audit Trail Triggers

```sql
-- ✅ CORRECT - Audit trail triggers
CREATE TRIGGER trg_projects_after_insert_audit
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_trail_insert();

CREATE TRIGGER trg_users_after_update_audit
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_trail_update();

CREATE TRIGGER trg_tasks_after_delete_audit
    AFTER DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_trail_delete();
```

---

## 📋 View Naming Conventions

### Format
```
v_viewname or view_name
```

### Rules
1. Optionally start with `v_` prefix (be consistent)
2. Descriptive name indicating the data provided
3. Snake_case

### Standard Views

```sql
-- ✅ CORRECT - View names
CREATE VIEW v_active_projects AS ...
CREATE VIEW v_user_permissions AS ...
CREATE VIEW v_project_summary AS ...
CREATE VIEW v_task_assignments AS ...

-- OR (without prefix, but be consistent)
CREATE VIEW active_projects AS ...
CREATE VIEW user_permissions AS ...

-- ❌ WRONG
CREATE VIEW ActiveProjects AS ...              -- Not snake_case
CREATE VIEW vActiveProjects AS ...             -- camelCase
CREATE VIEW active_project AS ...              -- Singular
CREATE VIEW view_active_projects AS ...        -- Redundant "view"
```

### Reporting Views

```sql
-- ✅ CORRECT - Reporting views
CREATE VIEW v_project_status_report AS ...
CREATE VIEW v_resource_utilization_report AS ...
CREATE VIEW v_budget_variance_report AS ...

-- Can also use "rpt_" prefix
CREATE VIEW rpt_project_status AS ...
CREATE VIEW rpt_resource_utilization AS ...
```

---

## 🗂️ Sequence Naming Conventions

### Format
```
seq_tablename_columnname
```

```sql
-- ✅ CORRECT - Sequence names
CREATE SEQUENCE seq_projects_project_number START 1000;
CREATE SEQUENCE seq_invoices_invoice_number START 10000;

-- ❌ WRONG
CREATE SEQUENCE project_seq START 1000;       -- Inconsistent format
CREATE SEQUENCE ProjectNumber START 1000;     -- Not snake_case
CREATE SEQUENCE seq_number START 1000;        -- Not descriptive
```

---

## 🔐 Row Level Security (RLS) Policy Naming

### Format
```
policy_tablename_description
```

```sql
-- ✅ CORRECT - RLS policy names
CREATE POLICY policy_projects_user_access
    ON projects FOR SELECT
    USING (id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid()));

CREATE POLICY policy_users_own_data
    ON users FOR ALL
    USING (id = auth.uid());

CREATE POLICY policy_projects_admin_full_access
    ON projects FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'System Admin'
    ));

-- ❌ WRONG
CREATE POLICY user_access ON projects ...      -- Missing policy_ prefix and table name
CREATE POLICY projects_policy ON projects ...  -- Redundant "policy"
CREATE POLICY ProjectAccess ON projects ...    -- Not snake_case
```

---

## 📊 Enum/Type Naming Conventions

### Format
```
enum_name or typename
```

```sql
-- ✅ CORRECT - Custom type names
CREATE TYPE project_status_enum AS ENUM ('draft', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE task_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE user_role_enum AS ENUM ('admin', 'project_manager', 'team_member', 'viewer');

-- ❌ WRONG
CREATE TYPE ProjectStatus AS ENUM (...);       -- Not snake_case
CREATE TYPE status AS ENUM (...);              -- Too generic
CREATE TYPE enum_project_status AS ENUM (...); -- Redundant "enum_" prefix
```

---

## 🎯 Methodology-Specific Naming Examples

### Structured PM Tables

```sql
-- ✅ CORRECT - Copyright-safe structured PM naming
CREATE TABLE structured_mandates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    mandate_title VARCHAR(200) NOT NULL,
    mandate_description TEXT,
    ...
);

CREATE TABLE structured_initiation_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    document_version VARCHAR(20),
    ...
);

CREATE TABLE structured_work_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    stage_id UUID REFERENCES structured_stage_boundaries(id),
    package_title VARCHAR(200),
    ...
);

-- ❌ WRONG - Trademark violations
CREATE TABLE prince2_mandates (...);           -- NEVER use trademarked names
CREATE TABLE p2_pids (...);                     -- Trademark + abbreviation
CREATE TABLE project_initiation_documents (...); -- Missing methodology prefix
```

### Agile Scrum Tables

```sql
-- ✅ CORRECT - Scrum naming
CREATE TABLE scrum_product_backlogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    backlog_title VARCHAR(200),
    ...
);

CREATE TABLE scrum_sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    sprint_number INTEGER,
    sprint_goal TEXT,
    start_date DATE,
    end_date DATE,
    ...
);

CREATE TABLE scrum_user_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backlog_id UUID REFERENCES scrum_product_backlogs(id),
    story_title VARCHAR(200),
    story_points INTEGER,
    ...
);

-- ❌ WRONG
CREATE TABLE sprints (...);                    -- Missing methodology prefix
CREATE TABLE agile_sprints (...);              -- Use "scrum_" not "agile_"
CREATE TABLE ScrumSprints (...);               -- Not snake_case
```

### Kanban Tables

```sql
-- ✅ CORRECT - Kanban naming
CREATE TABLE kanban_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    board_name VARCHAR(200),
    ...
);

CREATE TABLE kanban_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES kanban_boards(id),
    column_name VARCHAR(100),
    wip_limit INTEGER,
    sort_order INTEGER,
    ...
);

CREATE TABLE kanban_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES kanban_boards(id),
    column_id UUID REFERENCES kanban_columns(id),
    card_title VARCHAR(200),
    ...
);

-- ❌ WRONG
CREATE TABLE boards (...);                     -- Missing methodology prefix
CREATE TABLE kb_boards (...);                  -- Abbreviated
CREATE TABLE KanbanBoards (...);               -- Not snake_case
```

---

## ✅ Naming Checklist

Before creating any database object, verify:

### Tables
- [ ] Lowercase with underscores (snake_case)
- [ ] Plural name
- [ ] Descriptive and clear
- [ ] Methodology prefix if methodology-specific
- [ ] No trademarked names
- [ ] No abbreviations (unless universal)

### Columns
- [ ] Lowercase with underscores (snake_case)
- [ ] Singular name
- [ ] Descriptive and clear
- [ ] Primary key named `id`
- [ ] Foreign keys end with `_id`
- [ ] Booleans start with `is_`, `has_`, `can_`, etc.
- [ ] Timestamps end with `_at`
- [ ] Dates end with `_date`

### Indexes
- [ ] Start with `idx_`
- [ ] Include table name
- [ ] Include column name(s)
- [ ] Snake_case
- [ ] Descriptive suffix for partial/unique indexes

### Constraints
- [ ] Correct prefix (`pk_`, `fk_`, `uq_`, `chk_`)
- [ ] Include table name
- [ ] Descriptive
- [ ] Snake_case

### Functions
- [ ] Lowercase snake_case
- [ ] Verb-based (action)
- [ ] Descriptive
- [ ] Trigger functions start with `trigger_`

### Triggers
- [ ] Start with `trg_`
- [ ] Include table name
- [ ] Include timing (before/after)
- [ ] Include action (insert/update/delete)
- [ ] Snake_case

---

## 📚 Quick Reference

| Object Type | Format | Example |
|-------------|--------|---------|
| **Table (core)** | `table_name` | `projects`, `users`, `tasks` |
| **Table (system)** | `table_name` | `audit_trails`, `session_logs` |
| **Table (structured PM)** | `structured_name` | `structured_mandates` |
| **Table (scrum)** | `scrum_name` | `scrum_sprints` |
| **Table (kanban)** | `kanban_name` | `kanban_boards` |
| **Junction table** | `table1_table2` | `user_roles`, `team_members` |
| **Primary key** | `id` | `id UUID PRIMARY KEY` |
| **Foreign key** | `tablename_id` | `project_id`, `user_id` |
| **Boolean column** | `is_/has_/can_` | `is_active`, `has_budget` |
| **Timestamp** | `action_at` | `created_at`, `updated_at` |
| **Date** | `action_date` | `start_date`, `end_date` |
| **Index** | `idx_table_column` | `idx_projects_status` |
| **Unique index** | `idx_table_column_unique` | `idx_users_email_unique` |
| **PK constraint** | `pk_table` | `pk_projects` |
| **FK constraint** | `fk_table_reftable` | `fk_tasks_projects` |
| **Unique constraint** | `uq_table_column` | `uq_users_email` |
| **Check constraint** | `chk_table_description` | `chk_projects_dates` |
| **Function** | `action_description` | `get_user_permissions` |
| **Trigger function** | `trigger_table_action` | `trigger_users_update_timestamp` |
| **Trigger** | `trg_table_when_action` | `trg_users_before_insert` |
| **View** | `v_description` | `v_active_projects` |
| **Policy** | `policy_table_description` | `policy_projects_user_access` |

---

## 🚫 Common Mistakes to Avoid

### 1. Trademark Violations
```sql
-- ❌ NEVER
CREATE TABLE prince2_pids (...);
CREATE TABLE prince2_stage_boundaries (...);

-- ✅ ALWAYS
CREATE TABLE structured_initiation_documents (...);
CREATE TABLE structured_stage_boundaries (...);
```

### 2. Inconsistent Case
```sql
-- ❌ WRONG
CREATE TABLE Projects (...);
CREATE TABLE project_Tasks (...);
CREATE TABLE USERS (...);

-- ✅ CORRECT
CREATE TABLE projects (...);
CREATE TABLE project_tasks (...);
CREATE TABLE users (...);
```

### 3. Singular Table Names
```sql
-- ❌ WRONG
CREATE TABLE project (...);
CREATE TABLE user (...);

-- ✅ CORRECT
CREATE TABLE projects (...);
CREATE TABLE users (...);
```

### 4. Abbreviations
```sql
-- ❌ WRONG
CREATE TABLE proj (...);
CREATE TABLE usr_perm (...);
CREATE TABLE pid (...);

-- ✅ CORRECT
CREATE TABLE projects (...);
CREATE TABLE user_permissions (...);
CREATE TABLE structured_initiation_documents (...);
```

### 5. Missing Prefixes
```sql
-- ❌ WRONG
CREATE INDEX projects_status ON projects(status_id);
CREATE FUNCTION update_timestamp() ...

-- ✅ CORRECT
CREATE INDEX idx_projects_status ON projects(status_id);
CREATE FUNCTION trigger_users_update_timestamp() ...
```

### 6. Boolean Naming
```sql
-- ❌ WRONG
active BOOLEAN
deleted BOOLEAN
public BOOLEAN

-- ✅ CORRECT
is_active BOOLEAN
is_deleted BOOLEAN
is_public BOOLEAN
```

---

## 📖 Examples by Category

### Complete Table Example

```sql
-- ✅ COMPLETE CORRECT EXAMPLE
CREATE TABLE projects (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    methodology_id UUID REFERENCES methodologies(id),
    status_id UUID REFERENCES project_statuses(id),
    type_id UUID REFERENCES project_types(id),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_by UUID REFERENCES users(id),

    -- Text columns
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_code VARCHAR(50),

    -- Numeric columns
    budget_amount DECIMAL(15, 2),
    estimated_hours DECIMAL(10, 2),

    -- Boolean columns
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,

    -- Date/Time columns
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    -- JSONB columns
    custom_fields JSONB,
    settings JSONB,

    -- Constraints
    CONSTRAINT chk_projects_dates CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_projects_status_id ON projects(status_id);
CREATE INDEX idx_projects_methodology_id ON projects(methodology_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE UNIQUE INDEX idx_projects_code_unique ON projects(project_code) WHERE is_deleted = FALSE;

-- Table registration
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('projects', 'Main project records for all methodologies', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-15 | Initial comprehensive naming conventions document |

---

## 📚 Related Documentation

- **Database Architecture:** `Database_Architecture.md`
- **Design Principles:** `Database_Design_Principles.md`
- **Copyright Strategy:** `projectplan/Copyright_Safe_Naming_Strategy.md`
- **Development Guidelines:** `Development_Guidelines.md`

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team

---

**Remember: Consistent, Clear, Copyright-Safe Naming!** 🎯
