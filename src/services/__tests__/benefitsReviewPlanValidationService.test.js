/**
 * Benefits Review Plan Validation Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateBenefitsReviewPlan, generateValidationReport } from '../benefitsReviewPlanValidationService';

// Mock dependencies
vi.mock('../benefitsReviewPlanService', () => ({
  getBenefitsReviewPlan: vi.fn(() => Promise.resolve({
    id: 'test-plan-id',
    project_id: 'test-project-id',
    scope_description: 'Test scope',
    measurement_approach: 'Test approach',
    dis_benefits_included: true
  })),
  getPlanBenefits: vi.fn(() => Promise.resolve([
    {
      id: 'coverage-1',
      benefit_id: 'benefit-1',
      benefit: {
        id: 'benefit-1',
        benefit_name: 'Test Benefit',
        measurement_unit: 'percentage',
        baseline_value: 50,
        estimated_value: 100000
      },
      measurement_frequency: 'monthly',
      measurement_timing_reason: 'Test reason'
    }
  ])),
  getPlanResources: vi.fn(() => Promise.resolve([
    {
      id: 'resource-1',
      resource_type: 'person',
      resource_name: 'Test Resource'
    }
  ])),
  calculateTotalResourceCost: vi.fn(() => Promise.resolve({
    total_cost: 10000,
    total_effort_hours: 100,
    resource_count: 1
  }))
}));

vi.mock('../benefitsService', () => ({
  getBenefits: vi.fn(() => Promise.resolve([
    {
      id: 'benefit-1',
      benefit_name: 'Test Benefit',
      is_dis_benefit: false
    }
  ]))
}));

describe('Benefits Review Plan Validation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateBenefitsReviewPlan', () => {
    it('should validate a plan against quality criteria', async () => {
      const planId = 'test-plan-id';
      const result = await validateBenefitsReviewPlan(planId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('plan_id', planId);
      expect(result).toHaveProperty('is_valid');
      expect(result).toHaveProperty('criteria');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
    });

    it('should mark plan as valid when all criteria are met', async () => {
      const planId = 'test-plan-id';
      const result = await validateBenefitsReviewPlan(planId);

      expect(result.is_valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing scope description', async () => {
      const { getBenefitsReviewPlan } = await import('../benefitsReviewPlanService');
      getBenefitsReviewPlan.mockResolvedValueOnce({
        id: 'test-plan-id',
        project_id: 'test-project-id',
        scope_description: null, // Missing scope
        measurement_approach: 'Test approach'
      });

      const result = await validateBenefitsReviewPlan('test-plan-id');
      
      expect(result.is_valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.criterion === 'Scope defined')).toBe(true);
    });

    it('should detect uncovered benefits', async () => {
      const { getBenefits } = await import('../benefitsService');
      getBenefits.mockResolvedValueOnce([
        { id: 'benefit-1', benefit_name: 'Benefit 1', is_dis_benefit: false },
        { id: 'benefit-2', benefit_name: 'Benefit 2', is_dis_benefit: false }
      ]);

      const { getPlanBenefits } = await import('../benefitsReviewPlanService');
      getPlanBenefits.mockResolvedValueOnce([
        { id: 'coverage-1', benefit_id: 'benefit-1' }
      ]);

      const result = await validateBenefitsReviewPlan('test-plan-id');
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.criterion.includes('Business Case benefits covered'))).toBe(true);
    });

    it('should validate cost vs benefit value', async () => {
      const { getBenefitsReviewPlan } = await import('../benefitsReviewPlanService');
      getBenefitsReviewPlan.mockResolvedValueOnce({
        id: 'test-plan-id',
        project_id: 'test-project-id',
        scope_description: 'Test scope',
        measurement_approach: 'Test approach',
        estimated_review_cost: 20000, // High cost
        dis_benefits_included: true
      });

      const result = await validateBenefitsReviewPlan('test-plan-id');
      
      // Should have warning about cost ratio if > 10%
      const costWarning = result.warnings.find(w => 
        w.criterion.includes('Effort and cost realistic')
      );
      expect(costWarning).toBeDefined();
    });
  });

  describe('generateValidationReport', () => {
    it('should generate a validation report', async () => {
      const planId = 'test-plan-id';
      const report = await generateValidationReport(planId);

      expect(report).toBeDefined();
      expect(report).toHaveProperty('plan_id', planId);
      expect(report).toHaveProperty('validation_date');
      expect(report).toHaveProperty('is_valid');
      expect(report).toHaveProperty('criteria_passed');
      expect(report).toHaveProperty('warnings_count');
      expect(report).toHaveProperty('errors_count');
      expect(report).toHaveProperty('summary');
    });

    it('should include summary of validation results', async () => {
      const planId = 'test-plan-id';
      const report = await generateValidationReport(planId);

      expect(report.summary).toBeDefined();
      expect(typeof report.summary).toBe('string');
      expect(report.summary.length).toBeGreaterThan(0);
    });
  });
});
