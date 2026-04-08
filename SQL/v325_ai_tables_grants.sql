-- v325: Grant permissions to authenticated role for all AI tables
-- Required so that logged-in users can read/write their own AI data through RLS

GRANT SELECT, INSERT, UPDATE, DELETE ON ai_conversations  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_messages       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_feedback       TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON ai_settings       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_insights_cache TO authenticated;

-- Simulator schema AI tables
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.ai_messages      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.ai_feedback      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.ai_debriefs      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.ai_coach_events  TO authenticated;
