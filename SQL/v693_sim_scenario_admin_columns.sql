-- v693: Add admin tracking columns to sim.scenarios (if they don't exist)
ALTER TABLE sim.scenarios ADD COLUMN IF NOT EXISTS run_count      INTEGER DEFAULT 0;
ALTER TABLE sim.scenarios ADD COLUMN IF NOT EXISTS avg_score      NUMERIC(5,2);
ALTER TABLE sim.scenarios ADD COLUMN IF NOT EXISTS is_published   BOOLEAN DEFAULT FALSE;
ALTER TABLE sim.scenarios ADD COLUMN IF NOT EXISTS methodology    VARCHAR(50) CHECK (methodology IN ('structured','pmbok','agile','hybrid'));
ALTER TABLE sim.scenarios ADD COLUMN IF NOT EXISTS difficulty     VARCHAR(20) CHECK (difficulty IN ('beginner','intermediate','advanced','expert'));

-- Simulator user admin table
CREATE TABLE IF NOT EXISTS sim.simulator_users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE,
  display_name          VARCHAR(200),
  email                 VARCHAR(255),
  tier                  VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free','premium','corporate')),
  scenarios_completed   INTEGER DEFAULT 0,
  certificates_count    INTEGER DEFAULT 0,
  last_active_at        TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE sim.simulator_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_users_select" ON sim.simulator_users FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "sim_users_all"    ON sim.simulator_users FOR ALL    USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('sim.simulator_users','Simulator user profiles and tier information',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
