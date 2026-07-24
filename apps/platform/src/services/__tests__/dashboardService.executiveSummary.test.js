import { describe, it, expect } from 'vitest';
import { bucketTaskExecutiveKey } from '../dashboardService';

describe('bucketTaskExecutiveKey', () => {
  it('buckets by embedded status_code', () => {
    expect(
      bucketTaskExecutiveKey({
        status_id: 'a',
        task_statuses: { status_code: 'todo', status_name: 'To Do' },
      })
    ).toBe('todo');
    expect(
      bucketTaskExecutiveKey({
        status_id: 'a',
        task_statuses: { status_code: 'in_progress', status_name: 'In Progress' },
      })
    ).toBe('inProgress');
    expect(
      bucketTaskExecutiveKey({
        status_id: 'a',
        task_statuses: { status_code: 'in_review', status_name: 'In Review' },
      })
    ).toBe('inProgress');
    expect(
      bucketTaskExecutiveKey({
        status_id: 'a',
        task_statuses: { status_code: 'completed', status_name: 'Completed' },
      })
    ).toBe('completed');
    expect(
      bucketTaskExecutiveKey({
        status_id: 'a',
        task_statuses: { status_code: 'cancelled', status_name: 'Cancelled' },
      })
    ).toBe('completed');
    expect(
      bucketTaskExecutiveKey({
        status_id: 'a',
        task_statuses: { status_code: 'blocked', status_name: 'Blocked' },
      })
    ).toBe('blocked');
  });

  it('uses statusLookupById when embed is missing', () => {
    const lookup = {
      sid: { status_code: 'blocked', status_name: 'Blocked' },
    };
    expect(
      bucketTaskExecutiveKey({ status_id: 'sid', task_statuses: null }, lookup)
    ).toBe('blocked');
  });

  it('falls back to status_name when code unknown', () => {
    expect(
      bucketTaskExecutiveKey({
        status_id: 'x',
        task_statuses: { status_code: 'custom', status_name: 'In Progress' },
      })
    ).toBe('inProgress');
  });
});
