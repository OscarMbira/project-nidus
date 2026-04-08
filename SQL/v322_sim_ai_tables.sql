-- v322: AI Assistant Tables (Simulator — sim schema)

CREATE TABLE IF NOT EXISTS sim.ai_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id     UUID,
  title      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES sim.ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  processed_by    TEXT CHECK (processed_by IN ('local', 'external')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.ai_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES sim.ai_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     SMALLINT CHECK (rating IN (-1, 1)),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE sim.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_feedback      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sim conversations" ON sim.ai_conversations;
CREATE POLICY "Users manage own sim conversations" ON sim.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own sim messages" ON sim.ai_messages;
CREATE POLICY "Users manage own sim messages" ON sim.ai_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM sim.ai_conversations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users manage own sim feedback" ON sim.ai_feedback;
CREATE POLICY "Users manage own sim feedback" ON sim.ai_feedback
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sim_ai_conv_user_id    ON sim.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_ai_msg_conv_id     ON sim.ai_messages(conversation_id);

-- Note: sim schema tables are not registered in public.database_tables
-- as the registry lives in the public schema and sim tables are managed separately
