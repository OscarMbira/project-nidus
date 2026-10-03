import { describe, it, expect } from 'vitest'
import {
  validateGovernanceChartFile,
  isGovernanceChartStoragePath,
  isGovernanceChartImage,
  isGovernanceChartPdf,
  MAX_GOVERNANCE_CHARTS,
  MAX_GOVERNANCE_CHART_FILE_SIZE_BYTES,
  GOVERNANCE_CHART_MIME_TYPES,
} from '../governanceChartService.js'

function fakeFile({ type = 'image/png', size = 100, name = 'chart.png' } = {}) {
  return { type, size, name }
}

describe('governanceChartService helpers', () => {
  it('accepts allowed image and pdf mime types', () => {
    expect(GOVERNANCE_CHART_MIME_TYPES).toContain('application/pdf')
    expect(validateGovernanceChartFile(fakeFile({ type: 'image/png' }))).toBeNull()
    expect(validateGovernanceChartFile(fakeFile({ type: 'application/pdf', name: 'a.pdf' }))).toBeNull()
  })

  it('rejects disallowed types and oversized files', () => {
    expect(validateGovernanceChartFile(fakeFile({ type: 'text/plain' }))).toMatch(/not allowed/i)
    expect(
      validateGovernanceChartFile(
        fakeFile({ type: 'image/png', size: MAX_GOVERNANCE_CHART_FILE_SIZE_BYTES + 1 }),
      ),
    ).toMatch(/too large/i)
  })

  it('detects storage paths vs urls', () => {
    expect(isGovernanceChartStoragePath('proj/user/id.png')).toBe(true)
    expect(isGovernanceChartStoragePath('https://example.com/x.png')).toBe(false)
    expect(isGovernanceChartStoragePath('')).toBe(false)
  })

  it('classifies image vs pdf', () => {
    expect(isGovernanceChartImage('image/jpeg')).toBe(true)
    expect(isGovernanceChartPdf('application/pdf')).toBe(true)
    expect(isGovernanceChartPdf('image/png')).toBe(false)
  })

  it('caps gallery at 10', () => {
    expect(MAX_GOVERNANCE_CHARTS).toBe(10)
  })
})
