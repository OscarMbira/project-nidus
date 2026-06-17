-- v685: stage_gate_reviews table
CREATE TABLE IF NOT EXISTS public.stage_gate_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_name       VARCHAR(200) NOT NULL,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  stage           VARCHAR(100),
  status          VARCHAR(50)  DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  decision_date   DATE,
  outcome         TEXT,
  notes           TEXT,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      TIMESTAMP,
  deleted_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  created_by      UUID REFERENCES public.users(id),
  updated_at      TIMESTAMP DEFAULT NOW(),
  updated_by      UUID REFERENCES public.users(id)
);
-- Ensure all columns exist if the table was created by an earlier migration
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS gate_name       VARCHAR(200);
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS project_id      UUID;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS stage           VARCHAR(100);
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS status          VARCHAR(50)  DEFAULT 'draft';
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS decision_date   DATE;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS outcome         TEXT;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS is_deleted      BOOLEAN      DEFAULT FALSE;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMP;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS deleted_by      UUID;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP    DEFAULT NOW();
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS created_by      UUID;
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP    DEFAULT NOW();
ALTER TABLE public.stage_gate_reviews ADD COLUMN IF NOT EXISTS updated_by      UUID;
CREATE INDEX IF NOT EXISTS idx_stage_gates_project ON public.stage_gate_reviews(project_id) WHERE is_deleted=FALSE;
ALTER TABLE public.stage_gate_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_gates_select" ON public.stage_gate_reviews FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE);
CREATE POLICY "stage_gates_insert" ON public.stage_gate_reviews FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "stage_gates_update" ON public.stage_gate_reviews FOR UPDATE USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('stage_gate_reviews','Formal go/no-go stage gate reviews between project stages',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
