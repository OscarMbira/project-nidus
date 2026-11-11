import { describe, it, expect } from 'vitest'
import {
  REQUIREMENT_CATEGORIES,
  requirementCategoryFromQuery,
  requirementCategoryLabel,
  requirementListTitle,
} from '../requirementCategories'

describe('requirementCategories (v1338 filtered requirement lists)', () => {
  it('matches the register CHECK values', () => {
    expect(REQUIREMENT_CATEGORIES.map((c) => c.value)).toEqual(['business', 'functional', 'non_functional', 'technical', 'regulatory', 'other'])
  })

  it('accepts only known ?category= values', () => {
    expect(requirementCategoryFromQuery('functional')).toBe('functional')
    expect(requirementCategoryFromQuery('nonsense')).toBe('')
    expect(requirementCategoryFromQuery(undefined)).toBe('')
  })

  it('titles the list by category', () => {
    expect(requirementListTitle('non_functional')).toBe('Non-functional requirements')
    expect(requirementListTitle('')).toBe('Requirements register')
    expect(requirementCategoryLabel('business')).toBe('Business')
  })
})
