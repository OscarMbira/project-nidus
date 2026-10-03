import { describe, it, expect } from 'vitest';
import { sanitizeProjectSearchTerm, mergeMyPmProjectIds, mergeMyAssignedProjectIds } from '../projectService';

describe('sanitizeProjectSearchTerm', () => {
  it('trims and removes ilike metacharacters', () => {
    expect(sanitizeProjectSearchTerm('  te%st_one\\  ')).toBe('test one');
  });

  it('removes commas that break PostgREST or()', () => {
    expect(sanitizeProjectSearchTerm('a,b')).toBe('a b');
  });

  it('handles null/undefined', () => {
    expect(sanitizeProjectSearchTerm(null)).toBe('');
    expect(sanitizeProjectSearchTerm(undefined)).toBe('');
  });
});

describe('mergeMyPmProjectIds', () => {
  it('unions managed, PM membership, and project-scoped PM user_roles ids', () => {
    const ids = mergeMyPmProjectIds({
      managedRows: [{ id: 'p1' }],
      membershipRows: [
        { project_id: 'p2', role: { role_name: 'project_manager' } },
        { project_id: 'p3', role: { role_name: 'pm_team_member' } },
      ],
      userRoleRows: [
        { project_id: 'p4', roles: { role_name: 'programme_manager' } },
        { project_id: 'p5', roles: { role_name: 'account_owner' } },
      ],
    });
    expect(ids.sort()).toEqual(['p1', 'p2', 'p4']);
  });

  it('returns empty when nothing matches', () => {
    expect(mergeMyPmProjectIds({})).toEqual([]);
  });
});

describe('mergeMyAssignedProjectIds (v1179 — Timesheets any-role scope)', () => {
  it('unions managed, ANY membership role, and ANY project-scoped user_roles role — not just PM roles', () => {
    const ids = mergeMyAssignedProjectIds({
      managedRows: [{ id: 'p1' }],
      membershipRows: [
        { project_id: 'p2', role: { role_name: 'project_manager' } },
        { project_id: 'p3', role: { role_name: 'team_member' } },
      ],
      userRoleRows: [
        { project_id: 'p4', roles: { role_name: 'programme_manager' } },
        { project_id: 'p5', roles: { role_name: 'account_owner' } },
      ],
    });
    expect(ids.sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('dedupes when the same project appears via more than one source', () => {
    const ids = mergeMyAssignedProjectIds({
      managedRows: [{ id: 'p1' }],
      membershipRows: [{ project_id: 'p1', role: { role_name: 'team_member' } }],
      userRoleRows: [{ project_id: 'p1', roles: { role_name: 'team_member' } }],
    });
    expect(ids).toEqual(['p1']);
  });

  it('returns empty when nothing matches', () => {
    expect(mergeMyAssignedProjectIds({})).toEqual([]);
  });
});
