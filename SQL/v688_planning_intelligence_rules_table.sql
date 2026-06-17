-- v688: intelligence_rules and governance_rules tables
CREATE TABLE IF NOT EXISTS public.intelligence_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(200) NOT NULL,
  trigger_condition   TEXT,
  action              TEXT,
  priority            VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  is_active           BOOLEAN DEFAULT TRUE,
  description         TEXT,
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP, deleted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(), created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP DEFAULT NOW(), updated_by UUID REFERENCES public.users(id)
);
CREATE TABLE IF NOT EXISTS public.governance_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name        VARCHAR(200) NOT NULL,
  rule_type        VARCHAR(50) DEFAULT 'threshold' CHECK (rule_type IN ('threshold','alert','escalation','compliance_check')),
  threshold_value  VARCHAR(100),
  applies_to       VARCHAR(200),
  description      TEXT,
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP, deleted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(), created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP DEFAULT NOW(), updated_by UUID REFERENCES public.users(id)
);
ALTER TABLE public.intelligence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "int_rules_select" ON public.intelligence_rules FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE);
CREATE POLICY "int_rules_insert" ON public.intelligence_rules FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "int_rules_update" ON public.intelligence_rules FOR UPDATE USING (auth.role()='authenticated');
CREATE POLICY "gov_rules_select" ON public.governance_rules FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE);
CREATE POLICY "gov_rules_insert" ON public.governance_rules FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "gov_rules_update" ON public.governance_rules FOR UPDATE USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES
  ('intelligence_rules','Planning intelligence condition–action rules',false,true),
  ('governance_rules','Governance threshold and compliance rules',false,true)
ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
