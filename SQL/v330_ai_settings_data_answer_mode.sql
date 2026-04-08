-- v330: AI Assistant — data answer mode and structured_data (NotebookLM-style)
-- Adds data_answer_mode and data_privacy_accepted_at to ai_settings;
-- Adds structured_data to ai_messages; creates sim.ai_settings for Simulator parity.

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_settings: data answer mode (template | claude | gemini)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS data_answer_mode TEXT
    NOT NULL DEFAULT 'claude'
    CHECK (data_answer_mode IN ('template', 'claude', 'gemini'));

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS data_privacy_accepted_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_messages: store Sources for history rehydration
-- Shape: { "modules": { "risks": [...], "issues": [...] }, "row_count": N }
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS structured_data JSONB;

-- Allow processed_by to include 'data' and 'docs' (Phase 1.5)
ALTER TABLE ai_messages DROP CONSTRAINT IF EXISTS ai_messages_processed_by_check;
ALTER TABLE ai_messages
  ADD CONSTRAINT ai_messages_processed_by_check
  CHECK (processed_by IS NULL OR processed_by IN ('local', 'external', 'data', 'docs'));

-- ─────────────────────────────────────────────────────────────────────────────
-- sim.ai_settings (Simulator parity)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.ai_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id            UUID NOT NULL,
  ai_enabled                 BOOLEAN DEFAULT TRUE,
  insights_enabled            BOOLEAN DEFAULT TRUE,
  data_answer_mode           TEXT NOT NULL DEFAULT 'claude'
                               CHECK (data_answer_mode IN ('template', 'claude', 'gemini')),
  data_privacy_accepted_at   TIMESTAMPTZ,
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id)
);

ALTER TABLE sim.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read sim ai settings" ON sim.ai_settings;
CREATE POLICY "Users read sim ai settings" ON sim.ai_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "PMO admins manage sim ai settings" ON sim.ai_settings;
CREATE POLICY "PMO admins manage sim ai settings" ON sim.ai_settings
  FOR ALL USING (true);

-- Register new/updated tables in database_tables if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'database_tables') THEN
    INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
    VALUES
      ('sim.ai_settings', 'Simulator AI settings per organisation (data answer mode, insights)', false, true)
    ON CONFLICT (table_name) DO UPDATE SET
      table_description = EXCLUDED.table_description,
      is_system_table = EXCLUDED.is_system_table,
      updated_at = NOW();
  END IF;
END $$;
