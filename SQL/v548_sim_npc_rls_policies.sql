-- v548: RLS for NPC catalogue tables + scenario_seed writes (v505)
-- Prerequisites: v540–v543

ALTER TABLE sim.npc_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.npc_event_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_npc_characters_read ON sim.npc_characters;
CREATE POLICY sim_npc_characters_read ON sim.npc_characters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sim_npc_event_templates_read ON sim.npc_event_templates;
CREATE POLICY sim_npc_event_templates_read ON sim.npc_event_templates FOR SELECT TO authenticated USING (COALESCE(is_active, true));

-- scenario_seed_data: allow authenticated read (already v543); drop duplicate service policy if it was ever created on the wrong name
DROP POLICY IF EXISTS sim_scenario_seed_service ON sim.scenario_seed_data;

DO $$ BEGIN RAISE NOTICE 'v548_sim_npc_rls_policies.sql applied'; END $$;
