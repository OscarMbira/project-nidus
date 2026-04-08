/**
 * Unit tests for queryRouter (data vs external engine classification)
 */

import { describe, it, expect } from 'vitest';
import { classifyQuery } from '../queryRouter';

describe('classifyQuery', () => {
  it('returns data engine for empty or non-string', () => {
    expect(classifyQuery('')).toMatchObject({ engine: 'data' });
    expect(classifyQuery(null)).toMatchObject({ engine: 'data' });
    expect(classifyQuery(undefined)).toMatchObject({ engine: 'data' });
  });

  it('returns external for generic knowledge questions without data keywords', () => {
    expect(classifyQuery('What is earned value management?')).toMatchObject({ engine: 'external', reason: 'generic_knowledge' });
    expect(classifyQuery('Best practice for agile')).toMatchObject({ engine: 'external' });
  });

  it('returns docs for how-to and guide questions (Phase 1.5)', () => {
    expect(classifyQuery('How do I create a mandate?')).toMatchObject({ engine: 'docs', reason: 'docs_query' });
    expect(classifyQuery('How to submit for approval?')).toMatchObject({ engine: 'docs' });
    expect(classifyQuery('What is the approval process?')).toMatchObject({ engine: 'docs' });
    expect(classifyQuery('Guide for risk register')).toMatchObject({ engine: 'docs' });
  });

  it('returns data when data keywords are present even with generic phrasing', () => {
    expect(classifyQuery('What are my risks?')).toMatchObject({ engine: 'data' });
    expect(classifyQuery('Explain my project status')).toMatchObject({ engine: 'data' });
  });

  it('returns data for clear data queries', () => {
    expect(classifyQuery('Show me high-severity risks')).toMatchObject({ engine: 'data', reason: 'data_query' });
    expect(classifyQuery('List open issues')).toMatchObject({ engine: 'data' });
    expect(classifyQuery('Which mandates are pending approval?')).toMatchObject({ engine: 'data' });
  });
});
