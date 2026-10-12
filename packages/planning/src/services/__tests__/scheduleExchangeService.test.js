import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'
import { makeFakeDb } from '../../test/fakeDb.js'

const dbs = vi.hoisted(() => ({ platform: null, sim: null }))
vi.mock('@nidus/supabase', () => ({
  get platformDb() { return dbs.platform },
  get simDb() { return dbs.sim },
}))

import {
  parsePredecessors, xmlDurationToDays, buildPreview, readCsv, buildCsv, readXml, buildXml,
  toExportRows, buildWorkbook, readWorkbook, TEMPLATE_COLUMNS, TYPE_TO_DB,
} from '../scheduleExchangeService.js'
import { createScheduleData } from '../scheduleData.js'

describe('small readers', () => {
  it('reads predecessor lists with types and lag', () => {
    expect(parsePredecessors('3, 5SS, 7ff+2, 9FS-1')).toEqual([
      { ref: '3', type: 'FS', lag: 0 }, { ref: '5', type: 'SS', lag: 0 },
      { ref: '7', type: 'FF', lag: 2 }, { ref: '9', type: 'FS', lag: -1 },
    ])
    expect(parsePredecessors('')).toEqual([])
    expect(parsePredecessors('3 xx')).toBeNull()
  })

  it('converts exchange durations to working days', () => {
    expect(xmlDurationToDays('PT40H0M0S')).toBe(5)
    expect(xmlDurationToDays('P2D')).toBe(2)
    expect(xmlDurationToDays('PT0H0M0S')).toBe(0)
    expect(xmlDurationToDays('nonsense')).toBeNull()
  })
})

describe('buildPreview', () => {
  it('turns rows into tasks and links', () => {
    const p = buildPreview([
      { id: '1', name: 'Design', duration: '5' },
      { id: '2', name: 'Build', duration: '10', predecessors: '1' },
      { id: '3', name: 'Go live', duration: '0', predecessors: '2FS+1' },
    ])
    expect(p.errors).toEqual([])
    expect(p.tasks.map((t) => t.task_name)).toEqual(['Design', 'Build', 'Go live'])
    expect(p.tasks[2]).toMatchObject({ is_milestone: true, estimated_duration_days: 0 })
    expect(p.links).toEqual([{ fromRef: '1', toRef: '2', type: 'FS', lag: 0 }, { fromRef: '2', toRef: '3', type: 'FS', lag: 1 }])
  })

  it('reports every problem with its row', () => {
    const p = buildPreview([
      { id: '1', name: '' },
      { id: '2', name: 'A', start: '12/10/2026' },
      { id: '2', name: 'Dup' },
      { id: '4', name: 'B', predecessors: '99' },
      { id: '5', name: 'C', percent: '150' },
      { id: '6', name: 'D', start: '2026-10-20', finish: '2026-10-10' },
    ])
    expect(p.errors.join('\n')).toMatch(/Row 1: Task name is missing/)
    expect(p.errors.join('\n')).toMatch(/Row 2: Start "12\/10\/2026"/)
    expect(p.errors.join('\n')).toMatch(/Row 3: ID 2 is used twice/)
    expect(p.errors.join('\n')).toMatch(/Predecessor 99 is not an ID/)
    expect(p.errors.join('\n')).toMatch(/% done must be 0–100/)
    expect(p.errors.join('\n')).toMatch(/Finish is before Start/)
  })

  it('rejects an empty file', () => {
    expect(buildPreview([]).errors).toEqual(['The file has no tasks.'])
  })
})

describe('CSV', () => {
  it('template carries a # data dictionary for every column and reads back', () => {
    const csv = buildCsv([{ id: 1, name: 'Design, phase 1', duration: 3, predecessors: '' }])
    for (const c of TEMPLATE_COLUMNS) expect(csv).toContain(`# ${c.label} |`)
    const rows = readCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: '1', name: 'Design, phase 1', duration: '3' })
  })

  it('accepts header aliases and needs ID + Task name', () => {
    expect(readCsv('UID,Name,Days\n1,X,2\n')[0]).toMatchObject({ id: '1', name: 'X', duration: '2' })
    expect(() => readCsv('Foo,Bar\n1,2\n')).toThrow(/ID.*Task name/)
  })
})

describe('XLSX', () => {
  it('has Instructions, Legend and Tasks sheets and reads back', () => {
    const wb = buildWorkbook(XLSX, [{ id: 1, name: 'Design', duration: 2 }])
    expect(wb.SheetNames).toEqual(['Instructions', 'Legend', 'Tasks'])
    const legend = XLSX.utils.sheet_to_json(wb.Sheets.Legend, { header: 1 })
    expect(legend[0]).toEqual(['Column', 'Required', 'Type', 'Limit', 'Notes', 'Also accepted as'])
    expect(legend).toHaveLength(TEMPLATE_COLUMNS.length + 1)
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    expect(readWorkbook(XLSX, buf)[0]).toMatchObject({ id: 1, name: 'Design', duration: 2 })
  })
})

describe('XML round trip', () => {
  it('exports tasks and links and reads them back', () => {
    const tasks = [
      { id: 'a', task_name: 'Design', estimated_duration_days: 5, planned_start_date: '2026-10-12', planned_end_date: '2026-10-16', percentage_complete: 50 },
      { id: 'b', task_name: 'Ship', is_milestone: true, planned_start_date: '2026-10-19', planned_end_date: '2026-10-19' },
    ]
    const deps = [{ predecessor_task_id: 'a', successor_task_id: 'b', dependency_type: 'start_to_start', lag_days: 2 }]
    const rows = toExportRows(tasks, deps)
    expect(rows[1].predecessors).toBe('1SS+2')
    const xml = buildXml(rows, 'Demo & Co')
    expect(xml).toContain('<Name>Demo &amp; Co</Name>')
    const back = readXml(xml)
    expect(back.map((r) => r.name)).toEqual(['Design', 'Ship'])
    expect(back[0]).toMatchObject({ duration: 5, start: '2026-10-12', percent: '50' })
    expect(back[1]).toMatchObject({ milestone: 'Yes', predecessors: '1SS+2' })
    const preview = buildPreview(back)
    expect(preview.errors).toEqual([])
    expect(preview.links).toEqual([{ fromRef: '1', toRef: '2', type: 'SS', lag: 2 }])
  })

  it('refuses unreadable XML', () => {
    expect(() => readXml('<Project><Tasks>')).toThrow(/could not be read/)
  })
})

describe('importPlan', () => {
  let respond
  beforeEach(() => {
    respond = vi.fn(() => ({ data: null, error: null }))
    dbs.platform = makeFakeDb((q) => respond(q))
    dbs.sim = makeFakeDb((q) => respond(q))
  })

  it('refuses a file whose links loop, before writing', async () => {
    const preview = buildPreview([{ id: '1', name: 'A', predecessors: '2' }, { id: '2', name: 'B', predecessors: '1' }])
    await expect(createScheduleData(false).importPlan('p1', preview, TYPE_TO_DB)).rejects.toThrow(/loop/)
    expect(dbs.platform.calls.some((c) => c.table === 'tasks')).toBe(false)
  })

  it('inserts tasks then links mapped to the new ids, into the sim schema in Simulator mode', async () => {
    respond = vi.fn((q) => {
      if (q.table === 'rpc:get_current_user_id') return { data: 'u1', error: null }
      if (q.table === 'tasks') return { data: [{ id: 'T1', custom_fields: { import_ref: '1' } }, { id: 'T2', custom_fields: { import_ref: '2' } }], error: null }
      return { data: null, error: null }
    })
    const preview = buildPreview([{ id: '1', name: 'A', duration: 2 }, { id: '2', name: 'B', duration: 1, predecessors: '1FF' }])
    const result = await createScheduleData(true).importPlan('pp1', preview, TYPE_TO_DB)
    expect(result).toMatchObject({ tasks: 2, links: 1, recalculated: true })
    const taskInsert = dbs.sim.calls.find((c) => c.table === 'tasks')
    expect(taskInsert.ops.find((o) => o[0] === 'insert')[1][0]).toMatchObject({ practice_project_id: 'pp1', task_code: '', task_name: 'A' })
    const linkInsert = dbs.sim.calls.find((c) => c.table === 'task_dependencies')
    expect(linkInsert.ops.find((o) => o[0] === 'insert')[1]).toEqual([{ predecessor_task_id: 'T1', successor_task_id: 'T2', dependency_type: 'finish_to_finish', lag_days: 0, created_by: 'u1' }])
    expect(dbs.platform.calls.filter((c) => c.table !== 'users')).toHaveLength(0)
  })
})
