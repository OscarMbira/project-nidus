-- ============================================================================
-- v1345 slice 3 wave 3b — project mandate field help (create, edit, view, both apps)
-- ============================================================================
-- Generated from scripts/field-help-content/mandate.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 31 help entries, module_code 'project_mandate'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.project_mandates.mandate_reference', 'Mandate code', 'A short code that identifies this mandate. Leave it blank and the system creates one.', '- MAN-2027-004', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.mandate_title', 'Mandate title', 'A short name for the proposed project.', '- Dubai Branch Network Refresh', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.project_code', 'Project code', 'The code of the project this mandate will become, if already known. Often blank at this stage.', '- PRJ-2027-014', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.project_name', 'Project name', 'The name of the project this mandate will become, if already known.', '- Dubai Branch Network Refresh', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.purpose', 'Purpose', 'Why the project is being proposed, in a sentence or two.', '- Give branch customers same-day account opening by replacing the ageing teller system.', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.background', 'Background', 'The situation that led to this mandate: what is happening now and why it matters.', '- Account opening in branches takes up to 3 days and complaints have doubled this year. The teller system is out of support next year.', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.authority_responsible', 'Authority responsible', 'Who is commissioning the project, such as the board, an executive committee or a programme.', E'- Executive Committee\n- Retail Transformation Programme', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.scope', 'Scope', 'What the project is about and what it will deliver, in outline.', E'- Replace the teller system in all Dubai branches\n- Train branch staff on the new system', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.scope_exclusions', 'Out of scope', 'What the project will deliberately not cover, so nobody assumes it will.', E'- Card processing\n- Branches outside Dubai', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.interfaces', 'Interfaces', 'Other projects, systems or teams this work must connect with.', E'- Core banking system\n- Identity verification service\n- Branch Modernisation Programme', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.proposed_executive_name', 'Executive', 'The senior person who would be in overall charge of the project.', '- Chief Operating Officer', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.proposed_pm_name', 'Project manager', 'The person proposed to run the project day to day, if already decided.', '- Senior Project Manager', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.project_objectives', 'Objectives', 'What the project is expected to achieve, such as savings or faster service.', E'- Cut account opening from 3 days to same day\n- Reduce branch running costs by 15%', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.constraints', 'Key constraints', 'Limits the project must work within: a fixed date, a maximum budget, required integrations.', E'- Must go live before the year-end freeze\n- Budget no more than 1,500,000', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.assumptions', 'Assumptions', 'What is being taken as true for planning, though not yet confirmed.', E'- The supplier contract is signed by March\n- Branches can close early on one Saturday each', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.outline_risks', 'Known risks and issues', 'Risks or problems already known at this early stage.', '- Key branch experts are also busy with year-end close', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.quality_expectations', 'Quality expectations', 'What the customer expects the finished result to be like.', E'- Available 99.9% of branch opening hours\n- Account opening screens usable without training', 'One item per line.', NULL, 'project_mandate'),
  ('public.project_mandates.quality_priority', 'Quality priority', 'Which matters most if a trade-off is needed: time, cost or quality, or a balance of all three.', '- Time first', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.outline_business_case', 'Outline business case', 'Why the project is worth doing: expected benefits, a rough cost and how it would be funded.', '- Expected savings of 400,000 a year from lower support costs; estimated cost 1,200,000 from the retail change budget.', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.key_deliverables', 'Key deliverables', 'The main things the project will produce. Add each one with a rough timeframe.', E'- New branch account opening process\n- Trained branch staff', NULL, NULL, 'project_mandate'),
  ('public.project_mandates.dependencies', 'Dependencies', 'Things outside the project that it relies on, or that rely on it.', '- Network upgrade by the infrastructure programme', NULL, NULL, 'project_mandate'),
  ('public.mandate_deliverables.deliverable_name', 'Deliverable', 'A short name for something the project will produce.', '- New customer onboarding journey', NULL, NULL, 'project_mandate'),
  ('public.mandate_deliverables.deliverable_description', 'Description', 'What the deliverable is, in a sentence or two.', '- A single screen flow that lets branch staff open an account and check identity in one visit.', NULL, NULL, 'project_mandate'),
  ('public.mandate_deliverables.estimated_completion', 'Rough timeframe', 'Roughly when it should be ready. A quarter or month is enough at this stage.', '- Q3 2027', NULL, NULL, 'project_mandate'),
  ('public.mandate_deliverables.is_in_scope', 'In scope', 'Tick if the project will deliver this. Untick for something discussed but left out.', '- Ticked', NULL, NULL, 'project_mandate'),
  ('public.mandate_deliverables.is_major_deliverable', 'Major deliverable', 'Tick if this is one of the main deliverables the project will be judged on.', '- Ticked', NULL, NULL, 'project_mandate'),
  ('public.mandate_dependencies.dependency_description', 'Dependency', 'What the project depends on, or what depends on the project.', '- Network upgrade in Dubai branches by the infrastructure programme', NULL, NULL, 'project_mandate'),
  ('public.mandate_dependencies.dependency_type', 'Type', 'Where the dependency sits: inside your organisation, outside it, or both ways between projects.', '- External', NULL, NULL, 'project_mandate'),
  ('public.mandate_dependencies.dependency_status', 'Status', 'How far the dependency has been worked through.', '- Identified', NULL, NULL, 'project_mandate'),
  ('public.mandate_dependencies.impact_during_project', 'Affects the project while it runs', 'Tick if the dependency matters while the project is being delivered.', '- Ticked', NULL, NULL, 'project_mandate'),
  ('public.mandate_dependencies.impact_after_implementation', 'Continues after implementation', 'Tick if the dependency still matters once the project has finished.', '- Not ticked', NULL, NULL, 'project_mandate')
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
  ('sim.project_mandates.mandate_reference', 'public.project_mandates.mandate_reference'),
  ('sim.project_mandates.mandate_title', 'public.project_mandates.mandate_title'),
  ('sim.project_mandates.project_code', 'public.project_mandates.project_code'),
  ('sim.project_mandates.project_name', 'public.project_mandates.project_name'),
  ('sim.project_mandates.purpose', 'public.project_mandates.purpose'),
  ('sim.project_mandates.background', 'public.project_mandates.background'),
  ('sim.project_mandates.authority_responsible', 'public.project_mandates.authority_responsible'),
  ('sim.project_mandates.scope', 'public.project_mandates.scope'),
  ('sim.project_mandates.scope_exclusions', 'public.project_mandates.scope_exclusions'),
  ('sim.project_mandates.interfaces', 'public.project_mandates.interfaces'),
  ('sim.project_mandates.proposed_executive_name', 'public.project_mandates.proposed_executive_name'),
  ('sim.project_mandates.proposed_pm_name', 'public.project_mandates.proposed_pm_name'),
  ('sim.project_mandates.project_objectives', 'public.project_mandates.project_objectives'),
  ('sim.project_mandates.constraints', 'public.project_mandates.constraints'),
  ('sim.project_mandates.assumptions', 'public.project_mandates.assumptions'),
  ('sim.project_mandates.outline_risks', 'public.project_mandates.outline_risks'),
  ('sim.project_mandates.quality_expectations', 'public.project_mandates.quality_expectations'),
  ('sim.project_mandates.quality_priority', 'public.project_mandates.quality_priority'),
  ('sim.project_mandates.outline_business_case', 'public.project_mandates.outline_business_case'),
  ('sim.project_mandates.key_deliverables', 'public.project_mandates.key_deliverables'),
  ('sim.project_mandates.dependencies', 'public.project_mandates.dependencies'),
  ('sim.mandate_deliverables.deliverable_name', 'public.mandate_deliverables.deliverable_name'),
  ('sim.mandate_deliverables.deliverable_description', 'public.mandate_deliverables.deliverable_description'),
  ('sim.mandate_deliverables.estimated_completion', 'public.mandate_deliverables.estimated_completion'),
  ('sim.mandate_deliverables.is_in_scope', 'public.mandate_deliverables.is_in_scope'),
  ('sim.mandate_deliverables.is_major_deliverable', 'public.mandate_deliverables.is_major_deliverable'),
  ('sim.mandate_dependencies.dependency_description', 'public.mandate_dependencies.dependency_description'),
  ('sim.mandate_dependencies.dependency_type', 'public.mandate_dependencies.dependency_type'),
  ('sim.mandate_dependencies.dependency_status', 'public.mandate_dependencies.dependency_status'),
  ('sim.mandate_dependencies.impact_during_project', 'public.mandate_dependencies.impact_during_project'),
  ('sim.mandate_dependencies.impact_after_implementation', 'public.mandate_dependencies.impact_after_implementation')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'project_mandate' AND is_active;
