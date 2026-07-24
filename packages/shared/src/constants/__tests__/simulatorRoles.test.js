import { describe, it, expect } from 'vitest';
import {
  SIMULATOR_ROLES,
  SIMULATOR_ROLE_IDS,
  isValidSimulatorRoleId,
  getRolesForSubscriptionTier,
  canAccessRoleForTier,
  ROLE_NPC_MAPPING,
} from '../simulatorRoles.js';

describe('simulatorRoles', () => {
  it('defines exactly five canonical roles', () => {
    expect(SIMULATOR_ROLE_IDS).toHaveLength(5);
    expect(new Set(SIMULATOR_ROLE_IDS).size).toBe(5);
  });

  it('each role has required fields', () => {
    Object.values(SIMULATOR_ROLES).forEach((role) => {
      expect(role.id).toBeTruthy();
      expect(role.label).toBeTruthy();
      expect(role.level).toBeTruthy();
      expect(role.dashboardPath).toMatch(/^\/simulator\//);
      expect(role.requiredTier).toBeTruthy();
    });
  });

  it('validates role ids', () => {
    expect(isValidSimulatorRoleId('project_manager')).toBe(true);
    expect(isValidSimulatorRoleId('team_member')).toBe(false);
  });

  it('gates roles by subscription tier', () => {
    expect(canAccessRoleForTier('project_coordinator', 'free')).toBe(true);
    expect(canAccessRoleForTier('portfolio_manager', 'free')).toBe(false);
    expect(getRolesForSubscriptionTier('professional')).toHaveLength(5);
  });

  it('maps user roles to NPC interaction sets', () => {
    expect(ROLE_NPC_MAPPING.project_manager.length).toBeGreaterThan(0);
    expect(ROLE_NPC_MAPPING.pmo_analyst).toContain('quality_assurance');
  });
});
