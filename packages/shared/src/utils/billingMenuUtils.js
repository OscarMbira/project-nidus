/**
 * Strip or inject Account & Subscription menus based on billing access.
 */

import { getV671CanonicalLeaves } from '@nidus/config/v671PmoMenuCanonical.js'
import { isPlatformBillingEnabled } from '@nidus/config/platformBillingFeatures.js'

const BILLING_MENU_CODE_RE =
  /^(plat_sec_account|plat_acct_|pmo-admin-subscription|pmo-cat-account-subscription|pmo-v671-account-subscription)/i

const BILLING_SIGNAL_RE =
  /account & subscription|subscription & billing|\/platform\/subscription|plat_acct_|current plan|billing history|payment methods|domain settings.*organisation/i

function nodeSignal(node = {}) {
  const code = String(node.menu_code || node.id || '').toLowerCase()
  const label = String(node.menu_label || node.label || '').toLowerCase()
  const path = String(node.route_path || node.path || '').toLowerCase()
  return `${code} ${label} ${path}`
}

export function isBillingMenuNode(node) {
  const s = nodeSignal(node)
  const code = String(node.menu_code || node.id || '')
  if (BILLING_MENU_CODE_RE.test(code)) return true
  if (BILLING_SIGNAL_RE.test(s)) return true
  if (/\/platform\/subscription/.test(s)) return true
  if (/\/platform\/organisation\/(profile|domain-settings)/.test(s) && /elevated|acct/.test(s)) return true
  return false
}

function stripBillingFromTree(nodes = []) {
  return (nodes || [])
    .filter((n) => !isBillingMenuNode(n))
    .map((n) => ({
      ...n,
      children: n.children?.length ? stripBillingFromTree(n.children) : [],
    }))
}

function virtualBillingSection() {
  const leaves = getV671CanonicalLeaves('accountSubscription')
  const subscriptionBilling = {
    menu_code: 'pmo-v671-acct-billing-group',
    menu_label: 'Subscription & Billing',
    route_path: null,
    menu_icon: 'credit-card',
    sort_order: 1,
    children: leaves.filter((l) => /subscription/.test(l.route_path || '')),
  }
  const orgElevated = {
    menu_code: 'pmo-v671-acct-org-group',
    menu_label: 'Organisation Settings (elevated)',
    route_path: null,
    menu_icon: 'building-2',
    sort_order: 2,
    children: leaves.filter((l) => /organisation/.test(l.route_path || '')),
  }

  return {
    menu_code: 'pmo-cat-account-subscription',
    menu_label: 'Account & Subscription',
    route_path: null,
    menu_icon: 'credit-card',
    sort_order: 12.5,
    categoryId: 'pmo-cat-account-subscription',
    children: [subscriptionBilling, orgElevated].filter((g) => g.children.length > 0),
  }
}

/**
 * @param {object[]} hierarchy
 * @param {boolean} hasBillingAccess
 * @param {string} [layout]
 * @returns {object[]}
 */
export function applyBillingMenuPolicy(hierarchy = [], hasBillingAccess = false, layout = 'pmo') {
  let tree = stripBillingFromTree(hierarchy)

  if (!isPlatformBillingEnabled() || layout !== 'pmo' || !hasBillingAccess) {
    return tree
  }

  const hasBillingSection = tree.some(
    (n) =>
      isBillingMenuNode(n) ||
      (n.children || []).some((c) => isBillingMenuNode(c))
  )

  if (hasBillingSection) {
    return tree
  }

  const section = virtualBillingSection()
  if (!section.children.length) return tree

  const adminIdx = tree.findIndex(
    (n) =>
      String(n.menu_code || n.id || '').includes('pmo-cat-admin') ||
      String(n.menu_label || n.label || '').toLowerCase() === 'administration'
  )
  const insertAt = adminIdx >= 0 ? adminIdx : tree.length
  const next = [...tree]
  next.splice(insertAt, 0, section)
  return next
}

export default {
  isBillingMenuNode,
  applyBillingMenuPolicy,
}
