import { describe, it, expect } from 'vitest'
import {
  normalizeDomainGroup,
  filterRowsByDomainGroup,
  domainGroupHeadingSuffix,
} from '../templateDomainGroup.js'

describe('normalizeDomainGroup', () => {
  it('accepts forms / templates only', () => {
    expect(normalizeDomainGroup('forms')).toBe('forms')
    expect(normalizeDomainGroup('Templates')).toBe('templates')
    expect(normalizeDomainGroup('other')).toBe(null)
  })
})

describe('filterRowsByDomainGroup', () => {
  const rows = [
    { id: '1', domain: 'form_template' },
    { id: '2', domain: 'process_template' },
    { id: '3', domain: 'fields' },
  ]

  it('forms group keeps only form_template', () => {
    expect(filterRowsByDomainGroup(rows, { domainGroup: 'forms' }).map((r) => r.id)).toEqual(['1'])
  })

  it('templates group excludes form_template', () => {
    expect(filterRowsByDomainGroup(rows, { domainGroup: 'templates' }).map((r) => r.id)).toEqual([
      '2',
      '3',
    ])
  })

  it('exact domain filter still works when no domainGroup', () => {
    expect(
      filterRowsByDomainGroup(rows, { domainFilter: 'process_template' }).map((r) => r.id),
    ).toEqual(['2'])
  })
})

describe('domainGroupHeadingSuffix', () => {
  it('returns em-dash labels for active groups', () => {
    expect(domainGroupHeadingSuffix('forms')).toBe(' — Forms')
    expect(domainGroupHeadingSuffix('templates')).toBe(' — Templates')
    expect(domainGroupHeadingSuffix(null)).toBe('')
  })
})
