import { describe, it, expect } from 'vitest'
import {
  assertBulkApproveWithinCap,
  canApproveFormInstance,
  canArchiveFormInstance,
  canBulkApproveFormInstance,
  canEditFormInstance,
  canRejectFormInstance,
  canSubmitFormInstance,
  DEFAULT_FORM_BULK_APPROVE_MAX,
  draftIdsFromFilteredRows,
  filterFormInstancesForRegister,
  formInstanceStatusLabel,
  isNonEmptyJustification,
  normalizeFormBulkApproveMax,
  normalizeFormInstanceRow,
  formInstancePathSegmentFromRow,
  formInstanceRouteKeyFromRow,
  looksLikeFormInstanceUuid,
  pickFormInstanceDisplayTitle,
  resolveFormInstanceDetailPath,
  resolveFormInstanceRecordsListPath,
} from '../formInstanceRegisterUtils.js'

describe('canArchiveFormInstance', () => {
  it('allows draft, in_review/submitted, rejected, and approved', () => {
    expect(canArchiveFormInstance('draft')).toBe(true)
    expect(canArchiveFormInstance('in_review')).toBe(true)
    expect(canArchiveFormInstance('submitted')).toBe(true)
    expect(canArchiveFormInstance('rejected')).toBe(true)
    expect(canArchiveFormInstance('approved')).toBe(true)
  })

  it('blocks already archived', () => {
    expect(canArchiveFormInstance('archived')).toBe(false)
  })
})

describe('canEditFormInstance', () => {
  it('allows mutable statuses and blocks approved/archived', () => {
    expect(canEditFormInstance('draft')).toBe(true)
    expect(canEditFormInstance('in_review')).toBe(true)
    expect(canEditFormInstance('rejected')).toBe(true)
    expect(canEditFormInstance('approved')).toBe(false)
    expect(canEditFormInstance('archived')).toBe(false)
  })
})

describe('filterFormInstancesForRegister', () => {
  const rows = [
    { id: '1', status: 'draft', template_name: 'Lessons Log', template_code: 'F001' },
    { id: '2', status: 'approved', template_name: 'Change Request', template_code: 'F002' },
    { id: '3', status: 'archived', template_name: 'Old Lessons', template_code: 'F001' },
    { id: '4', status: 'in_review', template_name: 'Status Report', template_code: 'F003' },
  ]

  it('hides archived by default', () => {
    const result = filterFormInstancesForRegister(rows, {})
    expect(result.map((r) => r.id)).toEqual(['1', '2', '4'])
  })

  it('shows only archived when filter is archived', () => {
    const result = filterFormInstancesForRegister(rows, { statusFilter: 'archived' })
    expect(result.map((r) => r.id)).toEqual(['3'])
  })

  it('filters by status and search', () => {
    const byStatus = filterFormInstancesForRegister(rows, { statusFilter: 'in_review' })
    expect(byStatus.map((r) => r.id)).toEqual(['4'])
    const bySearch = filterFormInstancesForRegister(rows, { search: 'lessons' })
    expect(bySearch.map((r) => r.id)).toEqual(['1'])
  })

  it('filters by templateCode', () => {
    const result = filterFormInstancesForRegister(rows, { templateCode: 'F001' })
    expect(result.map((r) => r.id)).toEqual(['1'])
  })
})

describe('formInstanceStatusLabel / normalizeFormInstanceRow', () => {
  it('labels in_review as In review', () => {
    expect(formInstanceStatusLabel('in_review')).toBe('In review')
  })

  it('flattens nested form_templates join', () => {
    const row = normalizeFormInstanceRow({
      id: 'x',
      form_templates: { name: 'Charter Form', template_code: 'F010' },
    })
    expect(row.template_name).toBe('Charter Form')
    expect(row.template_code).toBe('F010')
    expect(row.form_templates).toBeUndefined()
  })
})

describe('v860 workflow gates', () => {
  it('gates submit / approve / reject / bulk-approve by status', () => {
    expect(canSubmitFormInstance('draft')).toBe(true)
    expect(canSubmitFormInstance('rejected')).toBe(true)
    expect(canSubmitFormInstance('in_review')).toBe(false)

    expect(canApproveFormInstance('draft')).toBe(true)
    expect(canApproveFormInstance('in_review')).toBe(true)
    expect(canApproveFormInstance('rejected')).toBe(false)

    expect(canRejectFormInstance('in_review')).toBe(true)
    expect(canRejectFormInstance('draft')).toBe(false)

    expect(canBulkApproveFormInstance('draft')).toBe(true)
    expect(canBulkApproveFormInstance('in_review')).toBe(false)
  })

  it('collects draft ids from filtered rows', () => {
    expect(
      draftIdsFromFilteredRows([
        { id: 'a', status: 'draft' },
        { id: 'b', status: 'approved' },
        { id: 'c', status: 'draft' },
      ]),
    ).toEqual(['a', 'c'])
  })

  it('normalises bulk approve cap and enforces it', () => {
    expect(normalizeFormBulkApproveMax(null)).toBe(DEFAULT_FORM_BULK_APPROVE_MAX)
    expect(normalizeFormBulkApproveMax(2500)).toBe(2500)
    expect(normalizeFormBulkApproveMax(99999)).toBe(10000)
    expect(assertBulkApproveWithinCap(10, 1000).ok).toBe(true)
    expect(assertBulkApproveWithinCap(1001, 1000).ok).toBe(false)
    expect(isNonEmptyJustification('  ok  ')).toBe(true)
    expect(isNonEmptyJustification('   ')).toBe(false)
  })

  it('resolves records list path with template filter from current URL', () => {
    expect(
      resolveFormInstanceRecordsListPath({
        pathname: '/platform/projects/uuid-here/forms/xyz/edit',
        projectId: 'uuid-here',
        projectKey: 'SEED334-PRJ-07',
        templateCode: 'FT-1',
      }),
    ).toBe('/platform/projects/SEED334-PRJ-07/forms?templateCode=FT-1')
    expect(
      resolveFormInstanceRecordsListPath({
        pathname: '/pm/projects/abc/forms/xyz/view',
        projectId: 'abc',
        projectKey: 'abc',
      }),
    ).toBe('/pm/projects/abc/forms')
  })

  it('builds a unique list title from Task Id + Task Description', () => {
    expect(
      pickFormInstanceDisplayTitle({
        values: { Task_Id: '17', Task_Description: 'Bug Fixing' },
        instanceReference: 'FI-1',
        templateName: 'Customer Data Fetch',
      }),
    ).toBe('17 — Bug Fixing')
    expect(
      pickFormInstanceDisplayTitle({
        valueRows: [{ field_key: 'Task_Description', field_value: 'IDD Signoff' }],
        instanceReference: 'FI-2',
        templateName: 'Customer Data Fetch',
      }),
    ).toBe('IDD Signoff')
  })

  it('prefers instance_reference in form instance URL segments', () => {
    expect(looksLikeFormInstanceUuid('b9a9afb7-bc8e-4240-ba58-aaae9e54b052')).toBe(true)
    expect(looksLikeFormInstanceUuid('FI-QE55Z65KW')).toBe(false)
    expect(
      formInstanceRouteKeyFromRow({ id: 'u1', instance_reference: 'FI-QE55Z65KW' }),
    ).toBe('FI-QE55Z65KW')
    expect(formInstancePathSegmentFromRow({ id: 'u1', instance_reference: 'FI-QE55Z65KW' })).toBe(
      'FI-QE55Z65KW',
    )
    expect(
      resolveFormInstanceDetailPath('/platform/projects/SEED/forms', {
        id: 'u1',
        instance_reference: 'FI-1',
      }, 'edit'),
    ).toBe('/platform/projects/SEED/forms/FI-1/edit')
  })
})
