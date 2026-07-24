/**
 * Benefits Review Plan Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getBenefitsReviewPlan, 
  saveBenefitsReviewPlan,
  getOrCreatePlanForProject,
  requestApproval,
  recordApproval,
  getPlanBenefits,
  addBenefitToPlan
} from '../benefitsReviewPlanService';

// Mock Supabase and platformDb
const mockPlatformDb = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'test-plan-id',
              project_id: 'test-project-id',
              plan_title: 'Test Plan',
              status: 'draft',
              version_number: '1.0'
            }, 
            error: null 
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'test-plan-id' }, 
          error: null 
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'test-plan-id' }, 
            error: null 
          }))
        }))
      }))
    }))
  }))
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: { id: 'test-auth-user-id' } },
      error: null
    }))
  }
};

vi.mock('../supabaseClient', () => ({
  platformDb: mockPlatformDb,
  supabase: mockSupabase
}));

vi.mock('../benefitsReviewPlanNotificationService', () => ({
  notifyApprovalRequested: vi.fn(() => Promise.resolve({ success: true })),
  notifyApprovalDecision: vi.fn(() => Promise.resolve({ success: true })),
  notifyDistribution: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('../benefitsReviewPlanBusinessCaseService', () => ({
  autoLinkBusinessCase: vi.fn(() => Promise.resolve({ success: true }))
}));

describe('Benefits Review Plan Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBenefitsReviewPlan', () => {
    it('should retrieve a plan by ID', async () => {
      const planId = 'test-plan-id';
      const result = await getBenefitsReviewPlan(planId);
      
      expect(result).toBeDefined();
      expect(mockPlatformDb.from).toHaveBeenCalledWith('benefits_review_plans');
    });

    it('should handle errors when plan not found', async () => {
      mockPlatformDb.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Plan not found' }
      });

      await expect(getBenefitsReviewPlan('invalid-id')).rejects.toThrow();
    });
  });

  describe('saveBenefitsReviewPlan', () => {
    it('should create a new plan', async () => {
      const planData = {
        project_id: 'test-project-id',
        plan_title: 'New Plan',
        status: 'draft'
      };

      const result = await saveBenefitsReviewPlan(planData);
      expect(result).toBeDefined();
      expect(mockPlatformDb.from).toHaveBeenCalledWith('benefits_review_plans');
    });

    it('should update an existing plan', async () => {
      const planData = {
        plan_title: 'Updated Plan'
      };
      const planId = 'test-plan-id';

      const result = await saveBenefitsReviewPlan(planData, planId);
      expect(result).toBeDefined();
      expect(mockPlatformDb.from).toHaveBeenCalledWith('benefits_review_plans');
    });
  });

  describe('getOrCreatePlanForProject', () => {
    it('should return existing plan if found', async () => {
      mockPlatformDb.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { id: 'existing-plan-id' },
        error: null
      });

      const result = await getOrCreatePlanForProject('test-project-id');
      expect(result).toBeDefined();
      expect(result.id).toBe('existing-plan-id');
    });

    it('should create new plan if not found', async () => {
      // First call: no existing plan
      mockPlatformDb.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock project query
      mockPlatformDb.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { project_name: 'Test Project' },
              error: null
            }))
          }))
        }))
      });

      // Mock insert for new plan
      mockPlatformDb.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'new-plan-id' },
              error: null
            }))
          }))
        }))
      });

      const result = await getOrCreatePlanForProject('test-project-id');
      expect(result).toBeDefined();
    });
  });

  describe('requestApproval', () => {
    it('should create approval requests for approvers', async () => {
      const planId = 'test-plan-id';
      const approverIds = ['approver-1', 'approver-2'];

      // Mock user lookup
      mockPlatformDb.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'test-user-id' },
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock plan version lookup
      mockPlatformDb.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { version_number: '1.0' },
              error: null
            }))
          }))
        }))
      });

      // Mock approver lookups
      mockPlatformDb.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'approver-1', email: 'approver@test.com', full_name: 'Approver 1' },
              error: null
            }))
          }))
        }))
      });

      // Mock approval insert
      mockPlatformDb.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'approval-1' },
              error: null
            }))
          }))
        }))
      });

      // Mock plan status update
      mockPlatformDb.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      const result = await requestApproval(planId, approverIds);
      expect(result).toBeDefined();
    });
  });

  describe('recordApproval', () => {
    it('should record approval decision', async () => {
      const approvalId = 'test-approval-id';
      const status = 'approved';
      const comments = 'Looks good';

      // Mock user lookup
      mockPlatformDb.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'test-user-id' },
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock approval update
      mockPlatformDb.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: approvalId, review_plan_id: 'test-plan-id' },
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock all approvals check
      mockPlatformDb.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      });

      // Mock plan status update
      mockPlatformDb.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      const result = await recordApproval(approvalId, status, comments);
      expect(result).toBeDefined();
    });
  });

  describe('getPlanBenefits', () => {
    it('should retrieve benefits for a plan', async () => {
      const planId = 'test-plan-id';
      
      mockPlatformDb.from().select().eq().eq.mockReturnValue({
        order: vi.fn(() => Promise.resolve({
          data: [{ id: 'coverage-1', benefit_id: 'benefit-1' }],
          error: null
        }))
      });

      const result = await getPlanBenefits(planId);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('addBenefitToPlan', () => {
    it('should add a benefit to a plan', async () => {
      const planId = 'test-plan-id';
      const benefitId = 'test-benefit-id';
      const coverageData = {
        included_in_scope: true,
        priority: 'high'
      };

      // Mock user lookup
      mockPlatformDb.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'test-user-id' },
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock insert
      mockPlatformDb.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'coverage-id' },
              error: null
            }))
          }))
        }))
      });

      const result = await addBenefitToPlan(planId, benefitId, coverageData);
      expect(result).toBeDefined();
    });
  });
});
