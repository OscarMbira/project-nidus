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

// Every query builder records nothing itself: each query consumes the next result queued by the
// test, in the order the service issues them (terminal .single(), or awaiting the builder).
const mockPlatformDb = vi.hoisted(() => {
  const queue = [];
  const nextResult = () => {
    const item = queue.length ? queue.shift() : { data: null, error: null };
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
    queue,
    from: vi.fn(() => makeBuilder()),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  };
});

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: mockPlatformDb
}));

const queueResult = (result) => mockPlatformDb.queue.push(result);
const queueReject = (error) => mockPlatformDb.queue.push({ __reject: error });

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
    mockPlatformDb.queue.length = 0;
    mockPlatformDb.auth.getUser.mockResolvedValue({
      data: { user: mockUser }
    });
  });

  describe('getTemplates', () => {
    it('should fetch templates for account', async () => {
      const mockTemplates = [mockTemplate];
      queueResult({ data: mockTemplates, error: null });

      const result = await getTemplates('account-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplates);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should fetch default template', async () => {
      queueResult({ data: mockTemplate, error: null });

      const result = await getDefaultTemplate('account-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
    });

    it('should return null if no default template', async () => {
      queueResult({ data: null, error: { code: 'PGRST116' } });

      const result = await getDefaultTemplate('account-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      queueResult({ data: mockUserData, error: null });
      queueResult({ data: mockTemplate, error: null });

      const result = await createTemplate('account-123', {
        template_name: 'Test Template'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      queueResult({ data: mockUserData, error: null });
      queueResult({ data: { ...mockTemplate, template_name: 'Updated Name' }, error: null });

      const result = await updateTemplate('template-123', {
        template_name: 'Updated Name'
      });

      expect(result.success).toBe(true);
      expect(result.data.template_name).toBe('Updated Name');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      queueResult({ data: mockUserData, error: null });
      queueResult({ error: null });

      const result = await deleteTemplate('template-123');

      expect(result.success).toBe(true);
    });
  });

  describe('setAsDefault', () => {
    it('should set template as default', async () => {
      queueResult({ data: { account_id: 'account-123' }, error: null });
      queueResult({ data: mockUserData, error: null });
      queueResult({ data: mockTemplate, error: null });

      const result = await setAsDefault('template-123');

      expect(result.success).toBe(true);
    });
  });
});
