// v1294 — Ask Nidus workspace scope: the Platform follows the header project; only multi-project
// roles get the "This project | All my projects" toggle; the Simulator keeps its own picker.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const state = vi.hoisted(() => ({ app: 'platform', scope: null, chatProps: null, current: { currentProjectId: 'p1', currentProject: { projectName: 'Velocity Freight' } } }))
const rpc = vi.fn()
const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: () => Promise.resolve({ data: [{ id: 's1', project_name: 'Practice One' }] }) }

vi.mock('@nidus/supabase', () => ({ platformDb: { rpc: (...a) => rpc(...a) } }))
const db = { from: () => chain } // one stable client, as in the app
vi.mock('@nidus/shared/context/AppConfigContext', () => ({ useAppConfig: () => ({ app: state.app, db }) }))
vi.mock('@nidus/shared/hooks/useCurrentProject', () => ({ useCurrentProject: () => state.current }))
vi.mock('@nidus/shared/services/askNidusService', () => ({
  getAiUser: () => Promise.resolve({ authUserId: 'a1' }),
  listConversations: () => Promise.resolve([]),
  deleteConversation: vi.fn(),
}))
vi.mock('../AskNidusChat.jsx', () => ({ default: (props) => { state.chatProps = props; return <div data-testid="chat" /> } }))

const { default: AskNidusWorkspace } = await import('../AskNidusWorkspace.jsx')
const renderWs = () => render(<MemoryRouter><AskNidusWorkspace /></MemoryRouter>)

beforeEach(() => {
  state.app = 'platform'
  state.chatProps = null
  state.current = { currentProjectId: 'p1', currentProject: { projectName: 'Velocity Freight' } }
  rpc.mockReset()
})

describe('AskNidusWorkspace scope (v1294)', () => {
  it('multi-project role: toggle, no project dropdown, header project by default', async () => {
    rpc.mockResolvedValue({ data: { can_choose_all: true, org_wide: true, default_project_id: 'p1' } })
    renderWs()
    const all = await screen.findByRole('button', { name: 'All my projects' })
    expect(screen.queryByLabelText('Scope')).not.toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('ai_project_scope', { p_project_id: 'p1', p_all: false })
    expect(state.chatProps).toMatchObject({ projectId: 'p1', projectName: 'Velocity Freight', scopeAll: false })
    fireEvent.click(all)
    await waitFor(() => expect(state.chatProps).toMatchObject({ projectId: null, scopeAll: true }))
  })

  it('other roles: no toggle and no dropdown; their only project is preselected', async () => {
    state.current = { currentProjectId: null, currentProject: null }
    rpc.mockResolvedValue({ data: { can_choose_all: false, default_project_id: 'p9' } })
    renderWs()
    await waitFor(() => expect(state.chatProps?.projectId).toBe('p9'))
    expect(screen.queryByRole('button', { name: 'All my projects' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Scope')).not.toBeInTheDocument()
    expect(state.chatProps.scopeAll).toBe(false)
  })

  it('multi-project role with no project open starts on "All my projects"', async () => {
    state.current = { currentProjectId: null, currentProject: null }
    rpc.mockResolvedValue({ data: { can_choose_all: true, org_wide: true, default_project_id: null } })
    renderWs()
    await waitFor(() => expect(state.chatProps).toMatchObject({ scopeAll: true, projectId: null }))
    expect(screen.getByRole('button', { name: 'This project' })).toBeDisabled()
  })

  it('Simulator keeps its own project picker and does not ask for a scope', async () => {
    state.app = 'simulator'
    renderWs()
    expect(await screen.findByLabelText('Scope')).toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('AskNidusWorkspace conversation list (hide/show, resize)', () => {
  it('hides and shows the list on desktop and remembers the choice', async () => {
    window.localStorage.removeItem('nidus:askNidus:historyHidden')
    rpc.mockResolvedValue({ data: { can_choose_all: false, default_project_id: 'p1' } })
    renderWs()
    const hide = await screen.findByRole('button', { name: 'Hide conversations' })
    fireEvent.click(hide)
    expect(screen.getByRole('button', { name: 'Show conversations' })).toHaveAttribute('aria-expanded', 'false')
    expect(window.localStorage.getItem('nidus:askNidus:historyHidden')).toBe('1')
    expect(screen.queryByRole('separator', { name: 'Resize conversations' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show conversations' }))
    expect(window.localStorage.getItem('nidus:askNidus:historyHidden')).toBe('0')
  })

  it('resizes with the keyboard within limits and remembers the width', async () => {
    window.localStorage.setItem('nidus:askNidus:historyWidth', '470')
    window.localStorage.removeItem('nidus:askNidus:historyHidden')
    rpc.mockResolvedValue({ data: { can_choose_all: false, default_project_id: 'p1' } })
    renderWs()
    const handle = await screen.findByRole('separator', { name: 'Resize conversations' })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle).toHaveAttribute('aria-valuenow', '480') // capped at the maximum
    fireEvent.doubleClick(handle)
    expect(handle).toHaveAttribute('aria-valuenow', '256')
    expect(window.localStorage.getItem('nidus:askNidus:historyWidth')).toBe('256')
  })
})
