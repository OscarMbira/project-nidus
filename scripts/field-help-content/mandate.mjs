// v1345 slice 3, wave 3b — project mandate field help: create, edit and view pages, both apps (source for SQL/v1516).
// Keys: public.project_mandates.<column>, public.mandate_deliverables.<column>, public.mandate_dependencies.<column>;
// Simulator sim.* keys alias to them. Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?].
// CLAUDE.md rule 77 applies: role titles, "Example … Ltd", globally familiar places, no product or brand names.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const LINES = 'One item per line.'
const M = 'public.project_mandates.'
const DL = 'public.mandate_deliverables.'
const DP = 'public.mandate_dependencies.'

export const MODULE = 'project_mandate'
export const ROWS = [
  // ── Basic information ──
  [M + 'mandate_reference', 'Mandate code', 'A short code that identifies this mandate. Leave it blank and the system creates one.', ['MAN-2027-004']],
  [M + 'mandate_title', 'Mandate title', 'A short name for the proposed project.', ['Dubai Branch Network Refresh']],
  [M + 'project_code', 'Project code', 'The code of the project this mandate will become, if already known. Often blank at this stage.', ['PRJ-2027-014']],
  [M + 'project_name', 'Project name', 'The name of the project this mandate will become, if already known.', ['Dubai Branch Network Refresh']],

  // ── Purpose ──
  [M + 'purpose', 'Purpose', 'Why the project is being proposed, in a sentence or two.', ['Give branch customers same-day account opening by replacing the ageing teller system.']],
  [M + 'background', 'Background', 'The situation that led to this mandate: what is happening now and why it matters.', ['Account opening in branches takes up to 3 days and complaints have doubled this year. The teller system is out of support next year.']],
  [M + 'authority_responsible', 'Authority responsible', 'Who is commissioning the project, such as the board, an executive committee or a programme.', ['Executive Committee', 'Retail Transformation Programme'], LINES],

  // ── Scope ──
  [M + 'scope', 'Scope', 'What the project is about and what it will deliver, in outline.', ['Replace the teller system in all Dubai branches', 'Train branch staff on the new system'], LINES],
  [M + 'scope_exclusions', 'Out of scope', 'What the project will deliberately not cover, so nobody assumes it will.', ['Card processing', 'Branches outside Dubai'], LINES],
  [M + 'interfaces', 'Interfaces', 'Other projects, systems or teams this work must connect with.', ['Core banking system', 'Identity verification service', 'Branch Modernisation Programme'], LINES],

  // ── People ──
  [M + 'proposed_executive_name', 'Executive', 'The senior person who would be in overall charge of the project.', ['Chief Operating Officer']],
  [M + 'proposed_pm_name', 'Project manager', 'The person proposed to run the project day to day, if already decided.', ['Senior Project Manager']],

  // ── Objectives and constraints ──
  [M + 'project_objectives', 'Objectives', 'What the project is expected to achieve, such as savings or faster service.', ['Cut account opening from 3 days to same day', 'Reduce branch running costs by 15%'], LINES],
  [M + 'constraints', 'Key constraints', 'Limits the project must work within: a fixed date, a maximum budget, required integrations.', ['Must go live before the year-end freeze', 'Budget no more than 1,500,000'], LINES],
  [M + 'assumptions', 'Assumptions', 'What is being taken as true for planning, though not yet confirmed.', ['The supplier contract is signed by March', 'Branches can close early on one Saturday each'], LINES],
  [M + 'outline_risks', 'Known risks and issues', 'Risks or problems already known at this early stage.', ['Key branch experts are also busy with year-end close'], LINES],

  // ── Quality and case ──
  [M + 'quality_expectations', 'Quality expectations', 'What the customer expects the finished result to be like.', ['Available 99.9% of branch opening hours', 'Account opening screens usable without training'], LINES],
  [M + 'quality_priority', 'Quality priority', 'Which matters most if a trade-off is needed: time, cost or quality, or a balance of all three.', ['Time first']],
  [M + 'outline_business_case', 'Outline business case', 'Why the project is worth doing: expected benefits, a rough cost and how it would be funded.', ['Expected savings of 400,000 a year from lower support costs; estimated cost 1,200,000 from the retail change budget.']],

  // ── Deliverables and dependencies (section headings) ──
  [M + 'key_deliverables', 'Key deliverables', 'The main things the project will produce. Add each one with a rough timeframe.', ['New branch account opening process', 'Trained branch staff']],
  [M + 'dependencies', 'Dependencies', 'Things outside the project that it relies on, or that rely on it.', ['Network upgrade by the infrastructure programme']],

  // ── One deliverable ──
  [DL + 'deliverable_name', 'Deliverable', 'A short name for something the project will produce.', ['New customer onboarding journey']],
  [DL + 'deliverable_description', 'Description', 'What the deliverable is, in a sentence or two.', ['A single screen flow that lets branch staff open an account and check identity in one visit.']],
  [DL + 'estimated_completion', 'Rough timeframe', 'Roughly when it should be ready. A quarter or month is enough at this stage.', ['Q3 2027']],
  [DL + 'is_in_scope', 'In scope', 'Tick if the project will deliver this. Untick for something discussed but left out.', ['Ticked']],
  [DL + 'is_major_deliverable', 'Major deliverable', 'Tick if this is one of the main deliverables the project will be judged on.', ['Ticked']],

  // ── One dependency ──
  [DP + 'dependency_description', 'Dependency', 'What the project depends on, or what depends on the project.', ['Network upgrade in Dubai branches by the infrastructure programme']],
  [DP + 'dependency_type', 'Type', 'Where the dependency sits: inside your organisation, outside it, or both ways between projects.', ['External']],
  [DP + 'dependency_status', 'Status', 'How far the dependency has been worked through.', ['Identified']],
  [DP + 'impact_during_project', 'Affects the project while it runs', 'Tick if the dependency matters while the project is being delivered.', ['Ticked']],
  [DP + 'impact_after_implementation', 'Continues after implementation', 'Tick if the dependency still matters once the project has finished.', ['Not ticked']],
]

// The Simulator mandate pages read the same help (sim.project_mandates and its child tables).
export const ALIASES = ROWS.map(([key]) => [key.replace(/^public\./, 'sim.'), key])
