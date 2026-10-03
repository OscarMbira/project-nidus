/**
 * Integration-style test for RegistrationEntryChoice.jsx (v982 Phase 1, task G) — walks
 * all three entry-choice branches end-to-end: For myself / For my organisation / I was
 * invited (found + not found), plus the direct-invitation-link redirect shortcut.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@nidus/shared/context/ThemeContext'
import RegistrationEntryChoice, { REGISTRATION_INTENT_STORAGE_KEY } from '../RegistrationEntryChoice'

const mockCheckPendingInvitationByEmail = vi.hoisted(() => vi.fn())

vi.mock('../../../services/invitationService', () => ({
  checkPendingInvitationByEmail: (...args) => mockCheckPendingInvitationByEmail(...args),
}))

function renderChoice(initialPath = '/platform/register') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/platform/register" element={<RegistrationEntryChoice target="platform" />} />
          <Route path="/platform/register/signup" element={<div>PLATFORM_SIGNUP_FORM</div>} />
          <Route path="/i/:token" element={<div>INVITATION_ACCEPT_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('RegistrationEntryChoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renders all three entry options', () => {
    renderChoice()
    expect(screen.getByText('For myself')).toBeInTheDocument()
    expect(screen.getByText('For my organisation')).toBeInTheDocument()
    expect(screen.getByText('I was invited')).toBeInTheDocument()
  })

  it('hides the Simulator header button on platform register', () => {
    renderChoice()
    const header = document.querySelector('header')
    expect(header).toBeTruthy()
    expect(header.querySelector('a[href="/simulator"]')).toBeNull()
  })

  it('"For myself" stores intent=individual and forwards to the signup form', async () => {
    const user = userEvent.setup()
    renderChoice()

    await user.click(screen.getByText('For myself'))

    expect(sessionStorage.getItem(REGISTRATION_INTENT_STORAGE_KEY)).toBe('individual')
    await waitFor(() => {
      expect(screen.getByText('PLATFORM_SIGNUP_FORM')).toBeInTheDocument()
    })
  })

  it('"For my organisation" stores intent=organisation and forwards to the signup form', async () => {
    const user = userEvent.setup()
    renderChoice()

    await user.click(screen.getByText('For my organisation'))

    expect(sessionStorage.getItem(REGISTRATION_INTENT_STORAGE_KEY)).toBe('organisation')
    await waitFor(() => {
      expect(screen.getByText('PLATFORM_SIGNUP_FORM')).toBeInTheDocument()
    })
  })

  it('"I was invited" -> found: shows the organisation name and no resend action', async () => {
    mockCheckPendingInvitationByEmail.mockResolvedValue({
      success: true,
      found: true,
      organisationName: 'Acme Corporation',
      error: null,
    })
    const user = userEvent.setup()
    renderChoice()

    await user.click(screen.getByText('I was invited'))
    await user.type(screen.getByLabelText('Email address'), 'invitee@example.com')
    await user.click(screen.getByRole('button', { name: /check for my invitation/i }))

    await waitFor(() => {
      expect(screen.getByText(/Acme Corporation/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/resend/i)).not.toBeInTheDocument()
  })

  it('"I was invited" -> not found: offers a way back into the other two branches', async () => {
    mockCheckPendingInvitationByEmail.mockResolvedValue({
      success: true,
      found: false,
      organisationName: null,
      error: null,
    })
    const user = userEvent.setup()
    renderChoice()

    await user.click(screen.getByText('I was invited'))
    await user.type(screen.getByLabelText('Email address'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: /check for my invitation/i }))

    await waitFor(() => {
      expect(screen.getByText(/No pending invitation found/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Set up for myself')).toBeInTheDocument()
    expect(screen.getByText('Set up for my organisation')).toBeInTheDocument()

    await user.click(screen.getByText('Set up for myself'))
    expect(sessionStorage.getItem(REGISTRATION_INTENT_STORAGE_KEY)).toBe('individual')
  })

  it('a direct invitation link (?invitation=TOKEN) skips the choice screen entirely', async () => {
    renderChoice('/platform/register?invitation=tok-123')
    await waitFor(() => {
      expect(screen.getByText('INVITATION_ACCEPT_PAGE')).toBeInTheDocument()
    })
    expect(screen.queryByText('For myself')).not.toBeInTheDocument()
  })
})
