// v1345 slice 4, wave 4p — public form top-up: the email box on the email-confirmation page (resend the link).
// module_code 'public_forms' so anonymous visitors may read it (v1546 policy).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]

export const MODULE = 'public_forms'
export const ROWS = [
  t('public.email_confirmation.email', 'Email address', 'The email you signed up with. We send a new confirmation link to it.', 'sam.example@company.example', null, 'Check your spam folder if the link does not arrive within a few minutes.'),
]
