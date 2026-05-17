-- ============================================================================
-- v564: Diagnostic + fix for email_configurations active record
--
-- Run in Supabase SQL Editor (as postgres / service role).
-- Step 1 shows every row in the table so you can see the exact state.
-- Step 2 ensures the Primary Resend row is active.
-- ============================================================================

-- ── Step 1: Show ALL rows ────────────────────────────────────────────────────

SELECT
  id,
  config_name,
  service_provider,
  is_active,
  is_default,
  is_deleted,
  from_email,
  length(api_key) AS api_key_length,
  created_at,
  updated_at
FROM  public.email_configurations
ORDER BY created_at DESC;

-- ── Step 2: Ensure the Resend row is active ──────────────────────────────────

UPDATE public.email_configurations
SET
  is_active  = TRUE,
  is_default = TRUE,
  is_deleted = COALESCE(is_deleted, FALSE),
  updated_at = now()
WHERE config_name    = 'Primary Resend'
  AND service_provider = 'resend';

-- Deactivate any non-Resend rows
UPDATE public.email_configurations
SET
  is_active  = FALSE,
  is_default = FALSE,
  updated_at = now()
WHERE config_name <> 'Primary Resend';

-- ── Step 3: Confirm what the Edge Function will see ──────────────────────────

SELECT
  id,
  config_name,
  service_provider,
  is_active,
  is_default,
  is_deleted,
  from_email,
  length(api_key) AS api_key_length
FROM  public.email_configurations
WHERE is_active = TRUE
ORDER BY is_default DESC, updated_at DESC;
