# PostgreSQL & Supabase Considerations
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0
**Database:** PostgreSQL 15+ (via Supabase)

---

## 📋 Overview

This document covers PostgreSQL-specific features and Supabase platform considerations for Project Nidus. Understanding these features is critical for building a high-performance, secure, scalable application.

---

## 🐘 PostgreSQL-Specific Features

### 1. UUID Generation

#### Enable UUID Extension

```sql
-- Enable UUID extension (run once per database)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### UUID Functions

```sql
-- Generate UUID v4 (random)
SELECT uuid_generate_v4();

-- Use in table definition
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(200) NOT NULL
);
```

#### Best Practices

- ✅ Use UUIDs for all primary keys (security, distribution)
- ✅ Use `uuid_generate_v4()` for random UUIDs
- ✅ Enable extension at database level, not per table
- ❌ Don't use sequential UUIDs (v1) - they leak timestamp info

---

### 2. JSONB (Binary JSON)

#### Why JSONB?

1. **Flexible Schema:** Store dynamic, nested data
2. **Indexable:** Create indexes on JSONB columns
3. **Queryable:** Query inside JSON structure
4. **Binary Storage:** Faster than text JSON
5. **Validation:** JSON is validated on insert

#### Common Use Cases

- Custom fields
- Configuration settings
- Metadata
- API responses
- Flexible attributes

#### Example Usage

```sql
-- Table with JSONB
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(200) NOT NULL,
    custom_fields JSONB,
    settings JSONB,
    metadata JSONB
);

-- Insert JSONB data
INSERT INTO projects (project_name, custom_fields)
VALUES ('Project Alpha', '{"priority": "high", "tags": ["urgent", "client"], "budget": 50000}');

-- Query JSONB (-> returns JSONB, ->> returns text)
SELECT
    project_name,
    custom_fields->>'priority' AS priority,
    custom_fields->'budget' AS budget
FROM projects;

-- Query nested JSONB
SELECT
    project_name,
    custom_fields->'details'->>'location' AS location
FROM projects;

-- Filter by JSONB value
SELECT * FROM projects
WHERE custom_fields->>'priority' = 'high';

-- Filter by JSONB existence
SELECT * FROM projects
WHERE custom_fields ? 'tags';  -- Has 'tags' key

-- Array contains
SELECT * FROM projects
WHERE custom_fields->'tags' @> '["urgent"]'::jsonb;
```

#### JSONB Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `->` | Get JSON object field (returns JSONB) | `data->'field'` |
| `->>` | Get JSON object field (returns TEXT) | `data->>'field'` |
| `#>` | Get JSON at path (returns JSONB) | `data#>'{a,b,c}'` |
| `#>>` | Get JSON at path (returns TEXT) | `data#>>'{a,b,c}'` |
| `?` | Does key exist? | `data ? 'key'` |
| `?|` | Do any keys exist? | `data ?| array['k1','k2']` |
| `?&` | Do all keys exist? | `data ?& array['k1','k2']` |
| `@>` | Contains JSON? | `data @> '{"a":1}'` |
| `<@` | Contained in JSON? | `data <@ '{"a":1,"b":2}'` |

#### JSONB Indexes

```sql
-- GIN index for JSONB (general queries)
CREATE INDEX idx_projects_custom_fields ON projects USING gin(custom_fields);

-- Index specific JSONB path
CREATE INDEX idx_projects_priority ON projects((custom_fields->>'priority'));

-- Index for containment queries
CREATE INDEX idx_projects_custom_fields_path ON projects USING gin(custom_fields jsonb_path_ops);
```

#### JSONB Functions

```sql
-- Build JSONB from parts
SELECT jsonb_build_object('name', 'John', 'age', 30);

-- Aggregate into JSONB
SELECT jsonb_agg(project_name) FROM projects;

-- Merge JSONB
SELECT custom_fields || '{"new_key": "new_value"}'::jsonb FROM projects;

-- Remove key
SELECT custom_fields - 'old_key' FROM projects;

-- Update nested value
UPDATE projects
SET custom_fields = jsonb_set(custom_fields, '{priority}', '"critical"')
WHERE id = 'project-uuid';
```

#### Best Practices

- ✅ Use JSONB (binary), not JSON (text)
- ✅ Index JSONB columns with GIN indexes
- ✅ Validate JSONB structure in application
- ✅ Use for truly flexible/dynamic data
- ❌ Don't use JSONB for data that should be in columns
- ❌ Don't nest too deeply (hard to query)
- ❌ Don't store large arrays (performance)

---

### 3. Array Types

#### Array Column Definition

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    project_name VARCHAR(200),
    tags TEXT[],                    -- Array of text
    assigned_user_ids UUID[],       -- Array of UUIDs
    priority_scores INTEGER[]       -- Array of integers
);
```

#### Working with Arrays

```sql
-- Insert array
INSERT INTO projects (project_name, tags)
VALUES ('Project Alpha', ARRAY['urgent', 'client', 'backend']);

-- Or using literal syntax
INSERT INTO projects (project_name, tags)
VALUES ('Project Beta', '{important,frontend}');

-- Query array elements
SELECT project_name, tags[1] AS first_tag FROM projects;

-- Check if array contains value
SELECT * FROM projects
WHERE 'urgent' = ANY(tags);

-- Check if all values in array
SELECT * FROM projects
WHERE tags @> ARRAY['urgent', 'client'];

-- Overlap (any common elements)
SELECT * FROM projects
WHERE tags && ARRAY['urgent', 'backend'];

-- Array length
SELECT project_name, array_length(tags, 1) AS tag_count FROM projects;

-- Unnest array to rows
SELECT project_name, unnest(tags) AS tag FROM projects;

-- Aggregate into array
SELECT array_agg(project_name) FROM projects;

-- Update array (add element)
UPDATE projects
SET tags = array_append(tags, 'new-tag')
WHERE id = 'project-uuid';

-- Update array (remove element)
UPDATE projects
SET tags = array_remove(tags, 'old-tag')
WHERE id = 'project-uuid';
```

#### Array Indexes

```sql
-- GIN index for array containment queries
CREATE INDEX idx_projects_tags ON projects USING gin(tags);

-- B-tree index (less common for arrays)
CREATE INDEX idx_projects_tags_btree ON projects(tags);
```

#### Best Practices

- ✅ Use arrays for simple lists (tags, categories)
- ✅ Index arrays with GIN for containment queries
- ✅ Keep arrays small (< 100 elements)
- ❌ Don't use for relationships (use junction tables)
- ❌ Don't store large arrays (performance issues)

---

### 4. Full-Text Search

#### Creating Full-Text Search Indexes

```sql
-- GIN index for full-text search
CREATE INDEX idx_projects_name_fts
    ON projects
    USING gin(to_tsvector('english', project_name));

CREATE INDEX idx_tasks_description_fts
    ON tasks
    USING gin(to_tsvector('english', description));
```

#### Searching

```sql
-- Basic search
SELECT * FROM projects
WHERE to_tsvector('english', project_name) @@ to_tsquery('english', 'database');

-- Search with ranking
SELECT
    project_name,
    ts_rank(to_tsvector('english', project_name), query) AS rank
FROM projects, to_tsquery('english', 'database') query
WHERE to_tsvector('english', project_name) @@ query
ORDER BY rank DESC;

-- Search multiple columns
SELECT * FROM projects
WHERE to_tsvector('english', project_name || ' ' || description)
      @@ to_tsquery('english', 'database & design');

-- Phrase search
SELECT * FROM projects
WHERE to_tsvector('english', project_name) @@ phraseto_tsquery('english', 'project management');

-- Prefix search (for autocomplete)
SELECT * FROM projects
WHERE to_tsvector('english', project_name) @@ to_tsquery('english', 'datab:*');
```

#### Full-Text Search Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&` | AND | `'cat & dog'` |
| `|` | OR | `'cat | dog'` |
| `!` | NOT | `'cat & !dog'` |
| `<->` | FOLLOWED BY | `'super <-> man'` |

#### Stored Generated Column for FTS

```sql
-- Create generated tsvector column (recommended)
ALTER TABLE projects
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', coalesce(project_name, '') || ' ' || coalesce(description, ''))) STORED;

-- Index the generated column
CREATE INDEX idx_projects_search_vector ON projects USING gin(search_vector);

-- Much simpler queries
SELECT * FROM projects
WHERE search_vector @@ to_tsquery('english', 'database');
```

#### Best Practices

- ✅ Use GIN indexes for full-text search
- ✅ Use generated columns for multi-column search
- ✅ Choose appropriate language ('english', 'simple', etc.)
- ✅ Use `ts_rank()` to rank results by relevance
- ✅ Consider `pg_trgm` extension for fuzzy matching

---

### 5. Partitioning

#### When to Partition

Partition large tables (> 1 million rows) that are:
- Frequently queried by date range
- Append-only or mostly append
- Have natural partitioning key (date, region, etc.)

#### Good Candidates for Partitioning

- `audit_trails` - Partition by created_at (monthly)
- `activity_logs` - Partition by occurred_at (monthly)
- `session_logs` - Partition by started_at (weekly)
- `notifications` - Partition by created_at (monthly)

#### Range Partitioning by Date

```sql
-- Create partitioned table
CREATE TABLE audit_trails (
    id UUID DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE audit_trails_2025_11 PARTITION OF audit_trails
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE audit_trails_2025_12 PARTITION OF audit_trails
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE audit_trails_2026_01 PARTITION OF audit_trails
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Create indexes on each partition
CREATE INDEX idx_audit_trails_2025_11_table ON audit_trails_2025_11(table_name);
CREATE INDEX idx_audit_trails_2025_12_table ON audit_trails_2025_12(table_name);
```

#### Automatic Partition Creation

```sql
-- Function to create new partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
    base_table TEXT,
    partition_date DATE
)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := base_table || '_' || to_char(partition_date, 'YYYY_MM');
    start_date := date_trunc('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, base_table, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Call monthly to create next partition
SELECT create_monthly_partition('audit_trails', '2026-02-01');
```

#### Best Practices

- ✅ Partition by commonly filtered column (usually date)
- ✅ Create indexes on each partition
- ✅ Automate partition creation
- ✅ Archive/drop old partitions
- ❌ Don't partition small tables (< 1M rows)
- ❌ Don't create too many partitions (< 100 is good)

---

### 6. Index Types

#### B-tree Index (Default)

**Use for:**
- Equality comparisons (`=`)
- Range queries (`<`, `>`, `BETWEEN`)
- Sorting (`ORDER BY`)
- Most queries

```sql
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_users_email ON users(email);
```

#### GIN Index (Generalized Inverted Index)

**Use for:**
- JSONB columns
- Array columns
- Full-text search
- Containment queries

```sql
-- JSONB
CREATE INDEX idx_projects_custom_fields ON projects USING gin(custom_fields);

-- Array
CREATE INDEX idx_projects_tags ON projects USING gin(tags);

-- Full-text search
CREATE INDEX idx_projects_fts ON projects USING gin(to_tsvector('english', project_name));
```

#### GiST Index (Generalized Search Tree)

**Use for:**
- Geometric data
- Range types
- Full-text search (alternative to GIN)

```sql
-- Less common in typical application
CREATE INDEX idx_projects_fts_gist ON projects USING gist(to_tsvector('english', project_name));
```

#### Hash Index

**Use for:**
- Equality comparisons only
- Rarely used (B-tree is usually better)

```sql
-- Rarely needed
CREATE INDEX idx_users_email_hash ON users USING hash(email);
```

#### BRIN Index (Block Range Index)

**Use for:**
- Very large tables
- Naturally ordered data (timestamps, sequences)
- Append-only tables

```sql
-- For very large audit tables
CREATE INDEX idx_audit_trails_created_brin ON audit_trails USING brin(created_at);
```

#### Index Comparison

| Index Type | Use Case | Size | Speed |
|------------|----------|------|-------|
| B-tree | General purpose, range queries | Medium | Fast |
| GIN | JSONB, arrays, full-text | Large | Very Fast (read) |
| GiST | Geometric, ranges | Medium | Medium |
| Hash | Equality only | Small | Fast |
| BRIN | Large tables, ordered data | Tiny | Medium |

---

## 🌊 Supabase-Specific Features

### 1. Row Level Security (RLS)

#### What is RLS?

Row Level Security is PostgreSQL's native feature to restrict which rows users can access. Supabase **requires** RLS for security.

#### Enable RLS on Tables

```sql
-- Enable RLS (REQUIRED on all tables)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

#### Policy Types

1. **SELECT** - Who can read rows
2. **INSERT** - Who can create rows
3. **UPDATE** - Who can modify rows
4. **DELETE** - Who can delete rows (or soft delete)
5. **ALL** - Applies to all operations

#### Common RLS Patterns

##### Pattern 1: User Owns Row

```sql
-- Users can only see their own data
CREATE POLICY policy_user_preferences_own_data
    ON user_preferences
    FOR ALL
    USING (user_id = auth.uid());
```

##### Pattern 2: User Has Project Access

```sql
-- Users can see projects they're assigned to
CREATE POLICY policy_projects_user_access
    ON projects
    FOR SELECT
    USING (
        id IN (
            SELECT project_id
            FROM user_projects
            WHERE user_id = auth.uid()
        )
    );
```

##### Pattern 3: Admin Full Access

```sql
-- Admins can see everything
CREATE POLICY policy_projects_admin_access
    ON projects
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );
```

##### Pattern 4: Public Read, Authenticated Write

```sql
-- Anyone can read, authenticated users can write
CREATE POLICY policy_projects_public_read
    ON projects
    FOR SELECT
    USING (is_public = TRUE);

CREATE POLICY policy_projects_auth_write
    ON projects
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
```

##### Pattern 5: Soft Delete Filter

```sql
-- Only show non-deleted records
CREATE POLICY policy_projects_active
    ON projects
    FOR SELECT
    USING (is_deleted = FALSE);
```

#### Combining Policies

Multiple policies are OR'd together:

```sql
-- Policy 1: User has project access
CREATE POLICY policy_projects_user_access
    ON projects FOR SELECT
    USING (
        id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())
    );

-- Policy 2: OR user is admin
CREATE POLICY policy_projects_admin_access
    ON projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.role_name = 'System Admin'
        )
    );

-- Result: User can see projects if (has access) OR (is admin)
```

#### RLS Performance

**Important:** RLS policies run on EVERY query, so they must be fast!

```sql
-- ❌ SLOW - Subquery runs for each row
CREATE POLICY slow_policy ON projects
    FOR SELECT USING (
        (SELECT role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = auth.uid() LIMIT 1) = 'Admin'
    );

-- ✅ FAST - EXISTS is optimized
CREATE POLICY fast_policy ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.role_name = 'Admin'
        )
    );
```

#### Bypass RLS (Service Role)

Supabase provides two keys:
- **anon key** - Public, RLS enforced
- **service_role key** - Private, RLS bypassed

**Never expose service_role key to client!**

#### Best Practices

- ✅ Enable RLS on ALL tables
- ✅ Use EXISTS for policy checks
- ✅ Test policies thoroughly
- ✅ Create separate policies per operation (SELECT, INSERT, UPDATE, DELETE)
- ✅ Index columns used in RLS policies
- ❌ Don't use expensive functions in policies
- ❌ Don't rely on client-side security

---

### 2. Supabase Auth Integration

#### auth.uid()

Returns the currently authenticated user's UUID from JWT token.

```sql
-- Get current user
SELECT auth.uid();

-- Use in queries
SELECT * FROM projects
WHERE owner_user_id = auth.uid();

-- Use in policies
CREATE POLICY policy_own_data ON user_preferences
    FOR ALL USING (user_id = auth.uid());

-- Use in triggers
NEW.created_by := auth.uid();
```

#### auth.role()

Returns the current user's role ('anon', 'authenticated', or custom).

```sql
-- Check if authenticated
SELECT auth.role(); -- Returns 'authenticated' or 'anon'

-- Use in policy
CREATE POLICY policy_auth_only ON projects
    FOR ALL USING (auth.role() = 'authenticated');
```

#### auth.jwt()

Access the full JWT token.

```sql
-- Get email from JWT
SELECT auth.jwt()->>'email';

-- Get custom claims
SELECT auth.jwt()->'app_metadata'->>'role';
```

#### Linking Users Table to Auth

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id),  -- Link to Supabase auth
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    -- ... other columns
);

-- Trigger to create users record on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 3. Realtime

#### Enable Realtime on Tables

```sql
-- Enable realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

#### Client-Side Subscription (JavaScript)

```javascript
// Subscribe to project changes
const channel = supabase
    .channel('projects-changes')
    .on(
        'postgres_changes',
        {
            event: '*',  // INSERT, UPDATE, DELETE, or *
            schema: 'public',
            table: 'projects'
        },
        (payload) => {
            console.log('Change received!', payload);
            // Update UI
        }
    )
    .subscribe();

// Unsubscribe
channel.unsubscribe();
```

#### Realtime Filters

```javascript
// Only changes for specific project
const channel = supabase
    .channel('project-123-tasks')
    .on(
        'postgres_changes',
        {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: 'project_id=eq.project-uuid-here'
        },
        (payload) => {
            console.log('Task changed!', payload);
        }
    )
    .subscribe();
```

#### RLS Applies to Realtime

Realtime respects RLS policies - users only see changes they have access to.

#### Best Practices

- ✅ Enable realtime only on tables that need it
- ✅ Use filters to reduce bandwidth
- ✅ Unsubscribe when component unmounts
- ❌ Don't enable realtime on large tables
- ❌ Don't enable on tables with sensitive data

---

### 4. Storage Integration

#### Storage Buckets

Supabase Storage for files (images, documents, etc.)

```sql
-- Reference files in database
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    document_name VARCHAR(200) NOT NULL,
    storage_path TEXT NOT NULL,  -- Path in Supabase Storage
    file_size BIGINT,
    mime_type VARCHAR(100),
    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);
```

#### Client-Side Upload

```javascript
// Upload file
const { data, error } = await supabase.storage
    .from('project-documents')
    .upload('project-123/document.pdf', file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
    .from('project-documents')
    .getPublicUrl('project-123/document.pdf');

// Store path in database
await supabase.from('documents').insert({
    project_id: 'project-uuid',
    document_name: 'document.pdf',
    storage_path: 'project-123/document.pdf',
    file_size: file.size,
    mime_type: file.type
});
```

---

### 5. API Auto-Generation

Supabase automatically generates REST and GraphQL APIs from your schema.

#### REST API

```javascript
// SELECT
const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status_id', 'active-status-uuid');

// INSERT
const { data, error } = await supabase
    .from('projects')
    .insert([
        { project_name: 'New Project', owner_user_id: 'user-uuid' }
    ]);

// UPDATE
const { data, error } = await supabase
    .from('projects')
    .update({ percentage_complete: 75 })
    .eq('id', 'project-uuid');

// DELETE (soft delete recommended)
const { data, error } = await supabase
    .from('projects')
    .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
    })
    .eq('id', 'project-uuid');
```

#### Filtering

```javascript
// WHERE is_deleted = FALSE AND status = 'active'
const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('is_deleted', false)
    .eq('status', 'active');

// WHERE created_at > '2025-01-01'
const { data } = await supabase
    .from('projects')
    .select('*')
    .gt('created_at', '2025-01-01');

// LIKE query
const { data } = await supabase
    .from('projects')
    .select('*')
    .ilike('project_name', '%alpha%');

// IN query
const { data } = await supabase
    .from('projects')
    .select('*')
    .in('status_id', ['uuid1', 'uuid2']);
```

#### Joins

```javascript
// JOIN with related tables
const { data } = await supabase
    .from('projects')
    .select(`
        *,
        project_statuses (
            status_name,
            status_color
        ),
        users!owner_user_id (
            full_name,
            email
        )
    `);
```

---

### 6. Edge Functions

Supabase Edge Functions for server-side logic (Deno runtime).

#### Use Cases

- Complex business logic
- Third-party API calls
- Scheduled tasks
- Custom endpoints

#### Example Function

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    const { userId, message } = await req.json()

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase
        .from('notifications')
        .insert([
            {
                user_id: userId,
                message: message,
                is_read: false
            }
        ])

    return new Response(
        JSON.stringify({ success: !error }),
        { headers: { "Content-Type": "application/json" } }
    )
})
```

---

## ✅ Best Practices Summary

### PostgreSQL

1. ✅ Enable uuid-ossp extension
2. ✅ Use JSONB for flexible data
3. ✅ Index JSONB with GIN
4. ✅ Use arrays for simple lists
5. ✅ Use full-text search with GIN indexes
6. ✅ Partition very large tables (> 1M rows)
7. ✅ Choose appropriate index type
8. ✅ Use generated columns for computed values

### Supabase

1. ✅ Enable RLS on ALL tables
2. ✅ Use EXISTS in RLS policies
3. ✅ Link users table to auth.users
4. ✅ Use realtime for live updates
5. ✅ Store file metadata in database
6. ✅ Use Edge Functions for server logic
7. ✅ Never expose service_role key
8. ✅ Test RLS policies thoroughly

---

## 📚 Related Documentation

- **Database Architecture:** `Database_Architecture.md`
- **Design Principles:** `Database_Design_Principles.md`
- **Naming Conventions:** `Database_Naming_Conventions.md`
- **Audit Fields:** `Database_Audit_Fields.md`
- **Supabase Setup:** `Supabase_Setup_Guide.md`

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-15 | Initial PostgreSQL and Supabase considerations |

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team

---

**PostgreSQL + Supabase = Powerful Platform!** 🚀
