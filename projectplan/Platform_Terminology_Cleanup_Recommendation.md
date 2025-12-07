# Platform Terminology Cleanup Recommendation

## Summary
After initial terminology standardization, **50 files** still contain references to "PM Platform" or "PM Simulator" with approximately **55+ instances**.

## Analysis by Category

### 🔴 Category 1: CRITICAL - Active Source Code (Must Update)
**20 files, 33 instances in src/** - These are actively used in the application.

#### High Priority UI Components (7 files):
- `src/pages/SubscriptionDashboard.jsx` - 5 instances
- `src/pages/PlatformPricing.jsx` - Already renamed file, check content
- `src/pages/NidusHomepage.jsx` - Main homepage
- `src/pages/auth/Register.jsx` - Registration flow
- `src/components/PlatformSwitcher.jsx` - 2 instances
- `src/components/PlatformSelectionModal.jsx` - 2 instances
- `src/pages/onboarding/SimulatorWelcome.jsx`

#### Medium Priority Service Files (13 files):
- `src/services/accountService.js` - 2 instances
- `src/services/seatManagementService.js` - 2 instances
- `src/services/projectRoleService.js` - 2 instances
- `src/services/projectMembershipService.js` - 2 instances
- `src/services/paynowService.js` - 2 instances
- `src/services/documentationService.js` - 2 instances
- `src/services/checkoutService.js` - 1 instance
- `src/services/invitationService.js` - 1 instance
- `src/services/stripeService.js` - 1 instance
- `src/utils/permissionChecker.js` - 1 instance
- `src/pages/app/AccountSettings.jsx`
- `src/pages/onboarding/PMAccountSetup.jsx`
- `src/config/pmMenuConfig.js` - 2 instances

#### Lower Priority (Homepage Components):
- `src/components/homepage/PricingSection.jsx` - 1 instance
- `src/components/homepage/CTASection.jsx` - 1 instance
- `src/pages/BundlePricing.jsx`

#### Simulator Files (4 files):
- `src/components/sim/SimulatorLayout.jsx` - 1 instance
- `src/pages/simulator/Tutorial.jsx` - 1 instance
- `src/pages/simulator/SimulatorDashboard.jsx` - 1 instance
- `src/pages/simulator/BetaProgram.jsx` - 1 instance

### 🟡 Category 2: IMPORTANT - Documentation Files (Should Update)
**~16 documentation files** - User-facing documentation needs consistency.

#### Files to Rename:
- `Documentation/PM_Platform_Getting_Started.md` → `Platform_Getting_Started.md`
- `Documentation/PM_Platform_User_Management.md` → `Platform_User_Management.md`
- Mirror files in `public/Documentation/` (same renames)

#### Files to Update Content:
- `Documentation/Platform_Switching_Guide.md`
- `Documentation/Unified_Login_System.md`
- `Documentation/Implementation_Complete_Summary.md`
- `Documentation/Routes_Configuration.md`
- `Documentation/Stripe_Webhook_Implementation.md`
- `Documentation/Dual_Subscription_Setup_Guide.md`
- All mirrored versions in `public/Documentation/`

### 🟢 Category 3: OPTIONAL - Planning Files (Historical Records)
**5 planning files** - These document the development process.

**Recommendation:** Leave as-is (historical record) OR update for consistency.

- `projectplan/Platform_Terminology_Standardization_Plan.md` (current plan)
- `projectplan/Unified_Login_System_Plan.md`
- `projectplan/Login_User_Role_Assignment_Plan.md`
- `projectplan/NidusHomepage_Performance_Optimization_Plan.md`
- `projectplan/Dual_Subscription_Registration_Plan.md`

### ⚪ Category 4: IGNORE - SQL Migration Files (Leave As-Is)
**5 SQL files** - Historical migrations that document what was changed.

**Recommendation:** DO NOT MODIFY - these are historical records.

- `SQL/v90_rename_pm_to_platform.sql` - Current migration (documents the rename)
- `SQL/v82_pm_subscriptions.sql` - Original table creation
- `SQL/v86_default_project_roles_seed.sql`
- `SQL/v85_project_invitations_seats.sql`
- `SQL/v84_accounts_and_extensions.sql`

### 🔵 Category 5: HTML Preview/Test Files
**2 HTML files** - Development/preview files.

**Recommendation:** Update or delete if not needed.

- `header-navigation-options.html`
- `documentation-preview.html`

## Recommended Action Plan

### Phase 1: Critical Source Code Updates (Required)
**Priority: HIGH | Estimated Time: 2-3 hours**

1. **Update UI Components** (30 min)
   - SubscriptionDashboard.jsx (5 instances)
   - PlatformSwitcher.jsx (2 instances)
   - PlatformSelectionModal.jsx (2 instances)
   - NidusHomepage.jsx
   - Register.jsx
   - SimulatorWelcome.jsx

2. **Update Service Files** (1 hour)
   - All 13 service files listed above
   - Focus on user-facing error messages and logs

3. **Update Configuration** (15 min)
   - pmMenuConfig.js → Consider renaming to platformMenuConfig.js

4. **Update Simulator Components** (15 min)
   - All 4 simulator files

5. **Update Homepage Components** (15 min)
   - PricingSection.jsx, CTASection.jsx, BundlePricing.jsx

6. **Test Changes** (30 min)
   - Verify all updated components render correctly
   - Check console for errors

### Phase 2: Documentation Updates (Recommended)
**Priority: MEDIUM | Estimated Time: 1 hour**

1. **Rename Documentation Files** (10 min)
   ```bash
   mv PM_Platform_Getting_Started.md Platform_Getting_Started.md
   mv PM_Platform_User_Management.md Platform_User_Management.md
   # Same for public/Documentation/
   ```

2. **Update Documentation Content** (50 min)
   - Search and replace "PM Platform" → "Platform"
   - Search and replace "PM Simulator" → "Simulator"
   - Verify all internal links still work

### Phase 3: Optional Cleanup (Nice to Have)
**Priority: LOW | Estimated Time: 30 min**

1. **Update Planning Files** (Optional)
   - For consistency with current terminology
   - OR leave as historical record

2. **Handle HTML Files** (Optional)
   - Delete if not needed
   - OR update if used for previews

## Automation Approach

You can use batch find/replace for efficiency:

```bash
# For source files (careful - manual review recommended)
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec sed -i 's/PM Platform/Platform/g' {} +
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec sed -i 's/PM Simulator/Simulator/g' {} +

# For documentation
find Documentation -type f -name "*.md" -exec sed -i 's/PM Platform/Platform/g' {} +
find Documentation -type f -name "*.md" -exec sed -i 's/PM Simulator/Simulator/g' {} +
```

**⚠️ WARNING:** Always review changes before committing. Some instances may be:
- In comments documenting the old terminology
- In migration notes explaining the change
- In historical context that should remain

## Expected Outcomes

### After Phase 1 (Critical):
- ✅ All user-facing text uses "Platform" and "Simulator"
- ✅ No "PM Platform" or "PM Simulator" in active UI
- ✅ Consistent terminology in error messages and logs
- ✅ Application functions correctly with new terminology

### After Phase 2 (Documentation):
- ✅ All documentation uses standardized terminology
- ✅ User guides are consistent with the application
- ✅ No confusion for new users

### After Phase 3 (Optional):
- ✅ Complete consistency across entire codebase
- ✅ Clean slate for future development

## Success Criteria

Run this verification after updates:
```bash
# Should return 0 results (except in SQL migration files and planning docs)
grep -r "PM Platform" src/
grep -r "PM Simulator" src/

# Documentation should be clean
grep -r "PM Platform" Documentation/
grep -r "PM Simulator" Documentation/
```

## Recommendation Summary

**✅ DO THIS NOW:**
- Phase 1: Update all source code files (20 files, ~33 instances)
- Commit changes with clear message

**✅ DO THIS SOON:**
- Phase 2: Update and rename documentation files
- Ensure user-facing docs are consistent

**🤔 DO THIS IF TIME PERMITS:**
- Phase 3: Update planning files for consistency
- Clean up HTML preview files

**❌ DO NOT DO:**
- Modify SQL migration files (historical record)
- Change comments that explain the terminology change

## Timeline

- **Immediate (Today):** Phase 1 - Critical source code
- **This Week:** Phase 2 - Documentation
- **This Month:** Phase 3 - Optional cleanup

## Notes

- The initial standardization covered the core infrastructure (database, main services, routing)
- These remaining files are mostly UI text, comments, and documentation
- No breaking changes expected - all updates are cosmetic/terminology only
- Backward compatibility maintained through `appDb` export
