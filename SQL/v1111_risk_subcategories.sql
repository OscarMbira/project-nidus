-- ============================================================================
-- v1111: System risk sub-categories, filtered by category on the risk form
-- ============================================================================
-- Lookup rows for risks.sub_category. The form stores subcategory_name
-- (VARCHAR 100 on risks.sub_category). System catalog only — organisation_id
-- is not used. Same pattern as the system rows in public.risk_categories
-- (SQL/v790_list_risk_category_options.sql). No display_id: these are stable
-- lookup codes, not generated record references.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risk_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(50) NOT NULL,
  subcategory_code VARCHAR(50) NOT NULL,
  subcategory_name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_risk_subcategories_code UNIQUE (category_code, subcategory_code)
);

CREATE INDEX IF NOT EXISTS idx_risk_subcategories_category
  ON public.risk_subcategories (category_code)
  WHERE is_active = TRUE;

ALTER TABLE public.risk_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS risk_subcategories_select ON public.risk_subcategories;
CREATE POLICY risk_subcategories_select
  ON public.risk_subcategories
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

GRANT SELECT ON public.risk_subcategories TO authenticated;
GRANT SELECT ON public.risk_subcategories TO service_role;

INSERT INTO public.risk_subcategories (category_code, subcategory_code, subcategory_name, display_order)
VALUES
  ('schedule', 'delay', 'Delay', 10),
  ('schedule', 'dependency', 'Dependency', 20),
  ('schedule', 'estimation', 'Estimation', 30),
  ('schedule', 'milestone', 'Milestone', 40),
  ('schedule', 'sequencing', 'Sequencing', 50),

  ('cost', 'budget_overrun', 'Budget overrun', 10),
  ('cost', 'estimate_accuracy', 'Estimate accuracy', 20),
  ('cost', 'funding', 'Funding', 30),
  ('cost', 'exchange_rate', 'Exchange rate', 40),
  ('cost', 'cost_escalation', 'Cost escalation', 50),

  ('quality', 'defect', 'Defect', 10),
  ('quality', 'rework', 'Rework', 20),
  ('quality', 'standard', 'Standard', 30),
  ('quality', 'acceptance', 'Acceptance', 40),
  ('quality', 'nonconformance', 'Nonconformance', 50),

  ('scope', 'scope_creep', 'Scope creep', 10),
  ('scope', 'ambiguity', 'Ambiguity', 20),
  ('scope', 'exclusion', 'Exclusion', 30),
  ('scope', 'change', 'Change', 40),
  ('scope', 'interface', 'Interface', 50),

  ('resource', 'capacity', 'Capacity', 10),
  ('resource', 'skill_gap', 'Skill gap', 20),
  ('resource', 'availability', 'Availability', 30),
  ('resource', 'turnover', 'Turnover', 40),
  ('resource', 'productivity', 'Productivity', 50),

  ('technical', 'design', 'Design', 10),
  ('technical', 'integration', 'Integration', 20),
  ('technical', 'performance', 'Performance', 30),
  ('technical', 'technology', 'Technology', 40),
  ('technical', 'data', 'Data', 50),

  ('legal', 'contract', 'Contract', 10),
  ('legal', 'dispute', 'Dispute', 20),
  ('legal', 'intellectual_property', 'Intellectual property', 30),
  ('legal', 'liability', 'Liability', 40),
  ('legal', 'licence', 'Licence', 50),

  ('regulatory', 'compliance', 'Compliance', 10),
  ('regulatory', 'reporting', 'Reporting', 20),
  ('regulatory', 'audit', 'Audit', 30),
  ('regulatory', 'permit', 'Permit', 40),
  ('regulatory', 'policy', 'Policy', 50),

  ('commercial', 'supplier', 'Supplier', 10),
  ('commercial', 'pricing', 'Pricing', 20),
  ('commercial', 'contract_terms', 'Contract terms', 30),
  ('commercial', 'market', 'Market', 40),
  ('commercial', 'procurement', 'Procurement', 50),

  ('operational', 'process', 'Process', 10),
  ('operational', 'continuity', 'Continuity', 20),
  ('operational', 'service', 'Service', 30),
  ('operational', 'handover', 'Handover', 40),
  ('operational', 'security', 'Security', 50),

  ('strategic', 'alignment', 'Alignment', 10),
  ('strategic', 'benefit', 'Benefit', 20),
  ('strategic', 'reputation', 'Reputation', 30),
  ('strategic', 'decision', 'Decision', 40),
  ('strategic', 'objective', 'Objective', 50),

  ('external', 'third_party', 'Third party', 10),
  ('external', 'environment', 'Environment', 20),
  ('external', 'political', 'Political', 30),
  ('external', 'market_shift', 'Market shift', 40),
  ('external', 'stakeholder', 'Stakeholder', 50),

  ('organizational', 'governance', 'Governance', 10),
  ('organizational', 'communication', 'Communication', 20),
  ('organizational', 'culture', 'Culture', 30),
  ('organizational', 'change_management', 'Change management', 40),
  ('organizational', 'decision_rights', 'Decision rights', 50),

  ('organisational', 'governance', 'Governance', 10),
  ('organisational', 'communication', 'Communication', 20),
  ('organisational', 'culture', 'Culture', 30),
  ('organisational', 'change_management', 'Change management', 40),
  ('organisational', 'decision_rights', 'Decision rights', 50),

  ('business', 'demand', 'Demand', 10),
  ('business', 'revenue', 'Revenue', 20),
  ('business', 'customer', 'Customer', 30),
  ('business', 'competition', 'Competition', 40),
  ('business', 'operating_model', 'Operating model', 50),

  ('other', 'unspecified', 'Unspecified', 10)
ON CONFLICT (category_code, subcategory_code) DO NOTHING;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES (
  'risk_subcategories',
  'System sub-categories for a risk, filtered by risk category',
  true,
  true,
  'risks'
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
