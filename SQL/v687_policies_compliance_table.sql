-- v687: policies_compliance table
CREATE TABLE IF NOT EXISTS public.policies_compliance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name       VARCHAR(200) NOT NULL,
  category          VARCHAR(100),
  status            VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  compliance_owner  VARCHAR(200),
  review_date       DATE,
  description       TEXT,
  requirements      TEXT,
  notes             TEXT,
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP, deleted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(), created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP DEFAULT NOW(), updated_by UUID REFERENCES public.users(id)
);
ALTER TABLE public.policies_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policies_select" ON public.policies_compliance FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE);
CREATE POLICY "policies_insert" ON public.policies_compliance FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "policies_update" ON public.policies_compliance FOR UPDATE USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('policies_compliance','Organisational policies and compliance records',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
