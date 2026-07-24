/**
 * Quality Activity Records Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as recordsService from '../qualityActivityRecordsService';
import { supabase } from '../supabaseClient';

// Mock supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

describe('Quality Activity Records Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecords', () => {
    it('should fetch records for a quality activity', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          activity_type: 'review',
          activity_id: 'activity-1',
          record_type: 'test_plan',
          record_title: 'Test Plan Document',
          record_reference: 'TP-001'
        }
      ];

      supabase.from().eq().eq().order().order.mockResolvedValueOnce({
        data: mockRecords,
        error: null
      });

      const result = await recordsService.getRecords('review', 'activity-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecords);
      expect(supabase.from).toHaveBeenCalledWith('quality_activity_records');
    });

    it('should handle errors when fetching records', async () => {
      supabase.from().eq().eq().order().order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await recordsService.getRecords('review', 'activity-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('addRecord', () => {
    it('should add a new quality record', async () => {
      const mockUser = { id: 'user-1' };
      const mockUserRecord = { id: 'internal-user-1' };

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser }
      });

      supabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: mockUserRecord
      });

      const mockRecord = {
        id: 'record-1',
        activity_type: 'review',
        activity_id: 'activity-1',
        record_type: 'test_plan',
        record_title: 'Test Plan'
      };

      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockRecord,
        error: null
      });

      const recordData = {
        record_type: 'test_plan',
        record_title: 'Test Plan',
        record_reference: 'TP-001'
      };

      const result = await recordsService.addRecord('review', 'activity-1', recordData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
    });

    it('should require authentication', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null }
      });

      const result = await recordsService.addRecord('review', 'activity-1', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });
  });

  describe('updateRecord', () => {
    it('should update an existing record', async () => {
      const mockUser = { id: 'user-1' };
      const mockUserRecord = { id: 'internal-user-1' };

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser }
      });

      supabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: mockUserRecord
      });

      const updatedRecord = {
        id: 'record-1',
        record_title: 'Updated Test Plan'
      };

      supabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedRecord,
        error: null
      });

      const result = await recordsService.updateRecord('record-1', {
        record_title: 'Updated Test Plan'
      });

      expect(result.success).toBe(true);
      expect(result.data.record_title).toBe('Updated Test Plan');
    });
  });

  describe('deleteRecord', () => {
    it('should soft delete a record', async () => {
      const mockUser = { id: 'user-1' };
      const mockUserRecord = { id: 'internal-user-1' };

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser }
      });

      supabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: mockUserRecord
      });

      supabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      const result = await recordsService.deleteRecord('record-1');

      expect(result.success).toBe(true);
    });
  });
});
