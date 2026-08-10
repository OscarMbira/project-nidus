import { describe, it, expect } from 'vitest'
import {
  resolveOrgTemplatesListBase,
  resolveOrgTemplatesListBaseFromDetailPath,
  orgTemplateDetailPath,
  resolveFormTemplateManagePath,
} from '../organisationalTemplateRoutes.js'

describe('organisationalTemplateRoutes', () => {
  it('keeps PM project list/detail under /platform/templates/project', () => {
    expect(
      resolveOrgTemplatesListBase('/platform/templates/project', { listVariant: 'project' }),
    ).toBe('/platform/templates/project')
    expect(resolveOrgTemplatesListBaseFromDetailPath('/platform/templates/project/TMP-1')).toBe(
      '/platform/templates/project',
    )
    expect(orgTemplateDetailPath('/platform/templates/project', 'TMP-1')).toBe(
      '/platform/templates/project/TMP-1',
    )
  })

  it('keeps Project Documents fill-in under /platform/documents/project', () => {
    expect(resolveOrgTemplatesListBase('/platform/documents/project')).toBe(
      '/platform/documents/project',
    )
    expect(resolveOrgTemplatesListBaseFromDetailPath('/platform/documents/project/abc-uuid')).toBe(
      '/platform/documents/project',
    )
    expect(orgTemplateDetailPath('/platform/documents/project', 'abc-uuid')).toBe(
      '/platform/documents/project/abc-uuid',
    )
  })

  it('keeps PM organisational list under /platform/templates/organisational', () => {
    expect(resolveOrgTemplatesListBase('/platform/templates/organisational')).toBe(
      '/platform/templates/organisational',
    )
    expect(resolveOrgTemplatesListBase('/platform/templates')).toBe(
      '/platform/templates/organisational',
    )
  })

  it('keeps PMO admin on /app/pmo/organisational-templates', () => {
    expect(resolveOrgTemplatesListBase('/app/pmo/organisational-templates')).toBe(
      '/app/pmo/organisational-templates',
    )
  })

  it('routes PM project Manage form fields to project field-templates (not /app/pmo)', () => {
    expect(
      resolveFormTemplateManagePath('/platform/templates/project/TPL-0028', {
        templateCode: 'quality_register_structured',
        scopeEntityId: 'proj-uuid',
        tier: 'project',
      }),
    ).toBe('/platform/projects/proj-uuid/field-templates?templateCode=quality_register_structured')
  })

  it('routes blank-origin project forms to the full Form Template Builder', () => {
    expect(
      resolveFormTemplateManagePath('/platform/templates/project/TPL-0099', {
        templateCode: 'FRM-0001',
        scopeEntityId: 'proj-uuid',
        tier: 'project',
        isBlankOrigin: true,
      }),
    ).toBe('/platform/templates/forms/FRM-0001/edit')
    expect(
      resolveFormTemplateManagePath('/simulator/pm/templates/project/TPL-0099', {
        templateCode: 'SFRM-0001',
        scopeEntityId: 'proj-uuid',
        tier: 'project',
        isBlankOrigin: true,
      }),
    ).toBe('/simulator/pm/templates/forms/SFRM-0001/edit')
  })

  it('keeps PMO Manage form fields on /app/pmo/forms', () => {
    expect(
      resolveFormTemplateManagePath('/app/pmo/organisational-templates/TPL-1', {
        templateCode: 'quality_register_structured',
      }),
    ).toBe('/app/pmo/forms/quality_register_structured/edit')
  })
})
