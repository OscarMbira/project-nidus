import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const updatePracticePID = vi.fn()
const showSuccess = vi.fn()
let row

vi.mock('@nidus/supabase', () => ({ simDb: {} }))
vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({ requestNavigation: vi.fn(), confirmBack: vi.fn(), confirmDiscard: vi.fn() }),
}))
vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({ useSuccessModal: () => ({ showSuccess, modal: null }) }))
vi.mock('@nidus/shared/utils/auditDisplayUtils', () => ({
  humanizeAuditToken: (v) => v, resolveAuditUserLabels: () => Promise.resolve({}),
}))
vi.mock('../../../services/sim/practicePIDService', () => ({
  getPracticePIDById: () => Promise.resolve({ success: true, data: row }),
  updatePracticePID: (...args) => updatePracticePID(...args),
}))

const { default: PracticePIDEdit } = await import('../PracticePIDEdit')

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/simulator/practice-pids/pid1/edit']}>
      <Routes><Route path="/simulator/practice-pids/:id/edit" element={<PracticePIDEdit />} /></Routes>
    </MemoryRouter>,
  )
}

describe('Practice PID edit page (v1344 follow-up)', () => {
  beforeEach(() => {
    updatePracticePID.mockReset()
    showSuccess.mockReset()
    row = {
      id: 'pid1', pid_title: 'PID — Mobile inspections', pid_reference: 'SPID-0001', record_status: 'live',
      project_objectives: ['Same-day results'], interfaces: [], tolerance_levels: { time: '2 weeks' },
      project_plan_summary: { summary: 'Three stages' }, stage_plan_summary: {},
    }
  })

  it('loads the PID, saves arrays and JSON, and confirms with the success modal', async () => {
    updatePracticePID.mockResolvedValue({ success: true, data: { ...row } })
    renderPage()
    const title = await screen.findByLabelText('PID title *')
    expect(title).toHaveValue('PID — Mobile inspections')
    fireEvent.click(screen.getByRole('tab', { name: 'Plans' }))
    expect(screen.getByLabelText('Project plan summary')).toHaveValue('Three stages')
    fireEvent.change(screen.getByLabelText('Current stage plan summary'), { target: { value: 'Pilot region first' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(updatePracticePID).toHaveBeenCalled())
    const [id, payload] = updatePracticePID.mock.calls[0]
    expect(id).toBe('pid1')
    expect(payload.project_objectives).toEqual(['Same-day results'])
    expect(payload.stage_plan_summary).toEqual({ summary: 'Pilot region first' })
    expect(payload.tolerance_levels).toEqual({ time: '2 weeks' })
    await waitFor(() => expect(showSuccess).toHaveBeenCalledWith(expect.objectContaining({ recordId: 'SPID-0001', operation: 'updated' })))
  })

  it('is read-only while the PID awaits authorisation', async () => {
    row.record_status = 'unauthorised'
    renderPage()
    expect(await screen.findByText(/awaiting authorisation/i)).toBeInTheDocument()
    expect(screen.getByLabelText('PID title *')).toBeDisabled()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('requires a title', async () => {
    renderPage()
    fireEvent.change(await screen.findByLabelText('PID title *'), { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('PID title is required')).toBeInTheDocument()
    expect(updatePracticePID).not.toHaveBeenCalled()
  })
})
