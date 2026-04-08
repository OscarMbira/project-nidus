-- v321: AI Assistant Tables (Platform — public schema)
-- Creates tables for AI conversations, messages, feedback, and org-level settings

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_conversations: one session per user/project
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  title           TEXT,
  domain          TEXT DEFAULT 'platform' CHECK (domain IN ('platform', 'simulator')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_messages: individual messages, persists across sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  processed_by    TEXT CHECK (processed_by IN ('local', 'external')),
  context_modules TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_feedback: thumbs up/down on AI responses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     SMALLINT CHECK (rating IN (-1, 1)),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_settings: org-level toggles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ai_enabled       BOOLEAN DEFAULT TRUE,
  insights_enabled BOOLEAN DEFAULT TRUE,
  hybrid_enabled   BOOLEAN DEFAULT TRUE,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own conversations" ON ai_conversations;
CREATE POLICY "Users manage own conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own messages" ON ai_messages;
CREATE POLICY "Users manage own messages" ON ai_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users manage own feedback" ON ai_feedback;
CREATE POLICY "Users manage own feedback" ON ai_feedback
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read org ai settings" ON ai_settings;
CREATE POLICY "Users read org ai settings" ON ai_settings
  FOR SELECT USING (
    organisation_id IN (
      SELECT id FROM accounts WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "PMO admins manage ai settings" ON ai_settings;
CREATE POLICY "PMO admins manage ai settings" ON ai_settings
  FOR ALL USING (
    organisation_id IN (
      SELECT id FROM accounts WHERE owner_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id    ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at      ON ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_message_id      ON ai_feedback(message_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Register in database_tables registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('ai_conversations', 'AI assistant conversation sessions per user', false, true),
  ('ai_messages',      'Individual AI assistant messages within conversations', false, true),
  ('ai_feedback',      'User thumbs up/down feedback on AI responses', false, true),
  ('ai_settings',      'Organisation-level AI assistant settings and feature toggles', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
