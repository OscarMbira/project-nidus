/**
 * Unit Tests for mandateValidationService
 * Tests validation and completion checking functions
 */

import {
  validateDraft,
  validateForSubmission,
  validateForApproval,
  calculateCompletionProgress,
  canSubmitForReview,
  canApprove
} from '../../services/mandateValidationService'

describe('mandateValidationService', () => {
  describe('validateDraft', () => {
    it('should validate minimum required fields for draft', () => {
      const validDraft = {
        mandate_title: 'Test Mandate',
        purpose: 'This purpose has more than 20 characters as required'
      }

      const result = validateDraft(validDraft)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject draft without title', () => {
      const invalidDraft = {
        purpose: 'Some purpose'
      }

      const result = validateDraft(invalidDraft)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject draft with purpose less than 20 characters', () => {
      const invalidDraft = {
        mandate_title: 'Test',
        purpose: 'Short'
      }

      const result = validateDraft(invalidDraft)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Purpose'))).toBe(true)
    })
  })

  describe('validateForSubmission', () => {
    it('should validate all required sections for submission', () => {
      const validMandate = {
        mandate_title: 'Test Mandate',
        purpose: 'This purpose has more than 50 characters as required for submission to ensure sufficient detail',
        background: 'This background needs to be at least 100 characters long to meet the submission requirements for project mandate validation',
        project_objectives: 'These objectives must be at least 100 characters long to meet submission requirements for project mandate validation',
        outline_business_case: 'This business case must be at least 100 characters long to meet submission requirements for project mandate validation'
      }

      const childData = {
        deliverables: [{ id: '1', is_in_scope: true }],
        stakeholders: [{ id: '1', stakeholder_type: 'customer' }]
      }

      const result = validateForSubmission(validMandate, childData)
      expect(result.isValid).toBe(true)
    })

    it('should reject submission without deliverables', () => {
      const mandate = {
        mandate_title: 'Test',
        purpose: 'Long enough purpose text for submission validation',
        background: 'Long enough background text for submission validation',
        project_objectives: 'Long enough objectives text for submission validation',
        outline_business_case: 'Long enough business case text for submission validation'
      }

      const childData = {
        deliverables: [],
        stakeholders: [{ id: '1' }]
      }

      const result = validateForSubmission(mandate, childData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('deliverable'))).toBe(true)
    })
  })

  describe('validateForApproval', () => {
    it('should require roles for approval', () => {
      const mandate = {
        mandate_title: 'Test',
        purpose: 'Long enough purpose',
        background: 'Long enough background',
        project_objectives: 'Long enough objectives',
        outline_business_case: 'Long enough business case'
      }

      const childData = {
        deliverables: [{ id: '1' }],
        stakeholders: [{ id: '1', stakeholder_type: 'customer' }]
      }

      const result = validateForApproval(mandate, childData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('role'))).toBe(true)
    })

    it('should validate complete mandate for approval', () => {
      const mandate = {
        mandate_title: 'Test',
        purpose: 'Long enough purpose text',
        background: 'Long enough background text',
        project_objectives: 'Long enough objectives text',
        outline_business_case: 'Long enough business case text',
        proposed_executive_name: 'John Doe',
        quality_priority: 'balanced'
      }

      const childData = {
        deliverables: [{ id: '1', is_in_scope: true }],
        stakeholders: [{ id: '1', stakeholder_type: 'customer' }]
      }

      const result = validateForApproval(mandate, childData)
      expect(result.isValid).toBe(true)
    })
  })

  describe('calculateCompletionProgress', () => {
    it('should calculate progress percentage correctly', () => {
      const mandate = {
        purpose: 'Long enough purpose text',
        background: 'Long enough background text',
        project_objectives: 'Long enough objectives text',
        outline_business_case: 'Long enough business case text',
        proposed_executive_name: 'John Doe'
      }

      const childData = {
        deliverables: [{ id: '1', is_in_scope: true }],
        stakeholders: [{ id: '1', stakeholder_type: 'customer' }]
      }

      const progress = calculateCompletionProgress(mandate, childData)
      expect(progress.percentage).toBeGreaterThanOrEqual(0)
      expect(progress.percentage).toBeLessThanOrEqual(100)
      expect(progress.completed).toBeGreaterThanOrEqual(0)
      expect(progress.total).toBe(12)
    })

    it('should return 0% for empty mandate', () => {
      const progress = calculateCompletionProgress({}, {})
      expect(progress.percentage).toBe(0)
      expect(progress.completed).toBe(0)
    })
  })

  describe('canSubmitForReview', () => {
    it('should return true for valid mandate', () => {
      const mandate = {
        mandate_title: 'Test',
        purpose: 'Long enough purpose',
        background: 'Long enough background',
        project_objectives: 'Long enough objectives',
        outline_business_case: 'Long enough business case'
      }

      const childData = {
        deliverables: [{ id: '1' }],
        stakeholders: [{ id: '1' }]
      }

      expect(canSubmitForReview(mandate, childData)).toBe(true)
    })
  })

  describe('canApprove', () => {
    it('should return true for complete mandate with roles', () => {
      const mandate = {
        mandate_title: 'Test',
        purpose: 'Long enough',
        background: 'Long enough',
        project_objectives: 'Long enough',
        outline_business_case: 'Long enough',
        proposed_executive_name: 'John Doe',
        quality_priority: 'balanced'
      }

      const childData = {
        deliverables: [{ id: '1' }],
        stakeholders: [{ id: '1', stakeholder_type: 'customer' }]
      }

      expect(canApprove(mandate, childData)).toBe(true)
    })
  })
})
