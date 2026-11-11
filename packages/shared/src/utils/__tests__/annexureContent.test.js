import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readAnnexureContent, sheetRowsToBlocks, hasReadableContent, XLSX_MIME, DOCX_MIME } from '../annexureContent'

// Repository root: the nearest folder above the working directory that holds the seed files.
const repoRoot = (() => {
  let dir = process.cwd()
  while (!existsSync(join(dir, 'Documents', 'seed')) && dirname(dir) !== dir) dir = dirname(dir)
  return dir
})()

const seed = (name) => {
  const buf = readFileSync(join(repoRoot, 'Documents', 'seed', 'cbs-dmsd-template', name))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('annexureContent', () => {
  it('recognises Word and Excel files only', () => {
    expect(hasReadableContent(XLSX_MIME)).toBe(true)
    expect(hasReadableContent('application/octet-stream', 'x.DOCX')).toBe(true)
    expect(hasReadableContent('image/png', 'a.png')).toBe(false)
  })

  it('keeps title rows above the header and drops empty columns', () => {
    const blocks = sheetRowsToBlocks([['RACI table'], [], ['Stage', '', 'Activity', 'PM'], ['Analysis', '', 'Scoping', 'R']])
    expect(blocks).toEqual([
      { type: 'text', text: 'RACI table' },
      { type: 'table', headers: ['Stage', 'Activity', 'PM'], rows: [['Analysis', 'Scoping', 'R']] },
    ])
  })

  it('reads the seed RACI matrix (Excel) as a table', async () => {
    const content = await readAnnexureContent(seed('annexure-d-raci-matrix.xlsx'), XLSX_MIME, 'annexure-d-raci-matrix.xlsx')
    const table = content.blocks.find((b) => b.type === 'table')
    expect(table.headers).toEqual(expect.arrayContaining(['Stage', 'Activity / deliverable']))
    expect(table.rows.length).toBeGreaterThan(5)
  })

  it('reads the seed hand-off control form (Word) as text and tables', async () => {
    const content = await readAnnexureContent(seed('annexure-c-data-handoff-control-form.docx'), DOCX_MIME, 'annexure-c-data-handoff-control-form.docx')
    expect(content.blocks.some((b) => b.type === 'text' && /DATA HAND-OFF CONTROL FORM/i.test(b.text))).toBe(true)
    expect(content.blocks.filter((b) => b.type === 'table').length).toBeGreaterThanOrEqual(2)
  })
})
