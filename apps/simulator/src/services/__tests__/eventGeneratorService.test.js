import { describe, it, expect } from 'vitest';
import {
  generateEventsForTurn,
  calculateConsequences,
  getEventProbability,
  EVENT_ARCHETYPES,
} from '../sim/eventGeneratorService.js';

describe('eventGeneratorService', () => {
  it('exposes event archetype categories', () => {
    expect(Object.keys(EVENT_ARCHETYPES)).toContain('schedule');
    expect(Object.keys(EVENT_ARCHETYPES)).toContain('risk');
  });

  it('generates role-filtered events for a turn', () => {
    const events = generateEventsForTurn(
      { scenario_data: { scripted_events: [] } },
      3,
      { stress_index: 60 },
      [],
      'project_manager',
    );
    events.forEach((ev) => {
      expect(ev.target_role).toBe('project_manager');
      expect(ev.decision_options?.length).toBeGreaterThan(0);
    });
  });

  it('calculates consequences for a decision', () => {
    const outcome = calculateConsequences(
      {
        decision_options: [
          { id: 'proactive', outcome: 'Good choice', score_delta: 5, impacts: { risk: 2 } },
        ],
      },
      'proactive',
      {},
    );
    expect(outcome.decision).toBe('proactive');
    expect(outcome.score_delta).toBe(5);
  });

  it('returns probability within bounds', () => {
    const p = getEventProbability('risk_materialised', { stress_index: 80 });
    expect(p).toBeGreaterThanOrEqual(0.05);
    expect(p).toBeLessThanOrEqual(0.95);
  });
});
