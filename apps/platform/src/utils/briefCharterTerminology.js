/**
 * Brief vs Charter — same document, different user-facing name by methodology.
 * Detect from URL path; keep data/services on project_briefs.
 */

import { platformProjectPath } from './projectRouteParam.js'

/**
 * @param {string} [pathname]
 * @returns {'brief' | 'charter'}
 */
export function resolveBriefCharterMode(pathname = '') {
  const p = String(pathname || '').toLowerCase()
  if (
    p.includes('project-charter') ||
    p.includes('/charter/') ||
    /\/charter(\/|$|\?)/.test(p)
  ) {
    return 'charter'
  }
  return 'brief'
}

/**
 * @param {'brief' | 'charter'} mode
 */
export function briefCharterLabels(mode = 'brief') {
  if (mode === 'charter') {
    return {
      mode: 'charter',
      singular: 'Charter',
      plural: 'Charters',
      title: 'Project Charter',
      titlePlural: 'Project Charters',
      create: 'Create Charter',
      loading: 'Loading charters…',
      emptyProject: 'No charters for this project',
      emptyAll: 'No charters found',
      selectProject: 'Select a project to view its charters',
      selectToCreate: 'Select project to create charter',
      createPageTitle: 'Create Project Charter',
      createPageSubtitle: 'Create a new project charter for this project',
      editPageTitle: 'Edit Project Charter',
      viewMissing: 'No project charter found for this project.',
      notFound: 'Charter not found',
      editLabel: 'Edit charter',
      exportBase: 'Charters',
      pathSegment: 'charter',
      listPath: '/pm/initiation/project-charter',
      referenceKeyLabel: 'Reference',
    }
  }
  return {
    mode: 'brief',
    singular: 'Brief',
    plural: 'Briefs',
    title: 'Project Brief',
    titlePlural: 'Project Briefs',
    create: 'Create Brief',
    loading: 'Loading briefs…',
    emptyProject: 'No briefs for this project',
    emptyAll: 'No briefs found',
    selectProject: 'Select a project to view its briefs',
    selectToCreate: 'Select project to create brief',
    createPageTitle: 'Create Project Brief',
    createPageSubtitle: 'Create a new project brief for this project',
    editPageTitle: 'Edit Project Brief',
    viewMissing: 'No project brief found for this project.',
    notFound: 'Brief not found',
    editLabel: 'Edit brief',
    exportBase: 'Briefs',
    pathSegment: 'brief',
    listPath: '/pm/initiation/project-brief',
    referenceKeyLabel: 'Reference',
  }
}

/**
 * @param {string} routeKeyDecoded
 * @param {'create' | 'view' | 'edit'} action
 * @param {'brief' | 'charter'} mode
 * @param {string} [basePath] — project workspace root to build under (e.g. '/pm/projects',
 *   '/pmo/projects'). Defaults to '/platform/projects' via platformProjectPath() when omitted,
 *   which is only correct when the caller isn't already inside a /pm/* or /pmo/* layout — those
 *   callers must pass their own basePath so the resulting link stays inside that layout instead
 *   of dropping the user into the generic Platform shell (see resolveProjectWorkspaceBasePath).
 */
export function briefCharterDocPath(routeKeyDecoded, action, mode = 'brief', basePath) {
  const seg = mode === 'charter' ? 'charter' : 'brief'
  if (basePath) {
    if (!routeKeyDecoded) return basePath
    return `${basePath}/${encodeURIComponent(routeKeyDecoded)}/${seg}/${action}`
  }
  return platformProjectPath(routeKeyDecoded, seg, action)
}

/**
 * Resolve the project-workspace URL root ('/pm/projects' | '/pmo/projects' | '/platform/projects')
 * from the current pathname, so links built from within the PM/PMO sidebar layouts stay inside
 * that layout instead of jumping out to the generic /platform/projects/* shell.
 * @param {string} [pathname]
 */
export function resolveProjectWorkspaceBasePath(pathname = '') {
  const p = String(pathname || '')
  if (p.startsWith('/pmo/') || p.includes('/pmo/')) return '/pmo/projects'
  if (p.startsWith('/pm/') || p.includes('/pm/')) return '/pm/projects'
  return '/platform/projects'
}
