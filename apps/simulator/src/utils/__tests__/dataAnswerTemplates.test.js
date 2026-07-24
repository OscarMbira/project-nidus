/**
 * Unit tests for dataAnswerTemplates (NotebookLM-style template answers)
 */

import { describe, it, expect } from 'vitest';
import { buildTemplateAnswer } from '../dataAnswerTemplates';

describe('buildTemplateAnswer', () => {
  it('returns no-data message when modules is empty', () => {
    const result = buildTemplateAnswer([], {});
    expect(result).toContain('No matching data found');
  });

  it('returns no-data message when modules have no rows', () => {
    const result = buildTemplateAnswer(['risks', 'issues'], { risks: [], issues: [] });
    expect(result).toContain('No matching records');
  });

  it('returns summary for single module with rows', () => {
    const structured = { risks: [{ id: '1' }, { id: '2' }, { id: '3' }] };
    const result = buildTemplateAnswer(['risks'], structured);
    expect(result).toContain('Found');
    expect(result).toContain('3 risks');
    expect(result).toContain('See details below');
  });

  it('returns summary for multiple modules with rows', () => {
    const structured = {
      risks: [{ id: '1' }],
      issues: [{ id: 'a' }, { id: 'b' }],
    };
    const result = buildTemplateAnswer(['risks', 'issues'], structured);
    expect(result).toContain('Found');
    expect(result).toContain('1 risk');
    expect(result).toContain('2 issues');
  });

  it('ignores documentation module in count', () => {
    const structured = { risks: [{ id: '1' }] };
    const result = buildTemplateAnswer(['risks', 'documentation'], structured);
    expect(result).toContain('1 risk');
  });
});
