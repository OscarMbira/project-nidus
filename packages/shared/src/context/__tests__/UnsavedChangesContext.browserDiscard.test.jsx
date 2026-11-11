import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Suspense, lazy, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom'
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../UnsavedChangesContext'

function Register() {
  const navigate = useNavigate()
  return (
    <div>
      <h1>Migration register</h1>
      <button type="button" onClick={() => navigate('/register/create')}>New record</button>
    </div>
  )
}

function CreateForm() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const { confirmDiscard } = useUnsavedChangesGuard(Boolean(title), 'You have unsaved changes to this record.')
  return (
    <div>
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="button" onClick={() => confirmDiscard(() => navigate('/register'))}>Cancel</button>
    </div>
  )
}

function renderApp() {
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UnsavedChangesProvider>
        <nav><Link to="/dashboard">Dashboard</Link></nav>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/register/create" element={<CreateForm />} />
          <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
        </Routes>
      </UnsavedChangesProvider>
    </BrowserRouter>
  )
}

async function openForm() {
  renderApp()
  fireEvent.click(screen.getByRole('button', { name: 'New record' }))
  return screen.findByLabelText('Title')
}

// A page whose code takes a while to load, like a lazy route on the dev server.
const SlowReports = lazy(() => new Promise((resolve) => {
  setTimeout(() => resolve({ default: () => <h1>Reports page</h1> }), 300)
}))

function renderAppWithSlowPage() {
  const page = (el) => <Suspense fallback={<p>Loading page…</p>}>{el}</Suspense>
  render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UnsavedChangesProvider>
        <nav><Link to="/reports">Reports</Link></nav>
        <Routes>
          <Route path="/register" element={page(<Register />)} />
          <Route path="/register/create" element={page(<CreateForm />)} />
          <Route path="/reports" element={page(<SlowReports />)} />
        </Routes>
      </UnsavedChangesProvider>
    </BrowserRouter>
  )
}

describe('Unsaved changes discard (real browser history)', () => {
  it('keeps the dialog open with "Leaving…" while a slow next page loads, then closes it (v1331)', async () => {
    window.history.replaceState({}, '', '/register')
    renderAppWithSlowPage()
    fireEvent.click(screen.getByRole('button', { name: 'New record' }))
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Core move' } })
    fireEvent.click(screen.getByRole('link', { name: 'Reports' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

    expect(await screen.findByRole('button', { name: /Leaving/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeDisabled()
    expect(screen.getByText('Discarding your changes and opening the next page…')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Reports page' })).toBeInTheDocument(), { timeout: 3000 })
    await waitFor(() => expect(screen.queryByRole('button', { name: /Leaving/ })).not.toBeInTheDocument())
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  beforeEach(() => {
    window.history.replaceState({}, '', '/register')
  })

  it('Cancel → Discard changes leaves the page', async () => {
    const input = await openForm()
    fireEvent.change(input, { target: { value: 'Core move' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Migration register' })).toBeInTheDocument(), { timeout: 3000 })
    expect(window.location.pathname).toBe('/register')
  })

  it('sidebar/header link → Discard changes closes the dialog and opens the link', async () => {
    const input = await openForm()
    fireEvent.change(input, { target: { value: 'Core move' } })
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard page' })).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard')
  })

  it('browser Back → Discard changes leaves the page after the form went clean and dirty again', async () => {
    const input = await openForm()
    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: 'Core move' } })

    await act(async () => { window.history.back() })
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Migration register' })).toBeInTheDocument(), { timeout: 3000 })
    expect(window.location.pathname).toBe('/register')
  })
})
