-- v690: workstream_plans table
CREATE TABLE IF NOT EXISTS public.workstream_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workstream_name   VARCHAR(200) NOT NULL,
  lead_name         VARCHAR(200),
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status            VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','active','on_hold','completed')),
  start_date        DATE,
  end_date          DATE,
  objectives        TEXT,
  tasks_summary     TEXT,
  notes             TEXT,
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP, deleted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(), created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP DEFAULT NOW(), updated_by UUID REFERENCES public.users(id)
);
ALTER TABLE public.workstream_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workstream_select" ON public.workstream_plans FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE);
CREATE POLICY "workstream_insert" ON public.workstream_plans FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "workstream_update" ON public.workstream_plans FOR UPDATE USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('workstream_plans','Team workstream plans managed by team leads',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
