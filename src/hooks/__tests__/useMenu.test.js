/**
 * Unit tests for methodology-aware menu utilities (v671).
 * Covers: resolveVisibleTracks, filterMenuByPmProfile, filterMenuTreeByVisibleTracks
 */
import { describe, it, expect } from 'vitest'
import {
  resolveVisibleTracks,
  filterMenuByPmProfile,
  filterMenuTreeByVisibleTracks,
  METHODOLOGY_TRACK_IDS,
} from '../../config/methodologyMenuUtils'

// ─── resolveVisibleTracks ────────────────────────────────────────────────────

describe('resolveVisibleTracks', () => {
  it('hybrid org with no project or user pref returns all three tracks', () => {
    const result = resolveVisibleTracks('hybrid', null, true, null)
    expect([...result].sort()).toEqual([...METHODOLOGY_TRACK_IDS].sort())
  })

  it('hybrid org with a project track returns only that project track', () => {
    const result = resolveVisibleTracks('hybrid', 'standards_based', true, null)
    expect([...result]).toEqual(['standards_based'])
  })

  it('hybrid org with user pref returns only that preferred track', () => {
    const result = resolveVisibleTracks('hybrid', null, true, 'agile')
    expect([...result]).toEqual(['agile'])
  })

  it('hybrid org: user pref takes priority over project track', () => {
    const result = resolveVisibleTracks('hybrid', 'standards_based', true, 'structured')
    expect([...result]).toEqual(['structured'])
  })

  it('structured org with override=false ignores differing project track', () => {
    const result = resolveVisibleTracks('structured', 'standards_based', false, null)
    expect([...result]).toEqual(['structured'])
    expect([...result]).not.toContain('standards_based')
    expect([...result]).not.toContain('agile')
  })

  it('standards_based org with override=false ignores differing project track', () => {
    const result = resolveVisibleTracks('standards_based', 'agile', false, null)
    expect([...result]).toEqual(['standards_based'])
    expect([...result]).not.toContain('structured')
    expect([...result]).not.toContain('agile')
  })

  it('agile org always returns only agile track', () => {
    const result = resolveVisibleTracks('agile', null, false, null)
    expect([...result]).toEqual(['agile'])
  })

  it('structured org with override=true and project=standards_based includes both', () => {
    const result = resolveVisibleTracks('structured', 'standards_based', true, null)
    expect([...result]).toContain('structured')
    expect([...result]).toContain('standards_based')
    expect([...result]).not.toContain('agile')
  })

  it('agile org with override=true and project=structured includes both', () => {
    const result = resolveVisibleTracks('agile', 'structured', true, null)
    expect([...result]).toContain('agile')
    expect([...result]).toContain('structured')
    expect([...result]).not.toContain('standards_based')
  })

  it('hybrid org with hybrid project track returns all tracks', () => {
    const result = resolveVisibleTracks('hybrid', 'hybrid', true, null)
    expect([...result].sort()).toEqual([...METHODOLOGY_TRACK_IDS].sort())
  })

  it('handles null/undefined org gracefully — defaults to hybrid', () => {
    const result = resolveVisibleTracks(null, null, true, null)
    expect([...result].sort()).toEqual([...METHODOLOGY_TRACK_IDS].sort())
  })

  it('normalizes legacy project values — prince2 maps to structured', () => {
    const result = resolveVisibleTracks('hybrid', 'prince2', true, null)
    expect([...result]).toEqual(['structured'])
  })

  it('normalizes legacy project values — scrum maps to agile', () => {
    const result = resolveVisibleTracks('hybrid', 'scrum', true, null)
    expect([...result]).toEqual(['agile'])
  })
})

// ─── filterMenuByPmProfile ────────────────────────────────────────────────────

describe('filterMenuByPmProfile', () => {
  const sampleItems = [
    { menu_code: 'dashboard', menu_label: 'Dashboard', route_path: '/pm/dashboard', children: [] },
    { menu_code: 'tasks', menu_label: 'Tasks', route_path: '/pm/tasks', children: [] },
    { menu_code: 'mandate', menu_label: 'Project Mandate', route_path: '/pm/initiation/mandate', children: [] },
    { menu_code: 'itto', menu_label: 'ITTO Templates', route_path: '/pm/itto/templates', children: [] },
    { menu_code: 'qa', menu_label: 'Quality Testing', route_path: '/pm/quality/testing', children: [] },
    { menu_code: 'analytics', menu_label: 'Analytics Dashboards', route_path: '/pm/reports/analytics', children: [] },
    { menu_code: 'approvals', menu_label: 'Pending My Approval', route_path: '/pm/authorisation/queue', children: [] },
  ]

  it('null profile returns items unchanged', () => {
    const result = filterMenuByPmProfile(sampleItems, null)
    expect(result).toHaveLength(sampleItems.length)
  })

  it('executive profile keeps dashboard and analytics but not tasks', () => {
    const result = filterMenuByPmProfile(sampleItems, 'executive')
    const codes = result.map((i) => i.menu_code)
    expect(codes).toContain('dashboard')
    expect(codes).toContain('analytics')
    expect(codes).not.toContain('tasks')
  })

  it('sponsor profile keeps mandate and approvals but not tasks', () => {
    const result = filterMenuByPmProfile(sampleItems, 'sponsor')
    const codes = result.map((i) => i.menu_code)
    expect(codes).toContain('mandate')
    expect(codes).toContain('approvals')
    expect(codes).not.toContain('tasks')
  })

  it('qa profile keeps quality items but not mandate', () => {
    const result = filterMenuByPmProfile(sampleItems, 'qa')
    const codes = result.map((i) => i.menu_code)
    expect(codes).toContain('qa')
    expect(codes).not.toContain('mandate')
  })

  it('viewer profile keeps only dashboard and analytics', () => {
    const result = filterMenuByPmProfile(sampleItems, 'viewer')
    const codes = result.map((i) => i.menu_code)
    expect(codes).toContain('dashboard')
    expect(codes).toContain('analytics')
    expect(codes).not.toContain('tasks')
    expect(codes).not.toContain('mandate')
  })

  it('preserves children when parent node matches', () => {
    const items = [
      {
        menu_code: 'reports_section',
        menu_label: 'Reporting',
        route_path: null,
        children: [
          { menu_code: 'highlight', menu_label: 'Highlight Reports', route_path: '/pm/reports/highlight', children: [] },
        ],
      },
    ]
    const result = filterMenuByPmProfile(items, 'executive')
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
  })
})

// ─── filterMenuTreeByVisibleTracks ────────────────────────────────────────────

describe('filterMenuTreeByVisibleTracks', () => {
  const makeTrackHeader = (track) => ({
    menu_code: `pmo-cat-${track === 'structured' ? 'initiation' : track}`,
    menu_label: track,
    is_methodology_header: true,
    methodology_track: track,
    route_path: null,
    children: [
      { menu_code: `${track}_item`, menu_label: `${track} item`, route_path: `/${track}/item`, children: [] },
    ],
  })

  const universalNode = {
    menu_code: 'pmo-cat-exec',
    menu_label: 'Executive Overview',
    is_methodology_header: false,
    route_path: null,
    children: [
      { menu_code: 'dash', menu_label: 'Dashboard', route_path: '/pmo/dashboard', children: [] },
    ],
  }

  const tree = [
    universalNode,
    makeTrackHeader('structured'),
    makeTrackHeader('standards_based'),
    makeTrackHeader('agile'),
  ]

  it('all tracks visible returns full tree', () => {
    const result = filterMenuTreeByVisibleTracks(tree, new Set(['structured', 'standards_based', 'agile']))
    expect(result).toHaveLength(4)
  })

  it('standards_based-only removes structured and agile track headers', () => {
    const result = filterMenuTreeByVisibleTracks(tree, new Set(['standards_based']))
    const codes = result.map((n) => n.methodology_track || n.menu_code)
    expect(codes).toContain('standards_based')
    expect(codes).not.toContain('structured')
    expect(codes).not.toContain('agile')
    expect(result.some((n) => n.menu_code === 'pmo-cat-exec')).toBe(true)
  })

  it('structured-only keeps structured track and universal nodes', () => {
    const result = filterMenuTreeByVisibleTracks(tree, new Set(['structured']))
    expect(result.some((n) => n.methodology_track === 'structured')).toBe(true)
    expect(result.some((n) => n.methodology_track === 'standards_based')).toBe(false)
    expect(result.some((n) => n.methodology_track === 'agile')).toBe(false)
    expect(result.some((n) => n.menu_code === 'pmo-cat-exec')).toBe(true)
  })

  it('removes track header when all its children are filtered out', () => {
    const emptyTrack = {
      menu_code: 'pmo-cat-agile-lean',
      is_methodology_header: true,
      methodology_track: 'agile',
      route_path: null,
      children: [],
    }
    const result = filterMenuTreeByVisibleTracks([emptyTrack], new Set(['agile']))
    expect(result).toHaveLength(0)
  })

  it('empty visibleTracks set removes all track headers', () => {
    const result = filterMenuTreeByVisibleTracks(tree, new Set([]))
    const trackHeaders = result.filter((n) => n.is_methodology_header)
    expect(trackHeaders).toHaveLength(0)
    expect(result.some((n) => n.menu_code === 'pmo-cat-exec')).toBe(true)
  })
})
