import { describe, it, expect } from 'vitest'
import {
  toProjectDocumentLabel,
  withCustomNameSuffix,
  isProjectProcessDocumentFill,
} from '../projectDocumentNaming.js'

describe('toProjectDocumentLabel', () => {
  it('strips Template / Master / custom suffixes for all document types', () => {
    expect(toProjectDocumentLabel('Project Charter Template (custom)')).toBe('Project Charter')
    expect(toProjectDocumentLabel('Assumption Log (Master) (custom)')).toBe('Assumption Log')
    expect(toProjectDocumentLabel('Impediment Log (Agile) (custom) (custom)')).toBe(
      'Impediment Log (Agile)',
    )
    expect(toProjectDocumentLabel('Activity Cost Estimates (Master)')).toBe('Activity Cost Estimates')
    expect(toProjectDocumentLabel('WBS Dictionary Template')).toBe('WBS Dictionary')
    expect(toProjectDocumentLabel('Quality Checklists Templates')).toBe('Quality Checklists')
  })
})

describe('withCustomNameSuffix', () => {
  it('does not stack another (custom) when the source already has one', () => {
    expect(withCustomNameSuffix('Risk Register (Structured) (custom)')).toBe(
      'Risk Register (Structured) (custom)',
    )
    expect(withCustomNameSuffix('Risk Register (Structured) (custom) (custom)')).toBe(
      'Risk Register (Structured) (custom)',
    )
    expect(withCustomNameSuffix('Project Charter')).toBe('Project Charter (custom)')
  })
})

describe('isProjectProcessDocumentFill', () => {
  it('is true for project-tier process docs and documents route', () => {
    expect(
      isProjectProcessDocumentFill(
        { domain: 'process_template', tier: 'project' },
        { isProjectDocumentsRoute: false },
      ),
    ).toBe(true)
    expect(
      isProjectProcessDocumentFill(
        { domain: 'process_template', tier: 'pmo' },
        { isProjectDocumentsRoute: true },
      ),
    ).toBe(true)
    expect(
      isProjectProcessDocumentFill(
        { domain: 'process_template', tier: 'pmo' },
        { isProjectDocumentsRoute: false },
      ),
    ).toBe(false)
    expect(
      isProjectProcessDocumentFill(
        { domain: 'form_template', tier: 'project' },
        { isProjectDocumentsRoute: false },
      ),
    ).toBe(false)
  })
})
