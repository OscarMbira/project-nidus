import { describe, it, expect } from 'vitest'
import {
  SECTION_TYPES,
  SECTION_ITEM_FIELDS,
  resolveSectionCta,
  sectionsForPage,
  sectionHasContent,
  faqJsonLd,
  validateSectionContent,
} from '../siteSections.js'

describe('section types', () => {
  it('defines the 11 types with item fields', () => {
    expect(SECTION_TYPES).toHaveLength(11)
    for (const t of SECTION_TYPES) expect(SECTION_ITEM_FIELDS[t.value]).toBeDefined()
  })
})

describe('resolveSectionCta', () => {
  it('classifies each kind of link', () => {
    expect(resolveSectionCta({ label: 'Get started', href: '#get-started' }).kind).toBe('chooser')
    expect(resolveSectionCta({ label: 'How', href: '#how-it-works' }).kind).toBe('anchor')
    expect(resolveSectionCta({ label: 'Demo', href: '/contact?topic=sales' }).kind).toBe('internal')
    expect(resolveSectionCta({ label: 'Platform', href: 'https://platform.example/' }).kind).toBe('external')
  })

  it('drops missing or invalid buttons', () => {
    expect(resolveSectionCta(null)).toBeNull()
    expect(resolveSectionCta({ label: '', href: '/x' })).toBeNull()
    expect(resolveSectionCta({ label: 'Bad', href: 'javascript:alert(1)' })).toBeNull()
    expect(resolveSectionCta({ label: 'Bad', href: 'contact' })).toBeNull()
  })
})

describe('sectionsForPage', () => {
  it('keeps the page, active rows only, in order', () => {
    const rows = [
      { page_slug: 'home', section_key: 'b', sort_order: 20, is_active: true },
      { page_slug: 'home', section_key: 'a', sort_order: 10, is_active: true },
      { page_slug: 'home', section_key: 'hidden', sort_order: 5, is_active: false },
      { page_slug: 'solutions/pmo', section_key: 'x', sort_order: 1, is_active: true },
    ]
    expect(sectionsForPage(rows, 'home').map((s) => s.section_key)).toEqual(['a', 'b'])
  })
})

describe('sectionHasContent', () => {
  it('skips list sections with no items and plain sections with no heading', () => {
    expect(sectionHasContent({ section_type: 'trust_strip', items: [] })).toBe(false)
    expect(sectionHasContent({ section_type: 'faq', items: [{ title: 'Q', text: 'A' }] })).toBe(true)
    expect(sectionHasContent({ section_type: 'hero', heading: '' })).toBe(false)
    expect(sectionHasContent({ section_type: 'product_cards' })).toBe(true)
  })
})

describe('faqJsonLd', () => {
  it('builds FAQPage data from complete entries only', () => {
    const ld = faqJsonLd([{ section_type: 'faq', items: [{ title: 'Is there a trial?', text: 'Yes.' }, { title: 'Empty', text: '' }] }])
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(1)
    expect(faqJsonLd([{ section_type: 'hero' }])).toBeNull()
  })
})

describe('validateSectionContent', () => {
  it('accepts a valid hero', () => {
    expect(validateSectionContent('hero', { heading: 'H', primary_cta: { label: 'Go', href: '#get-started' } })).toEqual({})
  })

  it('reports heading, button, alt text and item problems', () => {
    expect(validateSectionContent('hero', {}).heading).toBeTruthy()
    expect(validateSectionContent('hero', { heading: 'H', primary_cta: { label: 'Go', href: 'nowhere' } }).primary_cta).toBeTruthy()
    expect(validateSectionContent('hero', { heading: 'H', image_url: 'https://x/y.png' }).image_alt).toBeTruthy()
    expect(validateSectionContent('faq', { heading: 'FAQ', items: [{ title: 'Q', text: '' }] })['items.0']).toMatch(/answer/)
    expect(validateSectionContent('testimonials', { items: [{ text: 'Great' }] })['items.0']).toMatch(/name/)
    expect(validateSectionContent('nope', {}).section_type).toBeTruthy()
  })
})
