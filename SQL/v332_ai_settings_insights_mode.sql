-- v332: AI settings — insights_mode for optional Gemini narrative (Phase 6)
-- Default rule-based insights; optional 'gemini' sends aggregated summary to Google.

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS insights_mode TEXT NOT NULL DEFAULT 'template'
  CHECK (insights_mode IN ('template', 'gemini'));

COMMENT ON COLUMN ai_settings.insights_mode IS 'template = rule-based only; gemini = optional narrative from aggregated data (sent to Google)';

-- Simulator parity
ALTER TABLE sim.ai_settings
  ADD COLUMN IF NOT EXISTS insights_mode TEXT NOT NULL DEFAULT 'template'
  CHECK (insights_mode IN ('template', 'gemini'));
