-- ============================================================================
-- v1345 slice 4 wave 4o — public forms (sign in, sign up, password reset, accept invitation, request a demo)
-- ============================================================================
-- Generated from scripts/field-help-content/public_forms.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 24 help entries, module_code 'public_forms'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490, v1546.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.sign_in.email', 'Email address', 'The email you signed up with.', '- project.manager@company.example', NULL, NULL, 'public_forms'),
  ('public.sign_in.password', 'Password', 'Your password. Use “Forgot password” if you can’t remember it.', '- Your password', NULL, NULL, 'public_forms'),
  ('public.sign_up.platform', 'Platform', 'Which product you are signing up for: the project management platform or the simulator.', '- Platform', NULL, NULL, 'public_forms'),
  ('public.sign_up.first_name', 'First name', 'Your first name as colleagues know it.', '- Sam', NULL, NULL, 'public_forms'),
  ('public.sign_up.last_name', 'Last name', 'Your surname.', '- Example', NULL, NULL, 'public_forms'),
  ('public.sign_up.full_name', 'Your name', 'Your name as colleagues should see it.', '- Sam Example', NULL, NULL, 'public_forms'),
  ('public.sign_up.email', 'Email address', 'Use your work email. We send a link to confirm it.', '- sam.example@company.example', NULL, NULL, 'public_forms'),
  ('public.sign_up.password', 'Password', 'A password for your account. A long phrase is easiest to remember and hardest to guess.', '- A phrase of four or more words', 'At least 8 characters.', NULL, 'public_forms'),
  ('public.sign_up.confirm_password', 'Confirm password', 'Type the same password again to check it.', '- The same password', NULL, NULL, 'public_forms'),
  ('public.password_reset.email', 'Email address', 'The email on your account. We send a reset link to it.', '- sam.example@company.example', NULL, NULL, 'public_forms'),
  ('public.password_reset.new_password', 'New password', 'The password you want to use from now on.', '- A phrase you have not used before', 'At least 8 characters.', NULL, 'public_forms'),
  ('public.invitation_accept.professional_role_id', 'Professional role', 'Your usual job role. It helps tailor menus and suggestions; you can change it later.', '- Project Manager', NULL, NULL, 'public_forms'),
  ('public.invitation_accept.email', 'Email', 'The email the invitation was sent to. It becomes your sign-in.', '- sam.example@company.example', NULL, NULL, 'public_forms'),
  ('public.invitation_accept.password', 'Password', 'Your existing password, if you already have an account.', '- Your password', NULL, NULL, 'public_forms'),
  ('public.invitation_accept.set_password', 'Set password', 'A password for your new account.', '- A phrase of four or more words', 'At least 8 characters.', NULL, 'public_forms'),
  ('public.invitation_accept.confirm_password', 'Confirm password', 'Type the same password again to check it.', '- The same password', NULL, NULL, 'public_forms'),
  ('public.demo_requests.full_name', 'Full name', 'Your name, so we know who to ask for.', '- Sam Example', NULL, NULL, 'public_forms'),
  ('public.demo_requests.email', 'Email address', 'Where we send the demo invitation.', '- sam.example@company.example', NULL, NULL, 'public_forms'),
  ('public.demo_requests.company', 'Company name', 'The organisation you work for.', '- Example Freight Ltd', NULL, NULL, 'public_forms'),
  ('public.demo_requests.phone', 'Phone number', 'A number we can call if email does not reach you.', '- +44 20 7946 0123', NULL, NULL, 'public_forms'),
  ('public.demo_requests.preferred_date', 'Preferred date', 'A day that suits you for the demo.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'public_forms'),
  ('public.demo_requests.preferred_time', 'Preferred time', 'A time that suits you, in your own time zone.', '- 14:00', NULL, NULL, 'public_forms'),
  ('public.demo_requests.team_size', 'Team size', 'Roughly how many people would use the product.', '- 11–50', NULL, NULL, 'public_forms'),
  ('public.demo_requests.message', 'Additional information', 'Anything you would like the demo to cover.', '- We run about 20 projects a year and want to see the risk register.', NULL, NULL, 'public_forms')
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
