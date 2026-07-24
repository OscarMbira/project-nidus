import { describe, expect, it } from 'vitest'
import { normalizeSupabaseAuthError } from './authErrorMessage'

describe('normalizeSupabaseAuthError', () => {
  it('uses message when present', () => {
    expect(normalizeSupabaseAuthError({ message: ' Email taken ' })).toBe('Email taken')
  })

  it('handles empty message with AuthRetryableFetchError name', () => {
    expect(normalizeSupabaseAuthError({ name: 'AuthRetryableFetchError', message: '' })).toMatch(
      /Could not reach the authentication server/i
    )
  })

  it('handles 504 status', () => {
    expect(normalizeSupabaseAuthError({ status: 504 })).toMatch(/504/)
    expect(normalizeSupabaseAuthError({ message: 'Gateway Timeout', status: 504 })).toMatch(/paused/)
  })

  it('respects fallback', () => {
    expect(normalizeSupabaseAuthError({}, 'Custom fallback')).toBe('Custom fallback')
  })
})
