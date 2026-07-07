import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DetachButton from '../DetachButton.jsx'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DetachButton />
    </MemoryRouter>
  )
}

describe('DetachButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('opens the current path with popout=1 appended', () => {
    renderAt('/platform/pmo/dashboard')
    fireEvent.click(screen.getByRole('button'))

    expect(window.open).toHaveBeenCalledTimes(1)
    const [url] = window.open.mock.calls[0]
    expect(url).toContain('/platform/pmo/dashboard')
    expect(url).toContain('popout=1')
  })

  it('preserves existing query params', () => {
    renderAt('/simulator/evm?scenarioId=abc')
    fireEvent.click(screen.getByRole('button'))

    const [url] = window.open.mock.calls[0]
    expect(url).toContain('scenarioId=abc')
    expect(url).toContain('popout=1')
  })
})
