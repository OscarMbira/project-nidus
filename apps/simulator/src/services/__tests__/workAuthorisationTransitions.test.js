import { describe, it, expect } from 'vitest'
import { isTerminalStatus, canEditDraft } from '../workAuthorisationTransitions'

describe('workAuthorisationTransitions', () => {
  it('isTerminalStatus', () => {
    expect(isTerminalStatus('closed')).toBe(true)
    expect(isTerminalStatus('rejected')).toBe(true)
    expect(isTerminalStatus('cancelled')).toBe(true)
    expect(isTerminalStatus('in_review')).toBe(false)
  })

  it('canEditDraft', () => {
    expect(canEditDraft('draft')).toBe(true)
    expect(canEditDraft('in_review')).toBe(false)
  })
})
