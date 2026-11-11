import { describe, it, expect } from 'vitest'
import { splitFlowSteps, textBlocks, blocksToLines, pdfSafeText } from '../textFlow'
import { fieldToItem } from '../registerDocumentModel'

const WORKFLOW = 'New → Triaged → Assigned → Fixed → Ready for retest → Closed (or Reopened). Daily triage with the vendor and partner; severity agreed by the test manager and business owner.'

describe('textFlow (v1366)', () => {
  it('turns an arrow chain into steps and keeps the sentence after it', () => {
    expect(splitFlowSteps(WORKFLOW)).toEqual({
      steps: ['New', 'Triaged', 'Assigned', 'Fixed', 'Ready for retest', 'Closed (or Reopened)'],
      intro: '',
      rest: 'Daily triage with the vendor and partner; severity agreed by the test manager and business owner.',
    })
  })

  it('reads ASCII arrows and an introduction before the first step', () => {
    expect(splitFlowSteps('Approval flow: Draft -> Review -> Approved')).toEqual({ steps: ['Draft', 'Review', 'Approved'], intro: 'Approval flow:', rest: '' })
  })

  it('leaves ordinary text alone', () => {
    expect(splitFlowSteps('Draft → Approved')).toBeNull() // two steps is not a workflow
    expect(splitFlowSteps('Plain sentence – with a dash – and nothing else')).toBeNull()
    expect(splitFlowSteps(`${'x'.repeat(70)} → b → c`)).toBeNull() // long parts are prose
  })

  it('builds paragraph and step blocks, and numbered plain lines', () => {
    const blocks = textBlocks(['Intro line', WORKFLOW])
    expect(blocks.map((b) => b.type)).toEqual(['p', 'steps', 'p'])
    expect(blocksToLines(blocks).slice(0, 3)).toEqual(['Intro line', '1. New', '2. Triaged'])
  })

  it('maps symbols the PDF fonts cannot draw', () => {
    expect(pdfSafeText('A → B ≥ 3 ✓ – “ok” • é')).toBe('A > B >= 3 Yes – “ok” • é')
    expect(pdfSafeText('emoji 🚀 gone')).toBe('emoji  gone')
  })

  it('gives the document a blocks item for a workflow field', () => {
    const item = fieldToItem({ field_label: 'Defect Workflow', field_type: 'long_text' }, WORKFLOW, null)
    expect(item.kind).toBe('blocks')
    expect(item.blocks[0]).toEqual({ type: 'steps', items: ['New', 'Triaged', 'Assigned', 'Fixed', 'Ready for retest', 'Closed (or Reopened)'] })
    expect(item.items[0]).toBe('1. New')
    // Text without a chain keeps its usual shape.
    expect(fieldToItem({ field_label: 'Purpose', field_type: 'long_text' }, 'Just text.', null)).toEqual({ label: 'Purpose', kind: 'paragraphs', items: ['Just text.'] })
  })
})
