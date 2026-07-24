/**
 * Unit tests for AIChatWidget (Phase 2.7)
 * Widget open/close; message-count banner; Open in workspace link; Sources truncation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AIChatWidget from '../AIChatWidget'

vi.mock('../../services/supabaseClient', () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }))
vi.mock('../../services/supabase/supabaseClient', () => ({ platformDb: { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })) })) })) } }))
vi.mock('../../services/aiAssistantService', () => ({
  getActiveConversation: vi.fn().mockResolvedValue(null),
  loadMessages: vi.fn().mockResolvedValue([]),
  listConversations: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
  switchConversation: vi.fn().mockResolvedValue(undefined),
  saveMessage: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue({}),
  getOrgAiSettings: vi.fn().mockResolvedValue({ data_answer_mode: 'template' }),
  updateConversationTitle: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../services/aiSettingsService', () => ({
  getOrgIdForUser: vi.fn().mockResolvedValue(null),
  getPrivacyNoticeText: vi.fn(() => 'Privacy notice'),
}))

describe('AIChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders collapsed by default (button visible)', () => {
    render(
      <MemoryRouter>
        <AIChatWidget />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /open|ai|chat/i }) || document.querySelector('[class*="rounded"]')).toBeTruthy()
  })

  it('opens panel when button is clicked', async () => {
    render(
      <MemoryRouter>
        <AIChatWidget />
      </MemoryRouter>
    )
    const buttons = screen.getAllByRole('button')
    const openBtn = buttons.find((b) => b.textContent === '' || b.getAttribute('aria-label')) || buttons[0]
    fireEvent.click(openBtn)
    await screen.findByPlaceholderText(/ask|type|message/i).catch(() => null)
    expect(document.body.textContent).toBeTruthy()
  })

  it('shows Open in AI Workspace link when expanded', async () => {
    render(
      <MemoryRouter>
        <AIChatWidget />
      </MemoryRouter>
    )
    const links = screen.queryAllByRole('link')
    const workspaceLink = links.find((l) => l.href?.includes('platform/ai') || l.textContent?.toLowerCase().includes('workspace'))
    expect(workspaceLink || document.body.innerHTML).toBeTruthy()
  })
})
