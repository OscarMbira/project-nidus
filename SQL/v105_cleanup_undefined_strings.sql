-- =====================================================================================
-- Cleanup: Remove "undefined" strings from database
-- Version: v105
-- Description: Fixes any existing records that have the string "undefined" in fields
-- =====================================================================================

-- Sometimes JavaScript undefined values get converted to the string "undefined"
-- This script finds and cleans up such data

-- =====================================================================================
-- STEP 1: Clean accounts table
-- =====================================================================================

UPDATE accounts
SET
  company_name = CASE WHEN company_name = 'undefined' THEN NULL ELSE company_name END,
  billing_email = CASE WHEN billing_email = 'undefined' THEN NULL ELSE billing_email END,
  primary_email = CASE WHEN primary_email = 'undefined' THEN NULL ELSE primary_email END,
  primary_phone = CASE WHEN primary_phone = 'undefined' THEN NULL ELSE primary_phone END,
  address_line1 = CASE WHEN address_line1 = 'undefined' THEN NULL ELSE address_line1 END,
  address_line2 = CASE WHEN address_line2 = 'undefined' THEN NULL ELSE address_line2 END,
  city = CASE WHEN city = 'undefined' THEN NULL ELSE city END,
  state_province = CASE WHEN state_province = 'undefined' THEN NULL ELSE state_province END,
  postal_code = CASE WHEN postal_code = 'undefined' THEN NULL ELSE postal_code END,
  country_code = CASE WHEN country_code = 'undefined' THEN NULL ELSE country_code END,
  logo_url = CASE WHEN logo_url = 'undefined' THEN NULL ELSE logo_url END,
  brand_color = CASE WHEN brand_color = 'undefined' THEN NULL ELSE brand_color END,
  business_registration_number = CASE WHEN business_registration_number = 'undefined' THEN NULL ELSE business_registration_number END,
  tax_id = CASE WHEN tax_id = 'undefined' THEN NULL ELSE tax_id END
WHERE
  company_name = 'undefined'
  OR billing_email = 'undefined'
  OR primary_email = 'undefined'
  OR primary_phone = 'undefined'
  OR address_line1 = 'undefined'
  OR address_line2 = 'undefined'
  OR city = 'undefined'
  OR state_province = 'undefined'
  OR postal_code = 'undefined'
  OR country_code = 'undefined'
  OR logo_url = 'undefined'
  OR brand_color = 'undefined'
  OR business_registration_number = 'undefined'
  OR tax_id = 'undefined';

-- =====================================================================================
-- STEP 2: Clean users table
-- =====================================================================================

UPDATE users
SET
  full_name = CASE WHEN full_name = 'undefined' THEN 'User' ELSE full_name END,
  email = CASE WHEN email = 'undefined' THEN NULL ELSE email END,
  phone_number = CASE WHEN phone_number = 'undefined' THEN NULL ELSE phone_number END,
  avatar_url = CASE WHEN avatar_url = 'undefined' THEN NULL ELSE avatar_url END,
  bio = CASE WHEN bio = 'undefined' THEN NULL ELSE bio END,
  job_title = CASE WHEN job_title = 'undefined' THEN NULL ELSE job_title END,
  organization = CASE WHEN organization = 'undefined' THEN NULL ELSE organization END
WHERE
  full_name = 'undefined'
  OR email = 'undefined'
  OR phone_number = 'undefined'
  OR avatar_url = 'undefined'
  OR bio = 'undefined'
  OR job_title = 'undefined'
  OR organization = 'undefined';

-- =====================================================================================
-- STEP 3: Clean projects table
-- =====================================================================================

UPDATE projects
SET
  project_description = CASE WHEN project_description = 'undefined' THEN NULL ELSE project_description END
WHERE
  project_description = 'undefined';

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
DECLARE
  v_accounts_cleaned INTEGER;
  v_users_cleaned INTEGER;
  v_projects_cleaned INTEGER;
BEGIN
  -- Count remaining "undefined" strings in accounts
  SELECT COUNT(*) INTO v_accounts_cleaned
  FROM accounts
  WHERE company_name = 'undefined'
     OR billing_email = 'undefined'
     OR primary_email = 'undefined'
     OR primary_phone = 'undefined';

  -- Count remaining "undefined" strings in users
  SELECT COUNT(*) INTO v_users_cleaned
  FROM users
  WHERE full_name = 'undefined'
     OR email = 'undefined';

  -- Count remaining "undefined" strings in projects
  SELECT COUNT(*) INTO v_projects_cleaned
  FROM projects
  WHERE project_description = 'undefined';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining "undefined" strings:';
  RAISE NOTICE '  Accounts: %', v_accounts_cleaned;
  RAISE NOTICE '  Users: %', v_users_cleaned;
  RAISE NOTICE '  Projects: %', v_projects_cleaned;
  RAISE NOTICE '';

  IF v_accounts_cleaned = 0 AND v_users_cleaned = 0 AND v_projects_cleaned = 0 THEN
    RAISE NOTICE '🎉 All "undefined" strings have been cleaned!';
  ELSE
    RAISE WARNING 'Some "undefined" strings remain. Please check the data manually.';
  END IF;

  RAISE NOTICE '';
END $$;
