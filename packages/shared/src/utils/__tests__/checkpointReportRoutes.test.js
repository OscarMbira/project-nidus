import { describe, it, expect, vi } from 'vitest'

// checkpointReportRoutes.js -> projectRouteParam.js imports platformDb at module load time —
// stub it so import doesn't throw for missing Supabase env config in the test environment.
vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

import {
  resolveCheckpointWorkPackageId,
  checkpointReportsListPath,
  checkpointReportCreatePath,
  checkpointReportDetailPath,
} from '../checkpointReportRoutes.js'

const PROJECT = '42a1c47a-c1bf-4ca3-a78c-cd278270458d'
const WP = 'e550e840-e29b-41d4-a716-446655440000'
const REPORT = '6ba7b810-9dad-41d1-80b4-00c04fd430c8'

describe('resolveCheckpointWorkPackageId', () => {
  it('rejects missing and literal undefined/null strings', () => {
    expect(resolveCheckpointWorkPackageId(undefined)).toBeNull()
    expect(resolveCheckpointWorkPackageId(null)).toBeNull()
    expect(resolveCheckpointWorkPackageId('undefined')).toBeNull()
    expect(resolveCheckpointWorkPackageId('null')).toBeNull()
    expect(resolveCheckpointWorkPackageId('')).toBeNull()
  })

  it('returns the first valid UUID', () => {
    expect(resolveCheckpointWorkPackageId('undefined', WP)).toBe(WP)
    expect(resolveCheckpointWorkPackageId(WP, REPORT)).toBe(WP)
  })
})

describe('checkpoint report paths', () => {
  // v882: these used to build `/app/projects/...` — a prefix with no matching route in
  // platformRoutes.jsx (dead link regardless of UUID-vs-code). Fixed to the real
  // `/platform/projects/...` prefix via platformProjectPath().
  it('uses project-scoped paths when work package is missing', () => {
    expect(checkpointReportsListPath(PROJECT, 'undefined')).toBe(
      `/platform/projects/${PROJECT}/checkpoint-reports`
    )
    expect(checkpointReportCreatePath(PROJECT, null)).toBe(
      `/platform/projects/${PROJECT}/checkpoint-reports/create`
    )
  })

  it('uses work-package-scoped paths when a valid WP id is present', () => {
    expect(checkpointReportsListPath(PROJECT, WP)).toBe(
      `/platform/projects/${PROJECT}/work-packages/${WP}/checkpoint-reports`
    )
    expect(checkpointReportDetailPath(PROJECT, WP, REPORT)).toBe(
      `/platform/projects/${PROJECT}/work-packages/${WP}/checkpoint-reports/${REPORT}`
    )
  })

  it('accepts a project_code or document_ref friendly segment, not just a UUID', () => {
    expect(checkpointReportsListPath('PRJ-0001', null)).toBe('/platform/projects/PRJ-0001/checkpoint-reports')
    expect(checkpointReportDetailPath('PRJ-0001', null, 'CHK-0001')).toBe(
      '/platform/projects/PRJ-0001/checkpoint-reports/CHK-0001'
    )
  })
})
