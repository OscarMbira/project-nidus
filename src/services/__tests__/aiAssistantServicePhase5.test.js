/**
 * Unit tests for Phase 5 — conversation persistence, auto-title, feedback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  updateConversationTitle,
  saveMessageFeedback,
} from '../aiAssistantService'

const mockEq = vi.fn(() => Promise.resolve({ error: null }))
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      update: mockUpdate,
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}))

describe('updateConversationTitle (Phase 5.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('truncates title to 50 characters', async () => {
    const longTitle = 'a'.repeat(60)
    await updateConversationTitle('conv-123', longTitle)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'a'.repeat(50),
      })
    )
    expect(mockEq).toHaveBeenCalledWith('id', 'conv-123')
  })

  it('does nothing when conversationId is null', async () => {
    mockUpdate.mockClear()
    await updateConversationTitle(null, 'Hello')
    await updateConversationTitle(undefined, 'Hello')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('does nothing when title is empty', async () => {
    mockUpdate.mockClear()
    await updateConversationTitle('conv-123', '')
    await updateConversationTitle('conv-123', null)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('saveMessageFeedback (Phase 5.5)', () => {
  it('returns true on success', async () => {
    const result = await saveMessageFeedback('msg-1', 'user-1', 1)
    expect(result).toBe(true)
  })
})
