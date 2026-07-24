/**
 * Rule-based event generation for simulation turns (v734).
 */

export const EVENT_ARCHETYPES = {
  schedule: ['milestone_delay', 'resource_unavailability', 'dependency_slip', 'fast_track_opportunity'],
  budget: ['cost_overrun', 'funding_cut', 'exchange_rate_change', 'savings_opportunity'],
  risk: ['risk_materialised', 'new_risk_identified', 'risk_escalation', 'risk_expired'],
  stakeholder: ['sponsor_change', 'scope_change_request', 'political_conflict', 'executive_escalation'],
  team: ['key_member_departure', 'skill_gap', 'morale_drop', 'performance_issue'],
  quality: ['defect_spike', 'audit_finding', 'standards_breach', 'process_improvement_opportunity'],
  external: ['regulatory_change', 'market_shift', 'competitor_action', 'vendor_failure'],
};

const NPC_BY_CATEGORY = {
  schedule: 'team_manager',
  budget: 'project_sponsor',
  risk: 'quality_assurance',
  stakeholder: 'project_sponsor',
  team: 'team_manager',
  quality: 'quality_assurance',
  external: 'change_authority',
};

export function getEventProbability(archetype, projectState = {}) {
  const base = 0.35;
  const stress = (projectState.stress_index || 50) / 100;
  const variance = (Math.random() * 0.4) - 0.2;
  return Math.max(0.05, Math.min(0.95, base + stress * 0.3 + variance));
}

export function calculateConsequences(event, decisionOptionId, projectState = {}) {
  const options = event.decision_options || [];
  const chosen = options.find((o) => o.id === decisionOptionId || o.label === decisionOptionId);
  return {
    decision: decisionOptionId,
    impacts: chosen?.impacts || {},
    score_delta: chosen?.score_delta ?? 0,
    narrative: chosen?.outcome || 'Decision recorded.',
  };
}

export function generateEventsForTurn(scenario, turnNumber, projectState, previousDecisions, userRole) {
  const scripted = scenario?.scenario_data?.scripted_events || [];
  const events = [];

  for (const script of scripted) {
    if (script.turn === turnNumber && (!script.target_role || script.target_role === userRole)) {
      events.push({
        event_type: script.event_type,
        severity: script.severity || 'medium',
        title: script.title,
        description: script.description,
        decision_options: script.decision_options || [],
        target_role: userRole,
        npc_source: script.npc_source || NPC_BY_CATEGORY[script.category] || 'project_manager',
      });
    }
  }

  const categories = Object.keys(EVENT_ARCHETYPES);
  for (const category of categories) {
    const archetype = EVENT_ARCHETYPES[category][turnNumber % EVENT_ARCHETYPES[category].length];
    if (getEventProbability(archetype, projectState) < 0.45) continue;

    const cascadeBoost = previousDecisions.some((d) => d.outcome?.impacts?.[category]) ? 0.15 : 0;
    if (Math.random() + cascadeBoost < 0.4) continue;

    events.push({
      event_type: archetype,
      severity: category === 'risk' || category === 'stakeholder' ? 'high' : 'medium',
      title: `${archetype.replace(/_/g, ' ')}`,
      description: `A ${category} event requires your attention this period.`,
      decision_options: [
        { id: 'proactive', label: 'Address proactively', score_delta: 8, impacts: { [category]: 5 } },
        { id: 'monitor', label: 'Monitor and defer', score_delta: 2, impacts: { [category]: -2 } },
        { id: 'escalate', label: 'Escalate immediately', score_delta: 5, impacts: { stakeholder: 3 } },
      ],
      target_role: userRole,
      npc_source: NPC_BY_CATEGORY[category],
    });
  }

  return events.slice(0, 4);
}
