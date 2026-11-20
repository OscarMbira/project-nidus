import { describe, it, expect } from 'vitest'
import {
  AMOUNT_SHORTHAND_NOTE,
  buildFieldHelpRules,
  buildLearnMoreHref,
  parseFieldHelpText,
  resolveFieldHelpTokens,
} from '../fieldHelp'

describe('field help — regional tokens (G-D6)', () => {
  it('fills date format, example date and currency from the regional settings', () => {
    const settings = { date_format: 'DD/MM/YYYY', currency_code: 'ZWG', locale: 'en-GB' }
    expect(resolveFieldHelpTokens('Shown as {date_format}', settings)).toBe('Shown as DD/MM/YYYY')
    expect(resolveFieldHelpTokens('e.g. {example_date}', settings)).toBe('e.g. 15/03/2027')
    expect(resolveFieldHelpTokens('Amounts in {currency}', settings)).toBe('Amounts in ZWG')
  })

  it('falls back to defaults and leaves unknown tokens alone', () => {
    expect(resolveFieldHelpTokens('{currency} {nope}', null)).toBe('USD {nope}')
    expect(resolveFieldHelpTokens(null, null)).toBe('')
  })
})

describe('field help — plain text (G-D12)', () => {
  it('turns "- " lines into lists and keeps HTML as text', () => {
    expect(parseFieldHelpText('Intro line\n- one\n- two\n\nAfter <b>bold</b>')).toEqual([
      { type: 'p', text: 'Intro line' },
      { type: 'ul', items: ['one', 'two'] },
      { type: 'p', text: 'After <b>bold</b>' },
    ])
  })
})

describe('field help — derived rules (G-D7)', () => {
  it('builds rules from the live field definition', () => {
    expect(buildFieldHelpRules({ required: true, maxLength: 200 })).toEqual(['Required.', 'Up to 200 characters.'])
    expect(buildFieldHelpRules({ required: false, min: 0, max: 168 })).toEqual(['Optional.', 'Between 0 and 168.'])
    expect(buildFieldHelpRules({ options: ['—', { label: 'Active' }, { value: 'inactive' }] }))
      .toEqual(['Choose from: Active, inactive.'])
    expect(buildFieldHelpRules({})).toEqual([])
  })

  it('caps long option lists and adds the amount shorthand note', () => {
    const options = Array.from({ length: 15 }, (_, i) => `O${i}`)
    expect(buildFieldHelpRules({ options })[0]).toMatch(/\(\+3 more\)\.$/)
    expect(buildFieldHelpRules({ isAmount: true })).toEqual([AMOUNT_SHORTHAND_NOTE])
  })
})

describe('field help — Learn more links (G-D11, PD4)', () => {
  it('links articles to the in-app page and guides to documentation', () => {
    expect(buildLearnMoreHref({ kind: 'article', key: 'stakeholder-basics', app: 'platform' }))
      .toBe('/platform/help/articles/stakeholder-basics')
    expect(buildLearnMoreHref({ kind: 'article', key: 'stakeholder-basics', app: 'simulator' }))
      .toBe('/simulator/help/articles/stakeholder-basics')
    expect(buildLearnMoreHref({ kind: 'documentation', key: 'stakeholders#identification', app: 'platform' }))
      .toBe('/documentation/platform/stakeholders#identification')
  })

  it('never builds a free or unsafe URL', () => {
    expect(buildLearnMoreHref({ kind: 'article', key: 'https://evil.example' })).toBeNull()
    expect(buildLearnMoreHref({ kind: 'article', key: 'javascript:alert(1)' })).toBeNull()
    expect(buildLearnMoreHref({ kind: 'documentation', key: '../../x' })).toBeNull()
    expect(buildLearnMoreHref({ kind: 'other', key: 'x' })).toBeNull()
    expect(buildLearnMoreHref({ kind: 'article', key: 'x', app: 'planner' })).toBeNull()
    expect(buildLearnMoreHref({ kind: 'article', key: '' })).toBeNull()
  })
})

describe('user-created field help (v1345 slice 1b)', async () => {
  const { isFieldHelpComplete, inlineHelpFromDefinition } = await import('../fieldHelp')

  it('is complete only with a purpose and an example (old "help" counts as the purpose)', () => {
    expect(isFieldHelpComplete({ help_purpose: 'Why', help_example: 'Tier 1' })).toBe(true)
    expect(isFieldHelpComplete({ help: 'Why', help_example: 'Tier 1' })).toBe(true)
    expect(isFieldHelpComplete({ help_purpose: 'Why' })).toBe(false)
    expect(isFieldHelpComplete({ help_example: 'Tier 1' })).toBe(false)
    expect(isFieldHelpComplete(null)).toBe(false)
  })

  it('builds popover help from a definition, or none without a purpose', () => {
    expect(inlineHelpFromDefinition({ label: 'Supplier tier *', help_purpose: 'How important', help_example: 'Tier 1', help_format: 'Tier N' }))
      .toEqual({ title: 'Supplier tier', purpose: 'How important', examples: 'Tier 1', format_notes: 'Tier N', extra_notes: null })
    expect(inlineHelpFromDefinition({ label: 'Old field', description: 'Legacy text' }).purpose).toBe('Legacy text')
    expect(inlineHelpFromDefinition({ label: 'No help' })).toBeNull()
  })
})
