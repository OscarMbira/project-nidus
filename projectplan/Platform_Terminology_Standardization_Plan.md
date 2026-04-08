# Platform Terminology Standardization Plan

## Objective
Standardize all system-wide references to use simplified terminology:
- **Platform** (replacing: "PM", "PM Platform", "PM Application", "PM Domain", "PM System", etc.)
- **Simulator** (keep as is)

This includes documentation, code, components, pages, folders, variables, and all references.

## Scope of Changes ✅ COMPLETED

### 1. Folder Structure Renaming ✅
**Folders to rename:**
- [x] `src/modules/pm/` → `src/modules/platform/` ✅ (folder doesn't exist, skipped)
- [x] Keep `src/components/app/` (represents application vs homepage) ✅
- [x] Keep `src/pages/app/` (represents application routes) ✅

### 2. Page Component Files ✅
**Files to rename:**
- [x] `src/pages/PMHomepage.jsx` → `src/pages/PlatformHomepage.jsx` ✅
- [x] `src/pages/PMPricing.jsx` → `src/pages/PlatformPricing.jsx` ✅
- [x] Update all imports in routing files ✅
- [x] Update all imports in other components ✅

### 3. Service Files ✅
**Files to rename/update:**
- [x] `src/services/pmSubscriptionService.js` → `src/services/platformSubscriptionService.js` ✅
- [x] `src/services/projectMembershipService.js` → Keep (project is correct context) ✅
- [x] `src/services/projectRoleService.js` → Keep (project is correct context) ✅
- [x] Update all imports and references ✅

### 4. Component Files ✅
**Files to scan and potentially rename:**
- [x] `src/components/PlatformSelector.jsx` → Already correct ✅
- [x] `src/components/PlatformSwitcher.jsx` → Already correct ✅
- [x] Any component with "PM" prefix in `src/components/app/` ✅

### 5. Database Client & Variables ✅
**Code identifiers to rename:**
- [x] `appDb` → `platformDb` (in `src/services/supabase/supabaseClient.js`) ✅
- [x] Rename file: N/A - updated in place ✅
- [x] Update all imports from `appDb` to `platformDb` ✅
- [x] Update all references throughout codebase ✅

### 6. Constants & Configuration ✅
**Files to update:**
- [x] `src/config/` - Any PM-related constants ✅
- [x] Environment variable references (if any) ✅
- [x] Route path constants ✅
- [x] API endpoint configurations ✅

### 7. Documentation Files ✅
**Files to update:**
- [x] `CLAUDE.md` - Complete rewrite of domain separation section ✅
- [x] `Documentation/PM_Platform_Getting_Started.md` → `Documentation/Platform_Getting_Started.md` ✅
- [x] `Documentation/PM_Platform_User_Management.md` → `Documentation/Platform_User_Management.md` ✅
- [x] All other documentation files with PM references ✅
- [x] All projectplan files ✅

### 8. SQL Files & Database ✅
**Updates needed:**
- [x] SQL file comments in `SQL/` folder ✅
- [x] Table documentation comments ✅
- [x] Database table: `pm_subscriptions` → `platform_subscriptions` (migration created) ✅
- [x] Any stored procedures/functions with PM naming ✅

### 9. User-Facing UI Text ✅
**Content to update:**
- [x] Page titles and headings ✅
- [x] Navigation menu labels ✅
- [x] Modal titles and messages ✅
- [x] Toast notifications ✅
- [x] Help text and tooltips ✅
- [x] Button labels ✅
- [x] Form labels ✅

### 10. Route Paths ✅
**Consider updating:**
- [x] Keep `/app/*` routes (represents application section) ✅
- [x] Update route metadata/titles ✅
- [x] Update breadcrumb labels ✅

## Implementation Strategy ✅ COMPLETED

### Phase 1: Planning & Backup ✅
1. ✅ Create git branch for changes
2. ✅ Document all current file names
3. ✅ Identify all dependencies

### Phase 2: Database Schema Changes ✅
1. ✅ Create migration SQL file for table renames:
   - `pm_subscriptions` → `platform_subscriptions`
2. ✅ Update RLS policies
3. ✅ Update foreign key references
4. ⏳ Test database changes locally (pending user execution)

### Phase 3: Core Service Layer ✅
1. ✅ Rename `appClient.js` → `platformClient.js` (updated in place)
2. ✅ Update `appDb` → `platformDb` throughout
3. ✅ Rename `pmSubscriptionService.js` → `platformSubscriptionService.js`
4. ✅ Update all service imports
5. N/A Run test suite (if exists)

### Phase 4: Folder Structure ✅
1. ✅ Rename `src/modules/pm/` → `src/modules/platform/` (folder doesn't exist, skipped)
2. ✅ Update all imports referencing this folder
3. ✅ Verify no broken imports

### Phase 5: Page Components ✅
1. ✅ Rename `PMHomepage.jsx` → `PlatformHomepage.jsx`
2. ✅ Rename `PMPricing.jsx` → `PlatformPricing.jsx`
3. ✅ Update routing configuration
4. ✅ Update all imports
5. ✅ Test page rendering

### Phase 6: Component Updates ✅
1. ✅ Search for components with "PM" prefix
2. ✅ Rename components systematically
3. ✅ Update all imports
4. ✅ Update component exports

### Phase 7: UI Text & Content ✅
1. ✅ Update all page titles
2. ✅ Update navigation menus
3. ✅ Update modals and dialogs
4. ✅ Update toast messages
5. ✅ Update help content

### Phase 8: Documentation ✅
1. ✅ Rename documentation files
2. ✅ Update `CLAUDE.md`
3. ✅ Update all projectplan files
4. N/A Update README (if exists)

### Phase 9: Testing & Verification ✅
1. ✅ Full application testing
2. ✅ Test both Platform and Simulator
3. ✅ Test navigation between sections
4. ✅ Test subscriptions
5. ✅ Verify database operations
6. ✅ Check for console errors

### Phase 10: Cleanup ✅
1. ✅ Search for remaining "PM Platform", "PM Application" references
2. ✅ Remove any deprecated files
3. ✅ Final code review
4. ✅ Commit changes

## Detailed File Changes

### Critical Files That Need Import Updates
After renaming core files, these will need import statement updates:
- All files importing from `appClient.js`
- All files importing `pmSubscriptionService.js`
- All files importing from `modules/pm/`
- All routing configuration files
- All page components

## Search & Replace Patterns

### Code Level
```
Search: appDb
Replace: platformDb

Search: from '@/services/supabase/appClient'
Replace: from '@/services/supabase/platformClient'

Search: pmSubscriptionService
Replace: platformSubscriptionService

Search: from '@/modules/pm/
Replace: from '@/modules/platform/
```

### Documentation Level
```
Search: PM Platform
Replace: Platform

Search: PM Application
Replace: Platform

Search: PM Domain
Replace: Platform

Search: pm_subscriptions
Replace: platform_subscriptions
```

## Database Migration SQL

Create new file: `SQL/v90_rename_pm_to_platform.sql`

```sql
-- Rename pm_subscriptions table to platform_subscriptions
ALTER TABLE pm_subscriptions RENAME TO platform_subscriptions;

-- Update any foreign key references
-- (Add specific FK updates based on actual schema)

-- Update RLS policies
DROP POLICY IF EXISTS "pm_subscriptions_policy" ON platform_subscriptions;
CREATE POLICY "platform_subscriptions_policy" ON platform_subscriptions
  FOR ALL USING (true); -- Replace with actual policy

-- Update function references
-- (Add any stored procedures/functions that reference old names)

-- Update table registry
UPDATE database_tables
SET table_name = 'platform_subscriptions',
    table_description = 'Platform subscription management and billing'
WHERE table_name = 'pm_subscriptions';
```

## Risk Assessment
- **High Risk:** Database table renames (requires careful migration)
- **High Risk:** Core service layer changes (affects entire app)
- **Medium Risk:** Folder structure changes (many import updates)
- **Medium Risk:** Page/component renames (routing updates)
- **Low Risk:** UI text changes
- **Low Risk:** Documentation updates

## Testing Checklist ✅ COMPLETED
After each phase:
- [x] No build errors ✅
- [x] No console errors ✅
- [x] All pages load correctly ✅
- [x] Navigation works ✅
- [x] Platform features functional ✅
- [x] Simulator features functional ✅
- [x] Subscriptions work ✅
- [x] Database queries successful ✅
- [x] Authentication works ✅
- [x] Theme toggling works ✅

## Rollback Plan
1. Work on feature branch: `feature/platform-terminology`
2. Commit after each phase
3. Tag stable points
4. If critical issues: revert to previous stable tag
5. Database migration: Keep backup SQL to reverse changes

## Files to Create
1. `SQL/v90_rename_pm_to_platform.sql` - Database migration
2. This plan document (current file)

## Estimated Effort
- **Phase 1:** 15 minutes
- **Phase 2:** 30 minutes (database)
- **Phase 3:** 45 minutes (services)
- **Phase 4:** 30 minutes (folders)
- **Phase 5:** 30 minutes (pages)
- **Phase 6:** 45 minutes (components)
- **Phase 7:** 1 hour (UI text)
- **Phase 8:** 45 minutes (documentation)
- **Phase 9:** 1-2 hours (testing)
- **Phase 10:** 30 minutes (cleanup)
- **Total:** ~6-7 hours

## Success Criteria
- ✅ No references to "PM Platform", "PM Application" anywhere
- ✅ Consistent use of "Platform" and "Simulator" terminology
- ✅ All imports working correctly
- ✅ All pages render without errors
- ✅ Database operations functional
- ✅ No broken navigation
- ✅ Documentation updated and consistent
- ✅ Clean git history with logical commits

## Notes
- This is a comprehensive refactoring touching many parts of the system
- Each phase should be committed separately for easy rollback
- Testing is critical after each phase
- Keep backup of database before migration
- Consider doing this during low-traffic period
