-- ============================================================================
-- v1345 wave 4p — Simulator-only practice pages
-- ============================================================================
-- Generated from scripts/field-help-content/sim_only_4p.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 1 help entries, module_code 'simulator_practice'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490, v1491.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('sim.practice_project_members.role_name', 'Role', 'The role this person plays on the practice project. It decides what they can see and do there.', '- Team member', NULL, 'You can change a member’s role later from the members list.', 'simulator_practice')
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
  ('sim.data_breach_records.breach_type', 'public.data_breach_records.breach_type'),
  ('sim.data_breach_records.severity', 'public.data_breach_records.severity'),
  ('sim.data_breach_records.status', 'public.data_breach_records.status'),
  ('sim.data_breach_records.data_types_affected', 'public.data_breach_records.data_types_affected'),
  ('sim.data_breach_records.mitigation_steps', 'public.data_breach_records.mitigation_steps'),
  ('sim.practice_project_plans.plan_title', 'public.project_plans.plan_title'),
  ('sim.practice_project_plans.plan_purpose', 'public.project_plans.plan_purpose'),
  ('sim.practice_stage_plans.stage_number', 'public.stage_plans.stage_number'),
  ('sim.practice_stage_plans.stage_title', 'public.stage_plans.stage_name'),
  ('sim.practice_stage_plans.stage_objectives', 'public.stage_plans.stage_objectives'),
  ('sim.portfolio_projects.portfolio_id', 'public.portfolio_projects.portfolio_id'),
  ('sim.portfolio_projects.project_id', 'public.portfolio_projects.project_id')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'simulator_practice' AND is_active;
