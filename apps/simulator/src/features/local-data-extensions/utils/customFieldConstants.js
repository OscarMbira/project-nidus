/** Phase 11 — Local Data Extensions enums and routing helpers */

export const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  DEPRECATED: 'deprecated',
}

export const AUDIT_ACTIONS = {
  DEFINITION_CREATED: 'definition_created',
  DEFINITION_UPDATED: 'definition_updated',
  DEFINITION_PUBLISHED: 'definition_published',
  VALUE_UPSERTED: 'value_upserted',
  GROUP_INSTANCE_UPSERTED: 'group_instance_upserted',
  PERMISSION_UPDATED: 'permission_updated',
  SCREEN_MAP_CHANGED: 'screen_map_changed',
}

/** Maps integration targets to system_screens.screen_code (seed v517 / v788 / v1544) */
export const ENTITY_SCREEN_CODES = {
  project: 'project_detail',
  risk: 'risk_detail',
  risk_register: 'risk_register',
  issue: 'issue_detail',
  change_request: 'change_request_detail',
  /** Tier-inheritance / Settings screen (v794); classic LDE map stays change_request_detail */
  change_request_tier: 'change_request',
  work_package: 'work_package',
  project_mandate: 'mandate_detail',
  /** Default for project_brief; Charter export must pass screenCode: 'charter_detail' */
  project_brief: 'brief_detail',
  business_case: 'business_case_detail',
  pid: 'pid_detail',
  benefits_review_plan: 'benefits_review_plan_detail',
  team_charter: 'team_charter_detail',
  project_governance_structure: 'governance_structure_detail',
}

export const ENTITY_TYPES = [
  'project',
  'risk',
  'issue',
  'change_request',
  'work_package',
  'project_mandate',
  'project_brief',
  'business_case',
  'pid',
  'benefits_review_plan',
  'team_charter',
  'project_governance_structure',
]
