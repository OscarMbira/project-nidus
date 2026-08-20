/**
 * Unit tests for RoleScopeGate — the v839 fix for the PM->PMO sidebar-switch bug. Its whole job
 * is to guarantee the wrong-scope Layout chrome (MenuProvider/Sidebar, passed as `children`)
 * never mounts: not while loading, not for a single frame, only once the guard says 'allowed'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RoleScopeGate from '../RoleScopeGate'

let mockGuardState

vi.mock('@nidus/shared/hooks/useRoleScopeGuard', () => ({
  useRoleScopeGuard: () => mockGuardState,
}))

function renderGate({ requiredScope = 'pmo', blockedRedirectTo = '/platform/dashboard' } = {}) {
  return render(
    <MemoryRouter initialEntries={['/app/pmo/some-page']}>
      <Routes>
        <Route
          path="/app/pmo/some-page"
          element={
            <RoleScopeGate requiredScope={requiredScope} blockedRedirectTo={blockedRedirectTo}>
              <div data-testid="pmo-sidebar-and-content">PMO chrome + page content</div>
            </RoleScopeGate>
          }
        />
        <Route path={blockedRedirectTo} element={<div data-testid="redirected">Redirected home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleScopeGate', () => {
  beforeEach(() => {
    mockGuardState = { status: 'loading', scopes: [] }
  })

  it('renders a neutral loading state while resolving — never the guarded children', () => {
    renderGate()
    expect(screen.queryByTestId('pmo-sidebar-and-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('redirected')).not.toBeInTheDocument()
  })

  it('renders the guarded children once allowed', () => {
    mockGuardState = { status: 'allowed', scopes: ['pmo'] }
    renderGate()
    expect(screen.getByTestId('pmo-sidebar-and-content')).toBeInTheDocument()
  })

  it('redirects away — without ever rendering the guarded children — when blocked', () => {
    mockGuardState = { status: 'blocked', scopes: ['pm'] }
    renderGate()
    expect(screen.queryByTestId('pmo-sidebar-and-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('redirected')).toBeInTheDocument()
  })

  it('avoids a same-path redirect loop by falling back to /platform/dashboard', () => {
    mockGuardState = { status: 'blocked', scopes: ['pmo'] }
    render(
      <MemoryRouter initialEntries={['/pm/dashboard']}>
        <Routes>
          <Route
            path="/pm/dashboard"
            element={
              <RoleScopeGate requiredScope="pm" blockedRedirectTo="/pm/dashboard">
                <div data-testid="pm-chrome">PM chrome</div>
              </RoleScopeGate>
            }
          />
          <Route path="/platform/dashboard" element={<div data-testid="platform-home">Platform home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('pm-chrome')).not.toBeInTheDocument()
    expect(screen.getByTestId('platform-home')).toBeInTheDocument()
  })

  it('renders children for a dual-role user whose scopes include the required one', () => {
    mockGuardState = { status: 'allowed', scopes: ['pm', 'pmo'] }
    renderGate({ requiredScope: 'pmo' })
    expect(screen.getByTestId('pmo-sidebar-and-content')).toBeInTheDocument()
  })
})
