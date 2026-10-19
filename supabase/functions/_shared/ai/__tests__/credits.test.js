import { describe, expect, it } from 'vitest'
import { addUsage, computeCredits, evaluateGate, fillMessage, messageLanguage, shouldSendWarning, usageCostUsd } from '../credits.js'

const settings = {
  credit_unit_usd: 0.001,
  model_prices: {
    'claude-haiku-5-5': { input: 0.1, output: 0.5, cache_read: 0.01, cache_write: 0.125 },
    'claude-sonnet-5-5': { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5 },
  },
}

describe('credits', () => {
  it('adds usage objects', () => {
    expect(addUsage({ input_tokens: 10, output_tokens: 2 }, { input_tokens: 5, cache_read_input_tokens: 7 })).toEqual({
      input_tokens: 15, output_tokens: 2, cache_read_input_tokens: 7, cache_creation_input_tokens: 0,
    })
  })

  it('prices tokens per million including cache reads and writes', () => {
    const usd = usageCostUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 },
      settings.model_prices['claude-sonnet-5-5'])
    expect(usd).toBeCloseTo(2 + 10 + 0.2 + 2.5, 6)
  })

  it('turns a typical multi-step Sonnet question into about 30 credits', () => {
    // 5k uncached + 15k cached input, 1.5k output ≈ $0.01 + $0.003 + $0.015 = $0.028
    const credits = computeCredits([{ model: 'claude-sonnet-5-5', usage: { input_tokens: 5000, cache_read_input_tokens: 15000, output_tokens: 1500 } }], settings)
    expect(credits).toBeCloseTo(28, 0)
  })

  it('sums parts across models and rounds up to 3 decimals', () => {
    const credits = computeCredits([
      { model: 'claude-haiku-5-5', usage: { input_tokens: 1000, output_tokens: 10 } },
      { model: 'claude-sonnet-5-5', usage: { input_tokens: 1, output_tokens: 1 } },
    ], settings)
    expect(credits).toBe(0.117) // $0.000117 ÷ $0.001
    // a fraction below 0.001 credit rounds up
    expect(computeCredits([{ model: 'claude-haiku-5-5', usage: { input_tokens: 1 } }], settings)).toBe(0.001)
  })

  it('refuses a model with no configured price', () => {
    expect(() => computeCredits([{ model: 'unknown', usage: {} }], settings)).toThrow(/No price/)
  })
})

describe('gate', () => {
  it('allows when the status allows', () => {
    expect(evaluateGate({ allowed: true })).toEqual({ allowed: true, reason: null })
  })
  it('passes the reason through when blocked', () => {
    expect(evaluateGate({ allowed: false, reason: 'quota_blocked' })).toEqual({ allowed: false, reason: 'quota_blocked' })
  })
  it('blocks when there is no status', () => {
    expect(evaluateGate(null).reason).toBe('no_account')
  })
})

describe('warning email', () => {
  const base = { warning_level: 'warn', period_start: '2026-10-01T00:00:00Z' }
  it('sends once per period', () => {
    expect(shouldSendWarning({ ...base, last_warning_period_start: null })).toBe(true)
    expect(shouldSendWarning({ ...base, last_warning_period_start: '2026-10-01T00:00:00Z' })).toBe(false)
    expect(shouldSendWarning({ ...base, last_warning_period_start: '2026-09-01T00:00:00Z' })).toBe(true)
  })
  it('does not send below the warning level', () => {
    expect(shouldSendWarning({ ...base, warning_level: 'none' })).toBe(false)
  })
})

describe('messages', () => {
  it('fills placeholders and keeps unknown ones', () => {
    expect(fillMessage('Ask {owner} ({x})', { owner: 'Ana' })).toBe('Ask Ana ({x})')
  })
  it('maps language codes to base languages', () => {
    expect(messageLanguage('pt-BR')).toBe('pt')
    expect(messageLanguage(null)).toBe('en')
  })
})
