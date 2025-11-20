# Portfolio Management - Testing Guide

**Quick Start for Testing Phase 6 Portfolio Functionality**

---

## 🚀 Quick Start (5 minutes)

### Step 1: Database Setup
Run these SQL files in your Supabase SQL editor (in order):

1. **`SQL/v36_portfolio_management.sql`** - Creates portfolio tables
2. **`SQL/v37_phase6_menu_items.sql`** - Adds menu items
3. **`SQL/v36_portfolio_test_data.sql`** (Optional) - Creates test data

### Step 2: Verify Setup
```sql
-- Check tables exist
SELECT table_name FROM database_tables WHERE table_category = 'portfolio';

-- Check menu items
SELECT menu_code, menu_label FROM menu_items WHERE menu_code LIKE 'portfolio%';
```

### Step 3: Test the Application
1. Start your application: `npm run dev`
2. Log in
3. Look for "Portfolio" in the navigation menu
4. Click on Portfolio → Should navigate to `/portfolio`

---

## ✅ Quick Test Checklist (15 minutes)

- [ ] **Navigation** - Portfolio menu appears and works
- [ ] **Portfolio List** - Page loads, shows stats cards
- [ ] **Create Portfolio** - Can create a new portfolio
- [ ] **View Portfolio** - Can view portfolio details
- [ ] **Edit Portfolio** - Can edit portfolio
- [ ] **Search & Filter** - Search and filters work
- [ ] **No Console Errors** - Check browser DevTools

---

## 📚 Detailed Testing Resources

### 1. **Quick Reference**
   - **File:** `projectplan/Phase_6_Quick_Test_Checklist.md`
   - **Time:** 15 minutes
   - **Use for:** Fast validation of core functionality

### 2. **Comprehensive Guide**
   - **File:** `projectplan/Phase_6_Testing_Guide.md`
   - **Time:** 1-2 hours
   - **Use for:** Thorough testing of all features

### 3. **Test Data**
   - **File:** `SQL/v36_portfolio_test_data.sql`
   - **Use for:** Creating sample portfolios for testing

### 4. **Summary**
   - **File:** `projectplan/Phase_6_Testing_Summary.md`
   - **Use for:** Overview of what's implemented

---

## 🔍 What to Test

### Core Functionality
1. **Portfolio List Page** (`/portfolio`)
   - View all portfolios
   - Search portfolios
   - Filter by status/type
   - Create new portfolio

2. **Portfolio Detail Page** (`/portfolio/:id`)
   - View portfolio information
   - Dashboard tab with metrics
   - Other tabs (Projects, Resources, etc.)

3. **Portfolio Edit Page** (`/portfolio/:id/edit`)
   - Edit portfolio details
   - Save changes
   - Cancel editing

### Database Operations
- Create portfolio
- Update portfolio
- Delete portfolio (soft delete)
- View portfolio with related data

---

## 🐛 Common Issues & Fixes

### Issue: Menu doesn't appear
**Fix:** Run `v37_phase6_menu_items.sql` and check user role permissions

### Issue: "Table doesn't exist" error
**Fix:** Run `v36_portfolio_management.sql` first

### Issue: Form doesn't submit
**Fix:** 
- Check browser console for errors
- Verify user is authenticated
- Check network tab for API errors

### Issue: Dashboard doesn't load
**Fix:** 
- Check if portfolio has data
- Verify service functions in `portfolioService.js`
- Check browser console for errors

---

## 📊 Success Criteria

### Must Pass (Critical)
- ✅ Can navigate to portfolio pages
- ✅ Can create portfolios
- ✅ Can view portfolios
- ✅ Can edit portfolios
- ✅ No application crashes
- ✅ No console errors

### Should Pass (Important)
- ✅ Search works
- ✅ Filters work
- ✅ Dashboard displays data
- ✅ Forms validate correctly

**If all critical items pass → Ready for Programme Management!**

---

## 🔗 Related Files

- **Implementation Plan:** `projectplan/Phase_6_Implementation_Plan.md`
- **Service Layer:** `src/services/portfolioService.js`
- **Components:** `src/components/portfolio/`
- **Pages:** `src/pages/portfolio/`
- **Routes:** `src/App.jsx` (lines 129-132)

---

## 📝 Test Report Template

After testing, document your findings:

```
Test Date: [DATE]
Tester: [NAME]

Results:
- Navigation: [PASS/FAIL]
- Create Portfolio: [PASS/FAIL]
- View Portfolio: [PASS/FAIL]
- Edit Portfolio: [PASS/FAIL]
- Search/Filter: [PASS/FAIL]

Issues Found:
1. [Issue description]
2. [Issue description]

Status: [READY / NEEDS FIXES]
```

---

## 🎯 Next Steps

1. **Complete Testing** - Follow the guides above
2. **Fix Any Issues** - Address critical problems
3. **Document Findings** - Record test results
4. **Proceed to Programme Management** - Begin next module

---

**Happy Testing!** 🚀

For detailed instructions, see `projectplan/Phase_6_Testing_Guide.md`

