import { describe, it, expect } from 'vitest'
import {
  resolveOrgTemplatesListBase,
  resolveOrgTemplatesListBaseFromDetailPath,
  orgTemplateDetailPath,
  resolveFormTemplateManagePath,
  resolveFormTemplateBuilderListPath,
  resolveFormTemplateBuilderBasePath,
  resolveFormTemplateRecordsPath,
  resolveFormTemplateRecordsTarget,
  inferNativeRegisterKey,
  parsePmTemplatesPath,
  buildPmTemplatesListPath,
  stripLegacyTemplateEntityParams,
} from '../organisationalTemplateRoutes.js'

describe('organisationalTemplateRoutes', () => {
  it('keeps PM project list/detail under /platform/templates/project with project key (v864)', () => {
    expect(
      resolveOrgTemplatesListBase('/platform/templates/project/SEED-01', { listVariant: 'project' }),
    ).toBe('/platform/templates/project/SEED-01')
    expect(
      resolveOrgTemplatesListBaseFromDetailPath('/platform/templates/project/SEED-01/TMP-1'),
    ).toBe('/platform/templates/project/SEED-01')
    expect(orgTemplateDetailPath('/platform/templates/project/SEED-01', 'TMP-1')).toBe(
      '/platform/templates/project/SEED-01/TMP-1',
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
    ).toBe(
      '/platform/templates/forms/FRM-0001/edit?tier=project&entityType=project&entityId=proj-uuid',
    )
    expect(
      resolveFormTemplateManagePath('/simulator/pm/templates/project/TPL-0099', {
        templateCode: 'SFRM-0001',
        scopeEntityId: 'proj-uuid',
        tier: 'project',
        isBlankOrigin: true,
      }),
    ).toBe(
      '/simulator/pm/templates/forms/SFRM-0001/edit?tier=project&entityType=project&entityId=proj-uuid',
    )
  })

  it('keeps PMO Manage form fields on /app/pmo/forms', () => {
    expect(
      resolveFormTemplateManagePath('/app/pmo/organisational-templates/TPL-1', {
        templateCode: 'quality_register_structured',
      }),
    ).toBe('/app/pmo/forms/quality_register_structured/edit')
  })

  it('returns PM Organisational Forms list from PM Form Template Builder (not /pmo/forms)', () => {
    expect(
      resolveFormTemplateBuilderListPath('/platform/templates/forms/FT-6QMB3A7B8/edit'),
    ).toBe('/platform/templates/organisational?domainGroup=forms')
    expect(
      resolveFormTemplateBuilderBasePath('/platform/templates/forms/FT-6QMB3A7B8/edit'),
    ).toBe('/platform/templates/forms')
    expect(
      resolveFormTemplateBuilderListPath('/simulator/pm/templates/forms/SFRM-1/edit', 'sim'),
    ).toBe('/simulator/pm/templates/organisational?domainGroup=forms')
  })

  it('routes Back by form tier (PMO / portfolio / programme / project)', () => {
    expect(
      resolveFormTemplateBuilderListPath('/platform/templates/forms/FT-1/edit', 'platform', {
        tier: 'pmo',
      }),
    ).toBe('/platform/templates/organisational?domainGroup=forms')
    expect(
      resolveFormTemplateBuilderListPath('/platform/templates/forms/FT-1/edit', 'platform', {
        tier: 'portfolio',
        entityId: 'pf-1',
      }),
    ).toBe(
      '/platform/templates/organisational?domainGroup=forms&tier=portfolio&entityType=portfolio&entityId=pf-1',
    )
    expect(
      resolveFormTemplateBuilderListPath('/platform/templates/forms/FT-1/edit', 'platform', {
        tier: 'programme',
        entityId: 'pg-1',
      }),
    ).toBe(
      '/platform/templates/organisational?domainGroup=forms&tier=programme&entityType=programme&entityId=pg-1',
    )
    expect(
      resolveFormTemplateBuilderListPath('/platform/templates/forms/FT-1/edit', 'platform', {
        tier: 'project',
        entityId: 'proj-1',
      }),
    ).toBe('/platform/templates/project/proj-1?domainGroup=forms')
  })

  it('sends PMO Form Template Builder Back to Organisational Templates Forms', () => {
    expect(resolveFormTemplateBuilderListPath('/pmo/forms/F001/edit')).toBe(
      '/app/pmo/organisational-templates?domainGroup=forms',
    )
    expect(resolveFormTemplateBuilderBasePath('/app/pmo/forms/F001/edit')).toBe('/app/pmo/forms')
  })

  it('appends tier/entity return query on Manage form fields builder links', () => {
    expect(
      resolveFormTemplateManagePath('/platform/templates/organisational', {
        templateCode: 'FRM-0001',
        tier: 'project',
        scopeEntityId: 'proj-uuid',
        scopeEntityType: 'project',
        isBlankOrigin: true,
      }),
    ).toBe(
      '/platform/templates/forms/FRM-0001/edit?tier=project&entityType=project&entityId=proj-uuid',
    )
  })

  it('resolves project form records list with templateCode filter', () => {
    expect(
      resolveFormTemplateRecordsPath('/platform/templates/project/SEED334-PRJ-07/TPI-0034', {
        projectId: 'proj-uuid',
        templateCode: 'FT-ABC',
      }),
    ).toBe('/platform/projects/SEED334-PRJ-07/forms?templateCode=FT-ABC')
    expect(
      resolveFormTemplateRecordsPath('/simulator/pm/templates/project/SEED-01/TPI-1', {
        projectId: 'proj-uuid',
        templateCode: 'SFRM-1',
      }),
    ).toBe('/simulator/pm/projects/SEED-01/forms?templateCode=SFRM-1')
    expect(
      resolveFormTemplateRecordsPath('/platform/templates/project', {
        projectId: 'proj-uuid',
        projectKey: 'SEED334-PRJ-07',
        templateCode: 'FT-1',
      }),
    ).toBe('/platform/projects/SEED334-PRJ-07/forms?templateCode=FT-1')
    expect(resolveFormTemplateRecordsPath('/platform/templates/project', {})).toBeNull()
  })

  it('routes Risk Register form templates to the native risk register (not form_instances)', () => {
    expect(
      inferNativeRegisterKey({
        templateName: 'Risk Register (Structured) (custom) (custom)',
        templateCode: 'F102',
      }),
    ).toBe('risk_register')
    expect(
      resolveFormTemplateRecordsTarget('/platform/templates/project/TPL-1', {
        projectId: 'proj-uuid',
        templateCode: 'F102',
        templateName: 'Risk Register (Structured) (custom)',
      }),
    ).toEqual({
      path: '/platform/projects/proj-uuid/risks',
      kind: 'native',
      registerKey: 'risk_register',
      countSpec: { table: 'risks', projectColumn: 'project_id', softDeleteColumn: 'is_deleted' },
    })
    expect(
      resolveFormTemplateRecordsPath('/platform/templates/project/TPL-1', {
        projectId: 'proj-uuid',
        templateCode: 'F102',
        templateName: 'Risk Register (Structured)',
      }),
    ).toBe('/platform/projects/proj-uuid/risks')
  })

  it('parses and builds v864 project-key template paths', () => {
    expect(parsePmTemplatesPath('/platform/templates/project/SEED-01')).toEqual({
      kind: 'project',
      projectKey: 'SEED-01',
      nodeId: null,
      ambiguousSegment: 'SEED-01',
    })
    expect(parsePmTemplatesPath('/platform/templates/project/SEED-01/TMP-1')).toEqual({
      kind: 'project',
      projectKey: 'SEED-01',
      nodeId: 'TMP-1',
      ambiguousSegment: null,
    })
    expect(
      buildPmTemplatesListPath({
        pathname: '/platform/templates/project',
        listVariant: 'project',
        projectKey: 'SEED-01',
        searchParams: 'entityType=project&entityId=uuid&domainGroup=forms',
      }),
    ).toBe('/platform/templates/project/SEED-01?domainGroup=forms')
    expect(stripLegacyTemplateEntityParams('entityType=project&entityId=x&tier=project').toString()).toBe(
      'tier=project',
    )
  })
})
