// v1345 slice 4, wave 4e — quality & testing field help (source for SQL/v1525).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const date = (key, title, purpose) => [key, title, purpose, ['{example_date}'], DF]
const PCT = 'A percentage from 0 to 100.'
const PP = 'public.project_plans.'
const QR = 'public.quality_register.'
const QI = 'public.quality_inspections.'
const QV = 'public.quality_reviews.'
const QC = 'public.quality_criteria.'
const QA = 'public.quality_activity_actions.'
const QP = 'public.quality_activity_participants.'
const QD = 'public.quality_activity_records.'
const ND = 'public.quality_defects.'
const WQ = 'public.wp_quality_criteria.'
const D = 'public.defects.'
const TC = 'public.test_cases.'
const TST = 'public.test_case_steps.'
const TR = 'public.test_runs.'
const TS = 'public.test_suites.'
const TE = 'public.test_environments.'
const TCR = 'public.tc_test_runs.'
const expectations = (P) => [
  [P + 'customer_quality_expectations', 'Customer quality expectations', 'What the customer expects the product to be like, in their words.', ['Easy for branch staff to use without a manual; never loses a customer record.']],
  [P + 'quality_characteristics', 'Quality characteristics', 'The measurable qualities the product must have.', ['Opens an account in under 20 minutes; 99.9% available in opening hours.']],
  [P + 'expectation_category', 'Category', 'The kind of quality expectation.', ['Performance']],
  [P + 'expectation_description', 'Expectation description', 'One quality expectation, stated so it can be checked.', ['Account opening screens respond in under 2 seconds.']],
  [P + 'priority', 'Priority', 'How important the expectation is.', ['Must have']],
  [P + 'source', 'Source', 'Who raised the expectation.', ['Head of Retail Banking']],
  [P + 'standard_reference', 'Standard reference', 'A standard the expectation comes from, if any.', ['Group accessibility standard v2']],
]

export const MODULE = 'quality'
export const ROWS = [
  // ── Project plan quality ──
  [PP + 'quality_management_strategy_id', 'Quality management strategy', 'The quality strategy this plan follows.', ['QMS – Dubai Branch Network Refresh']],
  [PP + 'quality_summary', 'Quality summary', 'How quality will be managed in this plan, in a few lines.', ['Every product reviewed before sign-off; pilot branches test the full process.']],
  [PP + 'quality_standards', 'Quality standards', 'The standards the products must meet.', ['Group IT change standard; accessibility standard v2']],
  [PP + 'quality_gates', 'Quality gates', 'Checkpoints where quality must be confirmed, written as a JSON list.', ['["Design sign-off", "Pilot exit"]']],

  // ── Quality expectations (project product description and product descriptions) ──
  ...expectations('public.ppd_quality_expectations.'),
  ...expectations('public.pd_quality_expectations.'),
  ['public.pd_quality_expectations.applicable_standards', 'Applicable standards', 'Standards the product must meet.', ['Group accessibility standard v2']],

  // ── Quality register ──
  [QR + 'product_reference', 'Product reference', 'The reference of the product whose quality is tracked.', ['PRD-014']],
  [QR + 'product_name', 'Product name', 'The product or deliverable checked for quality.', ['Branch account opening process']],
  [QR + 'product_type', 'Product type', 'What kind of product it is.', ['Document']],
  [QR + 'product_category', 'Product category', 'A grouping that makes products easier to find.', ['Process design']],
  [QR + 'product_description', 'Description', 'What the product is.', ['Step-by-step process branch staff follow to open an account.']],
  [QR + 'quality_method', 'Quality method', 'How the product’s quality will be checked: review, inspection, testing, audit and so on.', ['Review']],
  [QR + 'quality_owner_user_id', 'Quality owner', 'The person responsible for the product’s quality checks.', ['Quality Lead']],
  date(QR + 'quality_review_planned_date', 'Planned review date', 'When the quality check is planned.'),
  [QR + 'defect_tolerance', 'Defect tolerance', 'How many defects are acceptable before the product fails.', ['No critical defects; up to 5 minor']],
  [QR + 'sign_off_required', 'Sign-off required', 'Tick if someone must formally sign off the product.', ['Ticked']],
  [QR + 'sign_off_by_user_id', 'Sign-off by', 'The person who signs off the product.', ['Head of Retail Operations']],

  // ── Quality inspections ──
  [QI + 'inspection_reference', 'Inspection reference', 'The reference of this inspection.', ['QI-2027-009']],
  [QI + 'inspection_title', 'Inspection title', 'A short name for the inspection.', ['Pilot branch counter set-up check']],
  [QI + 'inspection_type', 'Inspection type', 'How formal the inspection is and who does it.', ['Peer Inspection']],
  [QI + 'inspection_method', 'Inspection method', 'How the inspection is carried out.', ['Checklist']],
  [QI + 'quality_register_id', 'Quality register item', 'The product being inspected.', ['Branch counter set-up']],
  [QI + 'inspection_scope', 'Inspection scope', 'What the inspection covers.', ['All 6 counters in the Dubai main branch.']],
  date(QI + 'inspection_date', 'Inspection date', 'When the inspection takes place.'),
  date(QI + 'forecast_date', 'Forecast date', 'When the inspection is now expected, if it has moved.'),
  date(QI + 'sign_off_planned_date', 'Sign-off planned date', 'When sign-off is planned.'),
  date(QI + 'sign_off_forecast_date', 'Sign-off forecast date', 'When sign-off is now expected.'),
  [QI + 'inspector_user_id', 'Inspector', 'The person who carries out the inspection.', ['Quality Lead']],
  [QI + 'inspection_location', 'Location', 'Where the inspection takes place.', ['Dubai main branch']],
  [QI + 'pass_threshold', 'Pass threshold (%)', 'The score needed to pass.', ['90'], PCT],
  [QI + 'defects_found_count', 'Total defects', 'How many defects were found in all.', ['7']],
  [QI + 'critical_defects_count', 'Critical defects', 'How many defects stop the product being used.', ['0']],
  [QI + 'major_defects_count', 'Major defects', 'How many defects seriously affect the product.', ['2']],
  [QI + 'minor_defects_count', 'Minor defects', 'How many small defects were found.', ['5']],
  [QI + 'inspection_score', 'Inspection score', 'The overall score from the inspection.', ['92'], PCT],
  [QI + 'inspection_result', 'Inspection result', 'The outcome of the inspection.', ['Passed with Conditions']],
  [QI + 'programme_id', 'Programme', 'The programme the inspection belongs to, if any.', ['Branch Modernisation Programme']],
  [QI + 'qms_method_id', 'QMS quality method', 'The quality method from the quality management strategy this follows.', ['Peer inspection with checklist']],
  [QI + 'inspection_findings', 'Inspection findings', 'What the inspection found.', ['Two counters had the wrong printer driver; all else as specified.']],
  [QI + 'corrective_actions_required', 'Corrective actions required', 'What must be fixed after the inspection.', ['Install the correct printer driver on counters 3 and 5.']],
  [QI + 'follow_up_inspection_required', 'Follow-up inspection required', 'Tick if the product must be inspected again.', ['Ticked']],
  date(QI + 'follow_up_inspection_date', 'Follow-up inspection date', 'When the follow-up inspection takes place.'),

  // ── Quality reviews ──
  [QV + 'review_reference', 'Review reference', 'The reference of this quality review.', ['QR-2027-012']],
  [QV + 'review_title', 'Review title', 'A short name for the review.', ['Account opening process review']],
  [QV + 'review_type', 'Review type', 'The kind of quality review.', ['Peer Review']],
  [QV + 'quality_register_id', 'Quality register item', 'The product being reviewed.', ['Branch account opening process']],
  [QV + 'review_scope', 'Review scope', 'What the review covers.', ['The process document and its screen flows.']],
  date(QV + 'planned_date', 'Planned date', 'When the review is planned.'),
  date(QV + 'forecast_date', 'Forecast date', 'When the review is now expected, if it has moved.'),
  date(QV + 'sign_off_planned_date', 'Sign-off planned date', 'When sign-off is planned.'),
  date(QV + 'sign_off_forecast_date', 'Sign-off forecast date', 'When sign-off is now expected.'),
  [QV + 'planned_duration_minutes', 'Duration (minutes)', 'How long the review meeting lasts.', ['90']],
  [QV + 'review_location_type', 'Location type', 'Whether the review is in person, virtual or hybrid.', ['Virtual']],
  [QV + 'review_location', 'Location / meeting link', 'Where the review is held, or the link to join.', ['https://meet.company.example/process-review']],
  [QV + 'chair_user_id', 'Review chair', 'The person who runs the review and makes sure it reaches a result.', ['Quality Lead']],
  [QV + 'secretary_user_id', 'Secretary', 'The person who records actions and the result.', ['Project Support Officer']],
  [QV + 'review_criteria', 'Review criteria', 'What reviewers check the product against.', ['Matches the product description; follows the process standard.']],
  [QV + 'programme_id', 'Programme', 'The programme the review belongs to, if any.', ['Branch Modernisation Programme']],
  [QV + 'qms_method_id', 'QMS quality method', 'The quality method from the quality management strategy this follows.', ['Formal peer review']],
  [QV + 'pass_threshold', 'Pass threshold', 'The result needed to pass.', ['No open major comments']],
  date(QV + 'materials_distribution_date', 'Materials distribution date', 'When reviewers get the material to read.'),
  [QV + 'preparation_required', 'Preparation required', 'Tick if reviewers must read the material before the meeting.', ['Ticked']],
  [QV + 'preparation_time_minutes', 'Preparation time (minutes)', 'How long reviewers need to prepare.', ['60']],

  // ── Quality criteria ──
  [QC + 'criterion_name', 'Criterion name', 'A short name for the quality criterion.', ['Response time']],
  [QC + 'criterion_type', 'Criterion type', 'The kind of criterion.', ['Performance']],
  [QC + 'quality_register_id', 'Product / deliverable', 'The product the criterion applies to.', ['Branch account opening system']],
  [QC + 'measurement_method', 'Measurement method', 'How the criterion is measured.', ['Timed test of 20 account openings']],
  [QC + 'acceptance_threshold', 'Acceptance threshold', 'The value the product must reach.', ['2']],
  [QC + 'measurement_unit', 'Measurement unit', 'The unit of the threshold.', ['seconds']],
  [QC + 'is_mandatory', 'Mandatory criterion', 'Tick if the product fails when this criterion is not met.', ['Ticked']],
  [QC + 'criterion_description', 'Description', 'What the criterion means in practice.', ['Each screen responds within 2 seconds at peak times.']],
  [QC + 'notes', 'Notes', 'Anything else about the criterion.', ['Measured from the branch, not the data centre.']],
  [QC + 'criteria_name', 'Criteria name', 'A short name for the quality criterion.', ['Accessibility']],
  [QC + 'criteria_type', 'Type', 'The kind of criterion.', ['Usability']],
  [QC + 'quality_standard', 'Quality standard', 'The standard the criterion comes from.', ['Group accessibility standard v2']],
  [QC + 'criteria_description', 'Description', 'What the criterion means in practice.', ['All screens usable with a keyboard only.']],

  // ── Quality activity details ──
  [QA + 'action_description', 'Action description', 'What must be done after the quality activity.', ['Fix the two printer driver defects']],
  [QA + 'action_type', 'Action type', 'The kind of follow-up action.', ['Corrective']],
  [QA + 'priority', 'Priority', 'How urgent the action is.', ['High']],
  [QA + 'assigned_to_id', 'Assigned to', 'The person who will do the action.', ['Desktop Support Engineer']],
  date(QA + 'due_date', 'Due date', 'When the action must be done.'),
  [QP + 'user_id', 'User', 'The person taking part.', ['Branch Manager']],
  [QP + 'participant_role', 'Role', 'Their role in the quality activity.', ['Reviewer']],
  [QP + 'responsibilities', 'Responsibilities', 'What they are responsible for in it.', ['Checks the process against branch practice.']],
  [QD + 'record_type', 'Record type', 'The kind of quality record.', ['Review minutes']],
  [QD + 'record_reference', 'Record reference', 'The reference of the record.', ['QR-2027-012-MIN']],
  [QD + 'record_title', 'Record title', 'A short name for the record.', ['Process review minutes']],
  [QD + 'record_description', 'Description', 'What the record contains.', ['Actions and result of the process review.']],
  [QD + 'record_url', 'Record URL / link', 'A link to the record.', ['https://documents.company.example/quality/qr-012-minutes']],
  [QD + 'is_mandatory', 'Mandatory record', 'Tick if this record must exist before sign-off.', ['Ticked']],

  // ── Non-conformance and work-package criteria ──
  [ND + 'defect_title', 'Title', 'A short name for the non-conformance.', ['Counter printer driver not to specification']],
  [ND + 'defect_description', 'Description', 'What does not meet the requirement, and where.', ['Counters 3 and 5 use an older driver than the specification requires.']],
  [ND + 'status', 'Status', 'Where the non-conformance stands.', ['Open']],
  [WQ + 'criteria_title', 'Criteria title', 'A short name for the quality criterion.', ['Printers tested in every branch']],
  [WQ + 'criteria_description', 'Criteria description', 'What must be true for the work package to pass.', ['A test receipt prints from every counter.']],
  [WQ + 'criteria_type', 'Criteria type', 'The kind of criterion.', ['Functional']],
  [WQ + 'quality_method', 'Quality method', 'How it will be checked.', ['Test']],
  [WQ + 'quality_responsible', 'Quality responsible', 'Who checks it.', ['Team Manager']],
  [WQ + 'quality_status', 'Quality status', 'Where the check stands.', ['Passed']],
  date(WQ + 'quality_date', 'Quality date', 'When the check was done.'),
  [WQ + 'quality_result', 'Quality result', 'What the check found.', ['All 12 branches printed a test receipt.']],

  // ── Testing ──
  [D + 'title', 'Title', 'A short name that says what is wrong.', ['Receipt prints twice for business accounts']],
  [D + 'description', 'Description', 'What happens, where and how often.', ['On counter 3, every business account receipt prints twice.']],
  [D + 'environment', 'Environment', 'Where the defect was found.', ['UAT']],
  [D + 'browser_os', 'Browser / OS', 'The browser and operating system used, if relevant.', ['Desktop browser on the branch PC image']],
  [D + 'test_case_id', 'Test case', 'The test case that found the defect, if any.', ['TC-0412 Open business account']],
  [D + 'severity', 'Severity', 'How badly the defect affects users.', ['Major']],
  [D + 'priority', 'Priority', 'How soon the defect must be fixed.', ['High']],
  [D + 'status', 'Status', 'Where the defect stands.', ['Open']],
  [D + 'steps_to_reproduce', 'Steps to reproduce', 'The steps that make the defect happen.', ['1. Open a business account. 2. Click Print receipt.']],
  [D + 'expected_behavior', 'Expected', 'What should happen.', ['One receipt prints.']],
  [D + 'actual_behavior', 'Actual', 'What actually happens.', ['Two receipts print.']],
  [TC + 'title', 'Title', 'A short name that says what the test checks.', ['Open a business account']],
  [TC + 'suite_id', 'Test suite', 'The group of tests this case belongs to.', ['Account opening – UAT']],
  [TC + 'test_type', 'Test type', 'Whether the test is run by hand, automated, or exploratory.', ['Manual']],
  [TC + 'priority', 'Priority', 'How important the test is.', ['High']],
  [TC + 'status', 'Status', 'Where the test case stands.', ['Ready']],
  [TC + 'estimated_duration_minutes', 'Estimated duration (minutes)', 'How long the test takes to run.', ['15']],
  [TC + 'description', 'Description', 'What the test checks and why.', ['Checks a business account can be opened with registry checks.']],
  [TC + 'preconditions', 'Preconditions', 'What must be true before the test starts.', ['Tester signed in as branch staff; test company exists in the registry.']],
  [TC + 'expected_result', 'Overall expected result', 'What should happen at the end of the test.', ['Account opened and receipt printed once.']],
  [TC + 'module_area', 'Module / area', 'The part of the system the test covers.', ['Account opening']],
  [TC + 'requirement_ref', 'Requirement ref', 'The requirement this test proves.', ['FR-014']],
  [TC + 'tags', 'Tags', 'Short words that make the test easy to find.', ['business, registry']],
  [TST + 'action', 'Action', 'What the tester does in this step.', ['Click Print receipt']],
  [TST + 'expected_result', 'Expected result', 'What should happen after the step.', ['One receipt prints']],
  [TST + 'test_data', 'Test data', 'Data the step needs, if any.', ['Company number 01234567']],
  [TR + 'run_name', 'Run name', 'A name for this test run.', ['UAT cycle 2 – account opening']],
  [TR + 'suite_id', 'Suite', 'The test suite being run.', ['Account opening – UAT']],
  [TR + 'environment', 'Environment', 'Where the tests are run.', ['UAT']],
  [TR + 'status', 'Status', 'Where the run stands.', ['In progress']],
  date(TR + 'run_date', 'Run date', 'When the run takes place.'),
  [TR + 'notes', 'Notes', 'Anything else about the run.', ['Printer tests run in the Dubai test branch only.']],
  [TS + 'name', 'Name', 'A short name for the test suite.', ['Account opening – UAT']],
  [TS + 'version', 'Version', 'The version of the suite.', ['1.2']],
  [TS + 'estimated_duration_minutes', 'Estimated duration (minutes)', 'How long the whole suite takes to run.', ['240']],
  [TS + 'description', 'Description', 'What the suite covers.', ['All account opening tests for user acceptance testing.']],
  [TS + 'suite_type', 'Suite type', 'The kind of testing the suite is for.', ['UAT']],
  [TS + 'status', 'Status', 'Where the suite stands.', ['Active']],
  [TS + 'target_environment_id', 'Target environment', 'Where the suite is normally run.', ['UAT']],
  [TS + 'tags', 'Tags', 'Short words that make the suite easy to find.', ['accounts, uat']],
  [TE + 'name', 'Name', 'A short name for the test environment.', ['UAT – Dubai test branch']],
  [TE + 'description', 'Description', 'What the environment is and what it is used for.', ['Full copy of the branch set-up with masked customer data.']],
  [TE + 'is_active', 'Active', 'Tick if the environment can still be used for test runs.', ['Ticked']],
  [TCR + 'suite_id', 'Test suite', 'The test suite to run.', ['Account opening – UAT']],
  [TCR + 'environment_id', 'Environment', 'Where the tests are run.', ['UAT – Dubai test branch']],
]

export const ALIASES = ['name', 'description', 'is_active'].map((c) => ['sim.practice_test_environments.' + c, TE + c])
