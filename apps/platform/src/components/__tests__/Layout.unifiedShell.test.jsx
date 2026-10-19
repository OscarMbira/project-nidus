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

vi.mock('../headers/PlatformAppHeader', () => ({
  default: function PlatformAppHeader({ projectSelector }) {
    return <header data-testid="header">{projectSelector}</header>
  },
}))

vi.mock('../headers/SimulatorAppHeader', () => ({ default: () => null }))
vi.mock('../MobileNavigation', () => ({ default: () => null }))
vi.mock('../help/HelpButton', () => ({ default: () => <div data-testid="help-button" /> }))
vi.mock('../feedback/FeedbackWidget', () => ({ default: () => <div data-testid="feedback-widget" /> }))
vi.mock('@nidus/ui/ai/AskNidusWidget.jsx', () => ({ default: () => <div data-testid="ai-chat-widget" /> }))
vi.mock('../../modules/pmis-gaps/components/QuickCaptureFab', () => ({ default: () => null }))
vi.mock('../pm/PMProjectSelector', () => ({ default: () => null }))
vi.mock('../../lib/CurrentProjectContext', () => ({
  CurrentProjectProvider: ({ children }) => children,
}))
vi.mock('../../lib/BrandingContext', () => ({
  BrandingProvider: ({ children }) => children,
}))
vi.mock('../../lib/useMenu', () => ({
  MenuProvider: ({ children }) => children,
  useMenu: () => ({ layoutHint: null }),
}))
vi.mock('@nidus/shared/hooks/useRoleScopeGuard', () => ({
  useRoleScopeGuard: () => ({ status: hoisted.gateStatus }),
}))

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Link to="/pm/controls/lessons-log">go pm</Link>
      <Link to="/platform/dashboard">go platform</Link>
      <Routes>
        <Route path="/platform/dashboard" element={<Layout><p>platform home</p></Layout>} />
        <Route path="/pm/controls/lessons-log" element={<Layout><p>lessons log</p></Layout>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout — one persistent shell across PM and Platform pages', () => {
  beforeEach(() => {
    hoisted.sidebarMounts = 0
    hoisted.gateStatus = 'allowed'
    localStorage.clear()
  })

  it('keeps the sidebar mounted when navigating between a Platform page and a PM page', async () => {
    renderAt('/platform/dashboard')
    expect(hoisted.sidebarMounts).toBe(1)

    fireEvent.click(screen.getByText('go pm'))
    expect(await screen.findByText('lessons log')).toBeInTheDocument()

    expect(hoisted.sidebarMounts).toBe(1)
  })

  it('shows the Help, Feedback and AI chat buttons on PM pages too', async () => {
    renderAt('/pm/controls/lessons-log')

    expect(await screen.findByTestId('help-button')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-widget')).toBeInTheDocument()
    expect(screen.getByTestId('ai-chat-widget')).toBeInTheDocument()
  })

  it('keeps the header and sidebar visible while the PM role check is still loading', async () => {
    hoisted.gateStatus = 'loading'
    renderAt('/pm/controls/lessons-log')

    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.queryByText('lessons log')).toBeNull()
  })

  it('redirects a user blocked from a PM page to the Platform dashboard', async () => {
    hoisted.gateStatus = 'blocked'
    renderAt('/pm/controls/lessons-log')

    expect(await screen.findByText('platform home')).toBeInTheDocument()
  })

  it('keeps the collapsed sidebar state across a scope switch', async () => {
    localStorage.setItem('nidus:sidebar-collapsed', '1')
    renderAt('/platform/dashboard')

    await act(async () => {
      fireEvent.click(screen.getByText('go pm'))
    })

    const main = document.getElementById('main-content')
    expect(main.className).toContain('lg:ml-0')
  })
})
