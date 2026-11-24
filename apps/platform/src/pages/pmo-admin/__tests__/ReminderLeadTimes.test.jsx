/** v1352 Slice 1 (D7) — Reminder Lead Times page: data from the RPC, saves only changes, read-only for others. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const showSuccess = vi.fn()
vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({ useSuccessModal: () => ({ showSuccess, modal: null }) }))
vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({ useUnsavedChangesGuard: () => ({ confirmDiscard: (fn) => fn?.() }) }))
vi.mock('@nidus/shared/context/FieldHelpContext', async () => {
  const { createContext } = await import('react')
  return {
    default: createContext(null),
    FieldHelpScope: ({ children }) => children,
    useFieldHelpEntry: () => null,
    useFieldHelpScope: () => null,
  }
})
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

const getReminderLeadTimes = vi.fn()
const saveReminderLeadTimes = vi.fn()
vi.mock('../../../services/reminderLeadTimeService', () => ({
  getReminderLeadTimes: (...a) => getReminderLeadTimes(...a),
  saveReminderLeadTimes: (...a) => saveReminderLeadTimes(...a),
}))

import ReminderLeadTimes from '../ReminderLeadTimes'

const payload = (over = {}) => ({
  account_name: 'Example Freight Ltd',
  account_code: 'ACC-0001',
  can_manage: true,
  items: [
    { record_type: 'risk_review', label: 'Risk reviews', description: 'Sent to the risk owner.', default_lead_days: 3, lead_days: null },
    { record_type: 'milestone_due', label: 'Milestones', description: null, default_lead_days: 7, lead_days: 10 },
  ],
  ...over,
})

const renderPage = () => render(<MemoryRouter><ReminderLeadTimes /></MemoryRouter>)

describe('ReminderLeadTimes', () => {
  beforeEach(() => {
    getReminderLeadTimes.mockReset()
    saveReminderLeadTimes.mockReset()
    showSuccess.mockReset()
  })

  it('lists the record types from the database with their defaults and overrides', async () => {
    getReminderLeadTimes.mockResolvedValue(payload())
    renderPage()
    expect(await screen.findByLabelText('Risk reviews')).toHaveValue(null)
    expect(screen.getByLabelText('Milestones')).toHaveValue(10)
    expect(screen.getByText('Default 3 · in use 3')).toBeInTheDocument()
    expect(screen.getByText('Default 7 · in use 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('saves only the changed types and shows the success modal', async () => {
    getReminderLeadTimes.mockResolvedValue(payload())
    saveReminderLeadTimes.mockResolvedValue(payload({ items: payload().items.map((i) => (i.record_type === 'risk_review' ? { ...i, lead_days: 5 } : i)) }))
    renderPage()
    fireEvent.change(await screen.findByLabelText('Risk reviews'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(saveReminderLeadTimes).toHaveBeenCalledWith([{ record_type: 'risk_review', lead_days: 5 }]))
    await waitFor(() => expect(showSuccess).toHaveBeenCalledWith(expect.objectContaining({ recordId: 'ACC-0001', operation: 'updated' })))
  })

  it('blocks an invalid value and lets a manager go back to the default', async () => {
    getReminderLeadTimes.mockResolvedValue(payload())
    renderPage()
    fireEvent.change(await screen.findByLabelText('Risk reviews'), { target: { value: '400' } })
    expect(screen.getByText('Enter 365 days or fewer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Use the default for Milestones' }))
    expect(screen.getByLabelText('Milestones')).toHaveValue(null)
  })

  it('is read-only for people who cannot manage it, and shows an error state when loading fails', async () => {
    getReminderLeadTimes.mockResolvedValue(payload({ can_manage: false }))
    const { unmount } = renderPage()
    expect(await screen.findByText(/only a PMO Admin or the account owner can change them/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
    expect(screen.getByLabelText('Risk reviews')).toBeDisabled()
    unmount()

    getReminderLeadTimes.mockRejectedValue(new Error('Could not find your organisation'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not find your organisation')
  })

  it('has an Audit details tab with the three audit cards', async () => {
    getReminderLeadTimes.mockResolvedValue(payload({ created_at: '2026-11-20T10:00:00Z', updated_at: '2026-11-22T10:00:00Z', created_by_name: 'Head of PMO', updated_by_name: 'Head of PMO' }))
    renderPage()
    await screen.findByLabelText('Risk reviews')
    fireEvent.click(screen.getByRole('tab', { name: /audit details/i }))
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Classification')).toBeInTheDocument()
    expect(screen.getByText('Record history')).toBeInTheDocument()
    expect(screen.getByText('Example Freight Ltd')).toBeInTheDocument()
  })
})
