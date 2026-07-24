/**
 * Risk Service Unit Tests
 * Tests for riskService.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as riskService from '../riskService'
import { platformDb } from '../supabase/supabaseClient'

// Mock platformDb
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    },
    rpc: vi.fn()
  }
}))

describe('riskService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRisksByProject', () => {
    it('should fetch risks for a project', async () => {
      const mockRegister = { id: 'register-id' }
      const mockRisks = [
        { id: 'risk-1', risk_title: 'Test Risk 1', risk_register_id: 'register-id' },
        { id: 'risk-2', risk_title: 'Test Risk 2', risk_register_id: 'register-id' }
      ]

      const registerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRegister })
      }

      const risksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRisks, error: null })
      }

      platformDb.from
        .mockReturnValueOnce(registerQuery)
        .mockReturnValueOnce(risksQuery)

      const result = await riskService.getRisksByProject('project-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRisks)
    })

    it('should return empty array if register does not exist', async () => {
      const registerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null })
      }

      platformDb.from.mockReturnValueOnce(registerQuery)

      const result = await riskService.getRisksByProject('project-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })
  })

  describe('createRisk', () => {
    it('should create a risk successfully', async () => {
      const mockUser = { id: 'user-id' }
      const mockUserRecord = { id: 'user-record-id' }
      const mockRisk = {
        id: 'risk-id',
        risk_title: 'New Risk',
        project_id: 'project-id'
      }

      platformDb.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      const userQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUserRecord, error: null })
      }

      const registerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null })
      }

      const rpcResult = { error: null }
      platformDb.rpc.mockResolvedValue(rpcResult)

      const risksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'register-id' }, error: null })
      }

      const insertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRisk, error: null })
      }

      platformDb.from
        .mockReturnValueOnce(userQuery)
        .mockReturnValueOnce(registerQuery)
        .mockReturnValueOnce(risksQuery)
        .mockReturnValueOnce(insertQuery)

      const result = await riskService.createRisk({
        project_id: 'project-id',
        risk_title: 'New Risk'
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRisk)
    })
  })

  describe('getRiskById', () => {
    it('should fetch a risk by ID', async () => {
      const mockRisk = {
        id: 'risk-id',
        risk_title: 'Test Risk',
        risk_identifier: 'R-2026-001'
      }

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRisk, error: null })
      }

      platformDb.from.mockReturnValueOnce(query)

      const result = await riskService.getRiskById('risk-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRisk)
    })
  })

  describe('updateRisk', () => {
    it('should update a risk successfully', async () => {
      const mockUser = { id: 'user-id' }
      const mockUserRecord = { id: 'user-record-id' }
      const mockUpdatedRisk = {
        id: 'risk-id',
        risk_title: 'Updated Risk'
      }

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
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedRisk, error: null })
      }

      platformDb.from
        .mockReturnValueOnce(userQuery)
        .mockReturnValueOnce(updateQuery)

      const result = await riskService.updateRisk('risk-id', {
        risk_title: 'Updated Risk'
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedRisk)
    })
  })

  describe('deleteRisk', () => {
    it('should delete a risk successfully', async () => {
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

      const deleteQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'risk-id' }, error: null })
      }

      platformDb.from
        .mockReturnValueOnce(userQuery)
        .mockReturnValueOnce(deleteQuery)

      const result = await riskService.deleteRisk('risk-id')

      expect(result.success).toBe(true)
    })
  })

  describe('closeRisk', () => {
    it('should close a risk successfully', async () => {
      const mockUser = { id: 'user-id' }
      const mockUserRecord = { id: 'user-record-id' }
      const mockClosedRisk = {
        id: 'risk-id',
        status_enum: 'closed',
        closure_reason: 'mitigated'
      }

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
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClosedRisk, error: null })
      }

      platformDb.from
        .mockReturnValueOnce(userQuery)
        .mockReturnValueOnce(updateQuery)

      const result = await riskService.closeRisk('risk-id', 'mitigated', 'Risk successfully mitigated')

      expect(result.success).toBe(true)
      expect(result.data.status_enum).toBe('closed')
    })
  })
})
