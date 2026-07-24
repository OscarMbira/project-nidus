/**
 * Canonical simulator practice role definitions (v734).
 * Shared by Platform and Simulator apps via @nidus/shared.
 */

export const SIMULATOR_ROLES = {
  PROJECT_MANAGER: {
    id: 'project_manager',
    label: 'Project Manager',
    level: 'Advanced',
    icon: 'Briefcase',
    color: 'purple',
    dashboardPath: '/simulator/pm/dashboard',
    requiredTier: 'basic',
  },
  PROGRAMME_MANAGER: {
    id: 'programme_manager',
    label: 'Programme Manager',
    level: 'Expert',
    icon: 'Layers',
    color: 'orange',
    dashboardPath: '/simulator/programme/dashboard',
    requiredTier: 'professional',
  },
  PORTFOLIO_MANAGER: {
    id: 'portfolio_manager',
    label: 'Portfolio Manager',
    level: 'Expert',
    icon: 'PieChart',
    color: 'indigo',
    dashboardPath: '/simulator/portfolio/dashboard',
    requiredTier: 'professional',
  },
  PMO_ANALYST: {
    id: 'pmo_analyst',
    label: 'PMO Analyst',
    level: 'Intermediate',
    icon: 'ShieldCheck',
    color: 'teal',
    dashboardPath: '/simulator/pmo/dashboard',
    requiredTier: 'basic',
  },
  PROJECT_COORDINATOR: {
    id: 'project_coordinator',
    label: 'Project Coordinator',
    level: 'Beginner–Intermediate',
    icon: 'ClipboardList',
    color: 'green',
    dashboardPath: '/simulator/coordinator/dashboard',
    requiredTier: 'free',
  },
};

export const SIMULATOR_ROLE_IDS = Object.values(SIMULATOR_ROLES).map((r) => r.id);

export const SIMULATOR_ROLE_LIST = Object.values(SIMULATOR_ROLES);

export const LEGACY_SIMULATOR_ROLE_IDS = ['team_lead', 'team_member'];

export const ROLE_TIME_PROFILES = {
  project_coordinator: { granularity: 'weekly', defaultTurns: 12, typicalMonths: 3 },
  pmo_analyst: { granularity: 'monthly', defaultTurns: 12, typicalMonths: 12 },
  project_manager: { granularity: 'monthly', defaultTurns: 18, typicalMonths: 18 },
  programme_manager: { granularity: 'monthly', defaultTurns: 30, typicalMonths: 30 },
  portfolio_manager: { granularity: 'quarterly', defaultTurns: 10, typicalMonths: 30 },
};

export const SUBSCRIPTION_ROLE_ACCESS = {
  free: ['project_coordinator'],
  basic: ['project_coordinator', 'pmo_analyst', 'project_manager'],
  professional: SIMULATOR_ROLE_IDS,
  enterprise: SIMULATOR_ROLE_IDS,
};

export function getSimulatorRoleById(roleId) {
  return SIMULATOR_ROLE_LIST.find((r) => r.id === roleId) || null;
}

export function isValidSimulatorRoleId(roleId) {
  return SIMULATOR_ROLE_IDS.includes(roleId);
}

export function getRolesForSubscriptionTier(tier = 'free') {
  const key = String(tier || 'free').toLowerCase();
  const allowed = SUBSCRIPTION_ROLE_ACCESS[key] || SUBSCRIPTION_ROLE_ACCESS.free;
  return SIMULATOR_ROLE_LIST.filter((r) => allowed.includes(r.id));
}

export function canAccessRoleForTier(roleId, tier = 'free') {
  return getRolesForSubscriptionTier(tier).some((r) => r.id === roleId);
}

export const ROLE_NPC_MAPPING = {
  project_manager: ['team_member', 'team_manager', 'project_sponsor', 'quality_assurance', 'change_authority'],
  programme_manager: ['project_manager', 'project_sponsor', 'project_board_member', 'change_authority'],
  portfolio_manager: ['programme_manager', 'project_sponsor', 'project_board_member', 'change_authority'],
  pmo_analyst: ['project_manager', 'programme_manager', 'quality_assurance', 'project_assurance'],
  project_coordinator: ['project_manager', 'team_member', 'team_manager', 'quality_assurance'],
};
