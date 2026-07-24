import { describe, expect, it } from 'vitest'
import {
  SIDEBAR_NAV_TIER_BASE,
  getSidebarNavTierClassName,
  getSidebarNestedItemPadding,
  getSidebarNestedRowPadding,
} from '../sidebarNavUtils.js'

describe('sidebarNavUtils', () => {
  it('defines a composable tier base class', () => {
    expect(SIDEBAR_NAV_TIER_BASE).toContain('border-l-2')
    expect(SIDEBAR_NAV_TIER_BASE).toContain('ml-3')
    expect(SIDEBAR_NAV_TIER_BASE).toContain('pl-3')
  })

  it('merges border class into tier className', () => {
    expect(getSidebarNavTierClassName('border-gray-700')).toContain('border-gray-700')
    expect(getSidebarNavTierClassName()).toBe(SIDEBAR_NAV_TIER_BASE)
  })

  it('uses full padding at root and right-only padding when nested', () => {
    expect(getSidebarNestedItemPadding(0)).toBe('px-2 sm:px-3')
    expect(getSidebarNestedItemPadding(2)).toBe('pr-2 sm:pr-3')
    expect(getSidebarNestedItemPadding(1, { base: 'px-4', nested: 'pr-4' })).toBe('pr-4')
  })

  it('keeps getSidebarNestedRowPadding as alias', () => {
    expect(getSidebarNestedRowPadding(0)).toBe(getSidebarNestedItemPadding(0))
  })
})
