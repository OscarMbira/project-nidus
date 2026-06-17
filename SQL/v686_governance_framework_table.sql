-- v686: governance_frameworks table
CREATE TABLE IF NOT EXISTS public.governance_frameworks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  version           VARCHAR(20)  DEFAULT '1.0',
  status            VARCHAR(50)  DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  description       TEXT,
  principles        TEXT,
  escalation_path   TEXT,
  notes             TEXT,
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP, deleted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(), created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP DEFAULT NOW(), updated_by UUID REFERENCES public.users(id)
);
ALTER TABLE public.governance_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gov_fw_select" ON public.governance_frameworks FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE);
CREATE POLICY "gov_fw_insert" ON public.governance_frameworks FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "gov_fw_update" ON public.governance_frameworks FOR UPDATE USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('governance_frameworks','Organisational governance framework definitions',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
