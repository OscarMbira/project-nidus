import { describe, it, expect } from 'vitest'
import { validateDateOrder, validateProbabilityImpactScale, validateRequiredFields } from '../formValidation'

describe('formValidation', () => {
  it('validates required fields', () => {
    const errors = validateRequiredFields({ required: ['name'] }, {})
    expect(errors.name).toBeTruthy()
  })

  it('validates date order', () => {
    expect(validateDateOrder('2026-05-10', '2026-05-01')).toContain('cannot be after')
  })

  it('validates probability impact scale', () => {
    expect(validateProbabilityImpactScale(6, 2)).toContain('between 1 and 5')
    expect(validateProbabilityImpactScale(3, 2)).toBeNull()
  })
})
