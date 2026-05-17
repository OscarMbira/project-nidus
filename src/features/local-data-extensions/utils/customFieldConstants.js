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

/** Maps integration targets to system_screens.screen_code (seed v517) */
export const ENTITY_SCREEN_CODES = {
  project: 'project_detail',
  risk: 'risk_detail',
  issue: 'issue_detail',
  change_request: 'change_request_detail',
}

export const ENTITY_TYPES = ['project', 'risk', 'issue', 'change_request']
