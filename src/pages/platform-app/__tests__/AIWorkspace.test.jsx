/**
 * Unit tests for AIWorkspace (Phase 3.8)
 * Workspace load; Sources panel; mobile tab layout; conversation history.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AIWorkspace from '../AIWorkspace'

vi.mock('../../../services/supabaseClient', () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } } }))
vi.mock('../../../services/supabase/supabaseClient', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
  }
  return {
    platformDb: {
      from: vi.fn(() => ({ ...chain })),
    },
  }
})
vi.mock('../../../services/aiAssistantService', () => ({
  getActiveConversation: vi.fn().mockResolvedValue(null),
  loadMessages: vi.fn().mockResolvedValue([]),
  listConversations: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn().mockResolvedValue({ id: 'c1' }),
  switchConversation: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue({}),
  getOrgAiSettings: vi.fn().mockResolvedValue({ data_answer_mode: 'template' }),
  updateConversationTitle: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../../services/aiSettingsService', () => ({
  getOrgIdForUser: vi.fn().mockResolvedValue('org1'),
  getPrivacyNoticeText: vi.fn(() => 'Privacy'),
}))

describe('AIWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders workspace with header', async () => {
    render(
      <MemoryRouter>
        <AIWorkspace />
      </MemoryRouter>
    )
    await vi.waitFor(() => {})
    expect(screen.getByText(/AI Workspace/i)).toBeTruthy()
  })

  it('shows Chat, Sources, History tabs on mobile layout', async () => {
    render(
      <MemoryRouter>
        <AIWorkspace />
      </MemoryRouter>
    )
    await vi.waitFor(() => {})
    expect(screen.getByText('Chat')).toBeTruthy()
    expect(screen.getByText('Sources')).toBeTruthy()
    expect(screen.getByText('History')).toBeTruthy()
  })

  it('has New chat button in history section', async () => {
    render(
      <MemoryRouter>
        <AIWorkspace />
      </MemoryRouter>
    )
    await vi.waitFor(() => {})
    expect(screen.getByText(/New chat/i)).toBeTruthy()
  })
})
