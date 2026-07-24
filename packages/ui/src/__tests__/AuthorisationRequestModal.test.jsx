import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthorisationRequestModal from '../AuthorisationRequestModal.jsx'

vi.mock('../Modal', () => ({
  default: ({ children, title }) => (
    <div data-testid="modal">
      <h2>{title}</h2>
      {children}
    </div>
  ),
}))

vi.mock('../Button', () => ({
  default: ({ children, disabled, onClick }) => (
    <button type="button" disabled={disabled} onClick={onClick}>{children}</button>
  ),
}))

vi.mock('../ApprovalChainDisplay', () => ({
  default: () => <div data-testid="approval-chain" />,
}))

describe('AuthorisationRequestModal', () => {
  it('requires justification before approve or reject in decide mode', () => {
    const onDecision = vi.fn()
    render(
      <AuthorisationRequestModal
        open
        mode="decide"
        onClose={() => {}}
        onDecision={onDecision}
      />,
    )

    const approveButton = screen.getByRole('button', { name: 'Approve' })
    const rejectButton = screen.getByRole('button', { name: 'Reject' })

    expect(approveButton).toBeDisabled()
    expect(rejectButton).toBeDisabled()

    fireEvent.click(approveButton)
    fireEvent.click(rejectButton)
    expect(onDecision).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Justification \(required\)/i), {
      target: { value: 'Pricing aligns with market rates' },
    })

    expect(approveButton).not.toBeDisabled()
    expect(rejectButton).not.toBeDisabled()

    fireEvent.click(rejectButton)
    expect(onDecision).toHaveBeenCalledWith('reject', 'Pricing aligns with market rates')
  })

  it('allows submit without notes in submit mode', () => {
    const onSubmit = vi.fn()
    render(
      <AuthorisationRequestModal
        open
        mode="submit"
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith('')
  })
})
