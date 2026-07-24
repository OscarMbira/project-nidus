import { describe, it, expect } from 'vitest';
import {
  isValidSimulatorRoleId,
  canAccessRoleForTier,
  getRolesForSubscriptionTier,
  ROLE_NPC_MAPPING,
} from '../../../../../packages/shared/src/constants/simulatorRoles.js';

describe('v734 role selection flow', () => {
  it('validates all five canonical role IDs', () => {
    const roles = [
      'project_manager',
      'programme_manager',
      'portfolio_manager',
      'pmo_analyst',
      'project_coordinator',
    ];
    roles.forEach((id) => expect(isValidSimulatorRoleId(id)).toBe(true));
    expect(isValidSimulatorRoleId('team_lead')).toBe(false);
  });

  it('gates roles by subscription tier', () => {
    expect(canAccessRoleForTier('project_coordinator', 'free')).toBe(true);
    expect(canAccessRoleForTier('portfolio_manager', 'free')).toBe(false);
    expect(canAccessRoleForTier('portfolio_manager', 'professional')).toBe(true);
    expect(getRolesForSubscriptionTier('basic').map((r) => r.id)).toContain('project_manager');
  });

  it('maps practice roles to NPC interaction sets', () => {
    expect(ROLE_NPC_MAPPING.project_manager).toContain('project_sponsor');
    expect(ROLE_NPC_MAPPING.pmo_analyst).toContain('quality_assurance');
  });
});
