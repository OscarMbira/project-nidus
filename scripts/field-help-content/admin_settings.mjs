// v1345 slice 4, wave 4k — organisation admin and settings field help (source for SQL/v1537).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
import fs from 'node:fs'
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]

const AC = 'public.accounts.'
const AI = 'public.ai_settings.'
const DE = 'public.draft_expiry_config.'
const EM = 'public.email_configurations.'
const BR = 'public.organisation_branding.'
const IN = 'public.organisation_invitations.'
const PA = 'public.project_assignments.'
const TS = 'public.project_timesheet_settings.'
const RO = 'public.roles.'
const US = 'public.users.'
const OVR = 'Tick Override first to change it for this project; otherwise the organisation default applies.'

export const MODULE = 'admin_settings'
export const ROWS = [
  // Organisation settings on the accounts row
  t(AC + 'default_methodology', 'Default methodology', 'The delivery approach new portfolios, programmes and projects start with.', 'Hybrid'),
  t(AC + 'allow_project_methodology_override', 'Allow methodology override', 'Tick to let a portfolio, programme or project choose a different approach from the organisation default.', 'Ticked'),
  t(AC + 'form_bulk_approve_max', 'Form bulk approve limit', 'The most form submissions an approver can approve in one go.', '25'),
  t(AC + 'project_invitation_expiry_days', 'Default expiry (days)', 'How many days a project invitation stays valid before the person must be invited again.', '7', null, 'Each invitation can still choose a different expiry when it is sent.'),

  // AI settings
  t(AI + 'ai_enabled', 'AI features on', 'Tick to let people in your organisation use the AI assistant and AI drafting.', 'Ticked'),
  t(AI + 'conversation_retention_months', 'Keep conversations for (months)', 'How long AI conversations are kept before they are deleted.', '12'),
  t(AI + 'audit_retention_months', 'Keep usage records for (months)', 'How long records of AI use are kept for audit.', '24'),
  t(AI + 'report_language_code', 'Language for AI-drafted reports', 'The language the AI writes report drafts in.', 'English'),

  // Draft expiry rules
  t(DE + 'entity_type', 'Entity type', 'The kind of record this expiry rule applies to. Leave blank to use the project type instead.', 'Risk'),
  t(DE + 'project_type_id', 'Project type', 'The project type this expiry rule applies to. Leave blank to use the entity type instead.', 'Infrastructure'),
  t(DE + 'expiry_days', 'Expiry days', 'Days a saved draft is kept before it is removed.', '30'),
  t(DE + 'warning_days', 'Warning days', 'Days before expiry when the owner is warned that the draft will be removed.', '3'),

  // Email delivery
  t(EM + 'api_key', 'Resend API key', 'The secret key from your Resend account that lets the system send email for you.', 're_xxxxxxxx', null, 'Leave blank when editing to keep the current key.'),
  t(EM + 'from_email', 'From email', 'The address emails are sent from. It must be on a domain you have verified with the email provider.', 'projects@company.example'),
  t(EM + 'from_name', 'From name', 'The sender name people see in their inbox.', 'Example Freight Ltd Projects'),
  t(EM + 'reply_to_email', 'Reply-to email', 'Where replies go, if not to the from address.', 'pmo@company.example'),
  t(EM + 'smtp_host', 'SMTP host', 'The address of your mail server.', 'smtp.company.example'),
  t(EM + 'smtp_port', 'Port', 'The port your mail server listens on.', '587', 'Usually 587 (TLS) or 465 (SSL).'),
  t(EM + 'smtp_username', 'Username', 'The account name used to sign in to the mail server.', 'projects@company.example'),
  t(EM + 'smtp_password', 'Password', 'The password or app key for the mail server account.', 'An app password from your mail provider', null, 'Leave blank when editing to keep the current one.'),

  // Seats
  t('public.extra_seat_purchases.quantity', 'Number of seats', 'How many extra user seats to buy for the project.', '10'),

  // Branding
  t(BR + 'app_display_name', 'App display name', 'The name shown in the header in place of the product name.', 'Example Freight Projects', 'Up to 100 characters.'),
  t(BR + 'app_tagline', 'Tagline', 'A short line shown under the app name.', 'Delivering on time, every time', 'Up to 200 characters.'),
  t(BR + 'base_font_size', 'Base font size', 'The text size used across the app for your organisation.', 'Medium'),

  // Roles and menu bundles
  t(RO + 'role_name', 'Role name (internal)', 'The fixed system name of the role, used behind the scenes.', 'qa_test_lead'),
  t(RO + 'display_name', 'Role name', 'The role name people see.', 'QA Test Lead'),
  t(RO + 'description', 'Description', 'What people in this role do.', 'Plans and leads testing for the project.'),
  t(RO + 'role_skills', 'Required skills', 'The skills someone needs to fill this role.', 'Test planning; defect management'),
  t(RO + 'role_level', 'Level', 'How senior the role is. Higher numbers are more senior.', '3'),
  t(RO + 'industry_category_id', 'Industry', 'The industry this role belongs to. Leave blank if it applies to all industries.', 'Construction & Engineering'),
  t(RO + 'is_governance_only', 'Oversight-only', 'Tick for roles that only watch progress, such as a board member or sponsor. They get the read-only Governance Dashboard.', 'Ticked'),
  t(RO + 'menu_layout_key', 'Menu based on', 'Which standard sidebar the role starts from.', 'Team member menu'),
  t(RO + 'start_from_bundle', 'Start from a bundle', 'Copy the menu items of a saved bundle to this role. Later changes to the bundle do not change the role.', 'Finance team pages'),
  t('public.org_menu_bundles.bundle_name', 'Bundle name', 'A name for this set of menu items.', 'Finance team pages'),
  t('public.org_menu_bundles.description', 'Description', 'Which roles the bundle is meant for.', 'Pages finance staff need on every project.'),

  // Invitations
  t(IN + 'invitation_type', 'Invitation type', 'Whether you are inviting someone to a project or as a PMO administrator.', 'Project'),
  t(IN + 'role_id', 'Role', 'The role the person will have once they accept.', 'Project Manager'),
  t(IN + 'project_id', 'Project', 'The project the person is invited to.', 'Warehouse Upgrade'),
  t(IN + 'company_name', 'Organisation / company', 'The organisation the invitation comes from. It is filled in for you.', 'Example Freight Ltd'),
  t(IN + 'invited_first_name', 'First name', 'The first name of the person you are inviting.', 'Sam'),
  t(IN + 'invited_last_name', 'Surname', 'The surname of the person you are inviting.', 'Example'),
  t(IN + 'email', 'Email address', 'Where the invitation is sent.', 'project.manager@company.example'),
  t(IN + 'invitation_expires_at', 'Invitation expires after', 'How long the person has to accept before the link stops working.', 'Organisation default (7 days)'),
  t(IN + 'invitation_message', 'Message', 'An optional note shown in the invitation email.', 'Welcome to the team. Our kick-off is on Monday.'),
  t(IN + 'assign_user_id', 'User', 'The existing user to give the role to.', 'Head of Finance'),

  // Project role assignment
  t(PA + 'project_id', 'Project', 'The project to give the person a role on.', 'Warehouse Upgrade'),
  t(PA + 'user_id', 'User', 'The person to give the role to.', 'Project Coordinator'),
  t(PA + 'role_id', 'Role', 'The role they will have on that project.', 'Team Member'),

  // Project timesheet overrides
  t(TS + 'standard_daily_hours', 'Standard daily hours', 'Normal working hours in a day on this project.', '7.5', null, OVR),
  t(TS + 'max_overtime_per_day', 'Max overtime / day', 'The most overtime hours someone can log in one day.', '2', null, OVR),
  t(TS + 'max_overtime_per_week', 'Max overtime / week', 'The most overtime hours someone can log in one week.', '8', null, OVR),
  t(TS + 'working_days', 'Standard working days', 'The days people normally work on this project.', 'Mon to Fri', null, OVR),

  // Manager assignment limit
  t('public.system_settings.max_manager_assignments', 'Maximum assignments per manager', 'The most portfolios, programmes or projects one manager can be assigned at the same time.', '5'),

  // My profile and password
  t(US + 'full_name', 'Full name', 'Your name as others see it in the app.', 'Sam Example'),
  t(US + 'email', 'Email', 'The address you sign in with and get notifications at.', 'sam.example@company.example'),
  t(US + 'bio', 'Bio', 'A short note about you for your team.', 'Project manager for the London depot programme.'),
  t(US + 'current_password', 'Current password', 'Your password now, to confirm it is you.', 'Your current password'),
  t(US + 'new_password', 'New password', 'The password you want to use from now on.', 'A long phrase you have not used before', 'At least 8 characters.'),
  t(US + 'confirm_password', 'Confirm new password', 'Type the new password again to check it.', 'The same new password'),
]

// The Simulator copies of these screens read the Platform help.
const twin = JSON.parse(fs.readFileSync(new URL('./_twin_aliases_adm.json', import.meta.url), 'utf8'))
const seeded = new Set(ROWS.map((r) => r[0]))
export const ALIASES = twin.filter(([, p]) => seeded.has(p))

// Top-up (SQL/v1538): PMO module pages (packages/modules), missed because the coverage check did not scan
// packages/modules until 2026-11-21. Built separately with TOPUP=1 so v1537 stays as run.
const NT = 'public.pm_template_nodes.'
const OPA = 'public.organisational_process_assets.'
const SR = 'public.process_template_signatory_requirements.'
export const TOPUP_ROWS = [
  t(NT + 'name', 'Name', 'The name of the organisational template.', 'Project closure checklist'),
  t(NT + 'category', 'Category', 'A grouping that helps people find the template.', 'Closing'),
  t(NT + 'description', 'Description', 'What the template is for and when to use it.', 'Steps to close a project and hand over to operations.'),
  t(OPA + 'title', 'Title', 'The title of this document in the template library.', 'Closure checklist (standard)'),
  t(OPA + 'description', 'Description', 'What this document holds.', 'The checklist used for every project closure.'),
  t(OPA + 'document_data', 'Document data (JSON)', 'The document’s content in raw form. Shown only when it cannot be shown as fields.', '{"items": ["Archive files", "Release team"]}', null, 'Edit with care: the text must stay valid JSON.'),
  t(SR + 'scope_type', 'Scope', 'The level these signatory rules apply at: the whole organisation, a portfolio, a programme or a project.', 'Programme'),
  t(SR + 'scope_id', 'Portfolio / programme / project', 'Which portfolio, programme or project the rules apply to.', 'Branch Modernisation Programme'),
  t(SR + 'table_name', 'Document types', 'The documents that need these signatories before they can be locked.', 'Project charter; closure report'),
]
export const TOPUP_ALIASES = TOPUP_ROWS.map((r) => [r[0].replace(/^public\./, 'sim.'), r[0]])
