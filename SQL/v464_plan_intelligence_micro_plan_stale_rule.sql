-- v464: Add intelligence rule for stale overdue micro-plan activities (Phase 6.11)
-- PostgreSQL 15 / Supabase — public + sim mirror

INSERT INTO public.plan_intelligence_rules
  (organisation_id, rule_code, rule_name, rule_description, severity, applies_to, is_system_rule)
VALUES
  (NULL, 'micro_plan_activity_stale', 'Micro-plan activity overdue and stale',
   'Team micro-plan activity is past planned end date with incomplete progress, and has had no update for 3+ days.',
   'warning', 'schedule', TRUE)
ON CONFLICT (organisation_id, rule_code) DO NOTHING;

INSERT INTO sim.plan_intelligence_rules (rule_code, rule_name, rule_description, severity, applies_to)
SELECT rule_code, rule_name, rule_description, severity, applies_to
FROM public.plan_intelligence_rules
WHERE organisation_id IS NULL AND rule_code = 'micro_plan_activity_stale'
ON CONFLICT (rule_code) DO UPDATE SET
  rule_name        = EXCLUDED.rule_name,
  rule_description = EXCLUDED.rule_description,
  severity         = EXCLUDED.severity,
  applies_to       = EXCLUDED.applies_to;
