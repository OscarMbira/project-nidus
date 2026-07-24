/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { aggregateDirtyState, evaluateLinkClickForGuard } from '../unsavedChangesUtils.js'

function clickEvent(overrides = {}) {
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: document.createElement('div'),
    preventDefault() {
      this.defaultPrevented = true
    },
    stopPropagation() {},
    ...overrides,
  }
}

describe('aggregateDirtyState', () => {
  it('returns not dirty when no guards are dirty', () => {
    expect(aggregateDirtyState([{ isDirty: false }, { isDirty: false }])).toEqual({
      isDirty: false,
      message: 'You have unsaved changes. Discard them and leave this page?',
    })
  })

  it('returns dirty and prefers a custom message', () => {
    expect(
      aggregateDirtyState([
        { isDirty: false, message: 'A' },
        { isDirty: true, message: 'Custom warning' },
      ]),
    ).toEqual({
      isDirty: true,
      message: 'Custom warning',
    })
  })
})

describe('evaluateLinkClickForGuard', () => {
  it('ignores modified clicks', () => {
    const event = clickEvent({ ctrlKey: true })
    expect(evaluateLinkClickForGuard(event, '/current')).toEqual({ intercept: false })
  })

  it('ignores target=_blank links', () => {
    const anchor = document.createElement('a')
    anchor.href = '/next'
    anchor.target = '_blank'
    const event = clickEvent({ target: anchor })
    expect(evaluateLinkClickForGuard(event, '/current')).toEqual({ intercept: false })
  })

  it('intercepts same-origin in-app navigation', () => {
    const anchor = document.createElement('a')
    anchor.href = '/platform/projects'
    const event = clickEvent({ target: anchor })
    expect(evaluateLinkClickForGuard(event, '/current')).toEqual({
      intercept: true,
      targetPath: '/platform/projects',
    })
  })

  it('ignores navigation to the current path', () => {
    const anchor = document.createElement('a')
    anchor.href = '/current?tab=1'
    const event = clickEvent({ target: anchor })
    expect(evaluateLinkClickForGuard(event, '/current?tab=1')).toEqual({ intercept: false })
  })
})
