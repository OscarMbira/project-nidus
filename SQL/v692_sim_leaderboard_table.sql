-- v692: sim.leaderboard_entries table
CREATE TABLE IF NOT EXISTS sim.leaderboard_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  display_name          VARCHAR(200),
  period                VARCHAR(30) DEFAULT 'all_time' CHECK (period IN ('all_time','this_month','this_week')),
  total_points          INTEGER DEFAULT 0,
  rank                  INTEGER,
  scenarios_completed   INTEGER DEFAULT 0,
  certificates_earned   INTEGER DEFAULT 0,
  badge_count           INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period)
);
-- Ensure all columns exist if the table was created by an earlier migration
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS user_id              UUID;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS display_name         VARCHAR(200);
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS period               VARCHAR(30)  DEFAULT 'all_time';
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS total_points         INTEGER      DEFAULT 0;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS rank                 INTEGER;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS scenarios_completed  INTEGER      DEFAULT 0;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS certificates_earned  INTEGER      DEFAULT 0;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS badge_count          INTEGER      DEFAULT 0;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS is_deleted           BOOLEAN      DEFAULT FALSE;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMP;
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS created_at           TIMESTAMP    DEFAULT NOW();
ALTER TABLE sim.leaderboard_entries ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMP    DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_lb_period_rank ON sim.leaderboard_entries(period, rank) WHERE is_deleted=FALSE;
ALTER TABLE sim.leaderboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lb_select" ON sim.leaderboard_entries FOR SELECT USING (auth.role()='authenticated' AND is_deleted=FALSE);
CREATE POLICY "lb_all" ON sim.leaderboard_entries FOR ALL USING (auth.role()='authenticated');
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('sim.leaderboard_entries','Simulator leaderboard rankings and scores',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
