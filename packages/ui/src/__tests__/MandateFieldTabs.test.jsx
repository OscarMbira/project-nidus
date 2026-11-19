import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MandateFieldTabs, { MANDATE_TABS, mandateListToMultiline, multilineToMandateList, MandateAssumptionsRisksView } from '../MandateFieldTabs'
import MandateDeliverablesSection from '../MandateDeliverablesSection'

beforeEach(() => localStorage.clear())

describe('MandateFieldTabs (v1344 slice 2)', () => {
  it('has the six content tabs', () => {
    expect(MANDATE_TABS.map((t) => t.label)).toEqual([
      'Purpose', 'Scope', 'People', 'Objectives & Constraints', 'Quality & Case', 'Deliverables & Dependencies',
    ])
  })

  it('converts lists both ways (JSON array and legacy text)', () => {
    expect(mandateListToMultiline('["a","b"]')).toBe('a\nb')
    expect(mandateListToMultiline('plain')).toBe('plain')
    expect(multilineToMandateList('a\n\n b ')).toBe('["a","b"]')
  })

  it('shows the fields of the chosen tab', () => {
    const onChange = vi.fn()
    const form = { mandate_title: 'T', purpose: 'Why', background: 'Ctx', quality_priority: 'time', outline_business_case: 'Case',
      assumptions: '["Vendor signs"]', outline_risks: '[]' }
    const { rerender } = render(<MandateFieldTabs activeTab="purpose" formData={form} onChange={onChange} onListChange={() => {}} viewModePrefix="t" />)
    expect(screen.getByDisplayValue('Why')).toBeInTheDocument()
    rerender(<MandateFieldTabs activeTab="case" formData={form} onChange={onChange} onListChange={() => {}} viewModePrefix="t" />)
    expect(screen.getByLabelText('Quality priority')).toHaveValue('time')
    rerender(<MandateFieldTabs activeTab="objectives" formData={form} onChange={onChange} onListChange={() => {}} viewModePrefix="t" />)
    expect(screen.getByText('Assumptions')).toBeInTheDocument()
    expect(screen.getByText('Known risks and issues')).toBeInTheDocument()
  })

  it('view shows only filled lists', () => {
    render(<MandateAssumptionsRisksView mandate={{ assumptions: '["Budget approved"]', outline_risks: '' }} />)
    expect(screen.getByText('Budget approved')).toBeInTheDocument()
    expect(screen.queryByText('Known risks and issues')).toBeNull()
  })
})

describe('MandateDeliverablesSection', () => {
  it('lists, then adds a deliverable through the service', async () => {
    const service = {
      list: vi.fn().mockResolvedValue([{ id: 'd1', deliverable_name: 'Onboarding journey', estimated_completion: 'Q3', is_in_scope: true, is_major_deliverable: true }]),
      add: vi.fn().mockResolvedValue({ id: 'd2', deliverable_name: 'Data migration', is_in_scope: true, is_major_deliverable: false }),
      update: vi.fn(), remove: vi.fn(),
    }
    render(<MandateDeliverablesSection mandateId="m1" viewModeId="t-deliv" service={service} />)
    expect(await screen.findByText('Onboarding journey')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add deliverable/i }))
    fireEvent.change(screen.getByPlaceholderText(/e.g. New customer onboarding journey/), { target: { value: 'Data migration' } })
    fireEvent.click(screen.getByLabelText('Major deliverable'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(service.add).toHaveBeenCalledWith('m1', expect.objectContaining({ deliverable_name: 'Data migration', is_major_deliverable: false })))
  })

  it('read-only hides actions; no mandate yet asks to save first', () => {
    const service = { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), remove: vi.fn() }
    render(<MandateDeliverablesSection mandateId={null} viewModeId="t-deliv2" service={service} readOnly />)
    expect(screen.getByText(/save the mandate first/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add deliverable/i })).toBeNull()
  })
})
