import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from '../Layout'

const hoisted = vi.hoisted(() => ({
  sidebarMounts: 0,
  gateStatus: 'allowed',
}))

vi.mock('../Sidebar', () => ({
  default: function Sidebar() {
    useEffect(() => {
      hoisted.sidebarMounts += 1
    }, [])
    return <nav data-testid="sidebar" />
  },
}))

vi.mock('../headers/SimulatorAppHeader', () => ({
  default: function SimulatorAppHeader() {
    return <header data-testid="header" />
  },
}))
vi.mock('../headers/PlatformAppHeader', () => ({ default: () => null }))
vi.mock('../MobileNavigation', () => ({ default: () => null }))
vi.mock('../help/HelpButton', () => ({ default: () => <div data-testid="help-button" /> }))
vi.mock('../feedback/FeedbackWidget', () => ({ default: () => <div data-testid="feedback-widget" /> }))
vi.mock('../ai/AIChatWidget', () => ({ default: () => <div data-testid="ai-chat-widget" /> }))
vi.mock('../../modules/pmis-gaps/components/QuickCaptureFab', () => ({ default: () => null }))
vi.mock('../sim/ui/PracticeDashboardSwitcher', () => ({ default: () => null }))
vi.mock('@nidus/shared/context/BrandingContext', () => ({
  BrandingProvider: ({ children }) => children,
}))
vi.mock('@nidus/shared/hooks/useMenu', () => ({
  MenuProvider: ({ children }) => children,
}))
vi.mock('@nidus/shared/hooks/useRoleScopeGuard', () => ({
  useRoleScopeGuard: () => ({ status: hoisted.gateStatus }),
}))

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Link to="/simulator/pm/projects">go pm</Link>
      <Link to="/simulator/dashboard">go sim</Link>
      <Routes>
        <Route path="/simulator/dashboard" element={<Layout><p>sim home</p></Layout>} />
        <Route path="/simulator/pm/projects" element={<Layout scope="pm"><p>pm projects</p></Layout>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Simulator Layout — one persistent shell across PM and simulator pages', () => {
  beforeEach(() => {
    hoisted.sidebarMounts = 0
    hoisted.gateStatus = 'allowed'
    localStorage.clear()
  })

  it('keeps the sidebar mounted when navigating between a simulator page and a PM page', async () => {
    renderAt('/simulator/dashboard')
    expect(hoisted.sidebarMounts).toBe(1)

    await act(async () => {
      fireEvent.click(screen.getByText('go pm'))
    })
    expect(await screen.findByText('pm projects')).toBeInTheDocument()

    expect(hoisted.sidebarMounts).toBe(1)
  })

  it('shows the Help, Feedback and AI chat buttons on PM pages too', async () => {
    renderAt('/simulator/pm/projects')

    expect(await screen.findByTestId('help-button')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-widget')).toBeInTheDocument()
    expect(screen.getByTestId('ai-chat-widget')).toBeInTheDocument()
  })

  it('keeps the header and sidebar visible while the PM role check is still loading', async () => {
    hoisted.gateStatus = 'loading'
    renderAt('/simulator/pm/projects')

    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.queryByText('pm projects')).toBeNull()
  })

  it('redirects a user blocked from a PM page to the simulator dashboard', async () => {
    hoisted.gateStatus = 'blocked'
    renderAt('/simulator/pm/projects')

    expect(await screen.findByText('sim home')).toBeInTheDocument()
  })

  it('keeps the collapsed sidebar state across a scope switch', async () => {
    localStorage.setItem('nidus:sidebar-collapsed', '1')
    renderAt('/simulator/dashboard')

    await act(async () => {
      fireEvent.click(screen.getByText('go pm'))
    })

    const main = document.getElementById('main-content')
    expect(main.className).toContain('lg:ml-0')
  })
})
