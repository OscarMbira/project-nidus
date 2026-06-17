-- v689: custom_metrics table
CREATE TABLE IF NOT EXISTS public.custom_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name  VARCHAR(200) NOT NULL,
  formula      TEXT,
  unit         VARCHAR(50),
  description  TEXT,
  is_shared    BOOLEAN DEFAULT FALSE,
  created_by_user_id UUID REFERENCES public.users(id),
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP, deleted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(), created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP DEFAULT NOW(), updated_by UUID REFERENCES public.users(id)
);
ALTER TABLE public.custom_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_metrics_select" ON public.custom_metrics FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE AND (is_shared=TRUE OR created_by=auth.uid()));
CREATE POLICY "custom_metrics_insert" ON public.custom_metrics FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "custom_metrics_update" ON public.custom_metrics FOR UPDATE USING (auth.role()='authenticated' AND created_by=auth.uid());
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('custom_metrics','User-defined analytics metric formulas',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
