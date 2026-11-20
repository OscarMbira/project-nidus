// v1345 slice 3, wave 3c — project brief field help (source for SQL/v1517).
// Platform: public.project_briefs + brief_tolerances / brief_product_descriptions / brief_role_descriptions /
// brief_references / brief_distribution. Simulator practice brief: sim.practice_project_briefs — four columns alias
// to the Platform help, the rest have their own sim.* rows (no Platform equivalent).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const B = 'public.project_briefs.'
const T = 'public.brief_tolerances.'
const PD = 'public.brief_product_descriptions.'
const R = 'public.brief_role_descriptions.'
const RF = 'public.brief_references.'
const DS = 'public.brief_distribution.'
const SB = 'sim.practice_project_briefs.'

export const MODULE = 'project_brief'
export const ROWS = [
  // ── Document metadata ──
  [B + 'brief_reference', 'Brief reference', 'The reference that identifies this project brief.', ['BRF-2027-006']],
  [B + 'version_number', 'Version number', 'The version of this brief. Raise it each time the brief is reissued.', ['1.2']],
  [B + 'document_ref', 'Document reference', 'The reference used in your document management system, if different.', ['DOC-PMO-0412']],
  [B + 'release', 'Release', 'Which release or issue of the brief this is, if your organisation tracks releases.', ['Draft for board review']],
  [B + 'created_date', 'Created date', 'When this brief was first written.', ['{example_date}'], DF],
  [B + 'author_id', 'Author', 'The person who wrote the brief.', ['Project Manager']],
  [B + 'owner_id', 'Owner', 'The person accountable for the brief and its approval.', ['Project Executive']],
  [B + 'client_id', 'Client', 'The person or body the project is being done for.', ['Head of Retail Banking']],

  // ── Project definition ──
  [B + 'background', 'Background', 'The context of the project: what has led to it and why now.', ['Branch account opening takes up to 3 days. The mandate approved a project to replace the teller system before support ends next year.']],
  [B + 'project_objectives', 'Project objectives', 'What the project must achieve. Make each one specific and measurable.', ['All 12 Dubai branches open accounts same day by the end of Q3', 'Branch running costs down 15% within a year of go-live'], 'One objective per line.'],
  [B + 'desired_outcomes', 'Desired outcomes', 'The changes the business wants to see once the project’s outputs are in use.', ['Customers no longer return to the branch to finish opening an account.']],

  // ── Scope ──
  [B + 'project_scope', 'Project scope', 'What the project will deliver and the work it covers.', ['New account opening system in all Dubai branches, staff training and updated procedures.']],
  [B + 'scope_exclusions', 'Scope exclusions', 'What the project will not deliver, so nobody assumes it will.', ['Card processing; branches outside Dubai.']],
  [B + 'constraints', 'Constraints', 'Limits the project must work within, such as dates, budget or required systems.', ['Go-live must avoid the year-end freeze; budget no more than 1,500,000.']],
  [B + 'assumptions', 'Assumptions', 'Things taken as true for planning that are not yet confirmed.', ['The supplier team stays available until go-live.']],

  // ── Tolerances (one row per tolerance) ──
  [T + 'tolerance_type', 'Tolerance type', 'What the tolerance limits: time, cost, quality, scope, risk or benefit.', ['Cost']],
  [T + 'escalation_required', 'Escalation required', 'Tick if going beyond this tolerance must be escalated to the project board.', ['Ticked']],
  [T + 'tolerance_description', 'Description', 'The tolerance in plain words.', ['The project may spend up to 5% over budget without board approval.']],
  [T + 'lower_limit', 'Lower limit', 'The lowest acceptable value, if the tolerance has a range.', ['-5']],
  [T + 'upper_limit', 'Upper limit', 'The highest acceptable value, if the tolerance has a range.', ['5']],
  [T + 'absolute_value', 'Absolute value', 'A single fixed limit, if there is no range.', ['10 days']],
  [T + 'notes', 'Notes', 'Anything else people need to know about this tolerance.', ['Excludes exchange-rate changes.']],

  // ── Stakeholders and interfaces ──
  [B + 'users_and_interested_parties', 'Stakeholders', 'Who will use the project’s outputs and who has an interest in the project.', ['Branch staff in Dubai', 'Retail customers', 'Compliance team']],
  [B + 'interfaces', 'Project interfaces', 'Other projects, systems or teams the project must work with.', ['Core banking system', 'Identity verification service', 'Branch Modernisation Programme']],

  // ── Outline business case ──
  [B + 'outline_business_case_summary', 'Business case summary', 'Why the project is worth doing, in a short paragraph: benefits, costs and timescale.', ['Expected savings of 400,000 a year from lower support costs, for a one-off cost of 1,200,000 over 9 months.']],
  [B + 'business_option_selected', 'Business option selected', 'The option chosen from those considered: do nothing, do the minimum, or do something.', ['Do Something']],
  [B + 'dis_benefits_included', 'Capture dis-benefits', 'Tick to record the negative effects of this business option.', ['Ticked']],
  [B + 'dis_benefits_description', 'Dis-benefits / negative consequences', 'Outcomes some people will see as negative, even if the project succeeds.', ['Branch staff need two days away from the counter for training.']],

  // ── Product descriptions (one row per product) ──
  [PD + 'product_name', 'Product name', 'The name of something the project will produce.', ['Branch account opening system']],
  [PD + 'is_main_product', 'Main project product', 'Tick if this is the project’s main product, the one the whole project delivers.', ['Ticked']],
  [PD + 'product_description', 'Product description', 'What the product is, in a sentence or two.', ['The configured system branch staff use to open accounts and check identity in one visit.']],
  [PD + 'purpose', 'Purpose', 'Why the product is needed and who will use it.', ['Lets branch staff open accounts same day.']],
  [PD + 'composition', 'Composition', 'The main parts that make up the product.', ['Account opening screens, identity check link, reports']],
  [PD + 'derivation', 'Derivation', 'What the product is built from or based on.', ['The group’s standard banking platform']],
  [PD + 'quality_criteria', 'Quality criteria', 'How the product will be judged acceptable.', ['An account can be opened in under 20 minutes', 'No critical defects at go-live']],
  [PD + 'quality_tolerance', 'Quality tolerance', 'How far the product may fall short of a criterion and still be accepted.', ['Up to 10 minor defects allowed at go-live']],
  [PD + 'quality_method', 'Quality method', 'How the product will be checked against the criteria.', ['User acceptance testing by branch staff in London and Dubai']],
  [PD + 'format_presentation', 'Format / presentation', 'The form the product takes when handed over.', ['Live system with a printed quick-start guide']],

  // ── Product quality expectations ──
  [B + 'customer_quality_expectations', 'Customer quality expectations', 'What the customer expects the finished result to be like.', ['Fast, simple screens that branch staff can use without a manual.']],
  [B + 'user_acceptance_criteria', 'User acceptance criteria', 'Measurable conditions the users must agree are met before they accept the result.', ['Account opened in under 20 minutes in 9 out of 10 tests.']],
  [B + 'operations_maintenance_criteria', 'Operations & maintenance criteria', 'What the team that will run and support the product needs.', ['Runbooks in place; support team trained; monitoring alerts set up.']],

  // ── Project approach ──
  [B + 'project_approach_description', 'Project approach description', 'How the project will deliver its products, in outline.', ['Configure the group platform, test in two pilot branches, then roll out in three waves.']],
  [B + 'solution_type', 'Solution type', 'Whether the solution is built new, bought, adapted from something existing, or a mix.', ['Customized Existing']],
  [B + 'delivery_approach', 'Delivery approach', 'Who does the work: your own staff, a contractor, or both.', ['Hybrid']],
  [B + 'development_approach', 'Development approach', 'Whether the work is a new design, a change to something existing, or joining existing parts.', ['Modification']],
  [B + 'operational_environment', 'Operational environment', 'Where the result will run and be used.', ['Group data centre in London; used in all Dubai branches.']],
  [B + 'approach_justification', 'Approach justification', 'Why this approach was chosen over the others.', ['Reusing the group platform halves the cost and time of a new build.']],

  // ── Team ──
  [B + 'team_structure_description', 'Team structure description', 'Who is on the project team and how they report to each other.', ['Project board of three; project manager; two team managers (technology and branch change) with 12 team members.']],

  // ── Role descriptions (one row per role) ──
  [R + 'role_name', 'Role name', 'The name of the role on the project.', ['Branch Change Lead']],
  [R + 'role_category', 'Role category', 'The type of role in the project organisation.', ['Team Manager']],
  [R + 'role_description', 'Role description', 'What the role is for, in a sentence or two.', ['Leads the branch staff, process and training work.']],
  [R + 'key_responsibilities', 'Key responsibilities', 'The main things the role is responsible for.', ['Plan branch training', 'Sign off branch readiness']],
  [R + 'authority_level', 'Authority level', 'What the role may decide or approve without escalating.', ['Can approve branch process changes up to 10,000']],
  [R + 'reporting_to', 'Reporting to', 'The role this role reports to.', ['Project Manager']],
  [R + 'required_skills', 'Required skills', 'Skills the person in the role needs.', ['Change management, training design']],
  [R + 'required_experience', 'Required experience', 'Experience the person in the role should have.', ['Has led branch change in a bank before']],
  [R + 'time_commitment', 'Time commitment', 'How much of their time the role needs.', ['3 days a week until go-live']],
  [R + 'assigned_to_user_id', 'Assigned to', 'The person currently filling the role, if decided.', ['Branch Operations Manager']],
  [R + 'is_mandatory', 'Mandatory role', 'Tick if the project cannot run without this role being filled.', ['Ticked']],

  // ── References (one row per reference) ──
  [RF + 'reference_type', 'Reference type', 'What kind of document is referenced.', ['Lesson Learned']],
  [RF + 'reference_title', 'Reference title', 'The title of the referenced document.', ['Lessons from the 2025 London branch upgrade']],
  [RF + 'reference_description', 'Description', 'Why the reference matters to this brief.', ['Recommends piloting in two branches before a full rollout.']],
  [RF + 'reference_url', 'URL', 'A link to the document, if it is online.', ['https://documents.company.example/lessons/branch-upgrade-2025']],

  // ── Distribution (one row per recipient) ──
  [DS + 'recipient_id', 'Recipient', 'A person in your organisation who receives the brief.', ['Head of Retail Banking']],
  [DS + 'recipient_name', 'External name', 'The name of someone outside the system who receives the brief, if not picked above.', ['Partner, Example Consulting Ltd']],
  [DS + 'recipient_title', 'Title', 'The recipient’s job title.', ['Chief Risk Officer']],
  [DS + 'version_distributed', 'Version distributed', 'Which version of the brief they received.', ['1.2']],

  // ── Simulator practice brief: fields with no Platform equivalent ──
  [SB + 'brief_title', 'Brief title', 'A short name for this practice brief.', ['Dubai Branch Network Refresh – brief']],
  [SB + 'brief_description', 'Description', 'A short summary of what the brief covers.', ['Brief for replacing the teller system in Dubai branches.']],
  [SB + 'project_definition', 'Project definition', 'What the project is, in a few sentences: its purpose, size and main products.', ['A 9-month project to replace the teller system in 12 Dubai branches and train branch staff.']],
  [SB + 'quality_approach', 'Quality approach', 'How quality will be planned and checked during the project.', ['Each product reviewed by a team lead; acceptance testing by branch staff before rollout.']],
  [SB + 'risk_approach', 'Risk approach', 'How risks will be found, recorded and managed.', ['Risks reviewed weekly by the team and monthly by the board; high risks escalated within 2 days.']],
  [SB + 'target_start_date', 'Target start', 'When the project is planned to start.', ['{example_date}'], DF],
  [SB + 'target_end_date', 'Target end', 'When the project is planned to finish. It must be after the start.', ['{example_date}'], DF],
]

// Simulator practice brief fields that mean the same as a Platform brief field.
export const ALIASES = [
  [SB + 'project_objectives', B + 'project_objectives'],
  [SB + 'project_scope', B + 'project_scope'],
  [SB + 'out_of_scope', B + 'scope_exclusions'],
  [SB + 'project_approach', B + 'project_approach_description'],
]
