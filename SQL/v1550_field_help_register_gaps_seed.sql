-- ============================================================================
-- v1345 fix — register fields that never had help (real-register-key audit)
-- ============================================================================
-- Generated from scripts/field-help-content/register_gaps.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 2 help entries, module_code 'registers_ict'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('register:ict_requirements_specification:document_type', 'Document type', 'Whether this is a business requirements document or a functional requirements specification.', '- Functional Requirements Specification', NULL, NULL, 'registers_ict'),
  ('register:ict_requirements_specification:functional_requirements', 'Functional requirements', 'Functional requirement records linked to this specification. Pick existing records from the Requirements register.', '- REQ-014 Scan every pallet on arrival', NULL, NULL, 'registers_ict')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'registers_ict' AND is_active;
