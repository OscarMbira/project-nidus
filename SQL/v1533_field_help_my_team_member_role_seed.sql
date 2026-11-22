-- v1533: Field help for My Team member / functional-role pages (v1346)
-- Keys used by MyTeamMemberPage / MyTeamFunctionalRolePage (+ sim aliases).
-- Prerequisites: v1490 field_help. Idempotent via UNIQUE (help_key, form_key, locale).

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.team_members.allocation_start_date', 'Start date', 'When the member joins this team.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'resources_teams'),
  ('public.team_members.allocation_end_date', 'End date', 'When the member leaves this team, if known.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'resources_teams'),
  ('public.team_members.member_comments', 'Comments', 'Anything else about this member’s place on the team.', '- Covers weekend on-call for the pilot.', NULL, NULL, 'resources_teams'),
  ('public.team_functional_roles.role_label', 'Role label', 'The name of the functional role as people on this team see it.', '- Integration Specialist', NULL, NULL, 'resources_teams'),
  ('public.team_functional_roles.required_skills', 'Required skills', 'Skills this role needs on the team. One skill per line.', '- Contract testing\n- Message queues', NULL, NULL, 'resources_teams'),
  ('public.team_functional_roles.sort_order', 'Sort order', 'Controls the order of roles in pickers. Lower numbers appear first.', '- 10', NULL, NULL, 'resources_teams')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.practice_team_members.allocation_start_date', 'public.team_members.allocation_start_date'),
  ('sim.practice_team_members.allocation_end_date', 'public.team_members.allocation_end_date'),
  ('sim.practice_team_members.member_comments', 'public.team_members.member_comments'),
  ('sim.practice_team_members.user_id', 'public.team_members.user_id'),
  ('sim.practice_team_members.member_role', 'public.team_members.member_role'),
  ('sim.practice_team_members.allocation_percentage', 'public.team_members.allocation_percentage'),
  ('sim.practice_team_functional_roles.role_label', 'public.team_functional_roles.role_label'),
  ('sim.practice_team_functional_roles.required_skills', 'public.team_functional_roles.required_skills'),
  ('sim.practice_team_functional_roles.sort_order', 'public.team_functional_roles.sort_order')
ON CONFLICT (alias_key) DO UPDATE SET
  help_key = EXCLUDED.help_key;
