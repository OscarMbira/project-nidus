import { describe, it, expect } from 'vitest'
import { findPlaceholders, recordPlaceholderSummary } from '../registerPlaceholders'

describe('registerPlaceholders', () => {
  it('finds bracketed capitalised placeholders only', () => {
    expect(findPlaceholders('Move [Legacy Core System] data to [Target Core System] by [Go-Live Date]; see [1] and [note]'))
      .toEqual(['[Legacy Core System]', '[Target Core System]', '[Go-Live Date]'])
    expect(findPlaceholders(['[Bank Name]', { a: '[Bank Name] again' }])).toEqual(['[Bank Name]'])
    expect(findPlaceholders(null)).toEqual([])
  })

  it('counts distinct placeholders per tab and overall', () => {
    const register = {
      fields: [
        { field_key: 'owner', field_label: 'Owner', field_type: 'text' },
        { field_key: 'purpose', field_label: 'Purpose', field_type: 'long_text', field_group: 'Executive Summary' },
        { field_key: 'scope', field_label: 'Scope', field_type: 'multi_line', field_group: 'Scope' },
      ],
    }
    const record = {
      title: 'Data Migration Strategy – [Bank Name]',
      field_values: { owner: '[Document Owner]', purpose: '[Bank Name] moves from [Legacy Core System]', scope: 'All products' },
    }
    expect(recordPlaceholderSummary(register, record)).toEqual({
      total: 3,
      placeholders: ['[Bank Name]', '[Document Owner]', '[Legacy Core System]'],
      tabs: [{ tab: 'Details', count: 2 }, { tab: 'Executive Summary', count: 2 }],
    })
  })
})
