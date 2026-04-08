/**
 * Risk Comment Service Unit Tests
 * Tests for riskCommentService.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as riskCommentService from '../riskCommentService'
import { platformDb } from '../supabase/supabaseClient'

// Mock platformDb
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}))

describe('riskCommentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCommentsByRisk', () => {
    it('should fetch comments for a risk', async () => {
      const mockComments = [
        { id: 'comment-1', comment_text: 'Test comment 1', risk_id: 'risk-id' },
        { id: 'comment-2', comment_text: 'Test comment 2', risk_id: 'risk-id' }
      ]

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockComments, error: null })
      }

      platformDb.from.mockReturnValueOnce(query)

      const result = await riskCommentService.getCommentsByRisk('risk-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockComments)
    })
  })

  describe('addComment', () => {
    it('should add a comment successfully', async () => {
      const mockUser = { id: 'user-id' }
      const mockUserRecord = { id: 'user-record-id' }
      const mockComment = {
        id: 'comment-id',
        comment_text: 'New comment',
        risk_id: 'risk-id'
      }

      platformDb.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      const userQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUserRecord, error: null })
      }

      const insertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
      }

      platformDb.from
        .mockReturnValueOnce(userQuery)
        .mockReturnValueOnce(insertQuery)

      const result = await riskCommentService.addComment('risk-id', 'New comment')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockComment)
    })
  })

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      const mockUpdatedComment = {
        id: 'comment-id',
        comment_text: 'Updated comment'
      }

      const query = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedComment, error: null })
      }

      platformDb.from.mockReturnValueOnce(query)

      const result = await riskCommentService.updateComment('comment-id', 'Updated comment')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedComment)
    })
  })

  describe('deleteComment', () => {
    it('should delete a comment successfully', async () => {
      const mockUser = { id: 'user-id' }
      const mockUserRecord = { id: 'user-record-id' }

      platformDb.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      const userQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUserRecord, error: null })
      }

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }

      platformDb.from
        .mockReturnValueOnce(userQuery)
        .mockReturnValueOnce(updateQuery)

      const result = await riskCommentService.deleteComment('comment-id')

      expect(result.success).toBe(true)
    })
  })
})
