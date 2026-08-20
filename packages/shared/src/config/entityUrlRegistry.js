/**
 * Table-driven registry for friendly-URL resolution (v882).
 *
 * Each entry describes how to turn a database UUID into a human code and back, for one
 * record type. Adding a new family to the friendly-URL system is a config entry here, not a
 * new resolver function — see packages/shared/src/utils/entityRouteParam.js for the generic
 * resolve/get functions that read this registry, and CLAUDE.md rule 16.1.
 *
 * @typedef {Object} EntityUrlConfig
 * @property {'public'|'sim'} schema - which Supabase client to query (platformDb vs simDb)
 * @property {string} table - table name within that schema
 * @property {string} codeColumn - the human-readable code/reference column
 * @property {string} [altCodeColumn] - secondary code column to also try (e.g. an older
 *   Admin display-ID column kept for backward compat)
 * @property {string} [scopeColumn] - FK column that scopes this entity to a parent (usually
 *   project_id) — when set, resolution requires the parent's UUID to disambiguate, since codes
 *   are typically only unique within their scope, not globally
 * @property {boolean} [noSoftDelete] - set true if the table has no is_deleted column
 */

/** @type {Record<string, EntityUrlConfig>} */
export const ENTITY_URL_REGISTRY = {
  // --- Platform: top-level (no project scope) ---
  project: { schema: 'public', table: 'projects', codeColumn: 'project_code' },
  programme: { schema: 'public', table: 'programmes', codeColumn: 'programme_code' },
  portfolio: { schema: 'public', table: 'portfolios', codeColumn: 'portfolio_code' },
  changeRequest: { schema: 'public', table: 'change_requests', codeColumn: 'change_reference' },
  team: { schema: 'public', table: 'teams', codeColumn: 'team_code' },

  // --- Platform: project-scoped (Phase 0/1 — DB-ready) ---
  risk: { schema: 'public', table: 'risks', codeColumn: 'risk_code', altCodeColumn: 'risk_identifier', scopeColumn: 'project_id' },
  issue: { schema: 'public', table: 'issues', codeColumn: 'issue_code', scopeColumn: 'project_id' },
  dailyLogEntry: { schema: 'public', table: 'daily_log_entries', codeColumn: 'entry_code', scopeColumn: 'project_id' },
  configurationItem: { schema: 'public', table: 'configuration_items', codeColumn: 'configuration_item_identifier', scopeColumn: 'project_id' },
  lesson: { schema: 'public', table: 'lessons_learned', codeColumn: 'lesson_reference', scopeColumn: 'project_id' },
  lessonsReport: { schema: 'public', table: 'lessons_reports', codeColumn: 'report_reference', scopeColumn: 'project_id' },
  productDescription: { schema: 'public', table: 'product_descriptions', codeColumn: 'pd_reference', scopeColumn: 'project_id' },
  productStatusAccount: { schema: 'public', table: 'product_status_accounts', codeColumn: 'psa_reference', scopeColumn: 'project_id' },
  checkpointReport: { schema: 'public', table: 'checkpoint_reports', codeColumn: 'document_ref', scopeColumn: 'project_id' },
  highlightReport: { schema: 'public', table: 'highlight_reports', codeColumn: 'report_reference', scopeColumn: 'project_id' },
  exceptionReport: { schema: 'public', table: 'exception_reports', codeColumn: 'document_ref', scopeColumn: 'project_id' },
  endStageReport: { schema: 'public', table: 'end_stage_reports', codeColumn: 'report_reference', scopeColumn: 'project_id' },
  // v756b's generator writes document_ref, not the report_reference column named in the original
  // v30 DDL — document_ref is the live, populated column (see v882 PRD).
  endProjectReport: { schema: 'public', table: 'end_project_reports', codeColumn: 'document_ref', scopeColumn: 'project_id' },
  workPackage: { schema: 'public', table: 'work_packages', codeColumn: 'wp_reference', scopeColumn: 'project_id' },
  // stage_plans has two historical generators (Phase-12 plan_code, admin-engine plan_reference);
  // plan_reference is canonical per v882 PRD.
  stagePlan: { schema: 'public', table: 'stage_plans', codeColumn: 'plan_reference', scopeColumn: 'project_id' },
  formInstance: { schema: 'public', table: 'form_instances', codeColumn: 'instance_reference', scopeColumn: 'project_id' },

  // --- Platform: project-scoped (Phase 2 — greenfield, no generator yet) ---
  agileRelease: { schema: 'public', table: 'agile_releases', codeColumn: 'release_reference', scopeColumn: 'project_id' },
  requirement: { schema: 'public', table: 'requirements_register', codeColumn: 'requirement_code', scopeColumn: 'project_id' },
  activity: { schema: 'public', table: 'activity_list', codeColumn: 'activity_code', scopeColumn: 'project_id' },
  opaCustomisation: { schema: 'public', table: 'project_opa_customisations', codeColumn: 'opa_reference', scopeColumn: 'project_id' },

  // --- Simulator ---
  scenario: { schema: 'sim', table: 'scenarios', codeColumn: 'scenario_code' },
  simRun: { schema: 'sim', table: 'simulation_runs', codeColumn: 'run_code' },
  practiceProject: { schema: 'sim', table: 'practice_projects', codeColumn: 'practice_code' },
}

/** True if `entityType` has a registry entry. */
export function hasEntityUrlConfig(entityType) {
  return Object.prototype.hasOwnProperty.call(ENTITY_URL_REGISTRY, entityType)
}
