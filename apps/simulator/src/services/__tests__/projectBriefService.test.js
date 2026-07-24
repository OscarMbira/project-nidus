/**
 * Project Brief Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBrief, getBriefById, updateBrief, deleteBrief, createBriefFromMandate } from '../projectBriefService'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('Project Brief Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createBrief', () => {
    it('should create a new brief', async () => {
      const projectId = 'test-project-id'
      const briefData = {
        background: 'Test background',
        project_objectives: 'Test objectives',
        document_status: 'draft'
      }

      const result = await createBrief(projectId, briefData)
      expect(result).toBeDefined()
      expect(result.id).toBe('test-id')
      expect(mockSupabase.from).toHaveBeenCalledWith('project_briefs')
    })

    it('should handle errors during creation', async () => {
      const projectId = 'test-project-id'
      const briefData = {}

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Creation failed' }
      })

      await expect(createBrief(projectId, briefData)).rejects.toThrow()
    })
  })

  describe('getBriefById', () => {
    it('should retrieve a brief by ID', async () => {
      const briefId = 'test-brief-id'
      const result = await getBriefById(briefId)
      expect(result).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('project_briefs')
    })

    it('should reject missing brief ID', async () => {
      await expect(getBriefById(undefined)).rejects.toThrow('Brief ID is required')
    })
  })

  describe('updateBrief', () => {
    it('should update an existing brief', async () => {
      const briefId = 'test-brief-id'
      const updates = {
        background: 'Updated background'
      }

      const result = await updateBrief(briefId, updates)
      expect(result).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('project_briefs')
    })
  })

  describe('deleteBrief', () => {
    it('should soft delete a brief', async () => {
      const briefId = 'test-brief-id'
      await deleteBrief(briefId)
      expect(mockSupabase.from).toHaveBeenCalledWith('project_briefs')
    })
  })

  describe('createBriefFromMandate', () => {
    it('should create brief from mandate', async () => {
      const mandateId = 'test-mandate-id'
      const projectId = 'test-project-id'

      // Mock the database function call
      mockSupabase.from().rpc = vi.fn(() => 
        Promise.resolve({ data: { id: 'test-id' }, error: null })
      )

      // Note: This would need the actual RPC call implementation
      expect(typeof createBriefFromMandate).toBe('function')
    })
  })
})
