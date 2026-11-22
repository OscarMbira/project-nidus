-- ============================================================================
-- v1345 wave 4p — email confirmation (public form)
-- ============================================================================
-- Generated from scripts/field-help-content/public_forms_4p.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 1 help entries, module_code 'public_forms'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1546, v1547.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.email_confirmation.email', 'Email address', 'The email you signed up with. We send a new confirmation link to it.', '- sam.example@company.example', NULL, 'Check your spam folder if the link does not arrive within a few minutes.', 'public_forms')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'public_forms' AND is_active;
