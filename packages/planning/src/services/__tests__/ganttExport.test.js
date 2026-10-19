// v1265 — Gantt export picture (task names + bars).
import { describe, it, expect } from 'vitest'
import { buildGanttSvg, ganttRowsFromOutline } from '../ganttExport.js'

const rows = [
  { outline: '1', name: 'Initiation', depth: 0, summary: true, start: '2026-09-07', finish: '2026-09-16', percent: 100 },
  { outline: '1.1', name: 'Prepare <charter> & scope', depth: 1, start: '2026-09-07', finish: '2026-09-11', percent: 50, critical: true },
  { outline: '1.2', name: 'Charter approved', depth: 1, milestone: true, start: '2026-09-16', finish: '2026-09-16' },
  { outline: '2', name: 'Not scheduled yet', depth: 0 },
]

describe('buildGanttSvg', () => {
  const { svg, width, height } = buildGanttSvg(rows, { zoom: 'week', title: 'Velocity Freight', subtitle: 'Plan Sheet', today: '2026-09-10' })

  it('is a standalone SVG sized to the plan', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(width).toBeGreaterThan(340)
    expect(height).toBeGreaterThan(4 * 26)
  })
  it('shows the title, outline numbers and names (text escaped)', () => {
    expect(svg).toContain('Velocity Freight')
    expect(svg).toContain('1.1  Prepare &lt;charter&gt; &amp; scope')
    expect(svg).not.toContain('<charter>')
  })
  it('draws a summary bracket, a critical bar with progress, a milestone diamond and today', () => {
    expect(svg).toContain('fill="#1f2937"') // summary
    expect(svg).toContain('fill="#dc2626"') // critical task
    expect(svg).toContain('fill="#991b1b"') // its done part
    expect(svg).toMatch(/<path d="M[\d.]+,[\d.]+ L/) // milestone diamond
    expect(svg).toContain('stroke="#f59e0b"') // today line
  })
  it('can hide outline numbers', () => {
    expect(buildGanttSvg(rows, { showOutline: false }).svg).not.toContain('1.1  Prepare')
  })
})

describe('ganttRowsFromOutline', () => {
  it('adds the project row and indents under it', () => {
    const out = ganttRowsFromOutline(
      [{ outline: '1', depth: 0, task: { task_name: 'A', is_summary: false, planned_start_date: '2026-01-05' } }],
      { task_name: 'Project', planned_start_date: '2026-01-05', planned_end_date: '2026-01-09' },
    )
    expect(out.map((r) => [r.name, r.depth, r.summary])).toEqual([['Project', 0, true], ['A', 1, false]])
  })
})

describe('frozen names for the preview', () => {
  it('cuts the same picture into a names column and a timeline of equal height', () => {
    const chart = buildGanttSvg(rows, { heading: false })
    expect(chart.names).toContain(`width="${chart.namesWidth}" height="${chart.height}" viewBox="0 0 ${chart.namesWidth} ${chart.height}"`)
    expect(chart.timeline).toContain(`viewBox="${chart.namesWidth} 0 ${chart.width - chart.namesWidth} ${chart.height}"`)
    expect(chart.svg).not.toContain('font-size="16"') // no title when heading is off
    expect(buildGanttSvg(rows, { title: 'T' }).svg).toContain('font-size="16"')
  })
})
