import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IndustryModulesPanel from '../IndustryModulesPanel.jsx'

const ROWS = [
  { menu_item_id: 'a', menu_label: 'Cutover Plan', group_label: 'Cutover', industry_name: 'Banking', is_disabled: false, organisation_disabled: false },
  { menu_item_id: 'b', menu_label: 'Hypercare Log', group_label: 'Hypercare', industry_name: 'Banking', is_disabled: true, organisation_disabled: false },
  { menu_item_id: 'c', menu_label: 'Payments Register', group_label: 'Payments', industry_name: 'Banking', is_disabled: false, organisation_disabled: true },
]

describe('IndustryModulesPanel (v1341 D16 / R3)', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* ignore */ } })

  it('switches an item off and back on through onToggle', () => {
    const onToggle = vi.fn()
    render(<IndustryModulesPanel rows={ROWS} history={[]} canEdit onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('switch', { name: /Cutover Plan: shown/ }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ menu_item_id: 'a' }), true)
    fireEvent.click(screen.getByRole('switch', { name: /Hypercare Log: switched off/ }))
    expect(onToggle).toHaveBeenLastCalledWith(expect.objectContaining({ menu_item_id: 'b' }), false)
  })

  it('shows organisation switch-offs as locked, with no switch', () => {
    render(<IndustryModulesPanel rows={ROWS} history={[]} canEdit onToggle={vi.fn()} />)
    expect(screen.getByText('Off for the organisation')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /Payments Register/ })).toBeNull()
  })

  it('is read-only for people who cannot edit', () => {
    render(<IndustryModulesPanel rows={ROWS} history={[]} canEdit={false} onToggle={vi.fn()} />)
    expect(screen.getByText(/Only the Project Manager or a PMO Admin/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Cutover Plan/ })).toBeDisabled()
  })

  it('lists who switched what in the Audit details tab', () => {
    const history = [{ id: 'h1', menu_label: 'Hypercare Log', action: 'switched_off', changed_by_name: 'Rudo Moyo', changed_at: '2026-11-13T09:00:00Z' }]
    render(<IndustryModulesPanel projectLabel="PRJ-1 — Core Banking" rows={ROWS} history={history} canEdit onToggle={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))
    expect(screen.getAllByText('Rudo Moyo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Switched off').length).toBeGreaterThan(0)
    expect(screen.getByText('PRJ-1 — Core Banking')).toBeInTheDocument()
  })

  it('says so when the project has no industry', () => {
    render(<IndustryModulesPanel rows={[]} history={[]} canEdit onToggle={vi.fn()} />)
    expect(screen.getByText(/has no industry/)).toBeInTheDocument()
  })
})
