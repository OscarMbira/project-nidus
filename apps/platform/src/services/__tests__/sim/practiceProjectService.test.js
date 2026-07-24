/**
 * Practice Project Service Unit Tests
 * Tests for practiceProjectService.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as practiceProjectService from '../../sim/practiceProjectService'
import { simDb } from '../../supabase/supabaseClient'

// Mock simDb
vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    },
    rpc: vi.fn()
  }
}))

describe('practiceProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMyPracticeProjects', () => {
    it('should fetch practice projects for current user', async () => {
      const mockProjects = [
        { id: 'project-1', project_name: 'Test Project 1', created_by: 'user-id' },
        { id: 'project-2', project_name: 'Test Project 2', created_by: 'user-id' }
      ]

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProjects, error: null })
      }

      simDb.from.mockReturnValue(query)
      simDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })

      const result = await practiceProjectService.getMyPracticeProjects()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockProjects)
      expect(simDb.from).toHaveBeenCalledWith('practice_projects')
    })

    it('should handle errors when fetching projects', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      }

      simDb.from.mockReturnValue(query)
      simDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })

      const result = await practiceProjectService.getMyPracticeProjects()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('createPracticeProject', () => {
    it('should create a new practice project', async () => {
      const projectData = {
        project_name: 'New Practice Project',
        project_description: 'Test description'
      }

      const mockProject = { id: 'new-project-id', ...projectData }

      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockProject], error: null })
      }

      simDb.from.mockReturnValue(query)
      simDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })

      const result = await practiceProjectService.createPracticeProject(projectData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockProject)
      expect(query.insert).toHaveBeenCalled()
    })
  })

  describe('getPracticeProjectById', () => {
    it('should fetch a practice project by ID', async () => {
      const mockProject = { id: 'project-id', project_name: 'Test Project' }

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null })
      }

      simDb.from.mockReturnValue(query)

      const result = await practiceProjectService.getPracticeProjectById('project-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockProject)
    })
  })
})
