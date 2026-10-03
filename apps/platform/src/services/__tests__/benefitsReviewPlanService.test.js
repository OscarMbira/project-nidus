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

// Each query consumes the next result queued by the test, in the order the service issues them.
// Unqueued queries fall back to a benign success result.
const { mockPlatformDb, mockSupabase } = vi.hoisted(() => {
  const queue = [];
  const fallback = { data: { id: 'test-plan-id' }, error: null };
  const nextResult = () => {
    const item = queue.length ? queue.shift() : fallback;
    if (item && item.__reject) return Promise.reject(item.__reject);
    return Promise.resolve(item);
  };
  const makeBuilder = () => {
    const builder = {};
    const chainable = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'in', 'is', 'gt', 'gte', 'lt', 'lte',
      'order', 'limit', 'range', 'or', 'not', 'filter', 'match'
    ];
    chainable.forEach((method) => {
      builder[method] = vi.fn(() => builder);
    });
    builder.single = vi.fn(() => nextResult());
    builder.maybeSingle = vi.fn(() => nextResult());
    builder.then = (resolve, reject) => nextResult().then(resolve, reject);
    return builder;
  };

  return {
    mockPlatformDb: {
      queue,
      from: vi.fn(() => makeBuilder())
    },
    mockSupabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({
          data: { user: { id: 'test-auth-user-id' } },
          error: null
        }))
      }
    }
  };
});

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

const queueResult = (result) => mockPlatformDb.queue.push(result);
const queueReject = (error) => mockPlatformDb.queue.push({ __reject: error });

describe('Benefits Review Plan Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatformDb.queue.length = 0;
  });

  describe('getBenefitsReviewPlan', () => {
    it('should retrieve a plan by ID', async () => {
      const planId = 'test-plan-id';
      queueResult({ data: { id: planId, plan_title: 'Test Plan' }, error: null });

      const result = await getBenefitsReviewPlan(planId);

      expect(result).toBeDefined();
      expect(mockPlatformDb.from).toHaveBeenCalledWith('benefits_review_plans');
    });

    it('should handle errors when plan not found', async () => {
      queueResult({ data: null, error: { message: 'Plan not found' } });

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

      const result = await saveBenefitsReviewPlan(planData, 'test-plan-id');

      expect(result).toBeDefined();
      expect(mockPlatformDb.from).toHaveBeenCalledWith('benefits_review_plans');
    });
  });

  describe('getOrCreatePlanForProject', () => {
    it('should return existing plan if found', async () => {
      queueResult({ data: { id: 'existing-plan-id' }, error: null });

      const result = await getOrCreatePlanForProject('test-project-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('existing-plan-id');
    });

    it('should create new plan if not found', async () => {
      queueResult({ data: null, error: { code: 'PGRST116' } });
      queueResult({ data: { id: 'user-record-id' }, error: null });
      queueResult({ data: { project_name: 'Test Project' }, error: null });
      queueResult({ data: { id: 'new-plan-id' }, error: null });

      const result = await getOrCreatePlanForProject('test-project-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('new-plan-id');
    });
  });

  describe('requestApproval', () => {
    it('should create approval requests for approvers', async () => {
      const planId = 'test-plan-id';
      const approverIds = ['approver-1', 'approver-2'];

      queueResult({ data: { id: 'test-user-id' }, error: null });
      queueResult({ data: { version_number: '1.0' }, error: null });
      queueResult({ data: { id: 'approver-1', email: 'approver@test.com', full_name: 'Approver 1' }, error: null });
      queueResult({ data: { id: 'approver-2', email: 'approver2@test.com', full_name: 'Approver 2' }, error: null });
      queueResult({ data: { id: 'approval-1' }, error: null });
      queueResult({ data: { id: 'approval-2' }, error: null });
      queueResult({ error: null });

      const result = await requestApproval(planId, approverIds);

      expect(result).toBeDefined();
    });
  });

  describe('recordApproval', () => {
    it('should record approval decision', async () => {
      const approvalId = 'test-approval-id';
      const status = 'approved';
      const comments = 'Looks good';

      queueResult({ data: { id: 'test-user-id' }, error: null });
      queueResult({ data: { id: approvalId, review_plan_id: 'test-plan-id' }, error: null });
      queueResult({ data: { id: approvalId, review_plan_id: 'test-plan-id' }, error: null });
      queueResult({ data: [], error: null });
      queueResult({ error: null });

      const result = await recordApproval(approvalId, status, comments);

      expect(result).toBeDefined();
    });
  });

  describe('getPlanBenefits', () => {
    it('should retrieve benefits for a plan', async () => {
      const planId = 'test-plan-id';
      queueResult({ data: [{ id: 'coverage-1', benefit_id: 'benefit-1' }], error: null });

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

      queueResult({ data: { id: 'test-user-id' }, error: null });
      queueResult({ data: { id: 'coverage-id' }, error: null });

      const result = await addBenefitToPlan(planId, benefitId, coverageData);

      expect(result).toBeDefined();
    });
  });
});
