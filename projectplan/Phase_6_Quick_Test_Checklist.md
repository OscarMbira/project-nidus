# Phase 6 Portfolio Management - Quick Test Checklist

**Quick Reference Guide for Testing**

---

## Pre-Testing Setup (5 minutes)

### 1. Database Setup
```sql
-- Run these SQL files in order:
1. v36_portfolio_management.sql
2. v37_phase6_menu_items.sql
3. v36_portfolio_test_data.sql (optional - for test data)
```

### 2. Verify Setup
```sql
-- Check tables exist
SELECT COUNT(*) FROM portfolios WHERE is_deleted = false;

-- Check menu items
SELECT menu_code, menu_label FROM menu_items WHERE menu_code LIKE 'portfolio%';
```

---

## Quick Test Sequence (15 minutes)

### ✅ Test 1: Navigation (2 min)
- [ ] Log in to application
- [ ] Check if "Portfolio" menu appears in navigation
- [ ] Click on Portfolio menu
- [ ] Verify it navigates to `/portfolio`

**Expected:** Portfolio menu visible, navigation works

---

### ✅ Test 2: Portfolio List Page (3 min)
- [ ] Page loads without errors
- [ ] Stats cards display (Total, Active, Planning, Completed, Total Projects)
- [ ] Search box is visible
- [ ] Filter dropdowns work
- [ ] "Create Portfolio" button is visible

**Expected:** Page loads, all UI elements visible

---

### ✅ Test 3: Create Portfolio (5 min)
- [ ] Click "Create Portfolio" button
- [ ] Form modal opens
- [ ] Fill in required fields:
  - Portfolio Name: "Test Portfolio"
  - Status: "Planning"
  - Type: "Strategic"
- [ ] Click "Create Portfolio"
- [ ] Verify portfolio appears in list

**Expected:** Portfolio created successfully, appears in list

---

### ✅ Test 4: View Portfolio Detail (2 min)
- [ ] Click on a portfolio card
- [ ] Portfolio detail page loads
- [ ] Dashboard tab shows:
  - Health score
  - Project counts
  - Budget/utilization stats
- [ ] Other tabs are clickable

**Expected:** Detail page loads, dashboard displays data

---

### ✅ Test 5: Edit Portfolio (2 min)
- [ ] Click "Edit" button on portfolio detail
- [ ] Edit page loads with form pre-filled
- [ ] Change portfolio name
- [ ] Save changes
- [ ] Verify changes saved

**Expected:** Edit works, changes persist

---

### ✅ Test 6: Search & Filter (1 min)
- [ ] Type in search box
- [ ] Verify results filter
- [ ] Change status filter
- [ ] Verify filtering works

**Expected:** Search and filters work correctly

---

## Critical Issues to Check

### 🔴 Must Fix (Blocking)
- [ ] Application crashes on portfolio page
- [ ] Cannot create portfolios
- [ ] Cannot view portfolios
- [ ] Database errors in console
- [ ] Routes don't work

### 🟡 Should Fix (Important)
- [ ] Menu doesn't appear
- [ ] Forms don't submit
- [ ] Dashboard doesn't load
- [ ] Search doesn't work
- [ ] Performance issues

### 🟢 Nice to Have (Enhancements)
- [ ] UI polish
- [ ] Loading states
- [ ] Error messages

---

## Common Issues & Quick Fixes

### Issue: Menu doesn't appear
**Quick Check:**
```sql
SELECT * FROM menu_items WHERE menu_code = 'portfolio';
SELECT * FROM role_menu_items WHERE menu_item_id IN (
    SELECT id FROM menu_items WHERE menu_code = 'portfolio'
);
```

### Issue: "Table doesn't exist" error
**Quick Check:**
```sql
SELECT table_name FROM database_tables WHERE table_category = 'portfolio';
```

### Issue: Form doesn't submit
**Check:**
1. Browser console for errors
2. Network tab for API errors
3. User authentication status

---

## Browser Console Checks

Open DevTools Console and check for:
- ❌ Red errors
- ⚠️ Yellow warnings (non-critical)
- ✅ No errors = Good!

---

## Network Tab Checks

When loading portfolio page, check:
- ✅ API calls return 200 status
- ✅ Response data is valid JSON
- ❌ No 401/403 errors (permission issues)
- ❌ No 500 errors (server errors)

---

## Test Data Verification

If you ran test data SQL:
```sql
-- Should return 3 portfolios
SELECT portfolio_code, portfolio_name, portfolio_status 
FROM portfolios 
WHERE portfolio_code IN ('STRAT-001', 'OPS-001', 'PLAN-001')
AND is_deleted = false;
```

---

## Success Criteria

### Minimum Viable Test (Pass/Fail)
- ✅ Can navigate to portfolio page
- ✅ Can create a portfolio
- ✅ Can view portfolio list
- ✅ Can view portfolio detail
- ✅ Can edit portfolio
- ✅ No console errors
- ✅ No application crashes

**If all above pass → Ready to proceed to Programme Management**

---

## Next Steps After Testing

1. **Document any issues found**
2. **Fix critical issues** (if any)
3. **Update this checklist** with findings
4. **Proceed to Programme Management** module

---

**Estimated Test Time:** 15-20 minutes for basic functionality

