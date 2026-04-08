-- v323: AI Insights Cache (Platform — public schema)
-- Stores pre-generated proactive insights per user with a 24h TTL

CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  insights        JSONB NOT NULL DEFAULT '[]',
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE (user_id)
);

ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own insights cache" ON ai_insights_cache;
CREATE POLICY "Users manage own insights cache" ON ai_insights_cache
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id    ON ai_insights_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_expires_at ON ai_insights_cache(expires_at);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('ai_insights_cache', 'Cached AI-generated proactive insights per user with 24h TTL', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
