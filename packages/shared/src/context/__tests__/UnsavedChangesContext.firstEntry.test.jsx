/**
 * Regression: a dirty page that is the first entry in the tab's history (opened in a new tab or
 * from a pasted link). Browser Back -> "Discard changes" used to do nothing, because the guard
 * stepped back two history entries that did not exist. It now goes up one level instead.
 * Kept in its own file so jsdom starts with a one-entry history.
 */
import { it, expect } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../UnsavedChangesContext'

function Editor() {
  const [name, setName] = useState('')
  useUnsavedChangesGuard(Boolean(name))
  return (
    <div>
      <label htmlFor="item-name">Item name</label>
      <input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
    </div>
  )
}

it('Discard after browser Back leaves the page even with no earlier history entry', async () => {
  window.history.replaceState(null, '', '/register/items/create')
  render(
    <BrowserRouter>
      <UnsavedChangesProvider>
        <Routes>
          <Route path="/register/items/create" element={<Editor />} />
          <Route path="/register/items" element={<h1>Item register</h1>} />
        </Routes>
      </UnsavedChangesProvider>
    </BrowserRouter>,
  )

  fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Draft' } })
  await act(async () => {
    window.history.back()
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Item register' })).toBeInTheDocument()
  })
  expect(window.location.pathname).toBe('/register/items')
})
