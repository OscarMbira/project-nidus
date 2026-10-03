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
 */
export function briefCharterDocPath(routeKeyDecoded, action, mode = 'brief') {
  const seg = mode === 'charter' ? 'charter' : 'brief'
  return platformProjectPath(routeKeyDecoded, seg, action)
}
