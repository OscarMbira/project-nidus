-- v1536: Field help for team_members.is_active (My Team member page, v1346 follow-on)
-- Value is stored on public.team_members.is_active (boolean). Prerequisites: v1490.
-- Note: v1535 is used by field_help_portfolio_programme_seed — do not reuse.

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  (
    'public.team_members.is_active',
    'Active',
    'Tick while the person is an active member of this team. Untick when they leave the team but you want to keep the record.',
    '- Ticked',
    NULL,
    NULL,
    'resources_teams'
  )
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
  ('sim.practice_team_members.is_active', 'public.team_members.is_active')
ON CONFLICT (alias_key) DO UPDATE SET
  help_key = EXCLUDED.help_key;
