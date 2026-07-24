import { describe, it, expect } from 'vitest'
import {
  resolveTierForCreate,
  pickCreateParentLink,
} from '../pmTemplateCreateInheritance.js'

describe('pmTemplateCreateInheritance', () => {
  describe('resolveTierForCreate', () => {
    it('maps portfolio under portfolio to sub_portfolio', () => {
      expect(resolveTierForCreate('portfolio', 'portfolio')).toBe('sub_portfolio')
    })

    it('keeps programme / project / standalone portfolio tiers', () => {
      expect(resolveTierForCreate('programme', 'portfolio')).toBe('programme')
      expect(resolveTierForCreate('project', 'programme')).toBe('project')
      expect(resolveTierForCreate('portfolio', null)).toBe('portfolio')
      expect(resolveTierForCreate('project', null)).toBe('project')
    })
  })

  describe('pickCreateParentLink', () => {
    it('prefers programme over portfolio for projects', () => {
      expect(
        pickCreateParentLink({
          programmeId: 'prog-1',
          portfolioId: 'pf-1',
        })
      ).toEqual({ parentEntityType: 'programme', parentEntityId: 'prog-1' })
    })

    it('uses portfolio when no programme', () => {
      expect(pickCreateParentLink({ portfolioId: 'pf-1' })).toEqual({
        parentEntityType: 'portfolio',
        parentEntityId: 'pf-1',
      })
    })

    it('uses parentPortfolioId for nested portfolios', () => {
      expect(pickCreateParentLink({ parentPortfolioId: 'parent-pf' })).toEqual({
        parentEntityType: 'portfolio',
        parentEntityId: 'parent-pf',
      })
    })

    it('returns nulls when standalone', () => {
      expect(pickCreateParentLink({})).toEqual({
        parentEntityType: null,
        parentEntityId: null,
      })
    })
  })
})
