/**
 * Unit tests for salience model (Mitchell et al.) – Power × Legitimacy × Urgency
 */

import { describe, it, expect } from 'vitest'
import { salienceClassFromPLU, getSalienceClassFromRecord } from '../salienceUtils'

describe('salienceClassFromPLU', () => {
  it('returns latent when all dimensions are low (< 4)', () => {
    expect(salienceClassFromPLU(1, 1, 1)).toBe('latent')
    expect(salienceClassFromPLU(3, 3, 3)).toBe('latent')
    expect(salienceClassFromPLU(0, 0, 0)).toBe('latent')
  })

  it('returns dormant when only power is high (>= 4)', () => {
    expect(salienceClassFromPLU(4, 1, 1)).toBe('dormant')
    expect(salienceClassFromPLU(5, 2, 3)).toBe('dormant')
  })

  it('returns discretionary when only legitimacy is high', () => {
    expect(salienceClassFromPLU(1, 4, 1)).toBe('discretionary')
    expect(salienceClassFromPLU(2, 5, 2)).toBe('discretionary')
  })

  it('returns demanding when only urgency is high', () => {
    expect(salienceClassFromPLU(1, 1, 4)).toBe('demanding')
    expect(salienceClassFromPLU(2, 2, 5)).toBe('demanding')
  })

  it('returns dominant when power and legitimacy are high', () => {
    expect(salienceClassFromPLU(4, 4, 1)).toBe('dominant')
    expect(salienceClassFromPLU(5, 5, 2)).toBe('dominant')
  })

  it('returns dangerous when power and urgency are high', () => {
    expect(salienceClassFromPLU(4, 1, 4)).toBe('dangerous')
    expect(salienceClassFromPLU(5, 2, 5)).toBe('dangerous')
  })

  it('returns dependent when legitimacy and urgency are high', () => {
    expect(salienceClassFromPLU(1, 4, 4)).toBe('dependent')
    expect(salienceClassFromPLU(2, 5, 5)).toBe('dependent')
  })

  it('returns definitive when all three are high', () => {
    expect(salienceClassFromPLU(4, 4, 4)).toBe('definitive')
    expect(salienceClassFromPLU(5, 5, 5)).toBe('definitive')
  })

  it('treats null/undefined as 0', () => {
    expect(salienceClassFromPLU(null, null, null)).toBe('latent')
    expect(salienceClassFromPLU(4, undefined, undefined)).toBe('dormant')
  })
})

describe('getSalienceClassFromRecord', () => {
  it('returns latent for null or empty object', () => {
    expect(getSalienceClassFromRecord(null)).toBe('latent')
    expect(getSalienceClassFromRecord({})).toBe('latent')
  })

  it('returns existing salience_class when present', () => {
    expect(getSalienceClassFromRecord({ salience_class: 'dominant' })).toBe('dominant')
    expect(getSalienceClassFromRecord({
      salience_class: 'custom',
      power_level: 5,
      legitimacy_level: 5,
      urgency_level: 5,
    })).toBe('custom')
  })

  it('computes from power_level, legitimacy_level, urgency_level when salience_class missing', () => {
    expect(getSalienceClassFromRecord({
      power_level: 4,
      legitimacy_level: 4,
      urgency_level: 4,
    })).toBe('definitive')
    expect(getSalienceClassFromRecord({
      power_level: 4,
      legitimacy_level: 1,
      urgency_level: 1,
    })).toBe('dormant')
  })
})
