import { describe, it, expect } from 'vitest'
import {
  validateBriefDiagramFile,
  isBriefDiagramStoragePath,
  BRIEF_DIAGRAM_IMAGE_MIME_TYPES,
  MAX_BRIEF_DIAGRAM_FILE_SIZE_BYTES,
} from '../briefTeamStructureDiagramService.js'

describe('briefTeamStructureDiagramService helpers', () => {
  it('accepts allowed image mime types within size limit', () => {
    for (const type of BRIEF_DIAGRAM_IMAGE_MIME_TYPES) {
      const file = new File([new Uint8Array(100)], 'diagram.png', { type })
      expect(validateBriefDiagramFile(file)).toBeNull()
    }
  })

  it('rejects missing file, wrong type, and oversized files', () => {
    expect(validateBriefDiagramFile(null)).toMatch(/No file/)
    const bad = new File([new Uint8Array(10)], 'x.pdf', { type: 'application/pdf' })
    expect(validateBriefDiagramFile(bad)).toMatch(/not allowed/)
    const big = new File([new Uint8Array(MAX_BRIEF_DIAGRAM_FILE_SIZE_BYTES + 1)], 'big.png', {
      type: 'image/png',
    })
    expect(validateBriefDiagramFile(big)).toMatch(/too large/)
  })

  it('detects storage paths vs external URLs', () => {
    expect(isBriefDiagramStoragePath('proj-uuid/user-uuid/team-structure-diagram.png')).toBe(true)
    expect(isBriefDiagramStoragePath('https://cdn.example.com/chart.png')).toBe(false)
    expect(isBriefDiagramStoragePath('data:image/png;base64,abc')).toBe(false)
    expect(isBriefDiagramStoragePath('')).toBe(false)
    expect(isBriefDiagramStoragePath(null)).toBe(false)
  })
})
