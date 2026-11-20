-- ============================================================================
-- v1345 slice 3 wave 3c — project brief field help (Platform brief + Simulator practice brief)
-- ============================================================================
-- Generated from scripts/field-help-content/brief.mjs by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- 74 help entries, module_code 'project_brief'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: v1490.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.project_briefs.brief_reference', 'Brief reference', 'The reference that identifies this project brief.', '- BRF-2027-006', NULL, NULL, 'project_brief'),
  ('public.project_briefs.version_number', 'Version number', 'The version of this brief. Raise it each time the brief is reissued.', '- 1.2', NULL, NULL, 'project_brief'),
  ('public.project_briefs.document_ref', 'Document reference', 'The reference used in your document management system, if different.', '- DOC-PMO-0412', NULL, NULL, 'project_brief'),
  ('public.project_briefs.release', 'Release', 'Which release or issue of the brief this is, if your organisation tracks releases.', '- Draft for board review', NULL, NULL, 'project_brief'),
  ('public.project_briefs.created_date', 'Created date', 'When this brief was first written.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'project_brief'),
  ('public.project_briefs.author_id', 'Author', 'The person who wrote the brief.', '- Project Manager', NULL, NULL, 'project_brief'),
  ('public.project_briefs.owner_id', 'Owner', 'The person accountable for the brief and its approval.', '- Project Executive', NULL, NULL, 'project_brief'),
  ('public.project_briefs.client_id', 'Client', 'The person or body the project is being done for.', '- Head of Retail Banking', NULL, NULL, 'project_brief'),
  ('public.project_briefs.background', 'Background', 'The context of the project: what has led to it and why now.', '- Branch account opening takes up to 3 days. The mandate approved a project to replace the teller system before support ends next year.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.project_objectives', 'Project objectives', 'What the project must achieve. Make each one specific and measurable.', E'- All 12 Dubai branches open accounts same day by the end of Q3\n- Branch running costs down 15% within a year of go-live', 'One objective per line.', NULL, 'project_brief'),
  ('public.project_briefs.desired_outcomes', 'Desired outcomes', 'The changes the business wants to see once the project’s outputs are in use.', '- Customers no longer return to the branch to finish opening an account.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.project_scope', 'Project scope', 'What the project will deliver and the work it covers.', '- New account opening system in all Dubai branches, staff training and updated procedures.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.scope_exclusions', 'Scope exclusions', 'What the project will not deliver, so nobody assumes it will.', '- Card processing; branches outside Dubai.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.constraints', 'Constraints', 'Limits the project must work within, such as dates, budget or required systems.', '- Go-live must avoid the year-end freeze; budget no more than 1,500,000.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.assumptions', 'Assumptions', 'Things taken as true for planning that are not yet confirmed.', '- The supplier team stays available until go-live.', NULL, NULL, 'project_brief'),
  ('public.brief_tolerances.tolerance_type', 'Tolerance type', 'What the tolerance limits: time, cost, quality, scope, risk or benefit.', '- Cost', NULL, NULL, 'project_brief'),
  ('public.brief_tolerances.escalation_required', 'Escalation required', 'Tick if going beyond this tolerance must be escalated to the project board.', '- Ticked', NULL, NULL, 'project_brief'),
  ('public.brief_tolerances.tolerance_description', 'Description', 'The tolerance in plain words.', '- The project may spend up to 5% over budget without board approval.', NULL, NULL, 'project_brief'),
  ('public.brief_tolerances.lower_limit', 'Lower limit', 'The lowest acceptable value, if the tolerance has a range.', '- -5', NULL, NULL, 'project_brief'),
  ('public.brief_tolerances.upper_limit', 'Upper limit', 'The highest acceptable value, if the tolerance has a range.', '- 5', NULL, NULL, 'project_brief'),
  ('public.brief_tolerances.absolute_value', 'Absolute value', 'A single fixed limit, if there is no range.', '- 10 days', NULL, NULL, 'project_brief'),
  ('public.brief_tolerances.notes', 'Notes', 'Anything else people need to know about this tolerance.', '- Excludes exchange-rate changes.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.users_and_interested_parties', 'Stakeholders', 'Who will use the project’s outputs and who has an interest in the project.', E'- Branch staff in Dubai\n- Retail customers\n- Compliance team', NULL, NULL, 'project_brief'),
  ('public.project_briefs.interfaces', 'Project interfaces', 'Other projects, systems or teams the project must work with.', E'- Core banking system\n- Identity verification service\n- Branch Modernisation Programme', NULL, NULL, 'project_brief'),
  ('public.project_briefs.outline_business_case_summary', 'Business case summary', 'Why the project is worth doing, in a short paragraph: benefits, costs and timescale.', '- Expected savings of 400,000 a year from lower support costs, for a one-off cost of 1,200,000 over 9 months.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.business_option_selected', 'Business option selected', 'The option chosen from those considered: do nothing, do the minimum, or do something.', '- Do Something', NULL, NULL, 'project_brief'),
  ('public.project_briefs.dis_benefits_included', 'Capture dis-benefits', 'Tick to record the negative effects of this business option.', '- Ticked', NULL, NULL, 'project_brief'),
  ('public.project_briefs.dis_benefits_description', 'Dis-benefits / negative consequences', 'Outcomes some people will see as negative, even if the project succeeds.', '- Branch staff need two days away from the counter for training.', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.product_name', 'Product name', 'The name of something the project will produce.', '- Branch account opening system', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.is_main_product', 'Main project product', 'Tick if this is the project’s main product, the one the whole project delivers.', '- Ticked', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.product_description', 'Product description', 'What the product is, in a sentence or two.', '- The configured system branch staff use to open accounts and check identity in one visit.', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.purpose', 'Purpose', 'Why the product is needed and who will use it.', '- Lets branch staff open accounts same day.', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.composition', 'Composition', 'The main parts that make up the product.', '- Account opening screens, identity check link, reports', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.derivation', 'Derivation', 'What the product is built from or based on.', '- The group’s standard banking platform', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.quality_criteria', 'Quality criteria', 'How the product will be judged acceptable.', E'- An account can be opened in under 20 minutes\n- No critical defects at go-live', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.quality_tolerance', 'Quality tolerance', 'How far the product may fall short of a criterion and still be accepted.', '- Up to 10 minor defects allowed at go-live', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.quality_method', 'Quality method', 'How the product will be checked against the criteria.', '- User acceptance testing by branch staff in London and Dubai', NULL, NULL, 'project_brief'),
  ('public.brief_product_descriptions.format_presentation', 'Format / presentation', 'The form the product takes when handed over.', '- Live system with a printed quick-start guide', NULL, NULL, 'project_brief'),
  ('public.project_briefs.customer_quality_expectations', 'Customer quality expectations', 'What the customer expects the finished result to be like.', '- Fast, simple screens that branch staff can use without a manual.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.user_acceptance_criteria', 'User acceptance criteria', 'Measurable conditions the users must agree are met before they accept the result.', '- Account opened in under 20 minutes in 9 out of 10 tests.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.operations_maintenance_criteria', 'Operations & maintenance criteria', 'What the team that will run and support the product needs.', '- Runbooks in place; support team trained; monitoring alerts set up.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.project_approach_description', 'Project approach description', 'How the project will deliver its products, in outline.', '- Configure the group platform, test in two pilot branches, then roll out in three waves.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.solution_type', 'Solution type', 'Whether the solution is built new, bought, adapted from something existing, or a mix.', '- Customized Existing', NULL, NULL, 'project_brief'),
  ('public.project_briefs.delivery_approach', 'Delivery approach', 'Who does the work: your own staff, a contractor, or both.', '- Hybrid', NULL, NULL, 'project_brief'),
  ('public.project_briefs.development_approach', 'Development approach', 'Whether the work is a new design, a change to something existing, or joining existing parts.', '- Modification', NULL, NULL, 'project_brief'),
  ('public.project_briefs.operational_environment', 'Operational environment', 'Where the result will run and be used.', '- Group data centre in London; used in all Dubai branches.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.approach_justification', 'Approach justification', 'Why this approach was chosen over the others.', '- Reusing the group platform halves the cost and time of a new build.', NULL, NULL, 'project_brief'),
  ('public.project_briefs.team_structure_description', 'Team structure description', 'Who is on the project team and how they report to each other.', '- Project board of three; project manager; two team managers (technology and branch change) with 12 team members.', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.role_name', 'Role name', 'The name of the role on the project.', '- Branch Change Lead', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.role_category', 'Role category', 'The type of role in the project organisation.', '- Team Manager', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.role_description', 'Role description', 'What the role is for, in a sentence or two.', '- Leads the branch staff, process and training work.', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.key_responsibilities', 'Key responsibilities', 'The main things the role is responsible for.', E'- Plan branch training\n- Sign off branch readiness', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.authority_level', 'Authority level', 'What the role may decide or approve without escalating.', '- Can approve branch process changes up to 10,000', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.reporting_to', 'Reporting to', 'The role this role reports to.', '- Project Manager', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.required_skills', 'Required skills', 'Skills the person in the role needs.', '- Change management, training design', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.required_experience', 'Required experience', 'Experience the person in the role should have.', '- Has led branch change in a bank before', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.time_commitment', 'Time commitment', 'How much of their time the role needs.', '- 3 days a week until go-live', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.assigned_to_user_id', 'Assigned to', 'The person currently filling the role, if decided.', '- Branch Operations Manager', NULL, NULL, 'project_brief'),
  ('public.brief_role_descriptions.is_mandatory', 'Mandatory role', 'Tick if the project cannot run without this role being filled.', '- Ticked', NULL, NULL, 'project_brief'),
  ('public.brief_references.reference_type', 'Reference type', 'What kind of document is referenced.', '- Lesson Learned', NULL, NULL, 'project_brief'),
  ('public.brief_references.reference_title', 'Reference title', 'The title of the referenced document.', '- Lessons from the 2025 London branch upgrade', NULL, NULL, 'project_brief'),
  ('public.brief_references.reference_description', 'Description', 'Why the reference matters to this brief.', '- Recommends piloting in two branches before a full rollout.', NULL, NULL, 'project_brief'),
  ('public.brief_references.reference_url', 'URL', 'A link to the document, if it is online.', '- https://documents.company.example/lessons/branch-upgrade-2025', NULL, NULL, 'project_brief'),
  ('public.brief_distribution.recipient_id', 'Recipient', 'A person in your organisation who receives the brief.', '- Head of Retail Banking', NULL, NULL, 'project_brief'),
  ('public.brief_distribution.recipient_name', 'External name', 'The name of someone outside the system who receives the brief, if not picked above.', '- Partner, Example Consulting Ltd', NULL, NULL, 'project_brief'),
  ('public.brief_distribution.recipient_title', 'Title', 'The recipient’s job title.', '- Chief Risk Officer', NULL, NULL, 'project_brief'),
  ('public.brief_distribution.version_distributed', 'Version distributed', 'Which version of the brief they received.', '- 1.2', NULL, NULL, 'project_brief'),
  ('sim.practice_project_briefs.brief_title', 'Brief title', 'A short name for this practice brief.', '- Dubai Branch Network Refresh – brief', NULL, NULL, 'project_brief'),
  ('sim.practice_project_briefs.brief_description', 'Description', 'A short summary of what the brief covers.', '- Brief for replacing the teller system in Dubai branches.', NULL, NULL, 'project_brief'),
  ('sim.practice_project_briefs.project_definition', 'Project definition', 'What the project is, in a few sentences: its purpose, size and main products.', '- A 9-month project to replace the teller system in 12 Dubai branches and train branch staff.', NULL, NULL, 'project_brief'),
  ('sim.practice_project_briefs.quality_approach', 'Quality approach', 'How quality will be planned and checked during the project.', '- Each product reviewed by a team lead; acceptance testing by branch staff before rollout.', NULL, NULL, 'project_brief'),
  ('sim.practice_project_briefs.risk_approach', 'Risk approach', 'How risks will be found, recorded and managed.', '- Risks reviewed weekly by the team and monthly by the board; high risks escalated within 2 days.', NULL, NULL, 'project_brief'),
  ('sim.practice_project_briefs.target_start_date', 'Target start', 'When the project is planned to start.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'project_brief'),
  ('sim.practice_project_briefs.target_end_date', 'Target end', 'When the project is planned to finish. It must be after the start.', '- {example_date}', 'Dates show as {date_format}.', NULL, 'project_brief')
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
  ('sim.practice_project_briefs.project_objectives', 'public.project_briefs.project_objectives'),
  ('sim.practice_project_briefs.project_scope', 'public.project_briefs.project_scope'),
  ('sim.practice_project_briefs.out_of_scope', 'public.project_briefs.scope_exclusions'),
  ('sim.practice_project_briefs.project_approach', 'public.project_briefs.project_approach_description')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;

-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = 'project_brief' AND is_active;
