/**
 * Practice Task Service Unit Tests
 * Tests for practiceTaskService.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as practiceTaskService from '../../sim/practiceTaskService'
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

describe('practiceTaskService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPracticeTasks', () => {
    it('should fetch practice tasks for a project', async () => {
      const mockTasks = [
        { id: 'task-1', task_title: 'Test Task 1', practice_project_id: 'project-id' },
        { id: 'task-2', task_title: 'Test Task 2', practice_project_id: 'project-id' }
      ]

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null })
      }

      simDb.from.mockReturnValue(query)

      const result = await practiceTaskService.getPracticeTasks('project-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTasks)
      expect(simDb.from).toHaveBeenCalledWith('practice_tasks')
    })
  })

  describe('createPracticeTask', () => {
    it('should create a new practice task', async () => {
      const taskData = {
        task_title: 'New Task',
        task_description: 'Test description',
        practice_project_id: 'project-id'
      }

      const mockTask = { id: 'new-task-id', ...taskData }

      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockTask], error: null })
      }

      simDb.from.mockReturnValue(query)
      simDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })

      const result = await practiceTaskService.createPracticeTask('project-id', taskData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTask)
    })
  })
})
