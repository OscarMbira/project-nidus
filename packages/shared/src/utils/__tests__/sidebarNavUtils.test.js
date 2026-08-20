import { describe, expect, it } from 'vitest'
import {
  SIDEBAR_NAV_TIER_BASE,
  SIDEBAR_NAV_TREE_ROW_BASE,
  getSidebarNavTierClassName,
  getSidebarNavTreeDotClassName,
  getSidebarNavTreeRowClassName,
  getSidebarNestedItemPadding,
  getSidebarNestedRowPadding,
} from '../sidebarNavUtils.js'

describe('sidebarNavUtils', () => {
  it('defines a composable tier base class with tree guide line', () => {
    expect(SIDEBAR_NAV_TIER_BASE).toContain('border-l')
    expect(SIDEBAR_NAV_TIER_BASE).toContain('ml-3')
    expect(SIDEBAR_NAV_TIER_BASE).toContain('pl-4')
    expect(SIDEBAR_NAV_TIER_BASE).toContain('relative')
  })

  it('defines a tree row wrapper base class', () => {
    expect(SIDEBAR_NAV_TREE_ROW_BASE).toBe('relative')
    expect(getSidebarNavTreeRowClassName()).toBe('relative')
  })

  it('merges border class into tier className', () => {
    expect(getSidebarNavTierClassName('border-gray-700')).toContain('border-gray-700')
    expect(getSidebarNavTierClassName()).toBe(SIDEBAR_NAV_TIER_BASE)
  })

  it('positions dot nodes on the guide line with theme-aware defaults', () => {
    expect(getSidebarNavTreeDotClassName()).toContain('rounded-full')
    expect(getSidebarNavTreeDotClassName()).toContain('dark:bg-gray-500')
    expect(getSidebarNavTreeDotClassName('bg-red-500')).toContain('bg-red-500')
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
