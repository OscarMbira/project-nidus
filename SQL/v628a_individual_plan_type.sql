-- v628a: Add 'individual' plan type to project_micro_plans
-- Allows team members to create personal individual plans
-- Applies to both platform (public) and simulator (sim) schemas

-- ── Platform schema ───────────────────────────────────────────────────────────

ALTER TABLE public.project_micro_plans
  DROP CONSTRAINT IF EXISTS project_micro_plans_plan_type_check;

ALTER TABLE public.project_micro_plans
  ADD CONSTRAINT project_micro_plans_plan_type_check
    CHECK (plan_type IN (
      'individual',
      'team_delivery',
      'quality',
      'risk_response',
      'test',
      'procurement',
      'communications',
      'stakeholder_engagement',
      'change_management',
      'resource',
      'custom'
    ));

-- ── Simulator schema ──────────────────────────────────────────────────────────

ALTER TABLE sim.project_micro_plans
  DROP CONSTRAINT IF EXISTS project_micro_plans_plan_type_check;

ALTER TABLE sim.project_micro_plans
  ADD CONSTRAINT project_micro_plans_plan_type_check
    CHECK (plan_type IN (
      'individual',
      'team_delivery',
      'quality',
      'risk_response',
      'test',
      'procurement',
      'communications',
      'stakeholder_engagement',
      'change_management',
      'resource',
      'custom'
    ));
