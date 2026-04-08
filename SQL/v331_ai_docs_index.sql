-- v331: AI Documentation Index — searchable chunks for "how do I" / docs query path
-- Populated by scripts/seed_docs_index.js; queried by docFetcher for engine 'docs'.

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_docs_index: one row per chunk (~500 words) per document
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_docs_index (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_filename  TEXT NOT NULL,
  doc_title     TEXT NOT NULL,
  chunk_index   INT NOT NULL DEFAULT 0,
  chunk_text    TEXT NOT NULL,
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  doc_route     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doc_filename, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_docs_index_keywords ON ai_docs_index USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_ai_docs_index_doc_filename ON ai_docs_index (doc_filename);

COMMENT ON TABLE ai_docs_index IS 'Chunked documentation for AI docs query path (Phase 1.5). Keywords used for overlap search.';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: allow read for authenticated users (docs are system documentation)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ai_docs_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read docs index" ON ai_docs_index;
CREATE POLICY "Authenticated users can read docs index" ON ai_docs_index
  FOR SELECT USING (auth.role() = 'authenticated');

-- Inserts/updates: run scripts/seed_docs_index.js with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)

-- ─────────────────────────────────────────────────────────────────────────────
-- database_tables registry
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'database_tables') THEN
    INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
    VALUES ('ai_docs_index', 'Chunked documentation index for AI docs query path (how do I, guide, process)', true, true)
    ON CONFLICT (table_name) DO UPDATE SET
      table_description = EXCLUDED.table_description,
      is_system_table = EXCLUDED.is_system_table,
      updated_at = NOW();
  END IF;
END $$;
