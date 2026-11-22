// v1345 slice 4, wave 4o — onboarding, organisation profile, project statuses / types, lifecycle templates,
// assignment roles, email sender profiles, data breach records, PMIS gap modules (integrations, intake forms,
// vendors, skills, training, guest access, client portals, notification preferences, project cloning), Planner pages.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
import fs from 'node:fs'
const DF = 'Dates show as {date_format}.'
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]
const d = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const active = (P, what) => t(P + 'is_active', 'Active', `Tick to make this ${what} available.`, 'Ticked')

const OR = 'public.organisations.'
const AC = 'public.accounts.'
export const MODULE = 'onboarding_pmis'
export const ROWS = [
  // Organisation set-up and profile
  t(OR + 'name', 'Organisation name', 'The name people in your organisation will see.', 'Example Freight Ltd'),
  t(OR + 'type', 'Organisation type', 'The kind of organisation.', 'Private company'),
  t(OR + 'company_name', 'Legal company name', 'The registered legal name, if different.', 'Example Freight Holdings Ltd'),
  t(OR + 'country_id', 'Country', 'The country your organisation is based in.', 'United Kingdom'),
  t(OR + 'phone', 'Phone number', 'The main contact number.', '+44 20 7946 0123'),
  t(OR + 'size', 'Organisation size', 'Roughly how many people work there.', '51–200'),
  t(OR + 'website', 'Website', 'Your organisation’s website.', 'https://www.company.example'),
  t(OR + 'contact_person', 'Contact person', 'Who we contact about the account.', 'Head of PMO'),
  t(OR + 'email', 'Email', 'The main contact email for the organisation.', 'pmo@company.example'),
  t(OR + 'billing_email', 'Billing email', 'Where invoices and payment notices are sent.', 'accounts@company.example'),
  t(OR + 'full_address', 'Full address', 'The organisation’s postal address.', '1 Example Street, London'),
  t(OR + 'registration_reference', 'Registration reference', 'The company registration number, if you have one.', '01234567'),
  t(OR + 'pmo_admin_access', 'PMO Admin access', 'Tick to also give yourself PMO Admin rights, so you can set up industries, templates and roles.', 'Ticked'),
  t(OR + 'industry', 'Industry', 'The main industry your organisation works in.', 'Logistics'),

  // Account and first project (sign-up wizards)
  t(AC + 'account_name', 'Account name', 'The name of your account or workspace.', 'Example Freight PMO'),
  t(AC + 'account_type', 'Account type', 'Whether the account is for one person, a team or a whole organisation.', 'Organisation'),
  t(AC + 'company_name', 'Company name', 'The organisation that owns the account.', 'Example Freight Ltd'),
  t(AC + 'billing_email', 'Billing email', 'Where invoices are sent.', 'accounts@company.example'),
  t(AC + 'first_project_name', 'Project name', 'The name of your first project.', 'Warehouse Upgrade'),
  t(AC + 'first_project_description', 'Project description', 'What the first project will deliver.', 'Upgrade the main warehouse.'),
  d(AC + 'first_project_start_date', 'Start date', 'When the first project starts.'),
  d(AC + 'first_project_end_date', 'End date', 'When the first project should finish.'),
  t('public.projects.enabled_subsystems', 'Subsystems', 'Which products this project uses: the project management platform, the simulator, or both.', 'Platform'),
  t('public.projects.member_count', 'Number of team members', 'How many people will work on the project. This sets the seats you pay for.', '8'),

  // Project statuses and types, lifecycle templates, assignment roles
  t('public.project_statuses.status_code', 'Status code', 'A short unique code for the status.', 'ACTIVE'),
  t('public.project_statuses.status_name', 'Status name', 'The name people see.', 'Active'),
  t('public.project_statuses.status_description', 'Description', 'When a project should have this status.', 'Work is under way.'),
  t('public.project_statuses.status_color', 'Colour', 'The colour used for the status in lists and charts.', '#16A34A'),
  t('public.project_statuses.status_icon', 'Icon', 'The icon name shown next to the status.', 'play-circle'),
  t('public.project_statuses.status_order', 'Order', 'Where the status comes in lists; lower numbers first.', '20'),
  t('public.project_statuses.is_initial_status', 'Initial status', 'Tick if new projects start with this status.', 'Ticked'),
  t('public.project_statuses.is_final_status', 'Final status', 'Tick if this status ends a project (for example Closed).', 'Ticked'),
  t('public.project_statuses.is_active_status', 'Active status', 'Tick if projects with this status count as running.', 'Ticked'),
  active('public.project_statuses.', 'status'),
  t('public.project_types.type_code', 'Type code', 'A short unique code for the project type.', 'INFRA'),
  t('public.project_types.type_name', 'Type name', 'The name people see.', 'Infrastructure'),
  t('public.project_types.type_description', 'Description', 'Which projects belong to this type.', 'Building and equipment projects.'),
  t('public.project_types.type_color', 'Colour', 'The colour used for the type in lists and charts.', '#2563EB'),
  t('public.project_types.type_icon', 'Icon', 'The icon name shown next to the type.', 'building'),
  t('public.project_types.type_category', 'Category', 'A grouping for project types.', 'Capital'),
  active('public.project_types.', 'project type'),
  t('public.lifecycle_templates.name', 'Name', 'The name of the lifecycle template.', 'Three-stage delivery'),
  t('public.lifecycle_templates.code', 'Code', 'A short unique code for the template.', 'LC-3STAGE'),
  t('public.lifecycle_templates.description', 'Description', 'The stages the template sets up.', 'Initiate, Deliver, Close.'),
  t('public.lifecycle_templates.sort_order', 'Sort order', 'Where the template comes in lists; lower numbers first.', '10'),
  active('public.lifecycle_templates.', 'template'),
  t('public.assignment_roles.code', 'Code', 'A short unique code for the assignment role.', 'REVIEWER'),
  t('public.assignment_roles.name', 'Name', 'The role name people see when they assign work.', 'Reviewer'),
  t('public.assignment_roles.description', 'Description', 'What someone in this role does on an assignment.', 'Checks the work before it is approved.'),
  t('public.assignment_roles.sort_order', 'Sort order', 'Where the role comes in lists; lower numbers first.', '20'),
  active('public.assignment_roles.', 'role'),

  // Email sender profiles
  t('public.email_sender_profiles.profile_name', 'Profile name', 'A name for this sender profile.', 'Infrastructure projects'),
  t('public.email_sender_profiles.is_default', 'System default', 'Tick to use this profile for every email that has no profile for its project type.', 'Ticked'),
  t('public.email_sender_profiles.project_type_id', 'Project type', 'The project type whose emails use this profile.', 'Infrastructure'),
  t('public.email_sender_profiles.from_name', 'From name', 'The sender name people see.', 'Example Freight PMO'),
  t('public.email_sender_profiles.from_email', 'From email', 'The address emails come from. Its domain must be verified with your email provider.', 'pmo@company.example'),
  t('public.email_sender_profiles.test_email', 'Send test to', 'An address to send a test email to.', 'head.of.pmo@company.example'),

  // Data breach records
  t('public.data_breach_records.breach_type', 'Breach type', 'What kind of breach happened.', 'Lost device'),
  t('public.data_breach_records.severity', 'Severity', 'How serious the breach is.', 'High'),
  t('public.data_breach_records.status', 'Status', 'Where handling of the breach stands.', 'Contained'),
  t('public.data_breach_records.data_types_affected', 'Data types affected', 'Which kinds of personal data were involved.', 'Names; email addresses'),
  t('public.data_breach_records.mitigation_steps', 'Mitigation steps', 'What was done to limit the harm.', 'Device wiped remotely; passwords reset.'),

  // Integrations catalogue
  t('public.integration_catalog.integration_name', 'Integration name', 'The name of the integration.', 'Calendar sync'),
  t('public.integration_catalog.integration_code', 'Code', 'A short unique code for the integration.', 'CAL-SYNC'),
  t('public.integration_catalog.category', 'Category', 'The kind of integration.', 'Productivity'),
  t('public.integration_catalog.description', 'Description', 'What the integration does.', 'Shows project meetings in your calendar.'),
  t('public.integration_catalog.logo_url', 'Logo URL', 'A link to the integration’s logo image.', 'https://cdn.company.example/logos/calendar.png'),
  t('public.integration_catalog.setup_guide_url', 'Setup guide URL', 'A link to the setup instructions.', 'https://docs.company.example/calendar-sync'),
  t('public.integration_catalog.is_available', 'Available', 'Tick if organisations can turn this integration on now.', 'Ticked'),
  t('public.integration_catalog.is_coming_soon', 'Coming soon', 'Tick to show it as coming soon.', 'Not ticked'),
  t('public.integration_catalog.sort_order', 'Sort order', 'Where it comes in the catalogue; lower numbers first.', '10'),

  // Intake forms
  t('public.intake_forms.form_name', 'Form name', 'The name of the intake form.', 'New project request'),
  t('public.intake_forms.form_code', 'Form code', 'A short unique code for the form.', 'INTAKE-PRJ'),
  t('public.intake_forms.target_entity_type', 'Creates a', 'What a submitted form creates.', 'Project request'),
  t('public.intake_forms.project_id', 'Project', 'The project the form belongs to, if any.', 'Warehouse Upgrade'),
  d('public.intake_forms.active_from', 'Active from', 'The first day the form can be used.'),
  d('public.intake_forms.active_to', 'Active to', 'The last day the form can be used.'),
  active('public.intake_forms.', 'form'),

  // Vendors
  t('public.vendors.vendor_name', 'Vendor name', 'The name of the supplier.', 'Example Racking Ltd'),
  t('public.vendors.category', 'Category', 'The kind of supplier.', 'Equipment'),
  t('public.vendors.vendor_code', 'Vendor code', 'A short code for the supplier.', 'V-0042'),
  t('public.vendors.contact_email', 'Contact email', 'The supplier’s contact address.', 'sales@racking.example'),
  t('public.vendors.contact_phone', 'Contact phone', 'The supplier’s contact number.', '+44 20 7946 0456'),
  active('public.vendors.', 'vendor'),
  t('public.vendor_categories.category_name', 'Category name', 'The name of the vendor category.', 'Equipment'),
  t('public.vendor_categories.description', 'Description', 'Which suppliers belong here.', 'Suppliers of machinery and fittings.'),
  active('public.vendor_categories.', 'category'),
  t('public.vendor_ratings.vendor_id', 'Vendor', 'The supplier you are rating.', 'Example Racking Ltd'),
  t('public.vendor_ratings.rating_score', 'Score (1–5)', 'How well the supplier performed, from 1 (poor) to 5 (excellent).', '4'),
  t('public.vendor_ratings.rating_notes', 'Notes', 'Why you gave this score.', 'On time; two items damaged on delivery.'),

  // Skills and training
  t('public.skill_catalog.skill_name', 'Skill name', 'The name of the skill.', 'Risk management'),
  t('public.skill_catalog.category_id', 'Category', 'The group the skill belongs to.', 'Project management'),
  t('public.skill_catalog.skill_code', 'Code', 'A short unique code for the skill.', 'SK-RISK'),
  t('public.skill_catalog.description', 'Description', 'What the skill covers.', 'Finding, assessing and handling project risks.'),
  t('public.skill_requirements.skill_id', 'Skill', 'The skill that is needed.', 'Risk management'),
  t('public.skill_requirements.entity_type', 'Applies to', 'What needs the skill: a role, a task or a work package.', 'Role'),
  t('public.skill_requirements.entity_id', 'Entity', 'The specific role, task or work package that needs it.', 'Risk Manager'),
  t('public.skill_requirements.project_id', 'Project', 'The project, if the need is for one project only.', 'Warehouse Upgrade'),
  t('public.skill_requirements.required_level', 'Required level', 'How skilled the person must be.', 'Advanced'),
  t('public.training_certifications.certification_name', 'Certification name', 'The name of the certification.', 'Advanced risk practitioner'),
  t('public.training_certifications.certification_code', 'Code', 'A short code for the certification.', 'CERT-RISK-ADV'),
  t('public.training_certifications.issuing_body', 'Issuing body', 'Who awards the certification.', 'Example Training Institute'),
  t('public.training_certifications.validity_months', 'Validity (months)', 'How long the certification lasts. Leave blank if it never expires.', '36'),
  t('public.training_records.certification_id', 'Certification', 'The certification this record is for, if any.', 'Advanced risk practitioner'),
  t('public.training_records.title', 'Title', 'The name of the course or training.', 'Risk workshop for team leads'),
  t('public.training_records.record_type', 'Type', 'The kind of training.', 'Course'),
  t('public.training_records.completion_status', 'Status', 'Whether the training is complete.', 'Completed'),
  d('public.training_records.issue_date', 'Issue date', 'When the training was completed or the certificate issued.'),
  d('public.training_records.expiry_date', 'Expiry date', 'When the certificate runs out, if it does.'),
  t('public.training_records.notes', 'Notes', 'Anything else about the training.', 'Paid by the project budget.'),

  // Guest access and client portals
  t('public.guest_access.guest_email', 'Email', 'The email of the person outside your organisation.', 'client.contact@client.example'),
  t('public.guest_access.guest_name', 'Name', 'The guest’s name or role.', 'Client Project Lead'),
  t('public.guest_access.permission_level', 'Permission level', 'What the guest may do: view only, or view and comment.', 'View only'),
  d('public.guest_access.expires_at', 'Expires', 'When the guest’s access ends.'),
  active('public.guest_access.', 'guest access'),
  t('public.client_portals.portal_name', 'Portal name', 'A name for the client portal.', 'Warehouse Upgrade — client view'),
  t('public.client_portals.project_id', 'Project', 'The project the portal shows.', 'Warehouse Upgrade'),
  active('public.client_portals.', 'portal'),

  // Notification preferences
  t('public.notification_preference_templates.template_name', 'Template name', 'A name for this set of notification settings.', 'Project managers — default'),
  t('public.notification_preference_templates.role_name', 'Role', 'The role these settings apply to. Leave blank for all roles.', 'Project Manager'),
  t('public.notification_preference_templates.event_category', 'Event category', 'Which kind of event the settings cover.', 'Approvals'),
  t('public.notification_preference_templates.channel_in_app', 'In-app', 'Tick to show these notifications in the app.', 'Ticked'),
  t('public.notification_preference_templates.channel_email', 'Email', 'Tick to send these notifications by email.', 'Ticked'),
  t('public.notification_preference_templates.channel_push', 'Push', 'Tick to send these notifications to phones.', 'Not ticked'),
  t('public.notification_preference_templates.frequency', 'Frequency', 'How often notifications are sent: straight away or in a digest.', 'Daily digest'),
  t('public.notification_preferences.quiet_hours_start', 'Quiet hours start', 'When notifications stop each evening.', '19:00'),
  t('public.notification_preferences.quiet_hours_end', 'Quiet hours end', 'When notifications start again in the morning.', '08:00'),
  t('public.notification_preferences.muted_project_ids', 'Muted projects', 'Tick the projects you do not want notifications from.', 'Warehouse Upgrade'),

  // Project cloning, portfolio projects, functional roles, EVM
  t('public.project_clones.source_project_id', 'Source project', 'The project to copy.', 'Warehouse Upgrade'),
  t('public.project_clones.date_shift_days', 'Shift dates by (days)', 'How many days to move every date in the copy. Use a minus sign to move dates earlier.', '90'),
  t('public.project_clones.clone_options', 'What to clone', 'Which parts of the project to copy. The project’s core fields are always copied.', 'Tasks; risks; team roles'),
  t('public.project_clones.include_tasks', 'Tasks', 'Tick to copy the project’s tasks.', 'Ticked'),
  t('public.portfolio_projects.portfolio_id', 'Portfolio', 'The portfolio to add the project to.', 'Retail Transformation Portfolio'),
  t('public.portfolio_projects.project_id', 'Project', 'The project to add.', 'Warehouse Upgrade'),
  t('public.project_functional_roles.required_skills', 'Required skills for this project', 'The skills this role needs on this project, one per line.', 'Warehouse systems; health and safety'),
  t('public.project_evm.bac', 'BAC (budget at completion)', 'The total approved budget for the work, used for earned value figures.', '1,200,000', 'Amounts show in {currency}.'),

  // Planner
  t('public.planner_subscriptions.seats', 'Seats', 'How many people can use the planner. You pay per seat.', '10'),
]

// Simulator copies read the Platform help for the same table and column.
const seeded = new Set(ROWS.map((r) => r[0]))
const twin = JSON.parse(fs.readFileSync(new URL('./_twin_aliases_4o.json', import.meta.url), 'utf8'))
const gaps = JSON.parse(fs.readFileSync(new URL('./_sim_gaps_4o.json', import.meta.url), 'utf8'))
export const ALIASES = [...new Map([...twin, ...gaps.map((k) => [k, k.replace(/^sim\./, 'public.')])].filter(([s, p]) => !seeded.has(s) && seeded.has(p))).entries()]
