import { describe, it, expect } from 'vitest';
import {
  getNpcRolesForUserRole,
  filterNpcEventTemplates,
} from '../npcRoleFilterService.js';
import { ROLE_NPC_MAPPING } from '@nidus/shared/constants/simulatorRoles';

describe('npcRoleFilterService', () => {
  it('returns NPC roles for each practice role', () => {
    expect(getNpcRolesForUserRole('project_manager')).toEqual(ROLE_NPC_MAPPING.project_manager);
    expect(getNpcRolesForUserRole('project_coordinator')).toEqual(ROLE_NPC_MAPPING.project_coordinator);
  });

  it('filters event templates for user role', () => {
    const templates = [
      { id: '1', target_role: 'project_manager' },
      { id: '2', target_role: 'programme_manager' },
      { id: '3', applicable_user_roles: ['project_manager'] },
    ];
    const filtered = filterNpcEventTemplates(templates, 'project_manager');
    expect(filtered.map((e) => e.id)).toEqual(['1', '3']);
  });
});
