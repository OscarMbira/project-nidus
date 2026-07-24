import { describe, it, expect } from 'vitest'
import {
  resolveVisibleTracks,
  normalizeProjectDeliveryTrack,
  inferMenuItemMethodology,
  wrapPmoMenuWithMethodologyTracks,
  filterMenuByPmProfile,
  categoryMethodologyTrack,
} from '../methodologyMenuUtils'

describe('methodologyMenuUtils', () => {
  it('resolveVisibleTracks returns all tracks for hybrid org with no focus', () => {
    const tracks = resolveVisibleTracks('hybrid', null, true)
    expect(tracks.has('structured')).toBe(true)
    expect(tracks.has('standards_based')).toBe(true)
    expect(tracks.has('agile')).toBe(true)
  })

  it('resolveVisibleTracks respects structured sidebar focus on hybrid org', () => {
    const tracks = resolveVisibleTracks('hybrid', null, true, 'structured')
    expect(tracks.has('structured')).toBe(true)
    expect(tracks.has('standards_based')).toBe(false)
    expect(tracks.has('agile')).toBe(false)
  })

  it('resolveVisibleTracks hides non-org tracks when org is standards_based', () => {
    const tracks = resolveVisibleTracks('standards_based', null, false)
    expect(tracks.has('standards_based')).toBe(true)
    expect(tracks.has('structured')).toBe(false)
    expect(tracks.has('agile')).toBe(false)
  })

  it('resolveVisibleTracks allows project override when enabled', () => {
    const tracks = resolveVisibleTracks('structured', 'agile', true)
    expect(tracks.has('structured')).toBe(true)
    expect(tracks.has('agile')).toBe(true)
  })

  it('normalizeProjectDeliveryTrack maps legacy values', () => {
    expect(normalizeProjectDeliveryTrack('Waterfall')).toBe('structured')
    expect(normalizeProjectDeliveryTrack('Agile')).toBe('agile')
    expect(normalizeProjectDeliveryTrack('hybrid')).toBe('hybrid')
    expect(normalizeProjectDeliveryTrack('pmbok')).toBe('standards_based')
    expect(normalizeProjectDeliveryTrack('waterfall-pmbok')).toBe('standards_based')
    expect(normalizeProjectDeliveryTrack('standards_based')).toBe('standards_based')
  })

  it('resolveVisibleTracks maps legacy org methodology pmbok to standards_based', () => {
    const tracks = resolveVisibleTracks('pmbok', null, false)
    expect(tracks.has('standards_based')).toBe(true)
    expect(tracks.has('structured')).toBe(false)
  })

  it('inferMenuItemMethodology maps legacy methodology pmbok and track category', () => {
    expect(inferMenuItemMethodology({ methodology: 'pmbok' })).toBe('standards_based')
    expect(
      inferMenuItemMethodology({
        menu_code: 'plat_grp_standards_based_forms',
        category: 'pmo-cat-standards-based',
      })
    ).toBe('standards_based')
  })

  it('wrapPmoMenuWithMethodologyTracks keeps [P] track children visible (smoke)', () => {
    const trackNodes = [
      {
        id: 'pmo-cat-standards-based',
        menu_code: 'pmo-cat-standards-based',
        menu_label: 'Process Group Forms',
        children: [{ id: '1', menu_label: 'Forms', route_path: '/platform/forms' }],
      },
    ]
    const wrapped = wrapPmoMenuWithMethodologyTracks(
      [],
      new Set(['standards_based']),
      trackNodes,
    )
    expect(wrapped.some((n) => n.is_methodology_header && n.methodology_track === 'standards_based')).toBe(true)
    const header = wrapped.find((n) => n.is_methodology_header && n.methodology_track === 'standards_based')
    expect((header?.children || []).length).toBeGreaterThan(0)
  })

  it('inferMenuItemMethodology classifies initiation', () => {
    expect(
      inferMenuItemMethodology({
        menu_code: 'pmo_init_business_case',
        route_path: '/pmo/initiation/business-case',
        category: 'pmo-cat-initiation',
      })
    ).toBe('structured')
  })

  it('categoryMethodologyTrack maps initiation category', () => {
    expect(categoryMethodologyTrack('pmo-cat-initiation')).toBe('structured')
    expect(categoryMethodologyTrack('pmo-cat-standards-based')).toBe('standards_based')
  })

  it('wrapPmoMenuWithMethodologyTracks adds track header when children exist', () => {
    const trackNodes = [
      {
        id: 'pmo-cat-initiation',
        menu_code: 'pmo-cat-initiation',
        menu_label: 'Pre-Project Docs',
        children: [{ id: '1', menu_label: 'Mandate', route_path: '/platform/mandates/list' }],
      },
    ]
    const wrapped = wrapPmoMenuWithMethodologyTracks([], new Set(['structured']), trackNodes)
    expect(wrapped.some((n) => n.is_methodology_header && n.methodology_track === 'structured')).toBe(true)
  })

  it('wrapPmoMenuWithMethodologyTracks hoists agile subsections under [A] without duplicate shell', () => {
    const trackNodes = [
      {
        menu_code: 'pmo-cat-agile-lean',
        menu_label: 'Agile & Lean Tools',
        children: [
          {
            menu_code: 'pmo-v671-agile-tools',
            menu_label: 'Agile & Lean Tools',
            children: [{ menu_label: 'Scrum of Scrums', route_path: '/platform/projects/x/scrum/scrum-of-scrums' }],
          },
          { menu_code: 'pmo-v671-agile-delivery', menu_label: 'Agile Delivery', children: [] },
          { menu_code: 'pmo-v671-agile-metrics', menu_label: 'Agile Metrics', children: [] },
        ],
      },
    ]
    const wrapped = wrapPmoMenuWithMethodologyTracks([], new Set(['agile']), trackNodes)
    const agileHeader = wrapped.find((n) => n.is_methodology_header && n.methodology_track === 'agile')
    expect(agileHeader).toBeDefined()
    expect(agileHeader.children.some((c) => c.menu_code === 'pmo-cat-agile-lean')).toBe(false)
    expect(agileHeader.children.map((c) => c.menu_label)).toEqual([
      'Agile & Lean Tools',
      'Agile Delivery',
      'Agile Metrics',
    ])
  })

  it('filterMenuByPmProfile limits viewer menu', () => {
    const tree = [
      { menu_label: 'Dashboard', route_path: '/platform/dashboard' },
      { menu_label: 'Create Project', route_path: '/platform/projects/create' },
    ]
    const filtered = filterMenuByPmProfile(tree, 'viewer')
    expect(filtered.length).toBe(1)
    expect(filtered[0].menu_label).toBe('Dashboard')
  })
})
