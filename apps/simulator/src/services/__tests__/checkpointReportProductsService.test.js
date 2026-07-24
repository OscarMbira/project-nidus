/**
 * Checkpoint Report Products Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addProduct,
  updateProduct,
  deleteProduct,
  getProductsByReport,
  getProductsInDevelopment,
  getProductsCompleted
} from '../checkpointReportProductsService'

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } }))
  },
  from: vi.fn()
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('Checkpoint Report Products Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addProduct', () => {
    it('should add a product to checkpoint report', async () => {
      const productData = {
        product_name: 'Test Product',
        product_status: 'in_development',
        quality_status: 'not_started'
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({
            data: [{ id: 'product-123', ...productData }],
            error: null
          }))
        }))
      })

      const result = await addProduct('report-123', productData)
      expect(result).toBeDefined()
      expect(result.id).toBe('product-123')
      expect(result.product_name).toBe('Test Product')
    })
  })

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const updates = {
        product_status: 'completed',
        quality_status: 'passed'
      }

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({
              data: [{ id: 'product-123', ...updates }],
              error: null
            }))
          }))
        }))
      })

      const result = await updateProduct('product-123', updates)
      expect(result).toBeDefined()
      expect(result.product_status).toBe('completed')
    })
  })

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })

      await expect(deleteProduct('product-123')).resolves.not.toThrow()
    })
  })

  describe('getProductsByReport', () => {
    it('should fetch products for report', async () => {
      const mockProducts = [
        { id: 'product-1', product_name: 'Product 1' },
        { id: 'product-2', product_name: 'Product 2' }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockProducts, error: null }))
            }))
          }))
        }))
      })

      const result = await getProductsByReport('report-123')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
    })

    it('should filter by period type', async () => {
      const mockProducts = [{ id: 'product-1', period_type: 'current' }]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockProducts, error: null }))
              }))
            }))
          }))
        }))
      })

      const result = await getProductsByReport('report-123', 'current')
      expect(result).toBeDefined()
      expect(result.length).toBe(1)
    })
  })

  describe('getProductsInDevelopment', () => {
    it('should fetch products in development', async () => {
      const mockProducts = [
        { id: 'product-1', product_status: 'in_development' }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockProducts, error: null }))
              }))
            }))
          }))
        }))
      })

      const result = await getProductsInDevelopment('report-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(1)
      expect(result[0].product_status).toBe('in_development')
    })
  })

  describe('getProductsCompleted', () => {
    it('should fetch completed products', async () => {
      const mockProducts = [
        { id: 'product-1', product_status: 'completed' }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockProducts, error: null }))
              }))
            }))
          }))
        }))
      })

      const result = await getProductsCompleted('report-123')
      expect(result).toBeDefined()
      expect(result.length).toBe(1)
      expect(result[0].product_status).toBe('completed')
    })
  })
})
