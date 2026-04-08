# PM to Platform Terminology Changes

**Date:** 2025-12-09
**Purpose:** Document all changes from /pm to /platform terminology
**Status:** Planning

---

## Overview

Per user request, all routes and references using `/pm` have been updated to `/platform` for consistency and clarity. This document tracks all changes needed across the codebase.

### Key Changes

| Old | New | Reason |
|-----|-----|--------|
| `/pm/` | `/platform/` | Route clarity |
| `PMAccountSetup` | `PlatformAccountSetup` | Component naming consistency |
| `pm-account-setup` | `platform-account-setup` | URL consistency |
| `/api/pm/` | `/api/platform/` | API endpoint consistency |

**Note:** Database table names like `pm_subscriptions` remain unchanged (database convention).

---

## Files to Update

### 1. Component Files

#### Rename File: PMAccountSetup.jsx → PlatformAccountSetup.jsx

**Current:** `src/pages/onboarding/PMAccountSetup.jsx`
**New:** `src/pages/onboarding/PlatformAccountSetup.jsx`

**Changes in file:**
```javascript
// Line 13: Update component name
export default function PMAccountSetup() {
// TO
export default function PlatformAccountSetup() {

// Line 2: Update comment
 * PM Account Setup Onboarding
// TO
 * Platform Account Setup Onboarding
```

### 2. Route Configuration

#### File: src/App.jsx

**Update route:**
```javascript
// OLD
<Route path="/onboarding/pm-account-setup" element={<PMAccountSetup />} />

// NEW
<Route path="/onboarding/platform-account-setup" element={<PlatformAccountSetup />} />
```

**Update import:**
```javascript
// OLD
import PMAccountSetup from './pages/onboarding/PMAccountSetup'

// NEW
import PlatformAccountSetup from './pages/onboarding/PlatformAccountSetup'
```

### 3. Registration Pages

#### File: src/pages/auth/Register.jsx

**Update navigation redirect:**
```javascript
// Lines ~496-498
if (selectedPlatforms.platform && !selectedPlatforms.simulator) {
  navigate('/onboarding/platform-account-setup')  // Already updated in plan
}
```

#### File: src/pages/auth/PlatformRegister.jsx

**Update navigation redirect:**
```javascript
// After registration
navigate('/onboarding/platform-account-setup')
```

### 4. Onboarding Platform Choice

#### File: src/pages/onboarding/PlatformChoice.jsx (NEW file)

**Ensure correct route:**
```javascript
<div onClick={() => navigate('/onboarding/platform-account-setup')}>
  <Briefcase />
  <h2>Platform</h2>
  <p>Set up your account and create your first project</p>
  <Button>Set up Platform</Button>
</div>
```

### 5. Login Flow

#### File: src/pages/auth/Login.jsx

Check if it references the old route (likely doesn't, but verify):
```javascript
// Should redirect to /app/dashboard, not onboarding
// But verify no references to pm-account-setup
```

### 6. Documentation Files

#### Already Updated ✅
- `projectplan/Registration_Revamp_Plan_Project_Based_Roles.md` ✅ (User updated)
- `projectplan/Unified_Login_System_Plan.md` ✅ (Already uses /platform in API endpoints)

#### Need Verification
- Check all other plan files for references

---

## API Endpoint Changes (If Backend Exists)

### Current State in Unified Plan ✅

The Unified_Login_System_Plan.md already specifies `/api/platform/`:
```
POST /api/platform/accounts
GET /api/platform/accounts/:id
PATCH /api/platform/accounts/:id
GET /api/platform/accounts/:id/projects
GET /api/platform/projects/:id/members
POST /api/platform/projects/:id/members/invite
GET /api/platform/projects/:id/roles
GET /api/platform/projects/:id/seats
```

**Action:** If backend services exist, ensure they use `/api/platform/` not `/api/pm/`

---

## Database Tables (NO CHANGE)

These remain as `pm_*` for database consistency:
- ✅ `pm_subscriptions` (stays as is)
- ✅ `pm_user_access` (if exists - stays as is)

**Reason:** Database table naming conventions typically don't change after creation. The "pm" prefix in database tables is acceptable and doesn't need to match frontend route naming.

---

## Environment Variables

Check if any env vars reference "PM":

**Current (from Unified Plan):**
```env
PM_BASE_SEAT_LIMIT=30
PM_EXTRA_SEAT_PRICE=0.80
PM_EXTRA_SEAT_DISCOUNT_RATE=0.70
PM_PLATFORM_URL=/app
```

**Recommendation:**
- Keep `PM_*` prefixes in env vars (internal config)
- Focus on frontend-facing routes only

**Alternative (if desired):**
```env
PLATFORM_BASE_SEAT_LIMIT=30
PLATFORM_EXTRA_SEAT_PRICE=0.80
PLATFORM_EXTRA_SEAT_DISCOUNT_RATE=0.70
PLATFORM_URL=/app
```

---

## Search and Replace Checklist

### Safe to Replace

✅ **Routes:**
- `/onboarding/pm-account-setup` → `/onboarding/platform-account-setup`
- `/api/pm/` → `/api/platform/` (if backend exists)

✅ **Component Names:**
- `PMAccountSetup` → `PlatformAccountSetup`
- File: `PMAccountSetup.jsx` → `PlatformAccountSetup.jsx`

✅ **Comments/Docs:**
- "PM Account Setup" → "Platform Account Setup"
- "PM platform" → "Platform"

### DO NOT Replace

❌ **Database Tables:**
- `pm_subscriptions` (keep as is)
- Any table names with `pm_` prefix

❌ **Historical References:**
- SQL migration file names (`v82_pm_subscriptions.sql`)
- Git commit messages
- Changelog entries

❌ **Internal Variable Names (unless desired):**
- `PM_BASE_SEAT_LIMIT` (env var - optional to change)

---

## Implementation Steps

### Step 1: Rename Component File
```bash
cd "E:\Project Nidus\src\pages\onboarding"
git mv PMAccountSetup.jsx PlatformAccountSetup.jsx
```

### Step 2: Update Component Content

**File:** `src/pages/onboarding/PlatformAccountSetup.jsx`

```javascript
// Line 2
- * PM Account Setup Onboarding
+ * Platform Account Setup Onboarding

// Line 13
-export default function PMAccountSetup() {
+export default function PlatformAccountSetup() {
```

### Step 3: Update App.jsx Routes

**File:** `src/App.jsx`

```javascript
// Import
-import PMAccountSetup from './pages/onboarding/PMAccountSetup'
+import PlatformAccountSetup from './pages/onboarding/PlatformAccountSetup'

// Route
-<Route path="/onboarding/pm-account-setup" element={<PMAccountSetup />} />
+<Route path="/onboarding/platform-account-setup" element={<PlatformAccountSetup />} />
```

### Step 4: Verify Navigation References

**Files to check:**
- `src/pages/auth/Register.jsx` ✅ (Already updated in plan)
- `src/pages/auth/PlatformRegister.jsx` (Update if needed)
- `src/pages/onboarding/PlatformChoice.jsx` (NEW - ensure correct route)

### Step 5: Search for Remaining References

```bash
# Search for old route references
grep -r "pm-account-setup" src/
grep -r "PMAccountSetup" src/

# Search for API endpoint references (if backend exists)
grep -r "/api/pm/" src/
```

### Step 6: Update Documentation

**Files:**
- ✅ `projectplan/Registration_Revamp_Plan_Project_Based_Roles.md` (User updated)
- Verify all other plan files

### Step 7: Test

- [ ] Registration flow redirects to correct route
- [ ] PlatformAccountSetup component loads correctly
- [ ] No 404 errors on onboarding routes
- [ ] Platform choice modal uses correct routes
- [ ] API calls use `/api/platform/` (if applicable)

---

## Verification Queries

### Find Old References

```bash
# In project root
grep -r "pm-account-setup" .
grep -r "PMAccountSetup" . --include="*.jsx" --include="*.js"
grep -r "/api/pm/" . --include="*.jsx" --include="*.js"
grep -r "onboarding/pm" . --include="*.md"
```

### Expected Results
- Should find NO references to old naming in active code
- May find references in:
  - This document (expected)
  - Backup/archive files (acceptable)
  - Database migrations (don't change)

---

## Summary of Changes

### Immediate Changes Required

| File | Change Type | Status |
|------|-------------|--------|
| `PMAccountSetup.jsx` | Rename to `PlatformAccountSetup.jsx` | ⬜ Pending |
| `PlatformAccountSetup.jsx` (content) | Update component name & comments | ⬜ Pending |
| `src/App.jsx` | Update import & route | ⬜ Pending |
| `src/pages/auth/Register.jsx` | Verify route reference | ✅ Already correct in plan |
| `src/pages/auth/PlatformRegister.jsx` | Update route reference | ⬜ Pending |
| `src/pages/onboarding/PlatformChoice.jsx` | Ensure correct route (new file) | ⬜ Pending |

### Already Correct ✅

- `projectplan/Registration_Revamp_Plan_Project_Based_Roles.md` ✅
- `projectplan/Unified_Login_System_Plan.md` (API endpoints) ✅

### No Change Needed ✅

- Database table: `pm_subscriptions` ✅
- SQL migration files ✅
- Environment variables (optional) ✅

---

## Post-Implementation Verification

After making changes:

1. **Build Test:**
   ```bash
   npm run build
   # Verify no import errors
   ```

2. **Route Test:**
   - Navigate to `/onboarding/platform-account-setup`
   - Verify component loads
   - No 404 errors

3. **Flow Test:**
   - Complete registration
   - Verify redirect to correct onboarding route
   - Complete onboarding wizard
   - Land on dashboard

4. **Search Test:**
   ```bash
   # Should return NO results
   grep -r "pm-account-setup" src/
   grep -r "PMAccountSetup" src/ --include="*.jsx"
   ```

---

## Notes

- **Database Naming:** The `pm_subscriptions` table name is intentionally kept as is. Database naming conventions don't need to match frontend route naming.

- **API Endpoints:** If a backend exists, ensure API routes use `/api/platform/` instead of `/api/pm/`. The Unified plan already specifies this correctly.

- **Backward Compatibility:** If users have bookmarks to `/onboarding/pm-account-setup`, consider adding a redirect:
  ```javascript
  <Route path="/onboarding/pm-account-setup" element={<Navigate to="/onboarding/platform-account-setup" replace />} />
  ```

- **Git History:** Using `git mv` preserves file history, making it easier to track changes over time.

---

**Status:** Ready for implementation
**Estimated Time:** 1 hour
**Risk:** Low (simple renaming)
**Impact:** Improved consistency and clarity
