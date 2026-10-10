import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../UnsavedChangesContext'

function Editor() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const { confirmDiscard } = useUnsavedChangesGuard(Boolean(name))

  return (
    <div>
      <label htmlFor="item-name">Item name</label>
      <input id="item-name" value={name} onChange={(event) => setName(event.target.value)} />
      <button type="button" onClick={() => confirmDiscard(() => navigate('/register'))}>
        Back to register
      </button>
    </div>
  )
}

function Register() {
  return <h1>Configuration item register</h1>
}

describe('Unsaved changes discard', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('leaves the page when Discard changes is clicked after the history trap is set', async () => {
    const back = vi.spyOn(window.history, 'back')

    render(
      <MemoryRouter initialEntries={['/edit']}>
        <UnsavedChangesProvider>
          <Routes>
            <Route path="/edit" element={<Editor />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </UnsavedChangesProvider>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Route engine' } })
    fireEvent.click(screen.getByRole('button', { name: 'Back to register' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Configuration item register' })).toBeInTheDocument()
    })
    expect(back).not.toHaveBeenCalled()
    back.mockRestore()
  })
})
