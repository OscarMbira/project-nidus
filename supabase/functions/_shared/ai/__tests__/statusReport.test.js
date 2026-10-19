import { describe, expect, it } from 'vitest'
import { buildPeriod, buildStatusReportPrompt, collectSources, enabledSections, factQueries, mapDraftToReport } from '../statusReport.js'

const layout = {
  sections: [
    { key: 'executive_summary', title: 'Summary', kind: 'builtin', column: 'executive_summary', enabled: true, instruction: 'Short.' },
    { key: 'risks_summary', title: 'Risks', kind: 'builtin', column: 'risks_summary', enabled: true },
    { key: 'supplier', title: 'Supplier performance', kind: 'custom', enabled: true, instruction: 'Three bullets.' },
    { key: 'recommendations', title: 'Recommendations', kind: 'builtin', column: 'recommendations', enabled: false },
  ],
}

const facts = {
  risks_open: { entity: 'risks', mode: 'rows', total_count: 1, rows: [{ __id: 'r1', __project_id: 'p', __display_id: 'RSK-1', title: 'Vendor delay', risk_score: 16, status: 'monitoring' }] },
  issues_open: { entity: 'issues', mode: 'rows', total_count: 0, rows: [] },
  changes: { entity: 'change_requests', mode: 'rows', total_count: 0, rows: [] },
  schedule_totals: { entity: 'tasks', mode: 'grouped', rows: [{ is_late: true, tasks: 3 }] },
}

describe('buildPeriod', () => {
  const today = new Date('2026-10-19T10:00:00Z')
  it('runs from the day after the last report to today', () => {
    expect(buildPeriod({ lastEnd: '2026-10-05', today })).toMatchObject({ start: '2026-10-06', end: '2026-10-19', nextStart: '2026-10-20', nextEnd: '2026-11-02' })
  })
  it('defaults to the last 14 days without a previous report', () => {
    expect(buildPeriod({ today })).toMatchObject({ start: '2026-10-06', end: '2026-10-19' })
  })
  it('keeps explicit dates', () => {
    expect(buildPeriod({ start: '2026-09-01', end: '2026-09-30', today })).toMatchObject({ start: '2026-09-01', end: '2026-09-30' })
  })
})

describe('factQueries', () => {
  it('scopes every query to the project and uses catalogue entities', () => {
    const q = factQueries('p1', buildPeriod({ start: '2026-10-01', end: '2026-10-14' }))
    for (const spec of Object.values(q)) expect(spec.project_id).toBe('p1')
    expect(q.tasks_completed.filters[0]).toEqual({ field: 'actual_end_date', op: 'between', value: ['2026-10-01', '2026-10-14'] })
    expect(q.schedule_totals.aggregates.map((a) => a.fn)).toEqual(['count', 'avg', 'max'])
  })
})

describe('prompt', () => {
  it('lists only enabled sections (custom ones too) and strips internal ids from facts', () => {
    expect(enabledSections(layout).map((s) => s.key)).toEqual(['executive_summary', 'risks_summary', 'supplier'])
    const { system, user } = buildStatusReportPrompt({ projectName: 'Alpha', period: buildPeriod({ start: '2026-10-01', end: '2026-10-14' }), layout, facts, language: 'fr-FR' })
    const payload = JSON.parse(user)
    expect(payload.sections.map((s) => s.key)).toEqual(['executive_summary', 'risks_summary', 'supplier'])
    expect(payload.facts.risks_open.rows[0]).toEqual({ ref: 'RSK-1', title: 'Vendor delay', risk_score: 16, status: 'monitoring' })
    expect(payload.language).toBe('fr-FR')
    expect(system).toMatch(/ONLY the facts/)
  })
})

describe('mapDraftToReport', () => {
  const draft = {
    sections: {
      executive_summary: { text: 'Good progress.', sources: [] },
      risks_summary: { text: '- RSK-1 vendor delay', sources: ['RSK-1'] },
      supplier: { text: '' },
    },
    rag: { time: { value: 'amber', reason: '3 late tasks' }, cost: { value: 'green', reason: 'Within budget' }, quality: { value: 'red', reason: 'Defects' } },
  }
  const base = { draft, layout, period: buildPeriod({ start: '2026-10-01', end: '2026-10-14' }), projectId: 'p1', projectName: 'Alpha', sources: collectSources(facts), facts, layoutNodeId: 'n1' }

  it('fills built-in columns, custom values, RAG and provenance; marks empty sections', () => {
    const { row, childRows, needsInput, sectionsDrafted } = mapDraftToReport({ ...base, schema: 'public' })
    expect(row.status).toBe('draft')
    expect(row.approval_workflow_status).toBe('draft')
    expect(row.executive_summary).toBe('Good progress.')
    expect(row.custom_values.supplier).toEqual({ title: 'Supplier performance', text: '' })
    expect(row.time_status).toBe('at_risk')
    expect(row.cost_status).toBe('on_track')
    expect(row.quality_status_six).toBe('off_track')
    expect(row.ai_provenance.risks_summary).toEqual([{ entity: 'risks', id: 'r1', ref: 'RSK-1' }])
    expect(needsInput).toEqual(['supplier'])
    expect(sectionsDrafted).toBe(2)
    expect(childRows.highlight_report_risks[0]).toMatchObject({ risk_id: 'r1', risk_title: 'Vendor delay' })
    expect(row.recommendations).toBeUndefined() // disabled section not written
  })

  it('writes Simulator drafts into the practice report shape', () => {
    const { row, childRows } = mapDraftToReport({ ...base, schema: 'sim' })
    expect(row.practice_project_id).toBe('p1')
    expect(row.executive_summary).toMatch(/Summary\nGood progress\./)
    expect(row.document_content.sections.supplier.title).toBe('Supplier performance')
    expect(childRows).toEqual({})
  })
})
