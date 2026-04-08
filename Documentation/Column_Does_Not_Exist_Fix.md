# Column Does Not Exist Fix

## Date
2025-12-20

## Problem Statement

Console error when loading project creation form:
```
❌ Error fetching project types: {
  code: '42703',
  details: null,
  hint: null,
  message: 'column project_types.is_default does not exist'
}
```

Also affected:
- `project_types.type_description`
- `project_types.is_default`
- `project_statuses.status_description`
- `project_statuses.status_color`
- `methodologies.methodology_description`
- `methodologies.is_default`

## Root Cause

The SELECT queries were trying to fetch columns that don't exist in the actual database schema.

The code assumed a richer table structure based on the seed data SQL I created, but the actual deployed tables only have minimal columns.

## Solution

Simplified queries to only select columns that definitely exist:

### Before (Broken)
```javascript
supabase
  .from('project_types')
  .select('id, type_name, type_description, is_default')  // ❌ Columns don't exist
```

### After (Fixed)
```javascript
supabase
  .from('project_types')
  .select('id, type_name')  // ✅ Only essential columns
```

## Changes Made

### src/pages/ProjectsCreate.jsx

**Line 72-73: Project Types Query**
```javascript
// Before
.select('id, type_name, type_description, is_default')

// After
.select('id, type_name')
```

**Line 77-78: Project Statuses Query**
```javascript
// Before
.select('id, status_name, status_description, status_color, is_initial_status')

// After
.select('id, status_name')
```

**Line 83-84: Methodologies Query**
```javascript
// Before
.select('id, methodology_name, methodology_description, is_default')

// After
.select('id, methodology_name')
```

**Line 130: Default Value Logic**
```javascript
// Before
project_type_id: types.find(t => t.is_default)?.id || types[0]?.id || ''

// After
project_type_id: types[0]?.id || ''
```

**Line 334: Methodology Options Rendering**
```javascript
// Before
{methodology.methodology_name}
{methodology.is_default ? ' (Default)' : ''}

// After
{methodology.methodology_name}
```

## PostgreSQL Error Code

**42703**: `undefined_column`
- Column referenced in query does not exist in the table
- Can occur in SELECT, WHERE, ORDER BY clauses

## Minimal Columns Required

For dropdown population, only 2 columns are needed:
1. **id** - Primary key for form value
2. **{table}_name** - Display name for dropdown option

Optional columns (only if they exist):
- `{table}_description` - For tooltips or help text
- `is_default` - To pre-select default option
- `status_color` - For colored badges
- `is_initial_status` - To filter initial statuses

## Testing

After the fix, refresh the page and verify:

### Console Logs
```
✅ Project types loaded: X items
✅ Project statuses loaded: X items
✅ Methodologies loaded: X items
```

### Dropdowns Work
- ✅ All 3 dropdowns populate with data
- ✅ Options show correct names
- ✅ No console errors
- ✅ Form submits successfully

## Database Schema Check

To verify what columns actually exist, run:

```sql
-- Check project_types columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_types'
ORDER BY ordinal_position;

-- Check project_statuses columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_statuses'
ORDER BY ordinal_position;

-- Check methodologies columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'methodologies'
ORDER BY ordinal_position;
```

## Lesson Learned

**Always verify actual schema before coding against it:**

1. Check `information_schema.columns` for actual column names
2. Don't assume columns exist based on seed data scripts
3. Use minimal SELECT (id + name) for dropdowns
4. Add optional columns progressively after verification

## Prevention

When creating new queries:

```javascript
// Step 1: Query minimal columns first
.select('id, name')

// Step 2: Test that it works

// Step 3: Add optional columns one at a time
.select('id, name, description')

// Step 4: Test again

// Step 5: Add more optional columns
.select('id, name, description, is_default')
```

This incremental approach catches missing columns early.

## Future Enhancement

If you want richer dropdown options later:

1. Run the seed data script (`v144_seed_lookup_tables.sql`) which includes:
   - `type_description`
   - `is_default`
   - `status_color`
   - etc.

2. Then update the queries to include those columns

3. Enhance the UI to use the extra data:
   - Show descriptions on hover
   - Highlight default options
   - Color-code statuses

But for now, minimal columns work perfectly for basic dropdowns.
