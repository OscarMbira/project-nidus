/**
 * Issue Validation Tests
 * Tests for issueValidation.js utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  validateTitle,
  validateDescription,
  validateImpact,
  validateIssueType,
  validatePriority,
  validateSeverity,
  validateOwner,
  validateStatusTransition,
  validateIssueForm,
  calculatePriorityScore,
  requiresImmediateAttention
} from '../issueValidation'

describe('Issue Validation Utilities', () => {
  describe('validateTitle', () => {
    it('should reject empty title', () => {
      const result = validateTitle('')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('required')
    })

    it('should reject title shorter than 10 characters', () => {
      const result = validateTitle('Short')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('10 characters')
    })

    it('should accept valid title', () => {
      const result = validateTitle('This is a valid issue title')
      expect(result.valid).toBe(true)
    })
  })

  describe('validateDescription', () => {
    it('should reject empty description', () => {
      const result = validateDescription('')
      expect(result.valid).toBe(false)
    })

    it('should reject description shorter than 30 characters', () => {
      const result = validateDescription('Short desc')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('30 characters')
    })

    it('should accept valid description', () => {
      const result = validateDescription('This is a valid issue description that meets the minimum length requirement')
      expect(result.valid).toBe(true)
    })
  })

  describe('validateImpact', () => {
    it('should reject empty impact description', () => {
      const result = validateImpact('')
      expect(result.valid).toBe(false)
    })

    it('should reject impact shorter than 20 characters', () => {
      const result = validateImpact('Short impact')
      expect(result.valid).toBe(false)
    })

    it('should accept valid impact', () => {
      const result = validateImpact('This is a valid impact description that meets requirements')
      expect(result.valid).toBe(true)
    })
  })

  describe('validateIssueType', () => {
    it('should accept valid issue types', () => {
      expect(validateIssueType('request_for_change').valid).toBe(true)
      expect(validateIssueType('off_specification').valid).toBe(true)
      expect(validateIssueType('problem_concern').valid).toBe(true)
    })

    it('should reject invalid issue types', () => {
      expect(validateIssueType('invalid_type').valid).toBe(false)
      expect(validateIssueType('').valid).toBe(false)
      expect(validateIssueType(null).valid).toBe(false)
    })
  })

  describe('validatePriority', () => {
    it('should accept valid priorities', () => {
      expect(validatePriority('critical').valid).toBe(true)
      expect(validatePriority('high').valid).toBe(true)
      expect(validatePriority('medium').valid).toBe(true)
      expect(validatePriority('low').valid).toBe(true)
    })

    it('should reject invalid priorities', () => {
      expect(validatePriority('invalid').valid).toBe(false)
      expect(validatePriority('').valid).toBe(false)
    })
  })

  describe('validateSeverity', () => {
    it('should accept valid severities', () => {
      expect(validateSeverity('critical').valid).toBe(true)
      expect(validateSeverity('major').valid).toBe(true)
      expect(validateSeverity('moderate').valid).toBe(true)
      expect(validateSeverity('minor').valid).toBe(true)
    })

    it('should reject invalid severities', () => {
      expect(validateSeverity('invalid').valid).toBe(false)
    })
  })

  describe('validateOwner', () => {
    it('should require owner for in_progress status', () => {
      const result = validateOwner('in_progress', null)
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Owner must be assigned')
    })

    it('should accept owner for in_progress status', () => {
      const result = validateOwner('in_progress', 'user-123')
      expect(result.valid).toBe(true)
    })

    it('should not require owner for other statuses', () => {
      expect(validateOwner('raised', null).valid).toBe(true)
      expect(validateOwner('draft', null).valid).toBe(true)
    })
  })

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(validateStatusTransition('draft', 'raised').valid).toBe(true)
      expect(validateStatusTransition('raised', 'under_assessment').valid).toBe(true)
    })

    it('should reject invalid transitions', () => {
      expect(validateStatusTransition('closed', 'raised').valid).toBe(false)
      expect(validateStatusTransition('cancelled', 'raised').valid).toBe(false)
    })
  })

  describe('validateIssueForm', () => {
    it('should validate complete form', () => {
      const formData = {
        issue_title: 'This is a valid issue title',
        issue_description: 'This is a valid issue description that meets the minimum length requirement',
        impact_description: 'This is a valid impact description',
        issue_type: 'problem_concern',
        priority: 'high',
        severity: 'major',
        status: 'raised',
        owner_id: null
      }

      const result = validateIssueForm(formData)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors).length).toBe(0)
    })

    it('should return errors for invalid form', () => {
      const formData = {
        issue_title: 'Short',
        issue_description: 'Short',
        impact_description: 'Short',
        issue_type: '',
        priority: '',
        severity: '',
        status: 'in_progress',
        owner_id: null
      }

      const result = validateIssueForm(formData)
      expect(result.valid).toBe(false)
      expect(Object.keys(result.errors).length).toBeGreaterThan(0)
    })

    it('should require product for off-specification issues', () => {
      const formData = {
        issue_title: 'This is a valid issue title',
        issue_description: 'This is a valid issue description that meets requirements',
        impact_description: 'This is a valid impact description',
        issue_type: 'off_specification',
        priority: 'high',
        severity: 'major',
        related_product_id: null
      }

      const result = validateIssueForm(formData)
      expect(result.valid).toBe(false)
      expect(result.errors.related_product_id).toBeDefined()
    })
  })

  describe('calculatePriorityScore', () => {
    it('should calculate very_high for critical/critical', () => {
      expect(calculatePriorityScore('critical', 'critical')).toBe('very_high')
      expect(calculatePriorityScore('critical', 'major')).toBe('very_high')
    })

    it('should calculate high for high/major', () => {
      expect(calculatePriorityScore('high', 'major')).toBe('high')
    })

    it('should calculate medium for medium/moderate', () => {
      expect(calculatePriorityScore('medium', 'moderate')).toBe('medium')
    })

    it('should calculate low for low/minor', () => {
      expect(calculatePriorityScore('low', 'minor')).toBe('low')
    })
  })

  describe('requiresImmediateAttention', () => {
    it('should return true for very_high and high scores', () => {
      expect(requiresImmediateAttention('critical', 'critical', 'raised')).toBe(true)
      expect(requiresImmediateAttention('high', 'major', 'raised')).toBe(true)
    })

    it('should return false for closed/cancelled issues', () => {
      expect(requiresImmediateAttention('critical', 'critical', 'closed')).toBe(false)
      expect(requiresImmediateAttention('high', 'major', 'cancelled')).toBe(false)
    })

    it('should return false for medium/low scores', () => {
      expect(requiresImmediateAttention('medium', 'moderate', 'raised')).toBe(false)
      expect(requiresImmediateAttention('low', 'minor', 'raised')).toBe(false)
    })
  })
})
