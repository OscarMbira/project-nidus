// v1264 — header colour helpers (must agree with public.site_color_contrast in SQL v1264).
import { describe, it, expect } from 'vitest'
import { contrastRatio, meetsAA, deriveHeaderPalette, headerCssVars, isDarkColor, DEFAULT_HEADER_COLORS } from '../siteColors.js'

describe('contrastRatio', () => {
  it('matches WCAG reference pairs', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21)
    expect(contrastRatio('#FFFFFF', '#000000')).toBe(21)
    expect(contrastRatio('#2563EB', '#2563EB')).toBe(1)
    expect(contrastRatio('#FFFFFF', '#2563EB')).toBeCloseTo(5.17, 1)
  })
  it('returns null for invalid colours', () => {
    expect(contrastRatio('red', '#FFFFFF')).toBeNull()
    expect(contrastRatio('#FFF', '#000000')).toBeNull()
  })
  it('meetsAA uses 4.5:1 (white on green-600 fails, green-700 passes)', () => {
    expect(meetsAA('#FFFFFF', '#16A34A')).toBe(false)
    expect(meetsAA('#FFFFFF', '#15803D')).toBe(true)
  })
})

describe('header palette', () => {
  it('uses built-in colours for missing or invalid settings', () => {
    expect(deriveHeaderPalette(null).bg).toBe(DEFAULT_HEADER_COLORS.bg_color)
    expect(deriveHeaderPalette({ bg_color: 'nope' }).bg).toBe(DEFAULT_HEADER_COLORS.bg_color)
  })
  it('keeps muted text readable on the menu panel', () => {
    for (const s of [DEFAULT_HEADER_COLORS, { bg_color: '#FFFFFF', text_color: '#374151' }, { bg_color: '#1E3A8A', text_color: '#FFFFFF' }]) {
      const p = deriveHeaderPalette(s)
      expect(meetsAA(p.muted, p.panel)).toBe(true)
      expect(meetsAA(p.strong, p.bg)).toBe(true)
    }
  })
  it('exposes CSS variables and detects dark backgrounds', () => {
    expect(headerCssVars({ ...DEFAULT_HEADER_COLORS, accent_color: '#7C3AED' })['--nh-accent']).toBe('#7C3AED')
    expect(isDarkColor('#030712')).toBe(true)
    expect(isDarkColor('#FFFFFF')).toBe(false)
  })
})
