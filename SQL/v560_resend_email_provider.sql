-- ============================================================================
-- v560: Resend API email provider support
--
-- Application transactional email uses public.email_configurations with
-- service_provider = 'resend' and api_key set via Admin → Email Settings.
--
-- This script only deactivates legacy SMTP-only rows so a new Resend config
-- can be saved from the UI without conflict. It does NOT store your API key.
--
-- After running: Platform → Admin → Email Settings → Resend API → paste key → Save
-- ============================================================================

UPDATE public.email_configurations
   SET is_active  = false,
       is_default = false,
       updated_at = now()
 WHERE config_name = 'Primary SMTP'
   AND service_provider = 'smtp'
   AND is_deleted = false
   AND is_active = true;

DO $$
BEGIN
  RAISE NOTICE 'v560_resend_email_provider.sql applied — configure Resend in Admin → Email Settings';
END $$;
