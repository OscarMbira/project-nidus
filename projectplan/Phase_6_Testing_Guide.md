# Phase 6 Portfolio Management - Testing Guide

**Version:** 1.0  
**Date:** 2025-01-XX  
**Status:** Ready for Testing

---

## Overview

This guide provides a comprehensive testing checklist for the Portfolio Management module implemented in Phase 6. Follow these steps to verify all functionality before proceeding to Programme Management.

---

## Prerequisites

### Database Setup
1. ✅ Run `v36_portfolio_management.sql` to create portfolio tables
2. ✅ Run `v37_phase6_menu_items.sql` to add menu items
3. ✅ Verify tables are registered in `database_tables` table
4. ✅ Verify menu items appear in `menu_items` table

### Application Setup
1. ✅ Application is running (npm run dev or similar)
2. ✅ User is authenticated
3. ✅ User has appropriate role (Portfolio Manager, Project Director, or Executive)
4. ✅ Supabase connection is configured

---

## Testing Checklist

### 1. Database Schema Testing

#### Test 1.1: Verify Tables Created
**Steps:**
1. Connect to Supabase database
2. Run: `SELECT table_name FROM database_tables WHERE table_category = 'portfolio' AND is_deleted = false;`
3. Verify all 9 tables exist:
   - portfolios
   - portfolio_projects
   - portfolio_objectives
   - portfolio_members
   - portfolio_governance
   - portfolio_metrics
   - portfolio_risks
   - portfolio_budgets
   - portfolio_reports

**Expected Result:** All 9 tables should be listed

#### Test 1.2: Verify Table Structure
**Steps:**
1. Check `portfolios` table structure
2. Verify audit fields exist (created_at, created_by, updated_at, updated_by, is_deleted, deleted_at, deleted_by)
3. Verify foreign key constraints exist

**Expected Result:** All tables have proper structure with audit fields

#### Test 1.3: Verify Menu Items
**Steps:**
1. Run: `SELECT menu_code, menu_label, is_visible FROM menu_items WHERE menu_code LIKE 'portfolio%' ORDER BY sort_order;`
2. Verify Portfolio menu and submenu items exist

**Expected Result:** Portfolio menu items should be visible

---

### 2. Navigation & Menu Testing

#### Test 2.1: Menu Visibility
**Steps:**
1. Log in to the application
2. Check navigation menu
3. Look for "Portfolio" menu item

**Expected Result:** Portfolio menu should appear in navigation (if user has appropriate role)

#### Test 2.2: Menu Navigation
**Steps:**
1. Click on "Portfolio" menu item
2. Verify it navigates to `/portfolio` route

**Expected Result:** Should navigate to portfolio list page

---

### 3. Portfolio List Page Testing

#### Test 3.1: Page Load
**Steps:**
1. Navigate to `/portfolio`
2. Wait for page to load

**Expected Result:**
- Page loads without errors
- Shows "Portfolio Management" heading
- Shows stats cards (Total Portfolios, Active, Planning, Completed, Total Projects)
- Shows search and filter controls
- Shows "Create Portfolio" button

#### Test 3.2: Empty State
**Steps:**
1. If no portfolios exist, verify empty state
2. Check empty state message

**Expected Result:**
- Shows "No Portfolios yet" message
- Shows helpful text about creating first portfolio
- Shows FolderKanban icon

#### Test 3.3: Search Functionality
**Steps:**
1. Create at least 2-3 test portfolios with different names
2. Use search box to search for portfolio name
3. Verify results filter correctly

**Expected Result:**
- Search filters portfolios in real-time
- Results update as you type
- Search works for portfolio name, code, and description

#### Test 3.4: Filter Functionality
**Steps:**
1. Create portfolios with different statuses (planning, active, on-hold, completed)
2. Use status filter dropdown
3. Verify filtering works

**Expected Result:**
- Filter dropdown shows correct options
- Filtering works correctly
- Shows count of filtered results

#### Test 3.5: Portfolio Cards Display
**Steps:**
1. View portfolio list with multiple portfolios
2. Check portfolio card layout

**Expected Result:**
- Cards display in grid layout (responsive)
- Each card shows:
  - Portfolio name
  - Portfolio code (if exists)
  - Status badge
  - Type badge
  - Health score progress bar
  - Project count
  - Budget (if set)
  - Owner (if set)
  - Risk alerts (if high risks exist)
- Cards are clickable

#### Test 3.6: Portfolio Card Actions
**Steps:**
1. Hover over portfolio card
2. Click on action buttons (View, Edit, Delete)

**Expected Result:**
- View button navigates to portfolio detail
- Edit button navigates to portfolio edit page
- Delete button shows confirmation dialog
- Delete works correctly (soft delete)

---

### 4. Create Portfolio Testing

#### Test 4.1: Open Create Form
**Steps:**
1. Click "Create Portfolio" button
2. Verify form modal opens

**Expected Result:**
- Modal opens with PortfolioForm component
- Form has all required fields
- Form is properly styled

#### Test 4.2: Form Validation
**Steps:**
1. Try to submit form without required fields
2. Fill in required fields and submit

**Expected Result:**
- Required field validation works
- Form prevents submission with missing required fields
- Error messages display appropriately

#### Test 4.3: Create Portfolio - Basic Info
**Steps:**
1. Fill in:
   - Portfolio Name: "Test Portfolio 1"
   - Portfolio Code: "TP-001"
   - Status: "Planning"
   - Type: "Strategic"
   - Description: "Test portfolio description"
2. Click "Create Portfolio"

**Expected Result:**
- Portfolio is created successfully
- Success message or redirect occurs
- Portfolio appears in list

#### Test 4.4: Create Portfolio - Full Details
**Steps:**
1. Fill in all form fields:
   - Basic information (name, code, description, vision)
   - Ownership (owner, manager)
   - Dates (start, end)
   - Budget (amount, currency)
   - Governance (model, review frequency)
   - Tags (add multiple tags)
2. Submit form

**Expected Result:**
- All fields save correctly
- Portfolio created with all details
- Tags are saved as array

#### Test 4.5: Parent Portfolio Selection
**Steps:**
1. Create a parent portfolio first
2. Create a child portfolio
3. Select parent portfolio in form

**Expected Result:**
- Parent portfolio dropdown shows available portfolios
- Parent portfolio selection works
- Hierarchy is maintained

---

### 5. Portfolio Detail Page Testing

#### Test 5.1: Page Load
**Steps:**
1. Click on a portfolio from the list
2. Navigate to `/portfolio/:id`

**Expected Result:**
- Page loads without errors
- Shows portfolio header with name and code
- Shows description
- Shows Edit button
- Shows tabs (Dashboard, Projects, Resources, Financial, Risks, Objectives, Reports)

#### Test 5.2: Dashboard Tab
**Steps:**
1. Open portfolio detail page
2. Verify Dashboard tab is active by default
3. Check dashboard content

**Expected Result:**
- Dashboard tab shows PortfolioDashboard component
- Displays:
  - Main stats cards (Total Projects, Health Score, Budget Utilization, Resource Utilization)
  - Secondary stats (Completed Projects, On Hold Projects, Total Risks)
  - Projects Overview section
  - Risk alerts (if applicable)
- All metrics display correctly
- Refresh button works

#### Test 5.3: Other Tabs
**Steps:**
1. Click on each tab (Projects, Resources, Financial, Risks, Objectives, Reports)
2. Verify tab switching works

**Expected Result:**
- Tabs switch correctly
- Each tab shows placeholder content (coming soon messages)
- Tab highlighting works correctly

#### Test 5.4: Edit Button
**Steps:**
1. Click "Edit" button on portfolio detail page
2. Verify navigation

**Expected Result:**
- Navigates to `/portfolio/:id/edit`
- Edit page loads correctly

---

### 6. Portfolio Edit Page Testing

#### Test 6.1: Page Load
**Steps:**
1. Navigate to `/portfolio/:id/edit`
2. Verify page loads

**Expected Result:**
- Page loads with portfolio data pre-filled
- Form shows all existing values
- Back button works

#### Test 6.2: Edit Portfolio
**Steps:**
1. Modify portfolio name
2. Change status
3. Update budget
4. Save changes

**Expected Result:**
- Changes save successfully
- Redirects to portfolio detail page
- Updated values display correctly

#### Test 6.3: Cancel Edit
**Steps:**
1. Make changes to portfolio
2. Click Cancel button

**Expected Result:**
- Returns to portfolio detail page
- Changes are not saved

---

### 7. Service Layer Testing

#### Test 7.1: Get Portfolios
**Steps:**
1. Open browser console
2. Test: `import { getPortfolios } from './services/portfolioService'; await getPortfolios();`

**Expected Result:**
- Returns array of portfolios
- Includes related data (owner, manager, parent)

#### Test 7.2: Get Single Portfolio
**Steps:**
1. Get a portfolio ID from database
2. Test: `await getPortfolio(portfolioId);`

**Expected Result:**
- Returns single portfolio object
- Includes all related data

#### Test 7.3: Create Portfolio via Service
**Steps:**
1. Test: `await savePortfolio({ portfolio_name: 'Test', portfolio_status: 'planning' });`

**Expected Result:**
- Portfolio is created
- Returns created portfolio object

#### Test 7.4: Update Portfolio via Service
**Steps:**
1. Test: `await savePortfolio({ portfolio_name: 'Updated Name' }, portfolioId);`

**Expected Result:**
- Portfolio is updated
- Returns updated portfolio object

#### Test 7.5: Delete Portfolio via Service
**Steps:**
1. Test: `await deletePortfolio(portfolioId);`

**Expected Result:**
- Portfolio is soft-deleted (is_deleted = true)
- Returns deleted portfolio object

---

### 8. Component Testing

#### Test 8.1: PortfolioDashboard Component
**Steps:**
1. Navigate to portfolio detail page
2. Check dashboard component renders

**Expected Result:**
- Component loads without errors
- Stats cards display
- Charts/graphs render (if applicable)
- Loading states work
- Error states display correctly

#### Test 8.2: PortfolioList Component
**Steps:**
1. Navigate to portfolio list page
2. Check list component

**Expected Result:**
- Component renders correctly
- Search works
- Filters work
- Cards display properly
- Empty state works

#### Test 8.3: PortfolioForm Component
**Steps:**
1. Open create/edit form
2. Test form interactions

**Expected Result:**
- Form fields work correctly
- Validation works
- Tag input works
- Date pickers work
- Dropdowns populate correctly
- Submit works
- Cancel works

---

### 9. Error Handling Testing

#### Test 9.1: Network Errors
**Steps:**
1. Disconnect internet
2. Try to load portfolio list

**Expected Result:**
- Error message displays
- User-friendly error handling
- No application crash

#### Test 9.2: Invalid Portfolio ID
**Steps:**
1. Navigate to `/portfolio/invalid-id`
2. Check error handling

**Expected Result:**
- Error message displays
- Option to go back
- No application crash

#### Test 9.3: Permission Errors
**Steps:**
1. Test with user without portfolio access
2. Try to access portfolio pages

**Expected Result:**
- Appropriate error or redirect
- No sensitive data exposed

---

### 10. Performance Testing

#### Test 10.1: Page Load Performance
**Steps:**
1. Open browser DevTools
2. Navigate to portfolio list
3. Check load time

**Expected Result:**
- Page loads in < 2 seconds
- No significant delays

#### Test 10.2: Large Dataset
**Steps:**
1. Create 50+ portfolios
2. Load portfolio list
3. Check performance

**Expected Result:**
- List loads reasonably fast
- Pagination works (if implemented)
- No browser freezing

---

### 11. Responsive Design Testing

#### Test 11.1: Mobile View
**Steps:**
1. Open browser DevTools
2. Switch to mobile view (375px width)
3. Test portfolio pages

**Expected Result:**
- Layout adapts to mobile
- Cards stack vertically
- Forms are usable
- Navigation works

#### Test 11.2: Tablet View
**Steps:**
1. Test at 768px width

**Expected Result:**
- Layout adapts appropriately
- Good user experience

---

### 12. Integration Testing

#### Test 12.1: Menu Integration
**Steps:**
1. Verify Portfolio menu appears
2. Click menu items
3. Verify navigation works

**Expected Result:**
- Menu items work correctly
- Navigation is smooth

#### Test 12.2: Route Integration
**Steps:**
1. Test all routes:
   - `/portfolio`
   - `/portfolio/:id`
   - `/portfolio/:id/edit`

**Expected Result:**
- All routes work
- Protected routes require authentication
- 404 handling works

---

## Known Issues & Limitations

### Current Limitations
1. **Placeholder Tabs**: Projects, Resources, Financial, Risks, Objectives, and Reports tabs show "coming soon" placeholders
2. **Metrics Calculation**: Portfolio health score calculation is basic (can be enhanced)
3. **No Pagination**: Portfolio list doesn't have pagination yet (for large datasets)
4. **No Export**: No export functionality for portfolios yet

### Future Enhancements
- Programme Management module
- Cross-project resource management
- Inter-project dependencies
- Benefits realization tracking
- Strategic alignment tools

---

## Test Data Setup

### Create Test Portfolios

```sql
-- Test Portfolio 1: Strategic Portfolio
INSERT INTO portfolios (
    portfolio_code,
    portfolio_name,
    portfolio_description,
    portfolio_type,
    portfolio_status,
    portfolio_owner_user_id,
    total_budget,
    budget_currency
) VALUES (
    'STRAT-001',
    'Strategic Initiatives Portfolio',
    'Portfolio for strategic business initiatives',
    'strategic',
    'active',
    (SELECT id FROM users LIMIT 1),
    1000000.00,
    'USD'
);

-- Test Portfolio 2: Operational Portfolio
INSERT INTO portfolios (
    portfolio_code,
    portfolio_name,
    portfolio_description,
    portfolio_type,
    portfolio_status,
    total_budget
) VALUES (
    'OPS-001',
    'Operations Portfolio',
    'Day-to-day operations portfolio',
    'operational',
    'active',
    500000.00
);

-- Test Portfolio 3: Planning Portfolio
INSERT INTO portfolios (
    portfolio_code,
    portfolio_name,
    portfolio_type,
    portfolio_status
) VALUES (
    'PLAN-001',
    'Planning Portfolio',
    'innovation',
    'planning'
);
```

---

## Quick Test Script

### Manual Test Sequence

1. **Database Setup** (5 minutes)
   - Run SQL files
   - Verify tables created
   - Verify menu items added

2. **Basic Functionality** (10 minutes)
   - Create a portfolio
   - View portfolio list
   - View portfolio detail
   - Edit portfolio
   - Delete portfolio

3. **Advanced Features** (10 minutes)
   - Test search
   - Test filters
   - Test with multiple portfolios
   - Test parent/child portfolios

4. **Error Scenarios** (5 minutes)
   - Test invalid data
   - Test network errors
   - Test permission errors

**Total Time:** ~30 minutes for basic testing

---

## Success Criteria

### Must Pass (Critical)
- ✅ Portfolios can be created
- ✅ Portfolios can be viewed
- ✅ Portfolios can be edited
- ✅ Portfolios can be deleted (soft delete)
- ✅ Portfolio list displays correctly
- ✅ Portfolio detail page loads
- ✅ Navigation works
- ✅ No console errors
- ✅ No application crashes

### Should Pass (Important)
- ✅ Search works correctly
- ✅ Filters work correctly
- ✅ Form validation works
- ✅ Dashboard displays metrics
- ✅ Responsive design works
- ✅ Error handling works

### Nice to Have (Enhancements)
- ⚠️ Performance is acceptable
- ⚠️ UI is polished
- ⚠️ Loading states work well

---

## Troubleshooting

### Issue: Portfolio menu doesn't appear
**Solution:**
1. Check if `v37_phase6_menu_items.sql` was run
2. Check user role has access to portfolio menu
3. Check `role_menu_items` table for user's role

### Issue: "Table doesn't exist" error
**Solution:**
1. Verify `v36_portfolio_management.sql` was run
2. Check table names in database
3. Verify Supabase connection

### Issue: Form doesn't submit
**Solution:**
1. Check browser console for errors
2. Verify required fields are filled
3. Check network tab for API errors
4. Verify user is authenticated

### Issue: Portfolio list is empty
**Solution:**
1. Create test portfolios using SQL or UI
2. Check `is_deleted = false` filter
3. Verify user has permission to view portfolios

---

## Next Steps After Testing

Once testing is complete:

1. **Document Issues**: Record any bugs or issues found
2. **Fix Critical Issues**: Address any blocking issues
3. **Update Documentation**: Update user guides if needed
4. **Proceed to Programme Management**: Begin Phase 6 Programme module

---

## Test Report Template

```
Phase 6 Portfolio Management - Test Report
Date: [DATE]
Tester: [NAME]

Test Results:
- Database Setup: [PASS/FAIL]
- Navigation: [PASS/FAIL]
- Create Portfolio: [PASS/FAIL]
- View Portfolio: [PASS/FAIL]
- Edit Portfolio: [PASS/FAIL]
- Delete Portfolio: [PASS/FAIL]
- Search & Filters: [PASS/FAIL]
- Dashboard: [PASS/FAIL]
- Error Handling: [PASS/FAIL]
- Performance: [PASS/FAIL]

Issues Found:
1. [Issue description]
2. [Issue description]

Recommendations:
- [Recommendation]
- [Recommendation]

Status: [READY FOR PRODUCTION / NEEDS FIXES]
```

---

**End of Testing Guide**

