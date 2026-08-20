/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useSuccessModal } from '../useSuccessModal.jsx'

// packages/shared's vitest config has no jsdom setupFiles (unlike packages/ui), so neither
// jest-dom matchers nor RTL's auto-cleanup-between-tests are wired up globally — do both
// explicitly in this file rather than changing shared setup for the rest of the (non-DOM,
// environment: 'node') suite.
afterEach(cleanup)

function Harness({ onOk }) {
  const { showSuccess, modal } = useSuccessModal()
  return (
    <div>
      <button
        onClick={() =>
          showSuccess({ recordId: 'RISK-2026-014', operation: 'created', message: 'Risk created successfully.', onOk })
        }
      >
        trigger
      </button>
      {modal}
    </div>
  )
}

describe('useSuccessModal (v861)', () => {
  it('renders nothing until showSuccess is called', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the modal with the given content when showSuccess is called', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('trigger'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Risk created successfully.')).toBeInTheDocument()
    expect(screen.getByText('RISK-2026-014')).toBeInTheDocument()
  })

  it('calls onOk after closing, not before, when OK is clicked', () => {
    const onOk = vi.fn()
    render(<Harness onOk={onOk} />)
    fireEvent.click(screen.getByText('trigger'))
    expect(onOk).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onOk).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes cleanly with no onOk provided', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('trigger'))
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
