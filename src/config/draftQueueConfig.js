/**
 * Draft Queue Configuration
 *
 * Entity type registry for the draft/hold queue system.
 * Defines routes, required fields, icons, and menu integration for all entity types.
 *
 * @version v201
 * @created 2026-01-31
 */

import {
  Folder,
  FileText,
  FileCheck,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  Package,
  Shield,
  MessageSquare,
  Settings,
  Layers,
  FileBarChart,
  Flag,
  Target,
  Users,
  GraduationCap
} from 'lucide-react';

// ============================================================================
// PLATFORM ENTITY TYPES
// ============================================================================

export const PLATFORM_ENTITY_TYPES = {
  // Core Project Entities
  project: {
    label: 'Project',
    labelPlural: 'Projects',
    icon: Folder,
    createRoute: '/app/projects/create',
    editRoute: (id) => `/app/projects/${id}/edit`,
    holdQueueRoute: '/app/projects/on-hold',
    titleField: 'project_name',
    requiredFields: ['project_name', 'project_description', 'project_manager_id'],
    defaultExpiryDays: 14,
    menuParent: 'projects',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  project_brief: {
    label: 'Project Brief',
    labelPlural: 'Project Briefs',
    icon: FileText,
    createRoute: '/app/briefs/create',
    editRoute: (id) => `/app/briefs/${id}/edit`,
    holdQueueRoute: '/app/briefs/on-hold',
    titleField: 'brief_title',
    requiredFields: ['brief_title', 'project_definition', 'project_objectives'],
    defaultExpiryDays: 14,
    menuParent: 'briefs',
    roles: ['pmo_admin', 'project_manager']
  },

  rfp: {
    label: 'RFP Document',
    labelPlural: 'RFP Documents',
    icon: FileSpreadsheet,
    createRoute: '/pmo/rfp/create',
    editRoute: (id) => `/pmo/rfp/${id}/edit`,
    holdQueueRoute: '/pmo/rfp/on-hold',
    titleField: 'rfp_title',
    requiredFields: ['rfp_title', 'service_provider_name'],
    defaultExpiryDays: 14,
    menuParent: 'procurement',
    roles: ['pmo_admin']
  },

  project_mandate: {
    label: 'Project Mandate',
    labelPlural: 'Project Mandates',
    icon: FileCheck,
    createRoute: '/app/mandates/create',
    editRoute: (id) => `/app/mandates/${id}/edit`,
    holdQueueRoute: '/app/mandates/on-hold',
    titleField: 'mandate_title',
    requiredFields: ['mandate_title', 'purpose', 'background'],
    defaultExpiryDays: 14,
    menuParent: 'mandates',
    roles: ['pmo_admin', 'project_manager']
  },

  // Benefits Management
  benefit: {
    label: 'Benefit',
    labelPlural: 'Benefits',
    icon: TrendingUp,
    createRoute: '/platform/benefits/create',
    editRoute: (id) => `/platform/benefits/${id}/edit`,
    holdQueueRoute: '/app/benefits/on-hold',
    titleField: 'benefit_name',
    requiredFields: ['benefit_name', 'benefit_type', 'owner_id'],
    defaultExpiryDays: 14,
    menuParent: 'benefits',
    roles: ['pmo_admin', 'project_manager', 'business_analyst']
  },

  benefits_review_plan: {
    label: 'Benefits Review Plan',
    labelPlural: 'Benefits Review Plans',
    icon: Target,
    createRoute: '/app/benefits-review-plans/create',
    editRoute: (id) => `/app/benefits-review-plans/${id}/edit`,
    holdQueueRoute: '/app/benefits-review-plans/on-hold',
    titleField: 'plan_name',
    requiredFields: ['plan_name', 'review_schedule'],
    defaultExpiryDays: 14,
    menuParent: 'benefits',
    roles: ['pmo_admin', 'project_manager']
  },

  // Management Strategies
  qms: {
    label: 'Quality Management Strategy',
    labelPlural: 'Quality Management Strategies',
    icon: CheckSquare,
    createRoute: '/app/qms/create',
    editRoute: (id) => `/app/qms/${id}/edit`,
    holdQueueRoute: '/app/qms/on-hold',
    titleField: 'strategy_name',
    requiredFields: ['strategy_name', 'quality_standards'],
    defaultExpiryDays: 21,
    menuParent: 'strategies',
    roles: ['pmo_admin', 'project_manager']
  },

  rms: {
    label: 'Risk Management Strategy',
    labelPlural: 'Risk Management Strategies',
    icon: Shield,
    createRoute: '/app/rms/create',
    editRoute: (id) => `/app/rms/${id}/edit`,
    holdQueueRoute: '/app/rms/on-hold',
    titleField: 'strategy_name',
    requiredFields: ['strategy_name', 'risk_tolerance'],
    defaultExpiryDays: 21,
    menuParent: 'strategies',
    roles: ['pmo_admin', 'project_manager']
  },

  cms: {
    label: 'Communication Management Strategy',
    labelPlural: 'Communication Management Strategies',
    icon: MessageSquare,
    createRoute: '/app/cms/create',
    editRoute: (id) => `/app/cms/${id}/edit`,
    holdQueueRoute: '/app/cms/on-hold',
    titleField: 'strategy_name',
    requiredFields: ['strategy_name', 'communication_methods'],
    defaultExpiryDays: 21,
    menuParent: 'strategies',
    roles: ['pmo_admin', 'project_manager']
  },

  configuration_ms: {
    label: 'Configuration Management Strategy',
    labelPlural: 'Configuration Management Strategies',
    icon: Settings,
    createRoute: '/app/configuration-ms/create',
    editRoute: (id) => `/app/configuration-ms/${id}/edit`,
    holdQueueRoute: '/app/configuration-ms/on-hold',
    titleField: 'strategy_name',
    requiredFields: ['strategy_name', 'configuration_items'],
    defaultExpiryDays: 21,
    menuParent: 'strategies',
    roles: ['pmo_admin', 'project_manager']
  },

  configuration_item: {
    label: 'Configuration Item',
    labelPlural: 'Configuration Items',
    icon: Layers,
    createRoute: '/app/configuration-items/create',
    editRoute: (id) => `/app/configuration-items/${id}/edit`,
    holdQueueRoute: '/app/configuration-items/on-hold',
    titleField: 'item_name',
    requiredFields: ['item_name', 'item_type', 'owner_id'],
    defaultExpiryDays: 14,
    menuParent: 'configuration',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  // Registers
  issue: {
    label: 'Issue',
    labelPlural: 'Issues',
    icon: AlertTriangle,
    createRoute: '/app/issues/create',
    editRoute: (id) => `/app/issues/${id}/edit`,
    holdQueueRoute: '/app/issues/on-hold',
    titleField: 'issue_title',
    requiredFields: ['issue_title', 'severity', 'assigned_to'],
    defaultExpiryDays: 7, // Issues expire faster
    menuParent: 'issues',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  issue_report: {
    label: 'Issue Report',
    labelPlural: 'Issue Reports',
    icon: FileBarChart,
    createRoute: '/app/issue-reports/create',
    editRoute: (id) => `/app/issue-reports/${id}/edit`,
    holdQueueRoute: '/app/issue-reports/on-hold',
    titleField: 'report_title',
    requiredFields: ['report_title', 'issue_id'],
    defaultExpiryDays: 7,
    menuParent: 'issues',
    roles: ['pmo_admin', 'project_manager']
  },

  risk: {
    label: 'Risk',
    labelPlural: 'Risks',
    icon: AlertCircle,
    createRoute: '/app/risks/create',
    editRoute: (id) => `/app/risks/${id}/edit`,
    holdQueueRoute: '/app/risks/on-hold',
    titleField: 'risk_title',
    requiredFields: ['risk_title', 'probability', 'impact'],
    defaultExpiryDays: 14,
    menuParent: 'risks',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  daily_log: {
    label: 'Daily Log Entry',
    labelPlural: 'Daily Log Entries',
    icon: Calendar,
    createRoute: '/app/daily-log/create',
    editRoute: (id) => `/app/daily-log/${id}/edit`,
    holdQueueRoute: '/app/daily-log/on-hold',
    titleField: 'entry_title',
    requiredFields: ['log_date', 'entry_type'],
    defaultExpiryDays: 7,
    menuParent: 'daily_log',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  lessons_log: {
    label: 'Lesson',
    labelPlural: 'Lessons',
    icon: BookOpen,
    createRoute: '/app/lessons/create',
    editRoute: (id) => `/app/lessons/${id}/edit`,
    holdQueueRoute: '/app/lessons/on-hold',
    titleField: 'lesson_title',
    requiredFields: ['lesson_title', 'category'],
    defaultExpiryDays: 14,
    menuParent: 'lessons',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  lessons_report: {
    label: 'Lessons Report',
    labelPlural: 'Lessons Reports',
    icon: FileBarChart,
    createRoute: '/app/lessons-reports/create',
    editRoute: (id) => `/app/lessons-reports/${id}/edit`,
    holdQueueRoute: '/app/lessons-reports/on-hold',
    titleField: 'report_title',
    requiredFields: ['report_title', 'period_start', 'period_end'],
    defaultExpiryDays: 21,
    menuParent: 'lessons',
    roles: ['pmo_admin', 'project_manager']
  },

  quality: {
    label: 'Quality Activity',
    labelPlural: 'Quality Activities',
    icon: CheckSquare,
    createRoute: '/app/quality/create',
    editRoute: (id) => `/app/quality/${id}/edit`,
    holdQueueRoute: '/app/quality/on-hold',
    titleField: 'activity_name',
    requiredFields: ['activity_name', 'quality_method'],
    defaultExpiryDays: 14,
    menuParent: 'quality',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  // Documents
  work_package: {
    label: 'Work Package',
    labelPlural: 'Work Packages',
    icon: Package,
    createRoute: '/app/work-packages/create',
    editRoute: (id) => `/app/work-packages/${id}/edit`,
    holdQueueRoute: '/app/work-packages/on-hold',
    titleField: 'package_name',
    requiredFields: ['package_name', 'description', 'assigned_to'],
    defaultExpiryDays: 14,
    menuParent: 'work_packages',
    roles: ['pmo_admin', 'project_manager', 'team_lead']
  },

  product_description: {
    label: 'Product Description',
    labelPlural: 'Product Descriptions',
    icon: ClipboardList,
    createRoute: '/app/product-descriptions/create',
    editRoute: (id) => `/app/product-descriptions/${id}/edit`,
    holdQueueRoute: '/app/product-descriptions/on-hold',
    titleField: 'product_name',
    requiredFields: ['product_name', 'purpose', 'composition'],
    defaultExpiryDays: 14,
    menuParent: 'products',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },

  product_status_account: {
    label: 'Product Status Account',
    labelPlural: 'Product Status Accounts',
    icon: ClipboardList,
    createRoute: '/app/psa/create',
    editRoute: (id) => `/app/psa/${id}/edit`,
    holdQueueRoute: '/app/psa/on-hold',
    titleField: 'product_name',
    requiredFields: ['product_id', 'status'],
    defaultExpiryDays: 14,
    menuParent: 'products',
    roles: ['pmo_admin', 'project_manager']
  },

  pid: {
    label: 'Project Initiation Document',
    labelPlural: 'Project Initiation Documents',
    icon: FileText,
    createRoute: '/app/pid/create',
    editRoute: (id) => `/app/pid/${id}/edit`,
    holdQueueRoute: '/app/pid/on-hold',
    titleField: 'document_title',
    requiredFields: ['document_title', 'project_definition'],
    defaultExpiryDays: 21,
    menuParent: 'pid',
    roles: ['pmo_admin', 'project_manager']
  },

  plan: {
    label: 'Plan',
    labelPlural: 'Plans',
    icon: ClipboardList,
    createRoute: '/app/plans/create',
    editRoute: (id) => `/app/plans/${id}/edit`,
    holdQueueRoute: '/app/plans/on-hold',
    titleField: 'plan_name',
    requiredFields: ['plan_name', 'plan_type'],
    defaultExpiryDays: 21,
    menuParent: 'plans',
    roles: ['pmo_admin', 'project_manager']
  },

  // Reports
  checkpoint_report: {
    label: 'Checkpoint Report',
    labelPlural: 'Checkpoint Reports',
    icon: Flag,
    createRoute: '/app/checkpoint-reports/create',
    editRoute: (id) => `/app/checkpoint-reports/${id}/edit`,
    holdQueueRoute: '/app/checkpoint-reports/on-hold',
    titleField: 'report_title',
    requiredFields: ['report_title', 'period_start', 'period_end'],
    defaultExpiryDays: 14,
    menuParent: 'reports',
    roles: ['pmo_admin', 'project_manager', 'team_lead']
  },

  end_stage_report: {
    label: 'End Stage Report',
    labelPlural: 'End Stage Reports',
    icon: FileBarChart,
    createRoute: '/app/end-stage-reports/create',
    editRoute: (id) => `/app/end-stage-reports/${id}/edit`,
    holdQueueRoute: '/app/end-stage-reports/on-hold',
    titleField: 'report_title',
    requiredFields: ['report_title', 'stage_name'],
    defaultExpiryDays: 21,
    menuParent: 'reports',
    roles: ['pmo_admin', 'project_manager']
  },

  end_project_report: {
    label: 'End Project Report',
    labelPlural: 'End Project Reports',
    icon: FileBarChart,
    createRoute: '/app/end-project-reports/create',
    editRoute: (id) => `/app/end-project-reports/${id}/edit`,
    holdQueueRoute: '/app/end-project-reports/on-hold',
    titleField: 'report_title',
    requiredFields: ['report_title'],
    defaultExpiryDays: 30,
    menuParent: 'reports',
    roles: ['pmo_admin', 'project_manager']
  },

  exception_report: {
    label: 'Exception Report',
    labelPlural: 'Exception Reports',
    icon: AlertTriangle,
    createRoute: '/app/exception-reports/create',
    editRoute: (id) => `/app/exception-reports/${id}/edit`,
    holdQueueRoute: '/app/exception-reports/on-hold',
    titleField: 'report_title',
    requiredFields: ['report_title', 'exception_type'],
    defaultExpiryDays: 7,
    menuParent: 'reports',
    roles: ['pmo_admin', 'project_manager']
  },

  highlight_report: {
    label: 'Highlight Report',
    labelPlural: 'Highlight Reports',
    icon: FileBarChart,
    createRoute: '/app/highlight-reports/create',
    editRoute: (id) => `/app/highlight-reports/${id}/edit`,
    holdQueueRoute: '/app/highlight-reports/on-hold',
    titleField: 'report_title',
    requiredFields: ['report_title', 'period_start', 'period_end'],
    defaultExpiryDays: 14,
    menuParent: 'reports',
    roles: ['pmo_admin', 'project_manager']
  },

  stakeholder: {
    label: 'Stakeholder',
    labelPlural: 'Stakeholders',
    icon: Users,
    createRoute: '/platform/stakeholders/register/new',
    editRoute: (id) => `/platform/stakeholders/register/edit/${id}`,
    holdQueueRoute: '/platform/stakeholders/on-hold',
    titleField: 'stakeholder_name',
    requiredFields: ['stakeholder_name'],
    defaultExpiryDays: 14,
    menuParent: 'stakeholders',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  }
};

// ============================================================================
// SIMULATOR ENTITY TYPES
// ============================================================================

export const SIMULATOR_ENTITY_TYPES = {
  sim_project: {
    label: 'Practice Project',
    labelPlural: 'Practice Projects',
    icon: GraduationCap,
    createRoute: '/simulator/practice/projects/create',
    editRoute: (id) => `/simulator/practice/projects/${id}/edit`,
    holdQueueRoute: '/simulator/practice/projects/on-hold',
    titleField: 'project_name',
    requiredFields: ['project_name', 'scenario_id'],
    defaultExpiryDays: 14,
    menuParent: 'practice_projects',
    roles: ['simulator_user']
  },

  sim_benefit: {
    label: 'Practice Benefit',
    labelPlural: 'Practice Benefits',
    icon: TrendingUp,
    createRoute: '/simulator/benefits/create',
    editRoute: (id) => `/simulator/benefits/${id}/edit`,
    holdQueueRoute: '/simulator/benefits/on-hold',
    titleField: 'benefit_name',
    requiredFields: ['benefit_name', 'benefit_type'],
    defaultExpiryDays: 14,
    menuParent: 'practice_benefits',
    roles: ['simulator_user']
  },

  sim_issue: {
    label: 'Practice Issue',
    labelPlural: 'Practice Issues',
    icon: AlertTriangle,
    createRoute: '/simulator/practice/issues/create',
    editRoute: (id) => `/simulator/practice/issues/${id}/edit`,
    holdQueueRoute: '/simulator/practice/issues/on-hold',
    titleField: 'issue_title',
    requiredFields: ['issue_title', 'severity'],
    defaultExpiryDays: 7,
    menuParent: 'practice_issues',
    roles: ['simulator_user']
  },

  sim_risk: {
    label: 'Practice Risk',
    labelPlural: 'Practice Risks',
    icon: AlertCircle,
    createRoute: '/simulator/practice/risks/create',
    editRoute: (id) => `/simulator/practice/risks/${id}/edit`,
    holdQueueRoute: '/simulator/practice/risks/on-hold',
    titleField: 'risk_title',
    requiredFields: ['risk_title', 'probability', 'impact'],
    defaultExpiryDays: 14,
    menuParent: 'practice_risks',
    roles: ['simulator_user']
  },

  practice_stakeholder: {
    label: 'Practice Stakeholder',
    labelPlural: 'Practice Stakeholders',
    icon: Users,
    createRoute: '/simulator/practice-stakeholders/create',
    editRoute: (id) => `/simulator/practice-stakeholders/register?edit=${id}`,
    holdQueueRoute: '/simulator/practice-stakeholders/on-hold',
    titleField: 'stakeholder_name',
    requiredFields: ['stakeholder_name'],
    defaultExpiryDays: 14,
    menuParent: 'practice_stakeholders',
    roles: ['simulator_user']
  }
};

// ============================================================================
// ALL ENTITY TYPES (Combined)
// ============================================================================

export const DRAFT_ENTITY_TYPES = {
  ...PLATFORM_ENTITY_TYPES,
  ...SIMULATOR_ENTITY_TYPES
};

// ============================================================================
// ENTITY CATEGORIES (For grouping in admin/overview)
// ============================================================================

export const ENTITY_CATEGORIES = {
  core: ['project', 'project_brief', 'project_mandate'],
  benefits: ['benefit', 'benefits_review_plan'],
  strategy: ['qms', 'rms', 'cms', 'configuration_ms'],
  configuration: ['configuration_item'],
  registers: ['issue', 'risk', 'daily_log', 'lessons_log', 'quality'],
  documents: ['work_package', 'product_description', 'product_status_account', 'pid', 'plan'],
  reports: [
    'checkpoint_report',
    'end_stage_report',
    'end_project_report',
    'exception_report',
    'highlight_report',
    'issue_report',
    'lessons_report'
  ],
  simulator: ['sim_project', 'sim_benefit', 'sim_issue', 'sim_risk', 'practice_stakeholder'],
  stakeholders: ['stakeholder']
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get entity configuration by type
 *
 * @param {string} entityType - Entity type key
 * @returns {object|null} Entity configuration or null
 */
export function getEntityConfig(entityType) {
  return DRAFT_ENTITY_TYPES[entityType] || null;
}

/**
 * Get all platform entity types
 *
 * @returns {object} Platform entity types
 */
export function getPlatformEntityTypes() {
  return PLATFORM_ENTITY_TYPES;
}

/**
 * Get all simulator entity types
 *
 * @returns {object} Simulator entity types
 */
export function getSimulatorEntityTypes() {
  return SIMULATOR_ENTITY_TYPES;
}

/**
 * Check if entity type is a simulator entity
 *
 * @param {string} entityType - Entity type key
 * @returns {boolean} True if simulator entity
 */
export function isSimulatorEntity(entityType) {
  return entityType?.startsWith('sim_') || false;
}

/**
 * Get entity category
 *
 * @param {string} entityType - Entity type key
 * @returns {string|null} Category name or null
 */
export function getEntityCategory(entityType) {
  for (const [category, types] of Object.entries(ENTITY_CATEGORIES)) {
    if (types.includes(entityType)) {
      return category;
    }
  }
  return null;
}

/**
 * Get entity types by category
 *
 * @param {string} category - Category name
 * @returns {array} Array of entity type keys
 */
export function getEntityTypesByCategory(category) {
  return ENTITY_CATEGORIES[category] || [];
}

/**
 * Get hold queue route for entity type
 *
 * @param {string} entityType - Entity type key
 * @returns {string|null} Hold queue route or null
 */
export function getHoldQueueRoute(entityType) {
  const config = getEntityConfig(entityType);
  return config?.holdQueueRoute || null;
}

/**
 * Get create route for entity type
 *
 * @param {string} entityType - Entity type key
 * @returns {string|null} Create route or null
 */
export function getCreateRoute(entityType) {
  const config = getEntityConfig(entityType);
  return config?.createRoute || null;
}

/**
 * Get edit route for entity type
 *
 * @param {string} entityType - Entity type key
 * @param {string} entityId - Entity ID
 * @returns {string|null} Edit route or null
 */
export function getEditRoute(entityType, entityId) {
  const config = getEntityConfig(entityType);
  if (!config?.editRoute) return null;
  return typeof config.editRoute === 'function'
    ? config.editRoute(entityId)
    : config.editRoute;
}

/**
 * Get icon component for entity type
 *
 * @param {string} entityType - Entity type key
 * @returns {Component|null} Icon component or null
 */
export function getEntityIcon(entityType) {
  const config = getEntityConfig(entityType);
  return config?.icon || Folder;
}

/**
 * Get label for entity type
 *
 * @param {string} entityType - Entity type key
 * @param {boolean} plural - Whether to return plural form
 * @returns {string} Entity label
 */
export function getEntityLabel(entityType, plural = false) {
  const config = getEntityConfig(entityType);
  if (!config) return entityType;
  return plural ? config.labelPlural : config.label;
}

export default {
  DRAFT_ENTITY_TYPES,
  PLATFORM_ENTITY_TYPES,
  SIMULATOR_ENTITY_TYPES,
  ENTITY_CATEGORIES,
  getEntityConfig,
  getPlatformEntityTypes,
  getSimulatorEntityTypes,
  isSimulatorEntity,
  getEntityCategory,
  getEntityTypesByCategory,
  getHoldQueueRoute,
  getCreateRoute,
  getEditRoute,
  getEntityIcon,
  getEntityLabel
};
