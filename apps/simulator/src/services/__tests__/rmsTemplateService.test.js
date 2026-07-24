/**
 * Unit Tests for RMS Template Service
 * Tests organization template management functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTemplates,
  getDefaultTemplate,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setAsDefault,
  createRMSFromTemplate
} from '../rmsTemplateService';

// Mock platformDb
const mockPlatformDb = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
        order: vi.fn()
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
    }))
  })),
  rpc: vi.fn()
};

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: mockPlatformDb
}));

describe('RMS Template Service', () => {
  const mockUser = { id: 'user-123' };
  const mockUserData = { id: 'user-data-123' };
  const mockTemplate = {
    id: 'template-123',
    account_id: 'account-123',
    template_name: 'Default RMS Template',
    is_default: true,
    is_active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformDb.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    });
  });

  describe('getTemplates', () => {
    it('should fetch templates for account', async () => {
      const mockTemplates = [mockTemplate];
      const orderChain = {
        order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null })
      };

      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => orderChain)
          }))
        }))
      });

      const result = await getTemplates('account-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplates);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should fetch default template', async () => {
      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null })
              }))
            }))
          }))
        }))
      });

      const result = await getDefaultTemplate('account-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
    });

    it('should return null if no default template', async () => {
      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockRejectedValue({ code: 'PGRST116' })
              }))
            }))
          }))
        }))
      });

      const result = await getDefaultTemplate('account-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const insertChain = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null })
        }))
      };

      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
          }))
        }))
      });

      mockPlatformDb.from().insert.mockReturnValue(insertChain);

      const result = await createTemplate('account-123', {
        template_name: 'Test Template'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const updateChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ 
                data: { ...mockTemplate, template_name: 'Updated Name' }, 
                error: null 
              })
            }))
          }))
        }))
      };

      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
          }))
        }))
      });

      mockPlatformDb.from().update.mockReturnValue(updateChain);

      const result = await updateTemplate('template-123', {
        template_name: 'Updated Name'
      });

      expect(result.success).toBe(true);
      expect(result.data.template_name).toBe('Updated Name');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      mockPlatformDb.from().select.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
          }))
        }))
      });

      mockPlatformDb.from().update.mockResolvedValue({ error: null });

      const result = await deleteTemplate('template-123');

      expect(result.success).toBe(true);
    });
  });

  describe('setAsDefault', () => {
    it('should set template as default', async () => {
      mockPlatformDb.from().select.mockReturnValueOnce({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { account_id: 'account-123' }, 
              error: null 
            })
          }))
        }))
      }).mockReturnValueOnce({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
          }))
        }))
      });

      const updateChain = {
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null })
            }))
          }))
        }))
      };

      mockPlatformDb.from().update.mockReturnValue(updateChain);

      const result = await setAsDefault('template-123');

      expect(result.success).toBe(true);
    });
  });
});
