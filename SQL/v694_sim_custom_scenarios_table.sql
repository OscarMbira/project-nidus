-- v694: sim.custom_scenarios table (user-created scenarios, premium only)
CREATE TABLE IF NOT EXISTS sim.custom_scenarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  methodology         VARCHAR(50) CHECK (methodology IN ('structured','pmbok','agile','hybrid')),
  difficulty          VARCHAR(20)  DEFAULT 'intermediate' CHECK (difficulty IN ('beginner','intermediate','advanced','expert')),
  creator_user_id     UUID NOT NULL,
  is_published        BOOLEAN DEFAULT FALSE,
  is_public           BOOLEAN DEFAULT FALSE,
  event_set           JSONB,
  settings            JSONB,
  status              VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  is_deleted BOOLEAN DEFAULT FALSE, deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
-- Ensure all columns exist if the table was created by an earlier migration.
-- NOT NULL is omitted on ADD COLUMN to avoid failures when existing rows are present.
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS title             VARCHAR(200);
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS methodology       VARCHAR(50);
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS difficulty        VARCHAR(20)  DEFAULT 'intermediate';
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS creator_user_id   UUID;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS is_published      BOOLEAN      DEFAULT FALSE;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS is_public         BOOLEAN      DEFAULT FALSE;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS event_set         JSONB;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS settings          JSONB;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS status            VARCHAR(30)  DEFAULT 'draft';
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS is_deleted        BOOLEAN      DEFAULT FALSE;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMP;
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP    DEFAULT NOW();
ALTER TABLE sim.custom_scenarios ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMP    DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_cs_creator ON sim.custom_scenarios(creator_user_id) WHERE is_deleted=FALSE;
ALTER TABLE sim.custom_scenarios ENABLE ROW LEVEL SECURITY;
-- Creator can see their own; published public ones visible to all authenticated users
CREATE POLICY "cs_select" ON sim.custom_scenarios FOR SELECT
  USING (auth.role()='authenticated' AND is_deleted=FALSE AND (creator_user_id=auth.uid() OR (is_published=TRUE AND is_public=TRUE)));
CREATE POLICY "cs_insert" ON sim.custom_scenarios FOR INSERT WITH CHECK (auth.role()='authenticated' AND creator_user_id=auth.uid());
CREATE POLICY "cs_update" ON sim.custom_scenarios FOR UPDATE USING (auth.role()='authenticated' AND creator_user_id=auth.uid());
INSERT INTO public.database_tables(table_name,table_description,is_system_table,is_active) VALUES('sim.custom_scenarios','User-created custom simulator scenarios (premium)',false,true) ON CONFLICT(table_name) DO UPDATE SET table_description=EXCLUDED.table_description,updated_at=NOW();
