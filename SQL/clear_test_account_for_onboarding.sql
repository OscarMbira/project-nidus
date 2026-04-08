-- ============================================================================
-- Clear Test Account for Onboarding
-- Version: v122
-- Description: Helper script to delete account records so user can complete 
--              organization setup flow after registration
-- Author: Development Team
-- Date: 2025-01-XX
-- ============================================================================
--
-- ⚠️ IMPORTANT: Replace 'your-email@example.com' with YOUR ACTUAL EMAIL ADDRESS
-- ⚠️ Do NOT run queries with placeholder text - you will get errors!
--
-- PURPOSE:
-- This script helps clear account records that were auto-created, allowing 
-- users to complete the organization setup flow manually.
--
-- USAGE:
-- 1. Replace 'your-email@example.com' with your actual email in the queries below
-- 2. Run STEP 1 to find your account (verify it exists)
-- 3. Run STEP 2 to soft delete your account
-- 4. Run STEP 3 to verify deletion
-- 5. Log out and log back in - you should be redirected to organization setup
--
-- ============================================================================

-- STEP 1: Find your account by email
-- ⚠️ REPLACE 'your-email@example.com' WITH YOUR ACTUAL EMAIL ADDRESS ⚠️
SELECT 
    a.id as account_id,
    a.account_name,
    a.account_code,
    a.organisation_verified,
    a.is_deleted,
    a.created_at,
    u.email,
    u.full_name,
    u.auth_user_id
FROM accounts a
INNER JOIN users u ON u.id = a.owner_user_id
WHERE u.email = 'your-email@example.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
  AND a.is_deleted = FALSE;

-- STEP 2: Soft delete your account (RECOMMENDED - safer)
-- This marks the account as deleted but keeps the data
-- ⚠️ REPLACE 'your-email@example.com' WITH YOUR ACTUAL EMAIL ADDRESS ⚠️
UPDATE accounts
SET 
    is_deleted = TRUE,
    deleted_at = NOW(),
    deleted_by = (
        SELECT id FROM users 
        WHERE email = 'your-email@example.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
        LIMIT 1
    )
WHERE owner_user_id = (
    SELECT id FROM users 
    WHERE email = 'your-email@example.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
    LIMIT 1
)
AND is_deleted = FALSE;

-- STEP 3: Verify that account was deleted
-- Run this after STEP 2 to confirm the account is marked as deleted
-- ⚠️ REPLACE 'your-email@example.com' WITH YOUR ACTUAL EMAIL ADDRESS ⚠️
SELECT 
    a.id as account_id,
    a.account_name,
    a.is_deleted,
    a.deleted_at,
    u.email
FROM accounts a
INNER JOIN users u ON u.id = a.owner_user_id
WHERE u.email = 'your-email@example.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
ORDER BY a.created_at DESC;

-- ============================================================================
-- ALTERNATIVE: Hard delete (USE WITH CAUTION - only if soft delete doesn't work)
-- ============================================================================
-- This permanently removes the account record
-- WARNING: This will fail if there are foreign key constraints (projects, subscriptions, etc.)
-- Only use if you're sure there's no related data
-- ⚠️ REPLACE 'your-email@example.com' WITH YOUR ACTUAL EMAIL ADDRESS ⚠️
-- 
-- DELETE FROM accounts
-- WHERE owner_user_id = (
--     SELECT id FROM users 
--     WHERE email = 'your-email@example.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
--     LIMIT 1
-- )
-- AND is_deleted = FALSE;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. After deleting the account, log out and log back in
-- 2. You should be redirected to /onboarding/organisation-setup
-- 3. Complete the organization setup form
-- 4. A new account will be created with the information you provide
--
-- If you have related data (projects, subscriptions) that you want to keep,
-- you may need to:
-- - Delete or reassign projects first
-- - Cancel or reassign subscriptions
-- - Then delete the account
--
-- ============================================================================

