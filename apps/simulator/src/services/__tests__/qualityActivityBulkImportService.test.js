/**
 * Quality Activity Bulk Import Service Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseQualityActivityCSV,
  validateActivityData,
  generateBulkImportTemplate
} from '../qualityActivityBulkImportService';

describe('Quality Activity Bulk Import Service', () => {
  describe('parseQualityActivityCSV', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `Activity Type,Review/Inspection Title,Product Reference,Planned Date,Project Code
review,Test Review,PPD-001,2026-02-01,PROJ-001
inspection,Test Inspection,PPD-002,2026-02-02,PROJ-001`;

      const result = parseQualityActivityCSV(csvContent);

      expect(result).toHaveLength(2);
      expect(result[0]['Activity Type']).toBe('review');
      expect(result[0]['Review/Inspection Title']).toBe('Test Review');
      expect(result[1]['Activity Type']).toBe('inspection');
    });

    it('should handle quoted fields with commas', () => {
      const csvContent = `Activity Type,Review/Inspection Title,Notes
review,"Test Review, Version 2","Notes with, commas"`;

      const result = parseQualityActivityCSV(csvContent);

      expect(result[0]['Review/Inspection Title']).toBe('Test Review, Version 2');
      expect(result[0]['Notes']).toBe('Notes with, commas');
    });

    it('should throw error for empty CSV', () => {
      expect(() => parseQualityActivityCSV('')).toThrow();
    });

    it('should throw error for missing headers', () => {
      const csvContent = `Activity Type,Title
review,Test`;
      
      expect(() => parseQualityActivityCSV(csvContent)).toThrow('Missing required headers');
    });
  });

  describe('validateActivityData', () => {
    it('should validate correct activity data', () => {
      const activityData = {
        'Activity Type': 'review',
        'Review/Inspection Title': 'Test Review',
        'Planned Date': '2026-02-01',
        'Project Code': 'PROJ-001'
      };

      const result = validateActivityData(activityData, 2);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const activityData = {
        'Activity Type': 'review'
        // Missing required fields
      };

      const result = validateActivityData(activityData, 2);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate activity type', () => {
      const activityData = {
        'Activity Type': 'invalid',
        'Review/Inspection Title': 'Test',
        'Planned Date': '2026-02-01'
      };

      const result = validateActivityData(activityData, 2);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Activity Type'))).toBe(true);
    });

    it('should validate date format', () => {
      const activityData = {
        'Activity Type': 'review',
        'Review/Inspection Title': 'Test',
        'Planned Date': 'invalid-date'
      };

      const result = validateActivityData(activityData, 2);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('date'))).toBe(true);
    });
  });

  describe('generateBulkImportTemplate', () => {
    it('should generate valid CSV template', () => {
      const template = generateBulkImportTemplate();

      expect(template).toContain('Activity Type');
      expect(template).toContain('Review/Inspection Title');
      expect(template).toContain('Planned Date');
      expect(template).toContain('Project Code');
      expect(template.split('\n').length).toBeGreaterThan(1); // Header + example row
    });

    it('should include example data', () => {
      const template = generateBulkImportTemplate();

      expect(template).toContain('review');
      expect(template).toContain('Technical Design Review');
    });
  });
});
