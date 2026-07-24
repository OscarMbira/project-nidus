/**
 * Practice Risk Service Unit Tests
 * Tests for practiceRiskService.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as practiceRiskService from '../../sim/practiceRiskService'
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

describe('practiceRiskService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPracticeRisks', () => {
    it('should fetch practice risks for a project', async () => {
      const mockRisks = [
        { id: 'risk-1', risk_title: 'Test Risk 1', practice_project_id: 'project-id' },
        { id: 'risk-2', risk_title: 'Test Risk 2', practice_project_id: 'project-id' }
      ]

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRisks, error: null })
      }

      simDb.from.mockReturnValue(query)

      const result = await practiceRiskService.getPracticeRisks('project-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRisks)
    })
  })

  describe('createPracticeRisk', () => {
    it('should create a new practice risk', async () => {
      const riskData = {
        risk_title: 'New Risk',
        risk_description: 'Test description',
        practice_project_id: 'project-id'
      }

      const mockRisk = { id: 'new-risk-id', ...riskData }

      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockRisk], error: null })
      }

      simDb.from.mockReturnValue(query)
      simDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } } })

      const result = await practiceRiskService.createPracticeRisk('project-id', riskData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRisk)
    })
  })
})
