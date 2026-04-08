/**
 * Unit tests for Stakeholder Service (importStakeholders and related)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importStakeholders, pickStakeholderWritePayload } from '../stakeholderService';

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(),
    })),
  })),
}));

vi.mock('../supabaseClient', () => ({
  platformDb: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'auth-user-1' } } },
        error: null,
      }),
    },
    from: vi.fn((table) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'platform-user-1' },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (table !== 'stakeholders') return mockFrom(table);
      return {
        insert: vi.fn((data) => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              if (data.stakeholder_name === 'Fail Me') {
                return Promise.reject(new Error('DB error'));
              }
              return Promise.resolve({
                data: { id: 'stakeholder-1', ...data },
                error: null,
              });
            }),
          })),
        })),
      };
    }),
  },
}));

describe('stakeholderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pickStakeholderWritePayload', () => {
    it('keeps only known columns and maps empty UUID-like strings to null', () => {
      const raw = {
        stakeholder_name: 'Test',
        project_id: '',
        reports_to_stakeholder_id: '',
        nested: { no: 'pe' },
        time_zone: 'x'.repeat(120),
      };
      const out = pickStakeholderWritePayload(raw);
      expect(out.stakeholder_name).toBe('Test');
      expect(out.project_id).toBeNull();
      expect(out.reports_to_stakeholder_id).toBeNull();
      expect(out.nested).toBeUndefined();
      expect(out.time_zone).toHaveLength(100);
    });
  });

  describe('importStakeholders', () => {
    it('returns empty created and failed when rows is empty', async () => {
      const result = await importStakeholders([], {});
      expect(result.created).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('skips rows without stakeholder_name and adds to failed', async () => {
      const result = await importStakeholders(
        [
          { stakeholder_name: '' },
          { name: '' },
          {},
        ],
        {}
      );
      expect(result.created).toHaveLength(0);
      expect(result.failed).toHaveLength(3);
      expect(result.failed.every((f) => f.error === 'Missing stakeholder_name')).toBe(true);
    });

    it('uses name as fallback when stakeholder_name is missing', async () => {
      const result = await importStakeholders(
        [{ name: 'Jane Doe' }],
        { projectId: 'proj-1' }
      );
      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(result.created[0].stakeholder_name).toBe('Jane Doe');
    });

    it('maps alternative field names (title, organization, role, status)', async () => {
      const result = await importStakeholders(
        [
          {
            stakeholder_name: 'Alice',
            title: 'Director',
            organization: 'Acme',
            role: 'Sponsor',
            status: 'active',
          },
        ],
        {}
      );
      expect(result.created).toHaveLength(1);
      expect(result.created[0].stakeholder_title).toBe('Director');
      expect(result.created[0].stakeholder_organization).toBe('Acme');
      expect(result.created[0].project_role).toBe('Sponsor');
      expect(result.created[0].stakeholder_status).toBe('active');
    });

    it('passes projectId when provided', async () => {
      const result = await importStakeholders(
        [{ stakeholder_name: 'Bob' }],
        { projectId: 'proj-99' }
      );
      expect(result.created).toHaveLength(1);
      expect(result.created[0].project_id).toBe('proj-99');
    });

    it('uses null project_id when projectId is not provided (unassigned import)', async () => {
      const result = await importStakeholders(
        [{ stakeholder_name: 'Unassigned' }],
        {}
      );
      expect(result.created).toHaveLength(1);
      expect(result.created[0].project_id).toBeNull();
    });

    it('adds failed row when saveStakeholder throws', async () => {
      const result = await importStakeholders(
        [
          { stakeholder_name: 'Good' },
          { stakeholder_name: 'Fail Me' },
          { stakeholder_name: 'Also Good' },
        ],
        {}
      );
      expect(result.created).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].row.stakeholder_name).toBe('Fail Me');
      expect(result.failed[0].error).toBe('DB error');
    });
  });
});
