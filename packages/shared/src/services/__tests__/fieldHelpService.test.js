import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

const { loadFieldHelp, recordFieldHelpOpen, recordFieldHelpVote, resetFieldHelpCacheForTests, commonRegisterKey } = await import('../fieldHelpService')

/** Minimal query-builder fake: records calls and returns rows per table. */
function fakeDb(tables, log = []) {
  return {
    log,
    from(table) {
      const q = { table, filters: [] }
      const builder = {
        select() { return builder },
        order() { return builder },
        limit() { log.push({ table, op: 'version' }); return Promise.resolve({ data: tables[`${table}:version`] || [], error: null }) },
        in(col, vals) { q.filters.push([col, vals]); return builder },
        eq(col, val) { q.filters.push([col, val]); return builder },
        then(resolve) {
          log.push({ table, op: 'select', filters: q.filters })
          return Promise.resolve({ data: tables[table] || [], error: null }).then(resolve)
        },
        insert(row) { log.push({ table, op: 'insert', row }); return Promise.resolve({ error: null }) },
        delete() {
          log.push({ table, op: 'delete' })
          const del = { eq: () => del, in: () => Promise.resolve({ error: null }) }
          return del
        },
      }
      return builder
    },
  }
}

const HELP = { help_key: 'public.stakeholders.stakeholder_name', form_key: '', title: 'Stakeholder name', purpose: 'Who', examples: '- A' }

describe('fieldHelpService (v1345)', () => {
  beforeEach(() => resetFieldHelpCacheForTests())

  it('loads help in one query and resolves Simulator aliases (PD1)', async () => {
    const db = fakeDb({
      'field_help:version': [{ updated_at: '2026-11-19T10:00:00Z' }],
      field_help_aliases: [{ alias_key: 'sim.practice_stakeholder_register.stakeholder_name', help_key: HELP.help_key }],
      field_help: [HELP],
    })
    const help = await loadFieldHelp(['sim.practice_stakeholder_register.stakeholder_name', 'sim.practice_stakeholder_register.none'], { db })
    expect(help['sim.practice_stakeholder_register.stakeholder_name'].title).toBe('Stakeholder name')
    expect(help['sim.practice_stakeholder_register.none']).toBeNull()
    expect(db.log.filter((l) => l.table === 'field_help' && l.op === 'select')).toHaveLength(1)
  })

  it('a Simulator key with no alias falls back to the Platform key of the same table and column (2026-11-22)', async () => {
    const db = fakeDb({
      field_help_aliases: [],
      field_help: [{ ...HELP, help_key: 'public.change_requests.cost_impact_level', title: 'Cost impact' }],
    })
    const help = await loadFieldHelp(['sim.change_requests.cost_impact_level'], { db })
    expect(help['sim.change_requests.cost_impact_level'].title).toBe('Cost impact')
    const sel = db.log.find((l) => l.table === 'field_help' && l.op === 'select')
    expect(sel.filters.find(([c]) => c === 'help_key')[1]).toContain('public.change_requests.cost_impact_level')
  })

  it('serves repeat loads from the cache and clears it when the help version changes (P8)', async () => {
    const tables = { 'field_help:version': [{ updated_at: 'v1' }], field_help: [HELP] }
    const db = fakeDb(tables)
    await loadFieldHelp([HELP.help_key], { db })
    await loadFieldHelp([HELP.help_key], { db })
    expect(db.log.filter((l) => l.table === 'field_help' && l.op === 'select')).toHaveLength(1)

    // New page load with edited help → cache cleared, help read again.
    resetFieldHelpCacheForTests()
    sessionStorage.setItem('nidus:fieldHelp:v2', JSON.stringify({ version: 'v1', entries: { [`en||${HELP.help_key}`]: { ...HELP, title: 'Old' } } }))
    tables['field_help:version'] = [{ updated_at: 'v2' }]
    const db2 = fakeDb(tables)
    const help = await loadFieldHelp([HELP.help_key], { db: db2 })
    expect(help[HELP.help_key].title).toBe('Stakeholder name')
  })

  it('never filters form_key in the query (PostgREST sends in.("") as an empty list)', async () => {
    const db = fakeDb({ field_help: [HELP, { ...HELP, form_key: 'other_form', title: 'Not for this form' }] })
    const help = await loadFieldHelp([HELP.help_key], { db })
    const select = db.log.find((l) => l.table === 'field_help' && l.op === 'select')
    expect(select.filters.map(([col]) => col)).not.toContain('form_key')
    expect(help[HELP.help_key].title).toBe('Stakeholder name')
  })

  it('register fields fall back to the common help for their field key (S2-D1)', async () => {
    expect(commonRegisterKey('register:fin_cutover:owner')).toBe('register:*:owner')
    expect(commonRegisterKey('register:*:owner')).toBeNull()
    expect(commonRegisterKey('public.stakeholders.notes')).toBeNull()
    const db = fakeDb({ field_help: [
      { help_key: 'register:*:owner', form_key: '', title: 'Owner', purpose: 'Common owner help', examples: '- Head of Finance' },
      { help_key: 'register:fin_cutover:notes', form_key: '', title: 'Notes', purpose: 'Cutover notes help', examples: '- x' },
      { help_key: 'register:*:notes', form_key: '', title: 'Notes', purpose: 'Common notes help', examples: '- x' },
    ] })
    const help = await loadFieldHelp(['register:fin_cutover:owner', 'register:fin_cutover:notes', 'register:fin_cutover:none'], { db })
    expect(help['register:fin_cutover:owner'].purpose).toBe('Common owner help')
    expect(help['register:fin_cutover:notes'].purpose).toBe('Cutover notes help')
    expect(help['register:fin_cutover:none']).toBeNull()
  })

  it('prefers a form override over the shared default', async () => {
    const db = fakeDb({ field_help: [HELP, { ...HELP, form_key: 'bulk', title: 'Name column' }] })
    const help = await loadFieldHelp([HELP.help_key], { db, formKey: 'bulk' })
    expect(help[HELP.help_key].title).toBe('Name column')
  })

  it('records one open per key per session and replaces a vote (P9)', async () => {
    const db = fakeDb({})
    await recordFieldHelpOpen(db, 'k1')
    await recordFieldHelpOpen(db, 'k1')
    expect(db.log.filter((l) => l.op === 'insert')).toHaveLength(1)
    const result = await recordFieldHelpVote(db, 'k1', false)
    expect(result.success).toBe(true)
    expect(db.log.some((l) => l.op === 'delete')).toBe(true)
    expect(db.log.at(-1).row).toMatchObject({ help_key: 'k1', event_type: 'helpful_no' })
  })
})
