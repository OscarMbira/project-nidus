import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import RegisterSignoffPanel from '../RegisterSignoffPanel'

const getRecordSignatories = vi.fn()
const resolveRegisterSignatorySlots = vi.fn()
const startRecordSignoff = vi.fn()
const restartRecordSignoff = vi.fn()
const signRecordSlot = vi.fn()

vi.mock('@nidus/shared/services/localRegisterSignoffService', () => ({
  getRecordSignatories: (...a) => getRecordSignatories(...a),
  resolveRegisterSignatorySlots: (...a) => resolveRegisterSignatorySlots(...a),
  startRecordSignoff: (...a) => startRecordSignoff(...a),
  restartRecordSignoff: (...a) => restartRecordSignoff(...a),
  signRecordSlot: (...a) => signRecordSlot(...a),
  assignRecordSignatory: vi.fn(async () => ({ success: true, data: {} })),
  declineRecordSlot: vi.fn(),
  lockRecordOptionalSlots: vi.fn(),
  getRecordSignatureUrl: vi.fn(async () => ({ success: false })),
  getRecordSigningHistory: vi.fn(async () => ({ success: true, data: [] })),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: () => ({ insert: async () => ({ error: null }) }) },
}))

vi.mock('../SignatureCaptureControl', () => ({
  default: ({ onSign }) => <button type="button" onClick={() => onSign(null)}>Sign with saved signature</button>,
}))

const MEMBERS = [{ id: 'u1', label: 'Ama Mensah' }, { id: 'u2', label: 'Kofi Osei' }]
const baseProps = {
  db: {},
  registerKey: 'fin_migration_strategy',
  accountId: 'acc-1',
  teamMembers: MEMBERS,
  currentUserId: 'u1',
  onRecordChange: vi.fn(),
}

describe('RegisterSignoffPanel — before sign-off', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRecordSignatories.mockResolvedValue({ success: true, data: [] })
    resolveRegisterSignatorySlots.mockResolvedValue({
      success: true,
      data: { slots: [{ role_label: 'Project Manager', is_mandatory: true }, { role_label: 'Observer', is_mandatory: false }] },
    })
    startRecordSignoff.mockResolvedValue({ success: true, data: [{ slot_order: 1, status: 'pending', assigned_user_id: 'u2', role_label: 'Project Manager' }] })
  })

  it('needs a person on every mandatory role before starting, then sends the chosen people', async () => {
    render(<RegisterSignoffPanel {...baseProps} record={{ id: 'r1', title: 'Strategy', signoff_state: 'none' }} />)
    const start = await screen.findByRole('button', { name: 'Start sign-off' })
    expect(start).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Signatory for Project Manager'), { target: { value: 'u2' } })
    expect(start).toBeEnabled()
    fireEvent.click(start)
    await waitFor(() => expect(startRecordSignoff).toHaveBeenCalledWith({}, {
      recordId: 'r1',
      slots: [
        expect.objectContaining({ role_label: 'Project Manager', assigned_user_id: 'u2' }),
        expect.objectContaining({ role_label: 'Observer', assigned_user_id: '' }),
      ],
    }))
    expect(baseProps.onRecordChange).toHaveBeenCalled()
  })

  it('explains when no signing roles are configured', async () => {
    resolveRegisterSignatorySlots.mockResolvedValue({ success: true, data: { slots: [] } })
    render(<RegisterSignoffPanel {...baseProps} record={{ id: 'r1', signoff_state: 'none' }} />)
    expect(await screen.findByText(/No signatories are set up for this document type yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start sign-off' })).not.toBeInTheDocument()
  })
})

describe('RegisterSignoffPanel — in progress', () => {
  const slots = [
    { id: 's1', slot_order: 1, signing_round: 1, role_label: 'Project Manager', is_mandatory: true, assigned_user_id: 'u1', status: 'pending' },
    { id: 's2', slot_order: 2, signing_round: 1, role_label: 'Sponsor', is_mandatory: true, assigned_user_id: 'u2', status: 'pending' },
  ]
  beforeEach(() => {
    vi.clearAllMocks()
    getRecordSignatories.mockResolvedValue({ success: true, data: slots })
    resolveRegisterSignatorySlots.mockResolvedValue({ success: true, data: { slots: [] } })
    signRecordSlot.mockResolvedValue({ success: true, data: { ...slots[0], status: 'signed' } })
    restartRecordSignoff.mockResolvedValue({ success: true, data: true })
  })

  it('lets only the person whose turn it is sign', async () => {
    render(<RegisterSignoffPanel {...baseProps} record={{ id: 'r1', title: 'Strategy', signoff_state: 'in_progress' }} />)
    expect(await screen.findByText(/your turn to sign as Project Manager/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Sign with saved signature' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Sign with saved signature' }))
    await waitFor(() => expect(signRecordSlot).toHaveBeenCalledWith({}, expect.objectContaining({ recordId: 'r1', slotOrder: 1, signingRound: 1, file: null })))
  })

  it('shows no signing controls to someone who is not next', async () => {
    render(<RegisterSignoffPanel {...baseProps} currentUserId="u2" record={{ id: 'r1', signoff_state: 'in_progress' }} />)
    await screen.findByText('2. Sponsor')
    expect(screen.queryByRole('button', { name: 'Sign with saved signature' })).not.toBeInTheDocument()
  })

  it('requires a reason to restart sign-off', async () => {
    render(<RegisterSignoffPanel {...baseProps} record={{ id: 'r1', signoff_state: 'in_progress' }} />)
    fireEvent.click(await screen.findByRole('button', { name: /Restart sign-off/ }))
    const confirm = screen.getByRole('button', { name: 'Restart sign-off' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Reason for restarting sign-off/), { target: { value: 'Scope changed' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(restartRecordSignoff).toHaveBeenCalledWith({}, { recordId: 'r1', reason: 'Scope changed' }))
  })
})
