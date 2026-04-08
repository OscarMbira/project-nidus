# Unique Organisation Names Feature

## Overview

This feature ensures that organisation names and legal company names are unique across the entire system, preventing duplicate organisations and maintaining data integrity.

## Implementation Date
**2025-12-13**

---

## Features

### 1. **Database-Level Uniqueness**
- **Organisation Name** (`account_name`) - Case-insensitive unique constraint
- **Legal Company Name** (`company_name`) - Case-insensitive unique constraint

### 2. **Real-Time Validation**
- Checks availability as users type (500ms debounce)
- Visual feedback with colored borders (red/yellow/green)
- Clear status messages below fields
- Prevents form submission if names are taken

### 3. **User-Friendly Experience**
- ✅ Green checkmark when name is available
- ⚠️ Yellow indicator while checking
- ❌ Red error message if name is taken
- Debounced API calls to avoid excessive database queries

---

## Database Changes

### SQL Migration: `v124_add_unique_organisation_names.sql`

#### 1. Unique Indexes Created

**Organisation Name Index:**
```sql
CREATE UNIQUE INDEX idx_accounts_account_name_unique
    ON accounts(LOWER(account_name))
    WHERE is_deleted = FALSE;
```

**Legal Company Name Index:**
```sql
CREATE UNIQUE INDEX idx_accounts_company_name_unique
    ON accounts(LOWER(company_name))
    WHERE is_deleted = FALSE AND company_name IS NOT NULL;
```

**Key Features:**
- Case-insensitive (uses `LOWER()` function)
- Only enforced for active accounts (`is_deleted = FALSE`)
- Company name allows NULL values
- Unique constraint on lowercase version of names

#### 2. Database Functions

**`check_organisation_name_availability(p_account_name, p_exclude_account_id)`**

Checks if an organisation name is already in use.

**Parameters:**
- `p_account_name` - The name to check
- `p_exclude_account_id` (optional) - Account ID to exclude from check (for updates)

**Returns:**
```json
{
  "available": true/false,
  "message": "Organisation name is available",
  "existing_account_id": "uuid" // if not available
}
```

**`check_company_name_availability(p_company_name, p_exclude_account_id)`**

Checks if a legal company name is already registered.

**Parameters:**
- `p_company_name` - The company name to check
- `p_exclude_account_id` (optional) - Account ID to exclude from check (for updates)

**Returns:**
```json
{
  "available": true/false,
  "message": "Legal company name is available",
  "existing_account_id": "uuid" // if not available
}
```

---

## Frontend Changes

### File: `src/pages/onboarding/OrganisationSetup.jsx`

#### 1. New State Variables

```javascript
const [nameValidation, setNameValidation] = useState({
  checking: false,
  available: true,
  message: ''
});

const [companyNameValidation, setCompanyNameValidation] = useState({
  checking: false,
  available: true,
  message: ''
});
```

#### 2. Validation Functions

**`checkOrganisationNameAvailability(name)`**
- Calls database function `check_organisation_name_availability`
- Updates `nameValidation` state
- Triggered with 500ms debounce

**`checkCompanyNameAvailability(companyName)`**
- Calls database function `check_company_name_availability`
- Updates `companyNameValidation` state
- Triggered with 500ms debounce

#### 3. UI Enhancements

**Organisation Name Field:**
- Dynamic border colors based on validation state
- Real-time status messages:
  - "Checking availability..." (yellow)
  - "This organisation name is already taken" (red)
  - "✓ Organisation name is available" (green)

**Legal Company Name Field:**
- Same validation UX as organisation name
- Only shown when organisation type is "business" or "company"
- Optional field (can be left empty)

#### 4. Form Submission Validation

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  // Block submission if names are not available
  if (!nameValidation.available) {
    toast.error('Organisation name is already taken...');
    return;
  }

  if (!companyNameValidation.available) {
    toast.error('Legal company name is already registered...');
    return;
  }

  // Proceed with organisation creation
};
```

---

## User Experience Flow

### Scenario 1: Creating Organisation with Unique Names

1. User enters organisation name "Acme Corp"
2. System waits 500ms (debounce)
3. Checks database: Name not found
4. Shows: "✓ Organisation name is available" (green)
5. User enters legal company name "Acme Corporation Ltd"
6. System waits 500ms
7. Checks database: Name not found
8. Shows: "✓ Legal company name is available" (green)
9. User submits form
10. Organisation created successfully ✅

### Scenario 2: Attempting to Use Taken Name

1. User enters organisation name "Acme Corp" (already exists)
2. System waits 500ms
3. Checks database: Name found!
4. Shows: "This organisation name is already taken" (red)
5. Border turns red
6. User tries to submit form
7. Toast error: "Organisation name is already taken. Please choose a different name."
8. Form submission blocked ❌
9. User must choose a different name

---

## Technical Details

### Case-Insensitive Matching

The system treats these as duplicates:
- "Acme Corp" vs "acme corp"
- "ACME CORP" vs "AcMe CoRp"
- "Acme Corp" vs "Acme  Corp" (extra spaces are trimmed)

### Deleted Accounts

Unique constraints only apply to active accounts:
- Deleted organisations (`is_deleted = TRUE`) don't block name reuse
- Users can create new organisation with a previously deleted name

### Performance Optimization

**Debouncing:**
- 500ms delay before checking availability
- Prevents excessive API calls while user is typing
- Only checks after user pauses typing

**Database Indexes:**
- Unique indexes make lookups extremely fast (O(1))
- Case-insensitive search using `LOWER()` function
- Partial indexes (only active records) improve performance

---

## Testing Guide

### Before Running Migration

**Check for Existing Duplicates:**

```sql
-- Check duplicate organisation names
SELECT LOWER(account_name) as name_lower, COUNT(*) as count
FROM accounts
WHERE is_deleted = FALSE
GROUP BY LOWER(account_name)
HAVING COUNT(*) > 1;

-- Check duplicate company names
SELECT LOWER(company_name) as name_lower, COUNT(*) as count
FROM accounts
WHERE is_deleted = FALSE AND company_name IS NOT NULL
GROUP BY LOWER(company_name)
HAVING COUNT(*) > 1;
```

**If Duplicates Found:**
1. Manually rename duplicates before applying constraints
2. Or soft-delete old/inactive duplicate organisations

### After Running Migration

**Test Unique Constraints:**

```sql
-- Test organisation name uniqueness
SELECT public.check_organisation_name_availability('Test Organisation');

-- Test company name uniqueness
SELECT public.check_company_name_availability('Test Company Ltd');

-- Try creating duplicate (should fail)
INSERT INTO accounts (owner_user_id, account_name, account_code)
VALUES ('user-id-here', 'existing name', 'TEST001');
-- Expected: ERROR - duplicate key value violates unique constraint
```

### Frontend Testing

1. **Create New Organisation:**
   - Go to `/onboarding/organisation-setup`
   - Enter a new unique organisation name
   - Should show green checkmark
   - Submit form - should succeed

2. **Try Duplicate Organisation Name:**
   - Go to `/onboarding/organisation-setup`
   - Enter an existing organisation name
   - Should show red error message
   - Try to submit - should block with toast error

3. **Test Legal Company Name:**
   - Select "Company" as organisation type
   - Enter existing legal company name
   - Should show red error message
   - Try to submit - should block with toast error

4. **Test Case-Insensitive:**
   - Enter "ACME CORP" (if "Acme Corp" exists)
   - Should show error (treated as duplicate)

5. **Test Debounce:**
   - Type quickly without pausing
   - Should only show "Checking..." once after 500ms pause

---

## Rollback Plan

If issues arise, rollback using:

```sql
-- Remove unique constraints
DROP INDEX IF EXISTS idx_accounts_account_name_unique;
DROP INDEX IF EXISTS idx_accounts_company_name_unique;

-- Remove validation functions
DROP FUNCTION IF EXISTS public.check_organisation_name_availability(VARCHAR, UUID);
DROP FUNCTION IF EXISTS public.check_company_name_availability(VARCHAR, UUID);
```

Then revert frontend changes in `OrganisationSetup.jsx`.

---

## Benefits

1. **Data Integrity**: No duplicate organisations in the system
2. **Better UX**: Users know immediately if name is taken
3. **Prevents Confusion**: Each organisation has unique identity
4. **Legal Compliance**: Prevents trademark/branding conflicts
5. **Database Performance**: Unique indexes speed up lookups

---

## Future Enhancements

1. **Similarity Suggestions**: "Did you mean...?" for similar names
2. **Domain Verification**: Verify company name against business registry APIs
3. **Bulk Import Validation**: Check for duplicates when importing organisations
4. **Audit Trail**: Log all organisation name changes
5. **Name Reservation**: Allow users to reserve names for future use

---

## Related Files

- `SQL/v124_add_unique_organisation_names.sql` - Database migration
- `src/pages/onboarding/OrganisationSetup.jsx` - Form with validation
- `SQL/v84_accounts_and_extensions.sql` - Original accounts table schema

---

## Support

If you encounter issues:

1. **Duplicate Found During Migration**:
   - Run verification queries to identify duplicates
   - Manually resolve conflicts before applying constraints

2. **Validation Not Working in Frontend**:
   - Check browser console for errors
   - Verify database functions were created successfully
   - Test functions directly in Supabase SQL Editor

3. **False Positives**:
   - Check for leading/trailing whitespace in existing data
   - Verify `is_deleted` flag is set correctly

---

**Created:** 2025-12-13
**Author:** Claude Code
**Version:** 1.0
**Status:** Production Ready
