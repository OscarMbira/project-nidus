/**
 * Issue Service Tests
 * Tests for issueService.js functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIssue, updateIssue, getIssues, getIssueById, updateStatus } from '../issueService'
import { validateStatusTransition } from '../../utils/issueValidation'

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'register-123', project_id: 'project-123' }, error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: { id: 'issue-123', issue_title: 'Test Issue' }, error: null }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: { id: 'issue-123', issue_title: 'Updated Issue' }, error: null }))
        }))
      }))
    }))
  }
}))

describe('Issue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createIssue', () => {
    it('should create an issue successfully', async () => {
      const issueData = {
        issue_title: 'Test Issue',
        issue_description: 'This is a test issue description',
        issue_type: 'problem_concern',
        priority: 'high',
        severity: 'major',
        impact_description: 'Test impact'
      }

      const result = await createIssue('register-123', issueData)
      expect(result).toBeDefined()
      expect(result.id).toBe('issue-123')
    })

    it('should throw error if register not found', async () => {
      const { supabase } = await import('../supabaseClient')
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } }))
            }))
          }))
        }))
      })

      await expect(createIssue('invalid-register', {})).rejects.toThrow()
    })
  })

  describe('updateIssue', () => {
    it('should update an issue successfully', async () => {
      const updates = {
        issue_title: 'Updated Issue Title'
      }

      const result = await updateIssue('issue-123', updates)
      expect(result).toBeDefined()
      expect(result.issue_title).toBe('Updated Issue')
    })
  })

  describe('getIssues', () => {
    it('should fetch issues successfully', async () => {
      const { supabase } = await import('../supabaseClient')
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [{ id: 'issue-1' }, { id: 'issue-2' }], error: null }))
          }))
        }))
      })

      const result = await getIssues('register-123')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getIssueById', () => {
    it('should fetch a single issue by ID', async () => {
      const { supabase } = await import('../supabaseClient')
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'issue-123', issue_title: 'Test Issue' }, 
                error: null 
              }))
            }))
          }))
        }))
      })

      const result = await getIssueById('issue-123')
      expect(result).toBeDefined()
      expect(result.id).toBe('issue-123')
    })
  })

  describe('updateStatus', () => {
    it('should validate status transition before updating', async () => {
      const { supabase } = await import('../supabaseClient')
      
      // Mock getIssueById to return issue with status 'raised'
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'issue-123', status: 'raised' }, 
                error: null 
              }))
            }))
          }))
        }))
      })

      // Mock updateIssue
      supabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ 
              data: { id: 'issue-123', status: 'under_assessment' }, 
              error: null 
            }))
          }))
        }))
      })

      const result = await updateStatus('issue-123', 'under_assessment')
      expect(result).toBeDefined()
      expect(result.status).toBe('under_assessment')
    })

    it('should reject invalid status transition', async () => {
      const { supabase } = await import('../supabaseClient')
      
      supabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'issue-123', status: 'closed' }, 
                error: null 
              }))
            }))
          }))
        }))
      })

      await expect(updateStatus('issue-123', 'raised')).rejects.toThrow()
    })
  })
})

describe('Status Transition Validation', () => {
  it('should allow valid transitions', () => {
    expect(validateStatusTransition('draft', 'raised').valid).toBe(true)
    expect(validateStatusTransition('raised', 'under_assessment').valid).toBe(true)
    expect(validateStatusTransition('under_assessment', 'awaiting_decision').valid).toBe(true)
    expect(validateStatusTransition('awaiting_decision', 'approved').valid).toBe(true)
    expect(validateStatusTransition('approved', 'in_progress').valid).toBe(true)
    expect(validateStatusTransition('in_progress', 'resolved').valid).toBe(true)
    expect(validateStatusTransition('resolved', 'closed').valid).toBe(true)
  })

  it('should reject invalid transitions', () => {
    expect(validateStatusTransition('closed', 'raised').valid).toBe(false)
    expect(validateStatusTransition('cancelled', 'raised').valid).toBe(false)
    expect(validateStatusTransition('draft', 'closed').valid).toBe(false)
    expect(validateStatusTransition('raised', 'resolved').valid).toBe(false)
  })

  it('should provide error messages for invalid transitions', () => {
    const result = validateStatusTransition('closed', 'raised')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Cannot transition')
  })
})
