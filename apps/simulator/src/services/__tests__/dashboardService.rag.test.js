import { describe, it, expect } from 'vitest';
import { mapSeverityToRag, worstRagFromAlertItems } from '../dashboardService';

describe('mapSeverityToRag', () => {
  it('maps danger to red', () => {
    expect(mapSeverityToRag('danger')).toBe('red');
  });
  it('maps warning to amber', () => {
    expect(mapSeverityToRag('warning')).toBe('amber');
  });
  it('maps ok and unknown to green', () => {
    expect(mapSeverityToRag('ok')).toBe('green');
    expect(mapSeverityToRag('')).toBe('green');
  });
});

describe('worstRagFromAlertItems', () => {
  it('returns green when no active counts', () => {
    expect(worstRagFromAlertItems([{ count: 0, rag: 'red' }])).toBe('green');
    expect(worstRagFromAlertItems([])).toBe('green');
  });
  it('returns red if any active row is red', () => {
    expect(
      worstRagFromAlertItems([
        { count: 1, rag: 'amber' },
        { count: 2, rag: 'red' },
      ])
    ).toBe('red');
  });
  it('returns amber if no red but an active amber exists', () => {
    expect(
      worstRagFromAlertItems([
        { count: 0, rag: 'red' },
        { count: 1, rag: 'amber' },
      ])
    ).toBe('amber');
  });
  it('treats yellow as amber', () => {
    expect(worstRagFromAlertItems([{ count: 1, rag: 'yellow' }])).toBe('amber');
  });
});
