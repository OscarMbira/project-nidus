import { describe, it, expect } from 'vitest'
import {
  buildMockInvitationProjectContext,
  NOT_LINKED_PORTFOLIO,
  NOT_LINKED_PROGRAMME,
} from '../invitationProjectContextService'
import {
  formatProjectContextBlockHtml,
  formatProjectContextBlockPlain,
} from '../../utils/invitationEmailBlocks'

describe('buildMockInvitationProjectContext', () => {
  it('includes portfolio linked and programme not-linked lines', () => {
    const ctx = buildMockInvitationProjectContext()
    expect(ctx.portfolio.linked).toBe(true)
    expect(ctx.programme.linked).toBe(false)
    expect(ctx.portfolio.line).toContain('PF-SAMPLE')
    expect(ctx.programme.line).toContain(NOT_LINKED_PROGRAMME)
    expect(ctx.placeholderMap.portfolio_context_line).toBe(ctx.portfolio.line)
  })

  it('builds a plain context block with hierarchy section', () => {
    const ctx = buildMockInvitationProjectContext()
    expect(ctx.projectContextBlockPlain).toContain('Project context')
    expect(ctx.projectContextBlockPlain).toContain('Hierarchy')
    expect(ctx.projectContextBlockPlain).toContain('SP-ALPHA')
  })
})

describe('formatProjectContextBlockHtml', () => {
  it('renders description when present', () => {
    const ctx = buildMockInvitationProjectContext()
    const html = formatProjectContextBlockHtml(ctx)
    expect(html).toContain('Description')
    expect(html).toContain('Sample initiative')
  })

  it('omits description row when empty', () => {
    const ctx = { ...buildMockInvitationProjectContext(), projectDescription: '' }
    const html = formatProjectContextBlockHtml(ctx)
    expect(html).not.toContain('>Description<')
    expect(html).toContain('Type')
  })
})

describe('formatProjectContextBlockPlain', () => {
  it('returns projectContextBlockPlain from context', () => {
    const ctx = buildMockInvitationProjectContext()
    expect(formatProjectContextBlockPlain(ctx)).toBe(ctx.projectContextBlockPlain)
  })

  it('returns empty string when context is null', () => {
    expect(formatProjectContextBlockPlain(null)).toBe('')
  })
})

describe('not-linked copy', () => {
  it('uses approved portfolio and programme messages', () => {
    expect(NOT_LINKED_PORTFOLIO).toBe('This project is not currently assigned to a portfolio.')
    expect(NOT_LINKED_PROGRAMME).toBe('This project is not currently assigned to a programme.')
  })
})
