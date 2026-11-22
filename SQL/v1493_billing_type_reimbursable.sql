-- v1493: Add Cost Reimbursable to project Billing Type options
-- Extends projects.billing_type check + project_attribute_options seed (rule 25.1).

BEGIN;

-- Allow the new code on public.projects (and migrate short-lived 'reimbursable' if present)
UPDATE public.projects
SET billing_type = 'cost_reimbursable', updated_at = NOW()
WHERE billing_type = 'reimbursable';

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_billing_type_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_billing_type_check
  CHECK (
    billing_type IS NULL
    OR billing_type IN ('time_and_material', 'fixed_price', 'cost_reimbursable')
  );

COMMENT ON COLUMN public.projects.billing_type IS
  'Billing classification: time_and_material, fixed_price, cost_reimbursable, or NULL (unset).';

-- Same for sim.projects when present
DO $$
BEGIN
  IF to_regclass('sim.projects') IS NOT NULL THEN
    EXECUTE $u$UPDATE sim.projects SET billing_type = 'cost_reimbursable', updated_at = NOW()
      WHERE billing_type = 'reimbursable'$u$;
    EXECUTE 'ALTER TABLE sim.projects DROP CONSTRAINT IF EXISTS projects_billing_type_check';
    EXECUTE 'ALTER TABLE sim.projects DROP CONSTRAINT IF EXISTS sim_projects_billing_type_check';
    EXECUTE $c$ALTER TABLE sim.projects ADD CONSTRAINT sim_projects_billing_type_check
      CHECK (
        billing_type IS NULL
        OR billing_type IN ('time_and_material', 'fixed_price', 'cost_reimbursable')
      )$c$;
  END IF;
END $$;

-- Drop the short-lived reimbursable option row if it was seeded earlier from this file
DELETE FROM public.project_attribute_options
WHERE attribute = 'billing_type' AND code = 'reimbursable';

INSERT INTO public.project_attribute_options (attribute, code, label, description, display_order)
VALUES (
  'billing_type',
  'cost_reimbursable',
  'Cost Reimbursable',
  'Costs billed back as incurred (cost-plus / pass-through recovery).',
  30
)
ON CONFLICT (attribute, code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

COMMIT;
