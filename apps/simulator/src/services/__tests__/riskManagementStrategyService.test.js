/**
 * Unit Tests for Risk Management Strategy Service
 * Tests CRUD operations, validation, conformance, and integration functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRMS,
  createRMSForProject,
  createRMSFromTemplate,
  getRMSById,
  getRMSByProject,
  updateRMS,
  deleteRMS,
  submitForApproval,
  approveRMS,
  validateCompleteness,
  checkConformance,
  applyToRiskRegister,
  getRevisionHistory
} from '../riskManagementStrategyService';

// Mock platformDb
const mockPlatformDb = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  })),
  rpc: vi.fn()
};

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: mockPlatformDb
}));

describe('Risk Management Strategy Service', () => {
  const mockUser = { id: 'user-123' };
  const mockUserData = { id: 'user-data-123' };
  const mockRMS = {
    id: 'rms-123',
    project_id: 'project-123',
    rms_reference: 'RMS-2024-001',
    version_number: 1,
    status: 'draft'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformDb.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    });
  });

  describe('createRMS', () => {
    it('should create RMS successfully', async () => {
      const insertChain = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockRMS, error: null })
        }))
      };
      
      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
        }))
      });
      
      mockPlatformDb.from().insert.mockReturnValue(insertChain);

      const result = await createRMS('project-123', { purpose: 'Test purpose' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRMS);
    });

    it('should return error if user not authenticated', async () => {
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await createRMS('project-123', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authenticated');
    });
  });

  describe('getRMSByProject', () => {
    it('should fetch RMS by project successfully', async () => {
      const selectChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockRMS, error: null })
          }))
        }))
      };

      mockPlatformDb.from().select.mockReturnValue(selectChain);

      const result = await getRMSByProject('project-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRMS);
    });

    it('should return null data if RMS not found', async () => {
      const selectChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { code: 'PGRST116' } 
            })
          }))
        }))
      };

      mockPlatformDb.from().select.mockReturnValue(selectChain);

      const result = await getRMSByProject('project-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('updateRMS', () => {
    it('should update RMS successfully', async () => {
      const updateChain = {
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { ...mockRMS, purpose: 'Updated purpose' }, 
              error: null 
            })
          }))
        }))
      };

      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
        }))
      });

      mockPlatformDb.from().update.mockReturnValue(updateChain);

      const result = await updateRMS('rms-123', { purpose: 'Updated purpose' });

      expect(result.success).toBe(true);
      expect(result.data.purpose).toBe('Updated purpose');
    });
  });

  describe('validateCompleteness', () => {
    it('should validate RMS completeness', async () => {
      const mockValidation = [
        { section_name: 'Standards', is_complete: true, missing_items: [] },
        { section_name: 'Methods', is_complete: false, missing_items: ['identification method'] }
      ];

      mockPlatformDb.rpc.mockResolvedValue({ data: mockValidation, error: null });

      const result = await validateCompleteness('rms-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockValidation);
      expect(mockPlatformDb.rpc).toHaveBeenCalledWith('validate_rms_completeness', {
        p_rms_id: 'rms-123'
      });
    });
  });

  describe('checkConformance', () => {
    it('should check RMS conformance', async () => {
      const mockConformance = [
        {
          standard_name: 'ISO 31000',
          conformance_status: 'Conforms',
          gaps: [],
          recommendations: null
        }
      ];

      mockPlatformDb.rpc.mockResolvedValue({ data: mockConformance, error: null });

      const result = await checkConformance('rms-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConformance);
      expect(mockPlatformDb.rpc).toHaveBeenCalledWith('check_rms_conformance', {
        p_rms_id: 'rms-123'
      });
    });
  });

  describe('applyToRiskRegister', () => {
    it('should apply RMS to risk register', async () => {
      mockPlatformDb.rpc.mockResolvedValue({ error: null });

      const result = await applyToRiskRegister('rms-123', 'register-123');

      expect(result.success).toBe(true);
      expect(mockPlatformDb.rpc).toHaveBeenCalledWith('apply_rms_to_risk_register', {
        p_rms_id: 'rms-123',
        p_risk_register_id: 'register-123'
      });
    });
  });

  describe('createRMSFromTemplate', () => {
    it('should create RMS from template', async () => {
      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
          }))
        }))
      });

      mockPlatformDb.rpc.mockResolvedValue({ data: 'rms-123', error: null });

      // Mock getRMSByProject to return the created RMS
      const selectChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockRMS, error: null })
          }))
        }))
      };
      
      // First call is for getUser, second is for getRMSByProject
      mockPlatformDb.from().select.mockReturnValueOnce({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
          }))
        }))
      }).mockReturnValueOnce(selectChain);

      const result = await createRMSFromTemplate('project-123', 'template-123');

      expect(mockPlatformDb.rpc).toHaveBeenCalledWith('create_rms_from_template', {
        p_project_id: 'project-123',
        p_template_id: 'template-123',
        p_user_id: mockUserData.id
      });
    });
  });

  describe('getRevisionHistory', () => {
    it('should fetch revision history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          version_number: 1,
          revision_reason: 'Initial version',
          created_at: '2024-01-01'
        }
      ];

      const selectChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: mockHistory, error: null })
          }))
        }))
      };

      mockPlatformDb.from().select.mockReturnValue(selectChain);

      const result = await getRevisionHistory('rms-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
    });
  });
});
