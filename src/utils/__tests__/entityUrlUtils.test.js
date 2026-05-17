import { describe, it, expect, vi, beforeEach } from 'vitest'

const UUID = 'e550e840-e29b-41d4-a716-446655440000'

vi.mock('../../services/entityResolverService', () => ({
  getProjectCode: vi.fn(async (id) =>
    id === 'e550e840-e29b-41d4-a716-446655440000' ? 'PRJ-0001' : id,
  ),
  getProgrammeCode: vi.fn(async () => 'PROG-0002'),
  getPortfolioCode: vi.fn(async () => 'PORT-0003'),
  getRiskCode: vi.fn(async () => 'RISK-0004'),
  getIssueCode: vi.fn(async () => 'ISS-0005'),
  getChangeRequestRef: vi.fn(async () => 'CR-0006'),
  getScenarioCode: vi.fn(async () => 'SCN-0007'),
  getSimRunCode: vi.fn(async () => 'RUN-0008'),
  getPracticeProjectCode: vi.fn(async () => 'PP-0009'),
  resolveProjectId: vi.fn(async (k) =>
    k === 'PRJ-0001' ? 'e550e840-e29b-41d4-a716-446655440000' : null,
  ),
}))

import {
  projectUrl,
  projectQueryParam,
  riskUrl,
  programmeUrl,
} from '../entityUrlUtils.js'

describe('entityUrlUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('projectUrl uses code when UUID passed', async () => {
    await expect(projectUrl(UUID)).resolves.toMatch('/platform/projects/PRJ-0001')
  })

  it('projectQueryParam resolves code', async () => {
    await expect(projectQueryParam(UUID)).resolves.toBe('PRJ-0001')
  })

  it('riskUrl builds nested path', async () => {
    const u = await riskUrl('RISK-0004', 'PRJ-0001')
    expect(u).toContain('/platform/projects/PRJ-0001/risks/RISK-0004')
  })

  it('programmeUrl uses /platform/programme base', async () => {
    const u = await programmeUrl(UUID, 'evm')
    expect(u).toContain('/platform/programme/PROG-0002/evm')
  })
})
