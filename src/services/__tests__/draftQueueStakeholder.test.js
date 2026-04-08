/**
 * Unit tests for draft queue integration – stakeholder and practice_stakeholder entity types.
 * Tests getRequiredFields, extractTitle, calculateCompletion, and config (getEntityConfig, getHoldQueueRoute).
 */

import { describe, it, expect } from 'vitest';
import {
  getRequiredFields,
  extractTitle,
  calculateCompletion,
} from '../draftQueueService';
import { getEntityConfig, getHoldQueueRoute } from '../../config/draftQueueConfig';

describe('draftQueueService – stakeholder entity', () => {
  describe('getRequiredFields', () => {
    it('returns stakeholder_name for entity type stakeholder', () => {
      expect(getRequiredFields('stakeholder')).toEqual(['stakeholder_name']);
    });

    it('returns stakeholder_name for entity type practice_stakeholder', () => {
      expect(getRequiredFields('practice_stakeholder')).toEqual(['stakeholder_name']);
    });

    it('returns empty array for unknown entity type', () => {
      expect(getRequiredFields('unknown_entity')).toEqual([]);
    });
  });

  describe('extractTitle', () => {
    it('extracts stakeholder_name from form data for stakeholder', () => {
      expect(extractTitle('stakeholder', { stakeholder_name: 'Jane Smith' })).toBe('Jane Smith');
    });

    it('extracts stakeholder_name for practice_stakeholder', () => {
      expect(extractTitle('practice_stakeholder', { stakeholder_name: 'Practice Alice' })).toBe('Practice Alice');
    });

    it('returns fallback when stakeholder_name is empty', () => {
      expect(extractTitle('stakeholder', { stakeholder_name: '' })).toBe('Untitled stakeholder');
    });

    it('returns fallback when form data is empty', () => {
      expect(extractTitle('stakeholder', {})).toBe('Untitled stakeholder');
    });
  });

  describe('calculateCompletion', () => {
    it('returns 100 when stakeholder_name is filled', () => {
      const result = calculateCompletion('stakeholder', { stakeholder_name: 'Alice' });
      expect(result.percentage).toBe(100);
      expect(result.total).toBe(1);
      expect(result.completed).toBe(1);
    });

    it('returns 100 for practice_stakeholder when stakeholder_name is filled', () => {
      const result = calculateCompletion('practice_stakeholder', { stakeholder_name: 'Bob' });
      expect(result.percentage).toBe(100);
      expect(result.completed).toBe(1);
    });

    it('returns 0 when stakeholder_name is empty', () => {
      const result = calculateCompletion('stakeholder', { stakeholder_name: '' });
      expect(result.percentage).toBe(0);
      expect(result.completed).toBe(0);
    });

    it('returns 0 when required fields are missing', () => {
      const result = calculateCompletion('stakeholder', {});
      expect(result.percentage).toBe(0);
      expect(result.total).toBe(1);
    });
  });

  describe('draft queue config – stakeholder', () => {
    it('getEntityConfig returns stakeholder config with createRoute and holdQueueRoute', () => {
      const config = getEntityConfig('stakeholder');
      expect(config).toBeDefined();
      expect(config.label).toBe('Stakeholder');
      expect(config.createRoute).toBe('/platform/stakeholders/register/new');
      expect(config.holdQueueRoute).toBe('/platform/stakeholders/on-hold');
      expect(config.titleField).toBe('stakeholder_name');
    });

    it('getHoldQueueRoute returns hold queue route for stakeholder', () => {
      expect(getHoldQueueRoute('stakeholder')).toBe('/platform/stakeholders/on-hold');
    });
  });

  describe('draft queue config – practice_stakeholder (simulator)', () => {
    it('getEntityConfig returns practice_stakeholder config', () => {
      const config = getEntityConfig('practice_stakeholder');
      expect(config).toBeDefined();
      expect(config.label).toBe('Practice Stakeholder');
      expect(config.createRoute).toBe('/simulator/practice-stakeholders/create');
      expect(config.holdQueueRoute).toBe('/simulator/practice-stakeholders/on-hold');
      expect(config.titleField).toBe('stakeholder_name');
    });

    it('getHoldQueueRoute returns hold queue route for practice_stakeholder', () => {
      expect(getHoldQueueRoute('practice_stakeholder')).toBe('/simulator/practice-stakeholders/on-hold');
    });
  });
});
