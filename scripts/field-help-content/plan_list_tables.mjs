// 2026-11-21 — plan lists moved from JSON to tables (SQL/v1542). Rewrites the help for those fields
// (was "written as JSON") and gives stage dependencies / resource allocation their own keys. Source for SQL/v1543.
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word that means "inside" (SQL editor trap).
const t = (key, title, purpose, ex, fmt = null, extra = null) => [key, title, purpose, [ex], fmt, extra]
const ROW = 'Add one row per item. Click a column heading to sort.'

export const MODULE = 'strategies_plans'
export const ROWS = [
  t('public.project_plans.key_risks', 'Key risks', 'The main risks to the plan: what could happen, how bad it would be, who owns it and the response.', 'Late racking delivery | High | Procurement Lead | Order from a second supplier', ROW),
  t('public.stage_plans.key_risks', 'Key risks', 'The main risks to this stage: what could happen, how bad it would be, who owns it and the response.', 'Scanner shortage | Medium | Team Manager | Borrow scanners from the pilot site', ROW),
  t('public.project_plans.quality_gates', 'Quality gates', 'Checkpoints where quality must be confirmed before work moves on, with the date and what must be true.', 'Design sign-off | {example_date} | Design approved by the Senior User', ROW),
  t('public.stage_plans.quality_gates', 'Quality gates', 'Quality checkpoints in this stage, with the date and what must be true.', 'Racking inspection | {example_date} | Passes the load test', ROW),
  t('public.project_plans.budget_breakdown', 'Budget breakdown', 'How the project budget splits by stage or category.', 'Stage 2 — Build | 650,000 | Includes racking', `${ROW} Amounts show in {currency}.`),
  t('public.stage_plans.budget_breakdown', 'Budget breakdown', 'How the stage budget splits by work package or category.', 'Racking installation | 200,000 | Fixed-price contract', `${ROW} Amounts show in {currency}.`),
  t('public.stage_plans.dependencies', 'Dependencies', 'Things this stage depends on, and whether they are inside or outside the project.', 'Racking delivered by supplier | External | Due before week 4', ROW),
  t('public.stage_plans.resource_allocation', 'Resource allocation', 'Which resources work on which work package, and how much.', 'Racking installation | Installation crew | 3 people for 4 weeks', ROW),
]
export const ALIASES = [
  ['sim.stage_plans.dependencies', 'public.stage_plans.dependencies'],
  ['sim.stage_plans.resource_allocation', 'public.stage_plans.resource_allocation'],
  ['sim.project_plans.key_risks', 'public.project_plans.key_risks'],
  ['sim.stage_plans.key_risks', 'public.stage_plans.key_risks'],
  ['sim.project_plans.quality_gates', 'public.project_plans.quality_gates'],
  ['sim.stage_plans.quality_gates', 'public.stage_plans.quality_gates'],
  ['sim.project_plans.budget_breakdown', 'public.project_plans.budget_breakdown'],
  ['sim.stage_plans.budget_breakdown', 'public.stage_plans.budget_breakdown'],
]
