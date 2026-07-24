/**
 * Unit Tests for projectMandateService
 * Tests CRUD operations and validation functions
 */

import {
  createMandate,
  getMandateById,
  updateMandate,
  deleteMandate,
  canCreateProject,
  canEditMandate
} from '../../services/projectMandateService'

// Mock supabase client
jest.mock('../../services/supabase/supabaseClient', () => ({
  platformDb: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } }))
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-id', mandate_reference: 'MAN-2026-001' }, error: null }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-id', document_status: 'approved' }, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
          }))
        }))
      }))
    }))
  }
}))

describe('projectMandateService', () => {
  describe('createMandate', () => {
    it('should create a mandate with minimum required fields', async () => {
      const mandateData = {
        mandate_title: 'Test Mandate',
        purpose: 'This is a test purpose with more than 20 characters',
        background: 'This is a test background that needs to be at least 100 characters long to meet the minimum requirement for validation.',
        project_objectives: 'Test objectives that need to be at least 100 characters long to meet validation requirements for project mandate creation.',
        outline_business_case: 'Test business case that needs to be at least 100 characters long to meet validation requirements for project mandate creation.'
      }

      const result = await createMandate(mandateData)
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('mandate_reference')
    })

    it('should throw error if user not authenticated', async () => {
      // Mock unauthenticated user
      const { platformDb } = require('../../services/supabase/supabaseClient')
      platformDb.auth.getUser = jest.fn(() => Promise.resolve({ data: { user: null } }))

      await expect(createMandate({})).rejects.toThrow('User not authenticated')
    })
  })

  describe('canCreateProject', () => {
    it('should return true for approved mandate without project', () => {
      const mandateData = {
        document_status: 'approved',
        project_id: null,
        proposed_executive_id: 'exec-id',
        deliverables: [{ id: '1' }],
        stakeholders: [{ id: '1' }]
      }

      expect(canCreateProject(mandateData)).toBe(true)
    })

    it('should return false for draft mandate', () => {
      const mandateData = {
        document_status: 'draft',
        project_id: null
      }

      expect(canCreateProject(mandateData)).toBe(false)
    })

    it('should return false for mandate already linked to project', () => {
      const mandateData = {
        document_status: 'approved',
        project_id: 'project-id'
      }

      expect(canCreateProject(mandateData)).toBe(false)
    })
  })

  describe('getMandateById', () => {
    it('should fetch mandate by ID', async () => {
      const result = await getMandateById('test-mandate-id')
      expect(result).toHaveProperty('id')
    })

    it('should handle errors gracefully', async () => {
      const { platformDb } = require('../../services/supabase/supabaseClient')
      platformDb.from().select().eq().eq().single = jest.fn(() => 
        Promise.resolve({ data: null, error: { message: 'Mandate not found' } })
      )

      await expect(getMandateById('invalid-id')).rejects.toThrow()
    })
  })

  describe('updateMandate', () => {
    it('should update mandate fields', async () => {
      const updates = {
        mandate_title: 'Updated Title'
      }

      const result = await updateMandate('test-id', updates)
      expect(result).toHaveProperty('id')
    })
  })

  describe('deleteMandate', () => {
    it('should only delete draft mandates', async () => {
      // Mock mandate fetch with draft status
      const { platformDb } = require('../../services/supabase/supabaseClient')
      platformDb.from().select().eq().single = jest.fn(() =>
        Promise.resolve({ data: { document_status: 'draft', project_id: null }, error: null })
      )

      const result = await deleteMandate('test-id')
      expect(result).toHaveProperty('id')
    })

    it('should reject deletion of non-draft mandates', async () => {
      // Mock mandate fetch with approved status
      const { platformDb } = require('../../services/supabase/supabaseClient')
      platformDb.from().select().eq().single = jest.fn(() =>
        Promise.resolve({ data: { document_status: 'approved', project_id: null }, error: null })
      )

      await expect(deleteMandate('test-id')).rejects.toThrow()
    })
  })
})
