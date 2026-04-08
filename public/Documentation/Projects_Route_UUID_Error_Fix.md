# Projects Route UUID Error Fix

## Date
2025-12-20

## Problem Statement

Console error when navigating to `/platform/projects/new`:
```
Error fetching project: {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type uuid: "new"'
}
```

## Root Cause

The application had a routing conflict:

1. **Missing Route**: No route defined for `/platform/projects/new`
2. **Route Fallthrough**: URL `/platform/projects/new` fell through to `/platform/projects/:id` route
3. **Invalid UUID**: Parameter `id` received value `"new"` instead of a valid UUID
4. **Database Error**: ProjectsDetail component tried to fetch a project with UUID `"new"`, causing PostgreSQL error `22P02` (invalid UUID syntax)

### Route Order Problem

```javascript
// Original routes (WRONG order)
<Route path="projects/create" />  // Only matched exact "create"
<Route path="projects/:id" />     // Matched "new" as :id parameter ❌
```

When user navigated to `/platform/projects/new`:
1. Router skipped `projects/create` (didn't match)
2. Router matched `projects/:id` with `id = "new"`
3. ProjectsDetail component loaded
4. Component tried: `SELECT * FROM projects WHERE id = 'new'`
5. PostgreSQL threw error: invalid UUID syntax

## Solution Implemented

### 1. Added Route Alias

Added explicit route for `/projects/new` that renders ProjectsCreate component (same as `/projects/create`).

**File**: `src/App.jsx`

```javascript
// BEFORE
<Route path="projects/create" element={<ProjectsCreate />} />
<Route path="projects/:id" element={<ProjectsDetail />} />

// AFTER
<Route path="projects/create" element={<ProjectsCreate />} />
<Route path="projects/new" element={<ProjectsCreate />} />  // ✅ Added
<Route path="projects/:id" element={<ProjectsDetail />} />
```

**Benefits**:
- Both `/projects/create` and `/projects/new` now work
- Specific routes take precedence over dynamic routes
- No breaking changes to existing code

### 2. Added UUID Validation

Added UUID format validation in ProjectsDetail component to prevent database errors if invalid IDs somehow reach the component.

**File**: `src/pages/ProjectsDetail.jsx`

```javascript
// BEFORE
useEffect(() => {
  fetchProject()
}, [id])

// AFTER
useEffect(() => {
  // Validate UUID format before fetching
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (id && uuidRegex.test(id)) {
    fetchProject()
  } else {
    console.error('Invalid project ID format:', id)
    setLoading(false)
    navigate('/platform/projects', { replace: true })
  }
}, [id])
```

**Benefits**:
- Prevents database errors from invalid UUIDs
- Graceful error handling with redirect
- User feedback via console error (development)
- Automatic redirect to projects list

## Technical Details

### UUID Format
PostgreSQL expects UUIDs in format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (8-4-4-4-12 hexadecimal digits)

### Error Code 22P02
PostgreSQL error code for "invalid text representation" - occurs when trying to cast invalid string to UUID type.

### React Router Route Matching
React Router matches routes in order:
1. **Exact paths** first (e.g., `projects/create`, `projects/new`)
2. **Dynamic segments** second (e.g., `projects/:id`)
3. **Wildcards** last (e.g., `projects/*`)

**Critical**: Specific routes MUST be defined BEFORE dynamic routes to avoid conflicts.

## Files Modified

1. **src/App.jsx**
   - Added `<Route path="projects/new">` (line 440-446)
   - Positioned before `projects/:id` route for proper precedence

2. **src/pages/ProjectsDetail.jsx**
   - Added UUID validation in useEffect (line 19-28)
   - Added auto-redirect for invalid IDs

## Testing Performed

✅ Navigate to `/platform/projects/new` - Loads ProjectsCreate component
✅ Navigate to `/platform/projects/create` - Still works (no breaking changes)
✅ Navigate to `/platform/projects/{valid-uuid}` - Loads project detail
✅ Navigate to `/platform/projects/invalid` - Redirects to projects list
✅ No console errors for any route
✅ Database not queried with invalid UUIDs

## Before vs After

### Before (Broken)
```
User navigates to: /platform/projects/new
  ↓
Route matched: projects/:id (id = "new")
  ↓
ProjectsDetail component loads
  ↓
Tries to fetch: SELECT * FROM projects WHERE id = 'new'
  ↓
PostgreSQL Error: invalid input syntax for type uuid: "new"
  ↓
❌ Console error, page may show error state
```

### After (Fixed)
```
User navigates to: /platform/projects/new
  ↓
Route matched: projects/new (exact match)
  ↓
ProjectsCreate component loads
  ↓
✅ Form displays, no errors
```

## Prevention Strategies

### 1. Route Ordering Convention
Always define specific routes before dynamic routes:
```javascript
// GOOD ✅
<Route path="users/new" />
<Route path="users/:id" />

// BAD ❌
<Route path="users/:id" />
<Route path="users/new" />  // Never matched!
```

### 2. UUID Validation Pattern
Add validation for all detail/edit components that accept IDs:
```javascript
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
```

### 3. TypeScript (Future Enhancement)
Consider using TypeScript with branded types for UUIDs:
```typescript
type UUID = string & { readonly __brand: 'UUID' }
```

## Related Issues

- Similar pattern may exist in other modules (Tasks, Teams, etc.)
- Consider auditing all dynamic routes for similar conflicts

## Browser Compatibility

- UUID validation uses standard RegExp (supported in all browsers)
- React Router v6 route matching (already in use)
- No new dependencies added

## Performance Impact

- **Minimal**: Regex validation adds <1ms overhead
- **Positive**: Prevents unnecessary database queries for invalid IDs
- **No bundle size increase**: Pure logic, no new imports

## Deployment Notes

- No database changes required
- No breaking changes
- Can be deployed independently
- No environment variable changes
- Backward compatible (both `/new` and `/create` work)
