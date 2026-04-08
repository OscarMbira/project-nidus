/**
 * Quality Activity Actions Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actionsService from '../qualityActivityActionsService';
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
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

describe('Quality Activity Actions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActions', () => {
    it('should fetch actions for a quality activity', async () => {
      const mockActions = [
        {
          id: 'action-1',
          activity_type: 'review',
          activity_id: 'activity-1',
          action_description: 'Fix critical bug',
          priority: 'high',
          status: 'open'
        }
      ];

      supabase.from().eq().eq().eq().order().order().order.mockResolvedValueOnce({
        data: mockActions,
        error: null
      });

      const result = await actionsService.getActions('review', 'activity-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockActions);
    });

    it('should filter actions by status', async () => {
      const mockActions = [
        {
          id: 'action-1',
          status: 'open'
        }
      ];

      supabase.from().eq().eq().eq().eq().order().order().order.mockResolvedValueOnce({
        data: mockActions,
        error: null
      });

      const result = await actionsService.getActions('review', 'activity-1', { status: 'open' });

      expect(result.success).toBe(true);
      expect(supabase.from().eq).toHaveBeenCalledWith('status', 'open');
    });
  });

  describe('addAction', () => {
    it('should add a new action item', async () => {
      const mockUser = { id: 'user-1' };
      const mockUserRecord = { id: 'internal-user-1' };

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser }
      });

      supabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: mockUserRecord
      });

      const mockAction = {
        id: 'action-1',
        action_description: 'Fix bug',
        priority: 'high',
        status: 'open'
      };

      supabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockAction,
        error: null
      });

      const actionData = {
        action_description: 'Fix bug',
        priority: 'high',
        action_type: 'corrective'
      };

      const result = await actionsService.addAction('review', 'activity-1', actionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAction);
    });
  });

  describe('completeAction', () => {
    it('should mark an action as completed', async () => {
      const mockUser = { id: 'user-1' };
      const mockUserRecord = { id: 'internal-user-1' };

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser }
      });

      supabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: mockUserRecord
      });

      const completedAction = {
        id: 'action-1',
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0]
      };

      supabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: completedAction,
        error: null
      });

      const result = await actionsService.completeAction('action-1', 'Task completed');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('completed');
    });
  });

  describe('verifyAction', () => {
    it('should verify a completed action', async () => {
      const mockUser = { id: 'user-1' };
      const mockUserRecord = { id: 'internal-user-1' };

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser }
      });

      supabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: mockUserRecord
      });

      const verifiedAction = {
        id: 'action-1',
        status: 'verified',
        verified_by_id: mockUserRecord.id
      };

      supabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: verifiedAction,
        error: null
      });

      const result = await actionsService.verifyAction('action-1', 'Verified as complete');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('verified');
    });
  });

  describe('getMyActions', () => {
    it('should fetch actions assigned to a user', async () => {
      const mockActions = [
        {
          id: 'action-1',
          assigned_to_id: 'user-1',
          status: 'open'
        }
      ];

      supabase.from().eq().eq().in().order().order.mockResolvedValueOnce({
        data: mockActions,
        error: null
      });

      const result = await actionsService.getMyActions('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockActions);
    });
  });
});
