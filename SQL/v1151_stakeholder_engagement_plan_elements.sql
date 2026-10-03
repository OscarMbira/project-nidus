-- =============================================================================
-- v1151: Fields required on a stakeholder engagement plan
--        Scope and impact of the change, pending stakeholder changes,
--        interrelationships, escalation path, and links to risks, decisions,
--        change, and adoption.
--        Current and desired engagement levels already exist. Engagement goals
--        use engagement_success_criteria. The engagement owner uses
--        relationship_owner_user_id.
-- Platform: public.stakeholder_engagement
-- Simulator practice: sim.practice_engagement_plans
-- =============================================================================

ALTER TABLE public.stakeholder_engagement
  ADD COLUMN IF NOT EXISTS change_scope_impact TEXT,
  ADD COLUMN IF NOT EXISTS pending_stakeholder_changes TEXT,
  ADD COLUMN IF NOT EXISTS interrelationships TEXT,
  ADD COLUMN IF NOT EXISTS escalation_path TEXT,
  ADD COLUMN IF NOT EXISTS related_engagement_links TEXT;

COMMENT ON COLUMN public.stakeholder_engagement.change_scope_impact IS
  'Scope and impact of the change on this stakeholder.';
COMMENT ON COLUMN public.stakeholder_engagement.pending_stakeholder_changes IS
  'Pending additions, deletions, or changes to this stakeholder, and the potential impact. One item per line.';
COMMENT ON COLUMN public.stakeholder_engagement.interrelationships IS
  'Relationships and overlap with other stakeholders or groups. One item per line.';
COMMENT ON COLUMN public.stakeholder_engagement.escalation_path IS
  'Who to escalate to, and when. One step per line.';
COMMENT ON COLUMN public.stakeholder_engagement.related_engagement_links IS
  'Links from this engagement to risks, decisions, change, and adoption needs. One link per line.';

ALTER TABLE sim.practice_engagement_plans
  ADD COLUMN IF NOT EXISTS change_scope_impact TEXT,
  ADD COLUMN IF NOT EXISTS pending_stakeholder_changes TEXT,
  ADD COLUMN IF NOT EXISTS interrelationships TEXT,
  ADD COLUMN IF NOT EXISTS escalation_path TEXT,
  ADD COLUMN IF NOT EXISTS related_engagement_links TEXT;

COMMENT ON COLUMN sim.practice_engagement_plans.change_scope_impact IS
  'Scope and impact of the change on this stakeholder.';
COMMENT ON COLUMN sim.practice_engagement_plans.pending_stakeholder_changes IS
  'Pending additions, deletions, or changes to this stakeholder, and the potential impact. One item per line.';
COMMENT ON COLUMN sim.practice_engagement_plans.interrelationships IS
  'Relationships and overlap with other stakeholders or groups. One item per line.';
COMMENT ON COLUMN sim.practice_engagement_plans.escalation_path IS
  'Who to escalate to, and when. One step per line.';
COMMENT ON COLUMN sim.practice_engagement_plans.related_engagement_links IS
  'Links from this engagement to risks, decisions, change, and adoption needs. One link per line.';
