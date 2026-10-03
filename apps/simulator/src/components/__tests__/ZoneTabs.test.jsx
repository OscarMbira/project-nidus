/**
 * ZoneTabs tests (v982 Phase 7 — Main Application Zones).
 * resolveActiveZone/zoneLandingRoute are pure, data-driven functions — the same "prove it's
 * data-driven, not eyeballed" discipline as Phase 5's widget-selection tests, applied here to
 * zone selection. No packages/config/src/pmoMenuHierarchyUtils.js involvement at all — these
 * functions only read location.pathname + the already-resolved layoutHint.layout.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ZoneTabs, { resolveActiveZone, zoneLandingRoute } from '../ZoneTabs'

describe('resolveActiveZone', () => {
  it('resolves Delivery for the pm layout', () => {
    expect(resolveActiveZone('/pm/dashboard', 'pm')).toBe('delivery')
    expect(resolveActiveZone('/pm/controls/risk-register', 'tm')).toBe('delivery')
  })

  it('resolves Organisation for the pmo layout', () => {
    expect(resolveActiveZone('/platform/dashboard', 'pmo')).toBe('organisation')
    expect(resolveActiveZone('/platform/pmo-admin/configuration', 'pmo')).toBe('organisation')
  })

  it('resolves the Simulator-equivalent layouts the same way', () => {
    expect(resolveActiveZone('/simulator/pm/dashboard', 'sim_pm')).toBe('delivery')
    expect(resolveActiveZone('/simulator/pmo/dashboard', 'sim_pmo')).toBe('organisation')
  })

  it('resolves Delivery for /simulator/practice-projects/* regardless of layout (v982 Phase 7 follow-up — a genuine gap the original phase flagged, not guessed at)', () => {
    // No explicit branch for this path exists in menuLayoutUtils.js's inferLayoutScopeFromPathname
    // — it would otherwise fall through to an ambiguous role-based default. resolveActiveZone
    // closes that gap with its own pathname check, independent of whatever `layout` resolves to.
    expect(resolveActiveZone('/simulator/practice-projects', null)).toBe('delivery')
    expect(resolveActiveZone('/simulator/practice-projects/create', undefined)).toBe('delivery')
    expect(resolveActiveZone('/simulator/practice-projects/abc-123/scope/wbs', 'sim_pmo')).toBe('delivery')
  })

  it('resolves My Work from the route regardless of layout', () => {
    expect(resolveActiveZone('/platform/my-work', 'pmo')).toBe('my-work')
    expect(resolveActiveZone('/simulator/my-work', null)).toBe('my-work')
  })

  it('returns null when neither the route nor a recognised layout applies (no zone forced)', () => {
    expect(resolveActiveZone('/platform/dashboard', null)).toBeNull()
    expect(resolveActiveZone('/some/other/path', 'unknown_layout')).toBeNull()
  })
})

describe('zoneLandingRoute', () => {
  it('maps each zone to its Platform landing route', () => {
    expect(zoneLandingRoute('my-work', false)).toBe('/platform/my-work')
    expect(zoneLandingRoute('delivery', false)).toBe('/pm/dashboard')
    expect(zoneLandingRoute('organisation', false)).toBe('/platform/dashboard')
  })

  it('maps each zone to its Simulator landing route', () => {
    expect(zoneLandingRoute('my-work', true)).toBe('/simulator/my-work')
    expect(zoneLandingRoute('delivery', true)).toBe('/simulator/pm/dashboard')
    expect(zoneLandingRoute('organisation', true)).toBe('/simulator/pmo/dashboard')
  })
})

describe('ZoneTabs component', () => {
  it('renders all three zones and highlights only the active one', () => {
    render(<ZoneTabs activeZone="delivery" onSelect={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(screen.getByRole('tab', { name: /delivery/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /my work/i })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /organisation/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onSelect with the clicked zone id', () => {
    const onSelect = vi.fn()
    render(<ZoneTabs activeZone="delivery" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('tab', { name: /organisation/i }))
    expect(onSelect).toHaveBeenCalledWith('organisation')
  })

  it('never renders a 4th "Account" tab (decision 1 — Account stays in the header dropdown)', () => {
    render(<ZoneTabs activeZone="delivery" onSelect={() => {}} />)
    expect(screen.queryByRole('tab', { name: /account/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })
})
