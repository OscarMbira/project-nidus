import { describe, it, expect } from 'vitest'
import { resolveSidebarThemeTokens } from '../sidebarThemeUtils'

describe('resolveSidebarThemeTokens', () => {
  const branding = {
    sidebar_bg_color: '#111827',
    sidebar_text_color: '#F9FAFB',
    sidebar_active_color: '#2563EB',
  }

  it('uses light palette in light mode and ignores dark-only brand text', () => {
    const t = resolveSidebarThemeTokens('light', branding)
    expect(t.asideClass).toContain('bg-white')
    expect(t.useBrandInactiveText).toBe(false)
    expect(t.inactiveItemClass).toContain('text-gray-700')
  })

  it('uses branding sidebar bg in dark mode', () => {
    const t = resolveSidebarThemeTokens('dark', branding)
    expect(t.asideStyle).toEqual({ backgroundColor: '#111827' })
    expect(t.useBrandInactiveText).toBe(true)
    expect(t.brandInactiveTextColor).toBe('#F9FAFB')
  })
})
