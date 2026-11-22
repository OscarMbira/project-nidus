// v1345 slice 4, wave 4p — Simulator-only pages (practice plans, data-breach record, portfolio projects,
// add member, manager assignment limit). Simulator keys alias to the Platform rows where the field is the same;
// only the member role has a Simulator-only row.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]

export const MODULE = 'simulator_practice'
export const ROWS = [
  t('sim.practice_project_members.role_name', 'Role', 'The role this person plays on the practice project. It decides what they can see and do there.', 'Team member', null, 'You can change a member’s role later from the members list.'),
]

export const ALIASES = [
  ['sim.data_breach_records.breach_type', 'public.data_breach_records.breach_type'],
  ['sim.data_breach_records.severity', 'public.data_breach_records.severity'],
  ['sim.data_breach_records.status', 'public.data_breach_records.status'],
  ['sim.data_breach_records.data_types_affected', 'public.data_breach_records.data_types_affected'],
  ['sim.data_breach_records.mitigation_steps', 'public.data_breach_records.mitigation_steps'],
  ['sim.practice_project_plans.plan_title', 'public.project_plans.plan_title'],
  ['sim.practice_project_plans.plan_purpose', 'public.project_plans.plan_purpose'],
  ['sim.practice_stage_plans.stage_number', 'public.stage_plans.stage_number'],
  ['sim.practice_stage_plans.stage_title', 'public.stage_plans.stage_name'],
  ['sim.practice_stage_plans.stage_objectives', 'public.stage_plans.stage_objectives'],
  ['sim.portfolio_projects.portfolio_id', 'public.portfolio_projects.portfolio_id'],
  ['sim.portfolio_projects.project_id', 'public.portfolio_projects.project_id'],
]
