-- ============================================================================
-- Plan lists as tables — updated field help
-- ============================================================================
-- Generated from scripts/field-help-content/plan_list_tables.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 8 help entries, module_code 'strategies_plans'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490, v1542.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.project_plans.key_risks', 'Key risks', 'The main risks to the plan: what could happen, how bad it would be, who owns it and the response.', '- Late racking delivery | High | Procurement Lead | Order from a second supplier', 'Add one row per item. Click a column heading to sort.', NULL, 'strategies_plans'),
  ('public.stage_plans.key_risks', 'Key risks', 'The main risks to this stage: what could happen, how bad it would be, who owns it and the response.', '- Scanner shortage | Medium | Team Manager | Borrow scanners from the pilot site', 'Add one row per item. Click a column heading to sort.', NULL, 'strategies_plans'),
  ('public.project_plans.quality_gates', 'Quality gates', 'Checkpoints where quality must be confirmed before work moves on, with the date and what must be true.', '- Design sign-off | {example_date} | Design approved by the Senior User', 'Add one row per item. Click a column heading to sort.', NULL, 'strategies_plans'),
  ('public.stage_plans.quality_gates', 'Quality gates', 'Quality checkpoints in this stage, with the date and what must be true.', '- Racking inspection | {example_date} | Passes the load test', 'Add one row per item. Click a column heading to sort.', NULL, 'strategies_plans'),
  ('public.project_plans.budget_breakdown', 'Budget breakdown', 'How the project budget splits by stage or category.', '- Stage 2 — Build | 650,000 | Includes racking', 'Add one row per item. Click a column heading to sort. Amounts show in {currency}.', NULL, 'strategies_plans'),
  ('public.stage_plans.budget_breakdown', 'Budget breakdown', 'How the stage budget splits by work package or category.', '- Racking installation | 200,000 | Fixed-price contract', 'Add one row per item. Click a column heading to sort. Amounts show in {currency}.', NULL, 'strategies_plans'),
  ('public.stage_plans.dependencies', 'Dependencies', 'Things this stage depends on, and whether they are inside or outside the project.', '- Racking delivered by supplier | External | Due before week 4', 'Add one row per item. Click a column heading to sort.', NULL, 'strategies_plans'),
  ('public.stage_plans.resource_allocation', 'Resource allocation', 'Which resources work on which work package, and how much.', '- Racking installation | Installation crew | 3 people for 4 weeks', 'Add one row per item. Click a column heading to sort.', NULL, 'strategies_plans')
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
  ('sim.stage_plans.dependencies', 'public.stage_plans.dependencies'),
  ('sim.stage_plans.resource_allocation', 'public.stage_plans.resource_allocation'),
  ('sim.project_plans.key_risks', 'public.project_plans.key_risks'),
  ('sim.stage_plans.key_risks', 'public.stage_plans.key_risks'),
  ('sim.project_plans.quality_gates', 'public.project_plans.quality_gates'),
  ('sim.stage_plans.quality_gates', 'public.stage_plans.quality_gates'),
  ('sim.project_plans.budget_breakdown', 'public.project_plans.budget_breakdown'),
  ('sim.stage_plans.budget_breakdown', 'public.stage_plans.budget_breakdown')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'strategies_plans' AND is_active;
