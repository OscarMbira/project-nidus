/**
 * WizardStepLayout — bidirectional stepper navigation + hide Login/Sign Up in header.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@nidus/shared/context/ThemeContext'
import WizardStepLayout from '../WizardStepLayout'

vi.mock('../../../../components/homepage/PlatformHeader', () => ({
  default: ({ hideAuthButtons }) => (
    <header data-testid="platform-header">
      {!hideAuthButtons && (
        <>
          <a href="/platform/login">Login</a>
          <a href="/platform/register">Sign Up</a>
        </>
      )}
    </header>
  ),
}))

function LocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="location-probe">
      {location.pathname}|{JSON.stringify(location.state || {})}
    </div>
  )
}

const FULL_STATE = {
  orgFormData: { name: 'Acme' },
  industrySelection: { primaryIndustryId: 'i1' },
  professionalRoleId: 'role-1',
}

function renderAtOrganisation(state = FULL_STATE) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[{ pathname: '/onboarding/organisation-setup', state }]}>
        <Routes>
          <Route
            path="/onboarding/organisation-setup"
            element={
              <WizardStepLayout stepId="organisation" title="Organisation step">
                <div>ORG_BODY</div>
              </WizardStepLayout>
            }
          />
          <Route
            path="/onboarding/industry-selection"
            element={
              <>
                <LocationProbe />
                <div>INDUSTRY_STEP</div>
              </>
            }
          />
          <Route
            path="/onboarding/professional-role"
            element={
              <>
                <LocationProbe />
                <div>ROLE_STEP</div>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

function renderAtIndustry(state = { orgFormData: { name: 'Acme' }, industrySelection: { primaryIndustryId: 'i1' } }) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[{ pathname: '/onboarding/industry-selection', state }]}>
        <Routes>
          <Route
            path="/onboarding/industry-selection"
            element={
              <WizardStepLayout stepId="industry" title="Industry step">
                <div>INDUSTRY_BODY</div>
              </WizardStepLayout>
            }
          />
          <Route
            path="/onboarding/organisation-setup"
            element={
              <>
                <LocationProbe />
                <div>ORG_STEP</div>
              </>
            }
          />
          <Route
            path="/onboarding/professional-role"
            element={
              <>
                <LocationProbe />
                <div>ROLE_STEP</div>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('WizardStepLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides Login and Sign Up during the registration wizard', async () => {
    renderAtIndustry()
    await waitFor(() => {
      expect(screen.getByTestId('platform-header')).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument()
  })

  it('lets the user navigate back to a previous step and preserves wizard state', async () => {
    const user = userEvent.setup()
    renderAtIndustry(FULL_STATE)

    const backBtn = await screen.findByRole('button', { name: /go back to your organisation/i })
    await user.click(backBtn)

    await waitFor(() => {
      expect(screen.getByText('ORG_STEP')).toBeInTheDocument()
    })
    expect(screen.getByTestId('location-probe').textContent).toContain('/onboarding/organisation-setup')
    expect(screen.getByTestId('location-probe').textContent).toContain('Acme')
    expect(screen.getByTestId('location-probe').textContent).toContain('role-1')
  })

  it('lets the user navigate forward to an already-unlocked later step', async () => {
    const user = userEvent.setup()
    renderAtOrganisation(FULL_STATE)

    const forwardBtn = await screen.findByRole('button', { name: /^go to professional role$/i })
    await user.click(forwardBtn)

    await waitFor(() => {
      expect(screen.getByText('ROLE_STEP')).toBeInTheDocument()
    })
    expect(screen.getByTestId('location-probe').textContent).toContain('/onboarding/professional-role')
    expect(screen.getByTestId('location-probe').textContent).toContain('role-1')
  })

  it('does not make locked future steps clickable', async () => {
    renderAtIndustry({ orgFormData: { name: 'Acme' } })
    await screen.findByText('Industry step')
    expect(screen.queryByRole('button', { name: /professional role/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /review/i })).not.toBeInTheDocument()
  })

  it('does not make Your Account clickable (signup already done)', async () => {
    renderAtIndustry()
    await screen.findByText('Industry step')
    expect(screen.getByText('Your Account')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /your account/i })).not.toBeInTheDocument()
  })
})
