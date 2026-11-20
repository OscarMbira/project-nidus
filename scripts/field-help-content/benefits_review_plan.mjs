// v1345 slice 3, wave 3f — benefits review plan field help (source for SQL/v1520).
// Platform: public.benefits_review_plans + benefits_review_plan_benefits / _resources / _distribution / _revisions,
// benefits_review_schedule, dis_benefits. Simulator: sim.practice_benefits_review_plans (3 fields).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const LINES = 'One item per line.'
const PL = 'public.benefits_review_plans.'
const CV = 'public.benefits_review_plan_benefits.'
const RS = 'public.benefits_review_plan_resources.'
const DS = 'public.benefits_review_plan_distribution.'
const RV = 'public.benefits_review_plan_revisions.'
const SC = 'public.benefits_review_schedule.'
const DB = 'public.dis_benefits.'
const SP = 'sim.practice_benefits_review_plans.'

export const MODULE = 'benefits_review_plan'
export const ROWS = [
  // ── Plan details ──
  [PL + 'plan_title', 'Plan title', 'A clear title for the benefits review plan.', ['Dubai Branch Network Refresh – benefits review plan']],
  [PL + 'document_ref', 'Document reference', 'The reference used in your document management system.', ['DOC-PMO-0611']],
  [PL + 'version_number', 'Version number', 'The version of this plan. Raise it each time the plan is reissued.', ['1.0']],
  [PL + 'release', 'Release', 'Which release or issue of the plan this is, if your organisation tracks releases.', ['Baseline for board approval']],
  [PL + 'plan_date', 'Plan date', 'The date this version of the plan was written.', ['{example_date}'], DF],
  [PL + 'author_user_id', 'Author', 'The person who wrote the plan.', ['Project Manager']],
  [PL + 'owner_user_id', 'Owner', 'The person accountable for the plan, usually the senior person who owns the benefits.', ['Head of Retail Banking']],
  [PL + 'client', 'Client', 'The person or body the benefits are for.', ['Retail Banking division']],
  [PL + 'project_id', 'Project', 'The project whose benefits this plan reviews.', ['Dubai Branch Network Refresh']],
  [PL + 'programme_id', 'Programme', 'The programme the benefits contribute to, if any.', ['Branch Modernisation Programme']],
  [PL + 'status', 'Status', 'Where the plan is in its approval life.', ['Pending approval']],

  // ── Sections ──
  [PL + 'benefits_coverage_notes', 'Benefits coverage notes', 'Which benefits the plan will measure and review, in summary.', ['Lower branch running costs', 'Same-day account opening'], LINES],
  [PL + 'accountability_description', 'Accountability', 'Who is accountable for achieving each benefit and for reviewing it.', ['The Head of Retail Banking owns all branch benefits; the PMO runs the reviews.']],
  [PL + 'measurement_approach', 'Benefits measurement approach', 'How the benefits will be measured: the data, the method and who collects it.', ['Monthly branch cost report from Finance', 'Account opening times from the branch system'], LINES],
  [PL + 'resources_description', 'Resources description', 'The people, systems and money needed to carry out the reviews.', ['PMO analyst – 2 days each quarter', 'Finance report access'], LINES],
  [PL + 'estimated_review_effort_hours', 'Estimated effort (hours)', 'The total hours expected to run the reviews.', ['120']],
  [PL + 'estimated_review_cost', 'Estimated cost', 'The expected cost of running the reviews.', ['15,000'], AM],
  [PL + 'review_cost_currency', 'Currency', 'The currency the review cost is in.', ['GBP']],
  [PL + 'baseline_measures_description', 'Baseline measures', 'The starting values the benefits will be compared with.', ['Branch running cost 2.6m a year; account opening averages 3 days.']],
  [PL + 'baseline_recording_date', 'Baseline recording date', 'When the baseline values were taken.', ['{example_date}'], DF],
  [PL + 'baseline_source', 'Baseline source', 'Where the baseline values came from.', ['Finance cost report for the last full year']],
  [PL + 'performance_review_approach', 'Performance review approach', 'How and when benefit performance will be reviewed, and by whom.', ['Quarterly review by the PMO with the benefit owner; results reported to the board.']],
  [PL + 'performance_review_frequency', 'Review frequency', 'How often performance is reviewed.', ['Quarterly']],
  [PL + 'performance_review_criteria', 'Review criteria', 'What each review checks.', ['Is the benefit on track against its target?', 'Are any dis-benefits growing?'], LINES],
  [PL + 'dis_benefits_included', 'Dis-benefits considered', 'Tick to measure and review dis-benefits (negative outcomes) as well as benefits.', ['Ticked']],
  [PL + 'dis_benefits_description', 'Dis-benefits for measurement and review', 'Each dis-benefit and how it will be measured.', ['Short dip in productivity during training – track via queue times'], LINES],

  // ── Benefits coverage (one row per benefit) ──
  [CV + 'benefit_id', 'Benefit', 'The benefit from the benefits register this plan will review.', ['Lower branch running costs']],
  [CV + 'measurement_frequency', 'Measurement frequency', 'How often this benefit is measured.', ['Monthly']],
  [CV + 'priority', 'Priority', 'How important this benefit is to review.', ['High']],
  [CV + 'accountable_user_id', 'Accountable person', 'The person accountable for this benefit being achieved.', ['Head of Retail Banking']],
  [CV + 'next_review_date', 'Next review date', 'When this benefit is next reviewed.', ['{example_date}'], DF],
  [CV + 'measurement_timing_reason', 'Measurement timing reason', 'Why the benefit is measured at that frequency.', ['Cost savings show in the monthly finance report.']],

  // ── Review resources (one row per resource) ──
  [RS + 'resource_type', 'Resource type', 'What kind of resource is needed.', ['Person']],
  [RS + 'resource_name', 'Resource name', 'A short name for the resource.', ['PMO benefits analyst']],
  [RS + 'assigned_user_id', 'Assigned user', 'The person providing the resource, if it is a person.', ['PMO Analyst']],
  [RS + 'availability_confirmed', 'Availability confirmed', 'Tick once the resource’s availability has been agreed.', ['Ticked']],
  [RS + 'skill_required', 'Skill required', 'The skill the resource must have.', ['Financial analysis']],
  [RS + 'skill_level', 'Skill level', 'How skilled the resource needs to be.', ['Intermediate']],
  [RS + 'estimated_effort_hours', 'Estimated effort (hours)', 'The hours this resource is expected to spend.', ['40']],
  [RS + 'estimated_cost', 'Estimated cost', 'What this resource is expected to cost.', ['4,000'], AM],
  [RS + 'cost_currency', 'Currency', 'The currency of the cost.', ['GBP']],
  [RS + 'required_from_date', 'Required from', 'When the resource is first needed.', ['{example_date}'], DF],
  [RS + 'required_to_date', 'Required to', 'When the resource is no longer needed.', ['{example_date}'], DF],
  [RS + 'resource_description', 'Resource description', 'What the resource will do.', ['Collects branch cost data and prepares the quarterly benefits report.']],
  [RS + 'notes', 'Notes', 'Anything else to know about this resource.', ['Shared with the Card Services programme.']],

  // ── Review schedule (one row per review) ──
  [SC + 'review_name', 'Review name', 'A short name for the review.', ['Q1 benefits review']],
  [SC + 'review_type', 'Review type', 'The kind of review.', ['Benefit Review']],
  [SC + 'benefit_id', 'Benefit', 'The benefit this review covers. Leave blank to review all benefits.', ['Lower branch running costs']],
  [SC + 'planned_date', 'Planned date', 'When the review is planned.', ['{example_date}'], DF],
  [SC + 'forecast_date', 'Forecast date', 'When the review is now expected, if it has moved.', ['{example_date}'], DF],
  [SC + 'review_duration_hours', 'Duration (hours)', 'How long the review takes.', ['2']],
  [SC + 'reviewer_user_id', 'Reviewer', 'The person who leads the review.', ['PMO Lead']],
  [SC + 'is_virtual', 'Virtual / remote review', 'Tick if the review is held online.', ['Ticked']],
  [SC + 'meeting_link', 'Meeting link', 'The link to join an online review.', ['https://meet.company.example/q1-benefits']],
  [SC + 'review_location', 'Review location', 'Where an in-person review is held.', ['Board room, London office']],
  [SC + 'review_description', 'Review description', 'What the review will cover.', ['Check Q1 savings against the target and agree any actions.']],
  [SC + 'outcome_summary', 'Outcome summary', 'The overall result of the review.', ['Savings 8% above target; benefit on track.']],
  [SC + 'findings', 'Findings', 'What the review found.', ['Overtime costs fell faster than expected in Dubai branches.']],
  [SC + 'recommendations', 'Recommendations', 'What the review recommends.', ['Raise the year-two savings target by 5%.']],
  [SC + 'action_items', 'Action items', 'Actions agreed at the review, with owners.', ['Update the benefits register – PMO Analyst']],
  [SC + 'review_report_url', 'Review report URL', 'A link to the full review report.', ['https://documents.company.example/benefits/q1-review']],

  // ── Dis-benefits (one row per dis-benefit) ──
  [DB + 'dis_benefit_code', 'Dis-benefit code', 'A short code for the dis-benefit.', ['DB-003']],
  [DB + 'dis_benefit_name', 'Dis-benefit name', 'A short name for the negative outcome.', ['Longer queues during training']],
  [DB + 'dis_benefit_category', 'Category', 'Who or what the dis-benefit affects.', ['Customer']],
  [DB + 'impact_severity', 'Impact severity', 'How serious the impact is.', ['Medium']],
  [DB + 'impact_probability', 'Impact probability (%)', 'How likely the dis-benefit is to happen.', ['60'], 'A percentage from 0 to 100.'],
  [DB + 'status', 'Status', 'Where the dis-benefit stands.', ['Identified']],
  [DB + 'mitigation_owner_user_id', 'Mitigation owner', 'The person responsible for reducing the dis-benefit.', ['Branch Operations Manager']],
  [DB + 'mitigation_status', 'Mitigation status', 'How far the mitigation has got.', ['In progress']],
  [DB + 'measurable', 'Measurable', 'Tick if the dis-benefit can be measured with a number.', ['Ticked']],
  [DB + 'measurement_unit', 'Measurement unit', 'The unit the dis-benefit is measured in.', ['Minutes of waiting time']],
  [DB + 'baseline_value', 'Baseline value', 'The value before the project started.', ['8']],
  [DB + 'dis_benefit_description', 'Dis-benefit description', 'What the negative outcome is.', ['Customers wait longer while branch staff are away training.']],
  [DB + 'impact_description', 'Impact description', 'How the dis-benefit affects people or the business.', ['Average waiting time may rise by 10 minutes at peak hours.']],
  [DB + 'mitigation_approach', 'Mitigation approach', 'How the dis-benefit will be reduced.', ['Train in small groups and add relief tellers on Saturdays.']],

  // ── Distribution (one row per recipient) ──
  [DS + 'recipient_user_id', 'Select user', 'A person in the system who receives the plan. Optional if you enter a name instead.', ['Chief Financial Officer']],
  [DS + 'recipient_name', 'Name', 'The recipient’s name or role.', ['Chief Financial Officer']],
  [DS + 'recipient_title', 'Title', 'The recipient’s job title.', ['Chief Financial Officer']],
  [DS + 'recipient_email', 'Email', 'Where the plan is sent.', ['cfo@company.example']],
  [DS + 'distribution_method', 'Distribution method', 'How the plan is shared with this person.', ['Email']],

  // ── Revision history (one row per revision) ──
  [RV + 'revision_date', 'Revision date', 'When this revision was made.', ['{example_date}'], DF],
  [RV + 'revision_number', 'Revision number', 'The number of this revision.', ['1.1']],
  [RV + 'summary_of_changes', 'Summary of changes', 'What changed in this revision.', ['Added the Q3 review dates; raised the cost savings target.']],
  [RV + 'changes_marked', 'Changes marked in document', 'Tick if the changes are highlighted in the document itself.', ['Ticked']],

  // ── Simulator practice plan ──
  [SP + 'scope_description', 'Scope description', 'Which benefits and which period the plan covers.', ['All branch benefits from go-live until two years after the project closes.']],
]

export const ALIASES = [
  [SP + 'plan_title', PL + 'plan_title'],
  [SP + 'measurement_approach', PL + 'measurement_approach'],
]
