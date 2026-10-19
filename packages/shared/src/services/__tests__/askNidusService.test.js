import { describe, expect, it, vi } from 'vitest'
import { AiBlockedError, parseSseBuffer, recordLink, saveResultAsReport } from '../askNidusService.js'

describe('parseSseBuffer', () => {
  it('returns complete events and keeps the unfinished tail', () => {
    const buf = 'data: {"type":"status","text":"a"}\n\ndata: {"type":"answer","text":"b"}\n\ndata: {"type":"do'
    const { events, rest } = parseSseBuffer(buf)
    expect(events).toEqual([{ type: 'status', text: 'a' }, { type: 'answer', text: 'b' }])
    expect(rest).toBe('data: {"type":"do')
  })

  it('skips malformed events', () => {
    expect(parseSseBuffer('data: {oops\n\ndata: {"type":"x"}\n\n').events).toEqual([{ type: 'x' }])
  })
})

describe('recordLink', () => {
  const row = { __id: 'r1', __project_id: 'p1' }
  it('fills {id} and {project_id}', () => {
    expect(recordLink('', '/platform/risks/{id}', row)).toBe('/platform/risks/r1')
    expect(recordLink('/simulator', '/simulator/practice-projects/{project_id}/milestones/{id}', row))
      .toBe('/simulator/practice-projects/p1/milestones/r1')
  })
  it('returns null without a template or id', () => {
    expect(recordLink('', null, row)).toBeNull()
    expect(recordLink('', '/platform/risks/{id}', {})).toBeNull()
  })
  it('refuses a link with a missing project id', () => {
    expect(recordLink('/simulator', '/simulator/practice-projects/{project_id}/milestones/{id}', { __id: 'x' })).toBeNull()
  })
})

describe('saveResultAsReport', () => {
  it('stores the query description without the row limit', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 't1', template_name: 'Open risks' }, error: null })
    const insert = vi.fn(() => ({ select: () => ({ single }) }))
    const db = { from: vi.fn(() => ({ insert })) }
    await saveResultAsReport(db, { name: 'Open risks', result: { entity: 'risks', explanation: 'Risks where…', spec: { entity: 'risks', limit: 50 } } })
    expect(db.from).toHaveBeenCalledWith('report_templates')
    const row = insert.mock.calls[0][0]
    expect(row.query_spec).toEqual({ entity: 'risks' })
    expect(row.primary_data_source).toBe('risks')
  })
})

describe('AiBlockedError', () => {
  it('carries the gate reason', () => {
    const e = new AiBlockedError('Ask your owner', 'not_enabled')
    expect(e.reason).toBe('not_enabled')
    expect(e).toBeInstanceOf(Error)
  })
})
