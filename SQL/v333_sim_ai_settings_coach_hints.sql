-- v333: Simulator AI settings — coach_hints_enabled (Phase 7.5)
-- Toggle real-time coaching hints on/off per org.

ALTER TABLE sim.ai_settings
  ADD COLUMN IF NOT EXISTS coach_hints_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN sim.ai_settings.coach_hints_enabled IS 'When true, show real-time AI coach hints during simulation runs.';
