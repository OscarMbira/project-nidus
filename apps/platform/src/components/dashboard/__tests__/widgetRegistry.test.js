/**
 * Sanity tests for the persona widget registries (v982 Phase 5, extended v982 Phase 5 follow-up).
 */
import { describe, it, expect } from 'vitest'
import {
  PROJECT_MANAGER_HOME_WIDGETS,
  FREELANCER_HOME_WIDGETS,
  PORTFOLIO_MANAGER_HOME_WIDGETS,
  PROGRAMME_MANAGER_HOME_WIDGETS,
  PMO_ADMIN_HOME_WIDGETS,
} from '../widgetRegistry'

function assertValidWidgetList(widgets) {
  const ids = new Set()
  for (const w of widgets) {
    expect(typeof w.id).toBe('string')
    expect(w.id.length).toBeGreaterThan(0)
    expect(ids.has(w.id)).toBe(false) // unique within the list
    ids.add(w.id)
    expect(typeof w.title).toBe('string')
    expect(w.component).toBeDefined()
  }
}

describe('PROJECT_MANAGER_HOME_WIDGETS', () => {
  it('has unique, well-formed widget entries', () => {
    assertValidWidgetList(PROJECT_MANAGER_HOME_WIDGETS)
    expect(PROJECT_MANAGER_HOME_WIDGETS.length).toBeGreaterThan(0)
  })
})

describe('FREELANCER_HOME_WIDGETS', () => {
  it('has unique, well-formed widget entries', () => {
    assertValidWidgetList(FREELANCER_HOME_WIDGETS)
    expect(FREELANCER_HOME_WIDGETS.length).toBeGreaterThan(0)
  })

  it('is a deliberately lighter subset of the Project Manager Home widget pool — proves the framework composes differently per persona, not just reuses everything', () => {
    const freelancerIds = FREELANCER_HOME_WIDGETS.map((w) => w.id)
    const pmIds = PROJECT_MANAGER_HOME_WIDGETS.map((w) => w.id)
    expect(freelancerIds.length).toBeLessThan(pmIds.length)
    for (const id of freelancerIds) {
      expect(pmIds).toContain(id)
    }
  })
})

describe('PORTFOLIO_MANAGER_HOME_WIDGETS (v982 Phase 5 follow-up)', () => {
  it('has unique, well-formed widget entries, all scoped to portfolioId', () => {
    assertValidWidgetList(PORTFOLIO_MANAGER_HOME_WIDGETS)
    expect(PORTFOLIO_MANAGER_HOME_WIDGETS.length).toBeGreaterThan(0)
    for (const w of PORTFOLIO_MANAGER_HOME_WIDGETS) {
      expect(w.requiredScope).toContain('portfolioId')
    }
  })

  it('shares no widget ids with PROGRAMME_MANAGER_HOME_WIDGETS or PROJECT_MANAGER_HOME_WIDGETS — genuinely new content, not relabelled reuse', () => {
    const portfolioIds = new Set(PORTFOLIO_MANAGER_HOME_WIDGETS.map((w) => w.id))
    const overlap = [...portfolioIds].filter(
      (id) => PROGRAMME_MANAGER_HOME_WIDGETS.some((w) => w.id === id) || PROJECT_MANAGER_HOME_WIDGETS.some((w) => w.id === id),
    )
    expect(overlap).toEqual([])
  })
})

describe('PROGRAMME_MANAGER_HOME_WIDGETS (v982 Phase 5 follow-up)', () => {
  it('has unique, well-formed widget entries, all scoped to programmeId', () => {
    assertValidWidgetList(PROGRAMME_MANAGER_HOME_WIDGETS)
    expect(PROGRAMME_MANAGER_HOME_WIDGETS.length).toBeGreaterThan(0)
    for (const w of PROGRAMME_MANAGER_HOME_WIDGETS) {
      expect(w.requiredScope).toContain('programmeId')
    }
  })
})

describe('PMO_ADMIN_HOME_WIDGETS (v982 Phase 5 follow-up)', () => {
  it('has unique, well-formed widget entries, all gated by a PMO_LAYOUT_ROLES-equivalent requiredRole list', () => {
    assertValidWidgetList(PMO_ADMIN_HOME_WIDGETS)
    expect(PMO_ADMIN_HOME_WIDGETS.length).toBeGreaterThan(0)
    for (const w of PMO_ADMIN_HOME_WIDGETS) {
      expect(w.requiredRole).toEqual(expect.arrayContaining(['pmo_admin', 'account_owner']))
    }
  })

  it('serves Account Owner and PMO Admin from the SAME widget list (one composition, not two) — matches today\'s existing shared gate in menuLayoutUtils.js\'s PMO_LAYOUT_ROLES', () => {
    // Both role names must independently satisfy every widget's requiredRole OR-match.
    for (const w of PMO_ADMIN_HOME_WIDGETS) {
      expect(w.requiredRole.includes('account_owner')).toBe(true)
      expect(w.requiredRole.includes('pmo_admin')).toBe(true)
    }
  })
})
