import { describe, it, expect } from 'vitest'
import {
  isBillingMenuNode,
  applyBillingMenuPolicy,
} from '../billingMenuUtils.js'

describe('billingMenuUtils', () => {
  it('detects billing menu nodes', () => {
    expect(isBillingMenuNode({ menu_code: 'plat_acct_current_plan', route_path: '/platform/subscription' })).toBe(true)
    expect(isBillingMenuNode({ menu_code: 'pmo-admin-subscription' })).toBe(true)
    expect(isBillingMenuNode({ menu_code: 'pmo-admin-users', route_path: '/platform/pmo-admin/users' })).toBe(false)
  })

  it('strips billing menus when user lacks billing access', () => {
    const tree = [
      { menu_code: 'pmo-cat-admin', menu_label: 'Administration', children: [
        { menu_code: 'pmo-admin-users', menu_label: 'User Management' },
        { menu_code: 'plat_acct_current_plan', menu_label: 'Current Plan', route_path: '/platform/subscription' },
      ]},
    ]
    const result = applyBillingMenuPolicy(tree, false, 'pmo')
    const flat = JSON.stringify(result)
    expect(flat).not.toMatch(/subscription/)
    expect(flat).toMatch(/User Management/)
  })

  it('injects Account & Subscription section when user has billing access', () => {
    const prev = import.meta.env.VITE_ENABLE_PLATFORM_BILLING
    import.meta.env.VITE_ENABLE_PLATFORM_BILLING = 'true'
    try {
      const tree = [
        { menu_code: 'pmo-cat-admin', menu_label: 'Administration', children: [] },
      ]
      const result = applyBillingMenuPolicy(tree, true, 'pmo')
      expect(result.some((n) => n.menu_code === 'pmo-cat-account-subscription')).toBe(true)
    } finally {
      import.meta.env.VITE_ENABLE_PLATFORM_BILLING = prev
    }
  })

  it('never injects billing menus when platform billing feature is disabled', () => {
    const prev = import.meta.env.VITE_ENABLE_PLATFORM_BILLING
    import.meta.env.VITE_ENABLE_PLATFORM_BILLING = 'false'
    try {
      const tree = [
        { menu_code: 'pmo-cat-admin', menu_label: 'Administration', children: [] },
      ]
      const result = applyBillingMenuPolicy(tree, true, 'pmo')
      expect(result.some((n) => n.menu_code === 'pmo-cat-account-subscription')).toBe(false)
    } finally {
      import.meta.env.VITE_ENABLE_PLATFORM_BILLING = prev
    }
  })
})
