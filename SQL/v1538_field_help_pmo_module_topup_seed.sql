-- ============================================================================
-- v1345 slice 4 wave 4k top-up — PMO module template and signatory pages
-- ============================================================================
-- Generated from scripts/field-help-content/admin_settings_topup.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 9 help entries, module_code 'admin_settings'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.pm_template_nodes.name', 'Name', 'The name of the organisational template.', '- Project closure checklist', NULL, NULL, 'admin_settings'),
  ('public.pm_template_nodes.category', 'Category', 'A grouping that helps people find the template.', '- Closing', NULL, NULL, 'admin_settings'),
  ('public.pm_template_nodes.description', 'Description', 'What the template is for and when to use it.', '- Steps to close a project and hand over to operations.', NULL, NULL, 'admin_settings'),
  ('public.organisational_process_assets.title', 'Title', 'The title of this document in the template library.', '- Closure checklist (standard)', NULL, NULL, 'admin_settings'),
  ('public.organisational_process_assets.description', 'Description', 'What this document holds.', '- The checklist used for every project closure.', NULL, NULL, 'admin_settings'),
  ('public.organisational_process_assets.document_data', 'Document data (JSON)', 'The document’s content in raw form. Shown only when it cannot be shown as fields.', '- {"items": ["Archive files", "Release team"]}', NULL, 'Edit with care: the text must stay valid JSON.', 'admin_settings'),
  ('public.process_template_signatory_requirements.scope_type', 'Scope', 'The level these signatory rules apply at: the whole organisation, a portfolio, a programme or a project.', '- Programme', NULL, NULL, 'admin_settings'),
  ('public.process_template_signatory_requirements.scope_id', 'Portfolio / programme / project', 'Which portfolio, programme or project the rules apply to.', '- Branch Modernisation Programme', NULL, NULL, 'admin_settings'),
  ('public.process_template_signatory_requirements.table_name', 'Document types', 'The documents that need these signatories before they can be locked.', '- Project charter; closure report', NULL, NULL, 'admin_settings')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;

-- Simulator keys read the Platform help (PRD G-D3).
INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.pm_template_nodes.name', 'public.pm_template_nodes.name'),
  ('sim.pm_template_nodes.category', 'public.pm_template_nodes.category'),
  ('sim.pm_template_nodes.description', 'public.pm_template_nodes.description'),
  ('sim.organisational_process_assets.title', 'public.organisational_process_assets.title'),
  ('sim.organisational_process_assets.description', 'public.organisational_process_assets.description'),
  ('sim.organisational_process_assets.document_data', 'public.organisational_process_assets.document_data'),
  ('sim.process_template_signatory_requirements.scope_type', 'public.process_template_signatory_requirements.scope_type'),
  ('sim.process_template_signatory_requirements.scope_id', 'public.process_template_signatory_requirements.scope_id'),
  ('sim.process_template_signatory_requirements.table_name', 'public.process_template_signatory_requirements.table_name')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'admin_settings' AND is_active;
