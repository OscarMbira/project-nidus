/**
 * v629 Process Templates — permissions, copy workflow, registry helpers.
 */
import {
  PROCESS_GROUPS,
  PROCESS_TEMPLATES,
  PROCESS_REGISTERS,
  PROCESS_LOGS,
  getTemplatesByGroup,
  getTemplateBySlug,
  getHubBasePath,
  getNewTemplates,
} from '../components/processTemplates/processTemplatesRegistry'
import { initProcessTemplateServices, getTemplateService } from './processTemplateCrudFactory'

// Register all new-template CRUD services on module load
initProcessTemplateServices(getNewTemplates())

export function getGroupRegistry() {
  return {
    groups: PROCESS_GROUPS,
    templates: PROCESS_TEMPLATES,
    registers: PROCESS_REGISTERS,
    logs: PROCESS_LOGS,
  }
}

/**
 * PMO can edit master templates; others view masters and edit own copies.
 * @param {'pmo'|'pm'|'simPmo'|'simPm'} roleKey
 * @param {{ is_master?: boolean, copied_by?: string, created_by?: string }} record
 * @param {string} [userId]
 */
export function canEditMasterTemplate(roleKey, record = {}, userId) {
  if (roleKey === 'pmo' || roleKey === 'simPmo') return true
  if (!record.is_master) {
    return record.copied_by === userId || record.created_by === userId
  }
  return false
}

export function canCreateMasterTemplate(roleKey) {
  return roleKey === 'pmo' || roleKey === 'simPmo'
}

export function isMasterCatalogMode(roleKey) {
  return canCreateMasterTemplate(roleKey)
}

export async function loadProcessTemplateRows(slug, { sim = false, masterCatalog = false, projectId = null } = {}) {
  const svc = getTemplateService(slug, { sim })
  if (masterCatalog) {
    return svc.listMasterCatalog()
  }
  const masters = await svc.listMasterCatalog()
  const copies = projectId ? await svc.listWorkspaceByProject(projectId) : []
  const masterIds = new Set(masters.map((m) => m.id))
  const merged = [...masters, ...copies.filter((c) => !masterIds.has(c.id))]
  return merged
}

export function canCopyTemplate(roleKey) {
  return ['pmo', 'pm', 'simPmo', 'simPm'].includes(roleKey)
}

export function canDeleteTemplate(roleKey, record = {}, userId) {
  if (record.is_master) return canCreateMasterTemplate(roleKey)
  return record.copied_by === userId || record.created_by === userId || canCreateMasterTemplate(roleKey)
}

export function getTemplatesForGroup(groupId) {
  return getTemplatesByGroup(groupId)
}

export { getTemplateBySlug, getHubBasePath, getTemplateService, PROCESS_GROUPS }
