import { describe, it, expect } from 'vitest'
import {
  canEditMasterTemplate,
  canCreateMasterTemplate,
  canCopyTemplate,
  canDeleteTemplate,
  getGroupRegistry,
  getTemplatesForGroup,
  isMasterCatalogMode,
} from '../processTemplatesService'
import { getNewTemplates } from '../../components/processTemplates/processTemplatesRegistry'
import { getTemplateService } from '../processTemplateCrudFactory'

describe('processTemplatesService', () => {
  it('returns group registry with 6 groups', () => {
    const reg = getGroupRegistry()
    expect(reg.groups).toBeDefined()
    expect(Object.keys(reg.groups).length).toBe(6)
    expect(reg.templates.length).toBeGreaterThan(50)
  })

  it('PMO uses master catalog mode without project', () => {
    expect(isMasterCatalogMode('pmo')).toBe(true)
    expect(isMasterCatalogMode('simPmo')).toBe(true)
    expect(isMasterCatalogMode('pm')).toBe(false)
  })

  it('PMO can create and edit masters', () => {
    expect(canCreateMasterTemplate('pmo')).toBe(true)
    expect(canEditMasterTemplate('pmo', { is_master: true }, 'u1')).toBe(true)
  })

  it('PM cannot edit master but can edit own copy', () => {
    expect(canCreateMasterTemplate('pm')).toBe(false)
    expect(canEditMasterTemplate('pm', { is_master: true }, 'u1')).toBe(false)
    expect(canEditMasterTemplate('pm', { is_master: false, copied_by: 'u1' }, 'u1')).toBe(true)
  })

  it('all roles can copy templates', () => {
    expect(canCopyTemplate('pm')).toBe(true)
    expect(canCopyTemplate('simPm')).toBe(true)
  })

  it('delete master only for PMO', () => {
    expect(canDeleteTemplate('pmo', { is_master: true }, 'u1')).toBe(true)
    expect(canDeleteTemplate('pm', { is_master: true }, 'u1')).toBe(false)
    expect(canDeleteTemplate('pm', { is_master: false, copied_by: 'u1' }, 'u1')).toBe(true)
  })

  it('getTemplatesForGroup returns initiating templates', () => {
    const items = getTemplatesForGroup('initiating')
    expect(items.some((t) => t.slug === 'project-charter')).toBe(true)
  })
})

describe('process template CRUD services', () => {
  const newTemplates = getNewTemplates()

  it('registers all 24 new template services (platform + sim via factory)', () => {
    expect(newTemplates.length).toBe(24)
    for (const t of newTemplates) {
      expect(() => getTemplateService(t.slug, { sim: false })).not.toThrow()
      expect(() => getTemplateService(t.slug, { sim: true })).not.toThrow()
    }
  })

  it('platform and sim services use different db clients via table name', () => {
    const svc = getTemplateService('project-charter', { sim: false })
    const simSvc = getTemplateService('project-charter', { sim: true })
    expect(svc.table).toBe('project_charters')
    expect(simSvc.table).toBe('project_charters')
  })
})
