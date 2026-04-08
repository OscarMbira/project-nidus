# Programme Service Bug Fix

## Date
2025-12-20

## Problem Statement

Multiple console errors were appearing when accessing the Programme module:
1. **400 Bad Request** errors - Failed to load resources
2. **ReferenceError** - `supabase is not defined` in `programmeService.js`

## Root Cause

The `programmeService.js` file imported `platformDb` from the Supabase client but was using `supabase` (which was not imported or defined) throughout the code. This caused:
- ReferenceError when calling any programme-related functions
- Failed API calls resulting in 400 errors
- Programme page unable to load data

## Affected Functions

The following functions were using undefined `supabase` instead of `platformDb`:

1. `getProgrammes()` - Line 11
2. `saveProgramme()` - Line 71, 108
3. `deleteProgramme()` - Line 108
4. `getProgrammeProjects()` - Line 131
5. `addProjectToProgramme()` - Line 167
6. `removeProjectFromProgramme()` - Line 194
7. `saveProgrammeBenefit()` - Line 253
8. `deleteProgrammeBenefit()` - Line 289
9. `addProgrammeMember()` - Line 330
10. `removeProgrammeMember()` - Line 357
11. `saveProgrammeGovernance()` - Line 399
12. `saveProgrammeMilestone()` - Line 458
13. `deleteProgrammeMilestone()` - Line 494
14. `getProgrammeDependencies()` - Line 517
15. `saveProgrammeDependency()` - Line 546
16. `deleteProgrammeDependency()` - Line 582
17. `getProgrammeReports()` - Line 605

## Solution Implemented

Replaced all instances of `supabase` with `platformDb` throughout the file:

### Query Instances
```javascript
// BEFORE
let query = supabase.from('programmes')

// AFTER
let query = platformDb.from('programmes')
```

### Auth Instances
```javascript
// BEFORE
const { data: { user } } = await supabase.auth.getUser()

// AFTER
const { data: { user } } = await platformDb.auth.getUser()
```

## Changes Made

### File Modified
- **src/services/programmeService.js**

### Total Replacements
- **17 instances** of `supabase` replaced with `platformDb`
- All query builders fixed
- All auth calls fixed

## Testing Performed

✅ Verified no remaining `supabase` references (except import path)
✅ Import statement remains correct: `import { platformDb } from './supabase/supabaseClient'`
✅ All 17 affected functions now use correct client

## Expected Results After Fix

1. ✅ No more ReferenceError in console
2. ✅ Programme module loads successfully
3. ✅ API calls return data instead of 400 errors
4. ✅ All CRUD operations work for:
   - Programmes
   - Programme Projects
   - Programme Benefits
   - Programme Members
   - Programme Governance
   - Programme Milestones
   - Programme Dependencies
   - Programme Reports

## Related Files

The following files were **NOT** affected and work correctly:
- `Programme.jsx` - Already uses `platformDb` correctly
- `supabaseClient.js` - Exports both `platformDb` and `simDb`

## Prevention

To prevent similar issues in the future:

1. **Use consistent naming**: Always use `platformDb` for Platform operations, `simDb` for Simulator operations
2. **ESLint rule**: Consider adding a rule to prevent undefined variables
3. **Code review**: Check that service files use the correct client
4. **Testing**: Test all service functions before deployment

## Related Documentation

- See: `CLAUDE.md` - Simulator Module Architecture Rules
- See: Database client usage guidelines

## Deployment Notes

- No database changes required
- No breaking changes
- Can be deployed independently
- No environment variable changes

## Browser Compatibility

All modern browsers - no compatibility concerns as this is a JavaScript variable reference fix.
