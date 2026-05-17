-- ============================================================================
-- v535: Append invitation expiry footer placeholder to existing message templates
-- Prerequisites: invitation_message_templates (v529), v531 seed may already exist
-- Idempotent: skips rows that already reference invitation_expiry placeholders
-- ============================================================================

UPDATE public.invitation_message_templates imt
SET
  message_body = rtrim(imt.message_body) || E'\n\n{{invitation_expiry_note}}',
  updated_at = NOW()
WHERE imt.message_body NOT LIKE '%{{invitation_expiry_%';

DO $$
BEGIN
  RAISE NOTICE 'v535_invitation_templates_append_expiry_placeholder.sql applied';
END $$;
