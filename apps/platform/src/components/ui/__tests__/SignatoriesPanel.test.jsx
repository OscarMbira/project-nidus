import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SignatoriesPanel from '../SignatoriesPanel'

const pendingSlot1 = {
  id: 'row-1', template_node_id: 'node-1', signing_round: 1, slot_order: 1,
  role_label: 'Project Manager', assigned_user_id: 'user-1', status: 'pending', display_id: 'SIG-0001',
}
const pendingSlot2 = {
  id: 'row-2', template_node_id: 'node-1', signing_round: 1, slot_order: 2,
  role_label: 'Sponsor', assigned_user_id: 'user-2', status: 'pending', display_id: 'SIG-0002',
}

const getDocumentSignatories = vi.fn()
const getSigningHistory = vi.fn()
const getSignatureSignedUrl = vi.fn()
const initializeSigningRound = vi.fn()
const resyncPendingSigningRoundOrder = vi.fn()
const assignSignatory = vi.fn()
const signSlot = vi.fn()
const declineSlot = vi.fn()
const restartSigningChain = vi.fn()
const lockRemainingOptionalSignatories = vi.fn()
const getDeclinedSignatoryCount = vi.fn()

vi.mock('@nidus/shared/services/processTemplateSignatoryService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual, // keep real areMandatorySlotsSigned / earlierMandatorySlotsSigned / slotIsMandatory / canLockRemainingOptionalSlots
    getDocumentSignatories: (...args) => getDocumentSignatories(...args),
    getSigningHistory: (...args) => getSigningHistory(...args),
    getSignatureSignedUrl: (...args) => getSignatureSignedUrl(...args),
    initializeSigningRound: (...args) => initializeSigningRound(...args),
    resyncPendingSigningRoundOrder: (...args) => resyncPendingSigningRoundOrder(...args),
    assignSignatory: (...args) => assignSignatory(...args),
    signSlot: (...args) => signSlot(...args),
    declineSlot: (...args) => declineSlot(...args),
    restartSigningChain: (...args) => restartSigningChain(...args),
    lockRemainingOptionalSignatories: (...args) => lockRemainingOptionalSignatories(...args),
    getDeclinedSignatoryCount: (...args) => getDeclinedSignatoryCount(...args),
  }
})

vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })) },
}))

vi.mock('../SignatureCaptureControl', () => ({
  default: ({ onSign }) => <button type="button" onClick={() => onSign(null)}>Sign with my saved signature</button>,
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

describe('SignatoriesPanel', () => {
  const db = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { scope_entity_id: 'project-1', created_by: 'owner-1' } }),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    db.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { scope_entity_id: 'project-1', created_by: 'owner-1' } }),
    })
    getSignatureSignedUrl.mockResolvedValue({ success: true, data: 'https://signed.example/sig.png' })
    initializeSigningRound.mockResolvedValue({ success: true, data: [] })
    // No-op by default — most tests aren't exercising the reorder-on-load path.
    resyncPendingSigningRoundOrder.mockResolvedValue({ success: false })
    getDeclinedSignatoryCount.mockResolvedValue({ success: true, data: 0 })
  })

  it('renders nothing when there is no templateNodeId', () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [] })
    const { container } = render(<SignatoriesPanel db={db} templateNodeId={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a message when no signatories are required for this document type', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [] })
    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)
    expect(await screen.findByText(/no signatories are required/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled()
  })

  it('initialises a signing round and renders the ordered slot list', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [] })
    initializeSigningRound.mockResolvedValue({ success: true, data: [pendingSlot1, pendingSlot2] })

    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)

    expect((await screen.findAllByText(/Project Manager/)).length).toBeGreaterThan(0)
    expect(screen.getByText(/Sponsor/)).toBeInTheDocument()
  })

  it('re-syncs an already-initialised round to a re-ordered signatory chain', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [pendingSlot1, pendingSlot2] })
    resyncPendingSigningRoundOrder.mockResolvedValue({
      success: true,
      data: [{ ...pendingSlot2, slot_order: 1 }, { ...pendingSlot1, slot_order: 2 }],
    })

    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)

    await waitFor(() => expect(resyncPendingSigningRoundOrder).toHaveBeenCalledWith(db, expect.objectContaining({
      templateNodeId: 'node-1', accountId: 'account-1', documentTable: 'project_charters',
    })))
    const order = (await screen.findAllByText(/^\d\.\s/)).map((el) => el.textContent)
    expect(order[0]).toMatch(/^1\.\s*Sponsor/)
    expect(order[1]).toMatch(/^2\.\s*Project Manager/)
  })

  it('shows sign/decline controls when it is the current user\'s turn', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [pendingSlot1, pendingSlot2] })

    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)

    expect(await screen.findByText(/it's your turn to sign/i)).toBeInTheDocument()
    expect(screen.getByText('Sign with my saved signature')).toBeInTheDocument()
    expect(screen.getByText('Decline to sign')).toBeInTheDocument()
  })

  it('requires a reason before confirming a decline', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [pendingSlot1, pendingSlot2] })
    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)

    fireEvent.click(await screen.findByText('Decline to sign'))
    const confirmButton = await screen.findByText('Confirm decline')
    expect(confirmButton).toBeDisabled()
  })

  it('calls signSlot when signing with the saved signature', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [pendingSlot1, pendingSlot2] })
    signSlot.mockResolvedValue({ success: true, data: { ...pendingSlot1, status: 'signed', signed_at: new Date().toISOString() } })

    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)

    fireEvent.click(await screen.findByText('Sign with my saved signature'))

    await waitFor(() => expect(signSlot).toHaveBeenCalledWith(db, expect.objectContaining({
      templateNodeId: 'node-1', slotOrder: 1, signingRound: 1,
    })))
  })

  it('hides assignment and signing controls when disabled', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [{ ...pendingSlot1, status: 'signed' }, { ...pendingSlot2, status: 'signed' }] })
    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" disabled />)

    await screen.findByText(/Project Manager/)
    expect(screen.queryByText('Decline to sign')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument()
  })

  it('shows a Save button that stays disabled until an assignment changes', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [pendingSlot1, pendingSlot2] })
    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)
    expect(await screen.findByRole('button', { name: /^Save$/ })).toBeDisabled()
  })

  it('offers "Lock remaining optional signatories" to a signed mandatory signatory once every mandatory slot is signed', async () => {
    getDocumentSignatories.mockResolvedValue({
      success: true,
      data: [
        { ...pendingSlot1, status: 'signed', is_mandatory: true },
        { ...pendingSlot2, status: 'pending', is_mandatory: false },
      ],
    })
    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)
    expect(await screen.findByText('Lock remaining optional signatories')).toBeInTheDocument()
  })

  it('does not offer the lock action while a mandatory slot is still pending', async () => {
    getDocumentSignatories.mockResolvedValue({
      success: true,
      data: [
        { ...pendingSlot1, status: 'signed', is_mandatory: true },
        { id: 'row-3', template_node_id: 'node-1', signing_round: 1, slot_order: 3, role_label: 'PMO Admin', assigned_user_id: 'user-1', status: 'pending', is_mandatory: true },
        { ...pendingSlot2, status: 'pending', is_mandatory: false },
      ],
    })
    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)
    await screen.findByText(/Project Manager/)
    expect(screen.queryByText('Lock remaining optional signatories')).not.toBeInTheDocument()
  })

  it('requires a reason and calls lockRemainingOptionalSignatories to confirm the lock', async () => {
    getDocumentSignatories.mockResolvedValue({
      success: true,
      data: [
        { ...pendingSlot1, status: 'signed', is_mandatory: true },
        { ...pendingSlot2, status: 'pending', is_mandatory: false },
      ],
    })
    lockRemainingOptionalSignatories.mockResolvedValue({
      success: true,
      data: [{ ...pendingSlot2, status: 'expired', lock_reason: 'Enough time given', locked_at: new Date().toISOString() }],
    })

    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" />)

    fireEvent.click(await screen.findByText('Lock remaining optional signatories'))
    const confirmButton = await screen.findByText('Confirm lock')
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/reason for locking/i), { target: { value: 'Enough time given' } })
    expect(confirmButton).not.toBeDisabled()
    fireEvent.click(confirmButton)

    await waitFor(() => expect(lockRemainingOptionalSignatories).toHaveBeenCalledWith(db, {
      templateNodeId: 'node-1', reason: 'Enough time given',
    }))
    expect(await screen.findByText('Expired')).toBeInTheDocument()
  })

  it('shows a persistent decline notice, independent of `disabled`, once a decline is on record', async () => {
    getDocumentSignatories.mockResolvedValue({ success: true, data: [{ ...pendingSlot1, status: 'signed' }, { ...pendingSlot2, status: 'signed' }] })
    getDeclinedSignatoryCount.mockResolvedValue({ success: true, data: 2 })

    render(<SignatoriesPanel db={db} templateNodeId="node-1" accountId="account-1" documentTable="project_charters" disabled />)

    expect(await screen.findByText(/This document has 2 recorded declines/)).toBeInTheDocument()
  })
})
