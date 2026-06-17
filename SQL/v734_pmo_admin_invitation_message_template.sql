-- =============================================================================
-- v734: PMO Administrator organisation invitation message template
-- Seeds invitation_message_templates.pmo_admin for all accounts (idempotent).
-- Prerequisites: v529, v531/v602 invitation_message_templates
-- =============================================================================

INSERT INTO public.invitation_message_templates (
  account_id,
  role_name,
  template_label,
  subject_line,
  message_body,
  is_active
)
SELECT
  a.id,
  'pmo_admin',
  'PMO Administrator',
  NULL,
  E'Dear {{invitee_name}},\n\nYou have been invited to join **{{organisation_name}}** as **{{role_name}}**. You will support PMO operations, governance, and delivery oversight across the organisation. This role does not include billing or subscription access.\n\n{{invitation_expiry_note}}',
  TRUE
FROM public.accounts a
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
ON CONFLICT (account_id, role_name) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'v734: pmo_admin invitation message template seeded'; END $$;
