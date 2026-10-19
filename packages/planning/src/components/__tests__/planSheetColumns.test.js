// v1265 — Plan sheet column catalog, saved layout, reordering.
import { describe, it, expect } from 'vitest'
import { planSheetColumnCatalog, applyColumnLayout, moveColumn, nudgeColumn, layoutFrom } from '../planSheetColumns.js'

const catalog = planSheetColumnCatalog([{ id: 'b0', baseline_number: 0, baseline_name: 'Original' }])
const keys = (cols) => cols.map((c) => c.key)

describe('applyColumnLayout', () => {
  it('without a saved layout shows the default columns in default order', () => {
    const { visible } = applyColumnLayout(catalog, null)
    expect(keys(visible)).toEqual(['id', 'indicators', 'mode', 'name', 'duration', 'start', 'finish', 'predecessors', 'successors', 'resources', 'planned', 'actual', 'deviation'])
  })

  it('keeps the saved order and hidden columns; new columns follow their default', () => {
    const layout = { order: ['name', 'id', 'finish', 'wbs'], hidden: ['finish'] }
    const { visible, all } = applyColumnLayout(catalog, layout)
    expect(keys(visible).slice(0, 3)).toEqual(['name', 'id', 'wbs'])
    expect(all.find((c) => c.key === 'finish').hidden).toBe(true)
    expect(all.find((c) => c.key === 'start').hidden).toBe(false) // default column not in the saved order
    expect(all.find((c) => c.key === 'bl:b0:start').hidden).toBe(true) // optional, not chosen
  })

  it('never hides the task name and ignores unknown saved keys', () => {
    const { visible } = applyColumnLayout(catalog, { order: ['gone', 'name'], hidden: ['name'] })
    expect(keys(visible)).toContain('name')
    expect(keys(visible)).not.toContain('gone')
  })

  it('offers start / finish / duration for every saved baseline', () => {
    expect(keys(catalog).filter((k) => k.startsWith('bl:'))).toEqual(['bl:b0:start', 'bl:b0:finish', 'bl:b0:duration'])
    expect(catalog.find((c) => c.key === 'bl:b0:start').label).toBe('B0 start')
  })
})

describe('reordering', () => {
  it('drops a column before another, or at the end', () => {
    expect(moveColumn(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
    expect(moveColumn(['a', 'b', 'c'], 'a', null)).toEqual(['b', 'c', 'a'])
    expect(moveColumn(['a', 'b'], 'a', 'a')).toEqual(['a', 'b'])
  })
  it('nudges one step with the keyboard alternative', () => {
    expect(nudgeColumn(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(nudgeColumn(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
  })
  it('turns the merged list back into a layout', () => {
    expect(layoutFrom([{ key: 'a', hidden: false }, { key: 'b', hidden: true }])).toEqual({ order: ['a', 'b'], hidden: ['b'] })
  })
})
