/**
 * End Stage Report Product Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addProductStatus,
  updateProductStatus,
  deleteProductStatus,
  getProductStatuses,
  syncProductsFromStage
} from '../endStageReportProductService'

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }))
  },
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('End Stage Report Product Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addProductStatus', () => {
    it('should add product status', async () => {
      const productData = {
        product_name: 'Test Product',
        completion_status: 'completed',
        quality_status: 'approved'
      }

      mockSupabase.from
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{
                id: 'product-status-123',
                ...productData
              }],
              error: null
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })

      const result = await addProductStatus('report-123', productData)
      expect(result).toBeDefined()
      expect(result.id).toBe('product-status-123')
    })
  })

  describe('updateProductStatus', () => {
    it('should update product status', async () => {
      const updates = {
        completion_status: 'completed',
        quality_status: 'approved'
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { end_stage_report_id: 'report-123' }, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'product-status-123',
                  ...updates
                }],
                error: null
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })

      const result = await updateProductStatus('product-status-123', updates)
      expect(result).toBeDefined()
      expect(result.completion_status).toBe('completed')
    })
  })

  describe('getProductStatuses', () => {
    it('should get product statuses', async () => {
      const mockProducts = [
        { id: 'product-1', product_name: 'Product 1' },
        { id: 'product-2', product_name: 'Product 2' }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockProducts, error: null }))
          }))
        }))
      })

      const result = await getProductStatuses('report-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(2)
    })
  })
})
