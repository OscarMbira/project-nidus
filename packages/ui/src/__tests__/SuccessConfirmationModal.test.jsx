import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SuccessConfirmationModal from '../SuccessConfirmationModal.jsx'

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe('SuccessConfirmationModal (v861)', () => {
  it('renders nothing when closed', () => {
    render(<SuccessConfirmationModal isOpen={false} onClose={() => {}} operation="updated" recordId="RISK-2026-014" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the record ID, message, and an OK button when open', () => {
    render(
      <SuccessConfirmationModal
        isOpen
        onClose={() => {}}
        operation="created"
        recordId="RISK-2026-014"
        message="Risk created successfully."
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Risk created successfully.')).toBeInTheDocument()
    expect(screen.getByText('RISK-2026-014')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('supports a custom OK label', () => {
    render(<SuccessConfirmationModal isOpen onClose={() => {}} operation="deleted" recordId="RISK-2026-014" okLabel="Got it" />)
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument()
  })

  it('calls onClose when OK is clicked', () => {
    const onClose = vi.fn()
    render(<SuccessConfirmationModal isOpen onClose={onClose} operation="updated" recordId="RISK-2026-014" />)
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('auto-focuses the OK button on open, not the secondary Copy-ID action', () => {
    render(
      <SuccessConfirmationModal isOpen onClose={() => {}} operation="updated" recordId="RISK-2026-014" message="Updated." />,
    )
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus()
  })

  it('copies the record ID to the clipboard when the copy action is used', async () => {
    render(<SuccessConfirmationModal isOpen onClose={() => {}} operation="updated" recordId="RISK-2026-014" />)
    fireEvent.click(screen.getByLabelText('Copy record ID'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('RISK-2026-014')
  })

  it('does not dismiss on overlay click (must be actively acknowledged)', () => {
    const onClose = vi.fn()
    render(<SuccessConfirmationModal isOpen onClose={onClose} operation="updated" recordId="RISK-2026-014" />)
    // Modal's backdrop click check compares e.target === e.currentTarget on the outer dialog wrapper;
    // clicking the dialog content itself must not trigger onClose.
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
