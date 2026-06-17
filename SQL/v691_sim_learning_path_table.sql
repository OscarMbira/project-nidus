-- v691: sim.learning_path_modules table
CREATE TABLE IF NOT EXISTS sim.learning_path_modules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 VARCHAR(200) NOT NULL,
  description           TEXT,
  estimated_minutes     INTEGER DEFAULT 30,
  order_index           INTEGER NOT NULL DEFAULT 0,
  is_published          BOOLEAN DEFAULT FALSE,
  prerequisite_module_id UUID REFERENCES sim.learning_path_modules(id) ON DELETE SET NULL,
  content_url           TEXT,
  methodology           VARCHAR(50) CHECK (methodology IN ('structured','pmbok','agile','universal')),
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
-- Ensure all columns exist if the table was created by an earlier migration
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS title                  VARCHAR(200);
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS description            TEXT;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS estimated_minutes      INTEGER      DEFAULT 30;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS order_index            INTEGER      DEFAULT 0;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS is_published           BOOLEAN      DEFAULT FALSE;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS prerequisite_module_id UUID;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS content_url            TEXT;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS methodology            VARCHAR(50);
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS is_deleted             BOOLEAN      DEFAULT FALSE;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS deleted_at             TIMESTAMP;
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS created_at             TIMESTAMP    DEFAULT NOW();
ALTER TABLE sim.learning_path_modules ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMP    DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_lpm_order ON sim.learning_path_modules(order_index) WHERE is_deleted=FALSE;
ALTER TABLE sim.learning_path_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lpm_select" ON sim.learning_path_modules FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE AND is_published=TRUE);
CREATE POLICY "lpm_admin" ON sim.learning_path_modules FOR ALL USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('sim.learning_path_modules','Simulator learning path curriculum modules',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
