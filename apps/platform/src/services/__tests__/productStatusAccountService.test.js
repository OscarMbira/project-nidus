/**
 * Product Status Account Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as productStatusAccountService from '../productStatusAccountService'
import { supabase } from '../supabaseClient'

// Mock supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            order: vi.fn()
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    })),
    rpc: vi.fn()
  }
}))

describe('productStatusAccountService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProductStatusAccount', () => {
    it('should create a new Product Status Account', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123', full_name: 'Test User', email: 'test@example.com' }
      const mockPSA = {
        id: 'psa-123',
        psa_reference: 'PSA-2026-001',
        product_name: 'Test Product',
        project_id: 'project-123'
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      supabase.from('users').select().eq().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null
      })
      supabase.from('product_status_accounts').insert().select().single.mockResolvedValue({
        data: mockPSA,
        error: null
      })

      const result = await productStatusAccountService.createProductStatusAccount('project-123', {
        product_name: 'Test Product',
        report_date: '2026-01-20'
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPSA)
    })

    it('should return error if user not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await productStatusAccountService.createProductStatusAccount('project-123', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })
  })

  describe('getProductStatusAccountById', () => {
    it('should get Product Status Account by ID', async () => {
      const mockPSA = {
        id: 'psa-123',
        psa_reference: 'PSA-2026-001',
        product_name: 'Test Product'
      }

      supabase.from('product_status_accounts').select().eq().eq().single.mockResolvedValue({
        data: mockPSA,
        error: null
      })

      const result = await productStatusAccountService.getProductStatusAccountById('psa-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPSA)
    })

    it('should return error if PSA not found', async () => {
      supabase.from('product_status_accounts').select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })

      const result = await productStatusAccountService.getProductStatusAccountById('invalid-id')

      expect(result.success).toBe(false)
    })
  })

  describe('updateProductStatusAccount', () => {
    it('should update Product Status Account', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123' }
      const mockUpdatedPSA = {
        id: 'psa-123',
        product_name: 'Updated Product Name'
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      supabase.from('users').select().eq().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null
      })
      supabase.from('product_status_accounts').update().eq().select().single.mockResolvedValue({
        data: mockUpdatedPSA,
        error: null
      })

      const result = await productStatusAccountService.updateProductStatusAccount('psa-123', {
        product_name: 'Updated Product Name'
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUpdatedPSA)
    })
  })

  describe('updateStatus', () => {
    it('should update Product Status Account status', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123' }
      const mockUpdatedPSA = {
        id: 'psa-123',
        current_status: 'in_progress'
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      supabase.from('users').select().eq().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null
      })
      supabase.from('product_status_accounts').update().eq().select().single.mockResolvedValue({
        data: mockUpdatedPSA,
        error: null
      })

      const result = await productStatusAccountService.updateStatus('psa-123', 'in_progress', 'Starting work')

      expect(result.success).toBe(true)
      expect(result.data.current_status).toBe('in_progress')
    })
  })

  describe('updateProgress', () => {
    it('should update Product Status Account progress', async () => {
      const mockUser = { id: 'user-123' }
      const mockUserData = { id: 'user-data-123' }
      const mockUpdatedPSA = {
        id: 'psa-123',
        progress_percentage: 50
      }

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      supabase.from('users').select().eq().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null
      })
      supabase.from('product_status_accounts').update().eq().select().single.mockResolvedValue({
        data: mockUpdatedPSA,
        error: null
      })

      const result = await productStatusAccountService.updateProgress('psa-123', 50, 'Halfway complete')

      expect(result.success).toBe(true)
      expect(result.data.progress_percentage).toBe(50)
    })
  })

  describe('getStatusSummary', () => {
    it('should get status summary for project', async () => {
      const mockSummary = {
        total_products: 10,
        not_started: 2,
        in_progress: 5,
        completed: 2,
        accepted: 1,
        on_hold: 0,
        at_risk: 2,
        delayed: 1
      }

      supabase.rpc.mockResolvedValue({
        data: [mockSummary],
        error: null
      })

      const result = await productStatusAccountService.getStatusSummary('project-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSummary)
    })
  })
})
