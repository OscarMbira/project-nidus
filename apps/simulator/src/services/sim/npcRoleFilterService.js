/**
 * NPC filtering by user practice role (v734).
 */
import { ROLE_NPC_MAPPING } from '@nidus/shared/constants/simulatorRoles';

export function getNpcRolesForUserRole(userRole) {
  return ROLE_NPC_MAPPING[userRole] || ROLE_NPC_MAPPING.project_manager;
}

export function filterNpcCharacters(characters = [], userRole) {
  const allowed = new Set(getNpcRolesForUserRole(userRole));
  return characters.filter((c) => allowed.has(c.role_name) || allowed.has(c.role));
}

export function filterNpcEventTemplates(templates = [], userRole) {
  return templates.filter((t) => {
    if (Array.isArray(t.applicable_user_roles) && t.applicable_user_roles.length) {
      return t.applicable_user_roles.includes(userRole);
    }
    if (t.target_role && Object.values(ROLE_NPC_MAPPING).flat().includes(t.target_role)) {
      return getNpcRolesForUserRole(userRole).includes(t.emitting_role) || t.target_role === userRole;
    }
    return !t.target_role || t.target_role === userRole;
  });
}

export function tagEventTemplatesWithUserRoles(templates = []) {
  return templates.map((t) => ({
    ...t,
    applicable_user_roles: t.applicable_user_roles?.length
      ? t.applicable_user_roles
      : Object.entries(ROLE_NPC_MAPPING)
        .filter(([, npcs]) => npcs.includes(t.emitting_role))
        .map(([role]) => role),
  }));
}
