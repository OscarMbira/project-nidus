import { describe, expect, it, vi } from 'vitest'
import { compactResultForModel, executeTool, TOOL_DEFINITIONS, toolsFor } from '../tools.js'
import { buildAskNidusSystem, catalogueText, toolStatus } from '../prompts.js'

const catalogue = {
  edition: 'platform',
  entities: [{
    entity: 'risks', label: 'Risks', description: 'Risk register',
    fields: [
      { field: 'status', label: 'Status', type: 'text', filter: true, group: true, values: ['open', 'closed'] },
      { field: 'risk_score', label: 'Score', type: 'number', filter: true, sum: true },
      { field: 'project_id', label: 'Project (link)', type: 'uuid', filter: true, link: 'projects' },
    ],
  }],
}

describe('tool registry', () => {
  it('every tool is read-only', () => {
    for (const t of Object.values(TOOL_DEFINITIONS)) expect(t.kind).toBe('read')
  })

  it('gives the Planner edition no record search (D16)', () => {
    const names = toolsFor('planner').map((t) => t.name)
    expect(names).toContain('query_records')
    expect(names).not.toContain('search_records')
    expect(toolsFor('platform').map((t) => t.name)).toContain('search_records')
  })

  it('tool schemas forbid unknown properties', () => {
    for (const t of toolsFor('platform')) expect(t.input_schema.additionalProperties).toBe(false)
  })
})

describe('executeTool', () => {
  it('passes the query description to ai_run_query and compacts the result', async () => {
    const result = { entity: 'risks', entity_label: 'Risks', explanation: 'Risks where status eq open', total_count: 2, row_count: 2,
      rows: [{ __id: 'u1', __project_id: 'p', __display_id: 'RSK-1', title: 'A' }, { __id: 'u2', __project_id: 'p', __display_id: 'RSK-2', title: 'B' }] }
    const db = { rpc: vi.fn().mockResolvedValue({ data: result, error: null }) }
    const out = await executeTool('query_records', { entity: 'risks', filters: [{ field: 'status', op: 'eq', value: 'open' }] }, { db, edition: 'platform' })
    expect(db.rpc).toHaveBeenCalledWith('ai_run_query', { p_spec: { entity: 'risks', filters: [{ field: 'status', op: 'eq', value: 'open' }] } })
    expect(out.content.rows[0]).toEqual({ ref: 'RSK-1', title: 'A' }) // no internal ids for the model
    expect(out.data.kind).toBe('table')
    expect(out.data.rows[0].__id).toBe('u1') // full result kept for the UI
  })

  it('returns runner validation errors to the model so it can fix the query', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'AIQ: Risks has no field "colour"' } }) }
    const out = await executeTool('query_records', { entity: 'risks', fields: ['colour'] }, { db, edition: 'platform' })
    expect(out.isError).toBe(true)
    expect(out.content).toMatch(/^AIQ:/)
  })

  it('turns an edition refusal into a short not-in-edition result', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'AIQ_EDITION: Risks is not available in the planner edition' } }) }
    const out = await executeTool('query_records', { entity: 'risks' }, { db, edition: 'planner' })
    expect(out.content).toMatch(/NOT_IN_EDITION/)
    expect(out.summary.error).toBe('not_in_edition')
  })

  it('refuses tools that the edition does not have', async () => {
    const out = await executeTool('search_records', { text: 'x' }, { db: {}, edition: 'planner' })
    expect(out.isError).toBe(true)
  })

  it('searches help docs by keywords', async () => {
    const chain = { select: vi.fn().mockReturnThis(), overlaps: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [{ doc_title: 'Risks', chunk_text: 'Create a risk…', doc_route: '/risks' }], error: null }) }
    const publicDb = { from: vi.fn().mockReturnValue(chain) }
    const out = await executeTool('search_help_docs', { question: 'How do I create a risk?' }, { publicDb, edition: 'platform' })
    expect(chain.overlaps).toHaveBeenCalledWith('keywords', expect.arrayContaining(['create', 'risk']))
    expect(out.content.excerpts).toHaveLength(1)
  })

  it('caps rows sent to the model and flags truncation', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ n: i }))
    const out = compactResultForModel({ rows, total_count: 100 }, 60)
    expect(out.returned).toBe(60)
    expect(out.truncated).toBe(true)
  })
})

describe('system prompt', () => {
  it('lists catalogue fields with flags, values and links', () => {
    const text = catalogueText(catalogue)
    expect(text).toMatch(/## risks — Risks/)
    expect(text).toMatch(/status \(text, filter\/group\) Status — values: open, closed/)
    expect(text).toMatch(/links to projects/)
  })

  it('puts the stable part first with cache_control and the per-request context after', () => {
    const blocks = buildAskNidusSystem({ app: 'platform', catalogue, context: { today: '2026-10-19', projectId: 'p1', projectName: 'Alpha', languageName: 'French', languageCode: 'fr-FR' } })
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(blocks[0].text).not.toMatch(/2026-10-19/)
    expect(blocks[1].text).toMatch(/Alpha \(project_id p1\)/)
    expect(blocks[1].text).toMatch(/French/)
  })

  it('tells the Planner edition what is out of scope', () => {
    const blocks = buildAskNidusSystem({ app: 'planner', catalogue: { ...catalogue, edition: 'planner' } })
    expect(blocks[0].text).toMatch(/Project Planner edition/)
  })

  it('describes tool progress in plain words', () => {
    expect(toolStatus('query_records', { entity: 'risks', aggregates: [{ fn: 'count' }] }, catalogue)).toBe('Calculating risks…')
    expect(toolStatus('search_records', {}, catalogue)).toBe('Searching records…')
  })
})

describe('v1294 project scope', () => {
  const okResult = { entity: 'risks', entity_label: 'Risks', total_count: 0, row_count: 0, rows: [] }
  const P1 = '11111111-1111-1111-1111-111111111111'
  const P2 = '22222222-2222-2222-2222-222222222222'

  it('adds the allowed projects to every query', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: okResult, error: null }) }
    await executeTool('query_records', { entity: 'risks', group_by: ['project_name'] }, { db, edition: 'platform', allowedProjectIds: [P1] })
    expect(db.rpc).toHaveBeenCalledWith('ai_run_query', { p_spec: { entity: 'risks', group_by: ['project_name'], project_ids: [P1] } })
  })

  it('refuses a project outside the scope without querying', async () => {
    const db = { rpc: vi.fn() }
    const out = await executeTool('query_records', { entity: 'risks', project_id: P2 }, { db, edition: 'platform', allowedProjectIds: [P1] })
    expect(out.isError).toBe(true)
    expect(out.content).toMatch(/OUT_OF_SCOPE/)
    expect(db.rpc).not.toHaveBeenCalled()
  })

  it('ignores a project list sent by the model, and adds none when the scope is unlimited', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: okResult, error: null }) }
    await executeTool('query_records', { entity: 'risks', project_ids: [P2] }, { db, edition: 'platform', allowedProjectIds: null })
    expect(db.rpc).toHaveBeenCalledWith('ai_run_query', { p_spec: { entity: 'risks' } })
  })

  it('an empty scope still sends an empty list (no rows, fails closed)', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: okResult, error: null }) }
    await executeTool('query_records', { entity: 'risks' }, { db, edition: 'platform', allowedProjectIds: [] })
    expect(db.rpc).toHaveBeenCalledWith('ai_run_query', { p_spec: { entity: 'risks', project_ids: [] } })
  })

  it('keeps only search hits from allowed projects', async () => {
    const hits = [
      { entity_type: 'risks', display_id: 'RSK-1', title: 'A', project_id: P1, project_name: 'One' },
      { entity_type: 'risks', display_id: 'RSK-2', title: 'B', project_id: P2, project_name: 'Two' },
      { entity_type: 'lessons', display_id: 'LES-1', title: 'C', project_id: null, project_name: null },
    ]
    const db = { rpc: vi.fn().mockResolvedValue({ data: hits, error: null }) }
    const out = await executeTool('search_records', { text: 'steel' }, { db, edition: 'platform', allowedProjectIds: [P1] })
    expect(db.rpc).toHaveBeenCalledWith('ai_search_records', expect.objectContaining({ p_project_id: P1, p_limit: 50 }))
    expect(out.data.hits.map((h) => h.display_id)).toEqual(['RSK-1'])
  })
})

describe('v1294 scope line in the system prompt', () => {
  const dynamicText = (context) => buildAskNidusSystem({ app: 'platform', catalogue, context })[1].text

  it('says the conversation covers only the current project', () => {
    const text = dynamicText({ projectId: 'p1', projectName: 'Velocity Freight', scope: { mode: 'project', project_ids: ['p1'], can_choose_all: true } })
    expect(text).toMatch(/covers only the current project/)
    expect(text).toMatch(/All my projects/)
  })

  it('describes assigned-only and organisation-wide scopes', () => {
    expect(dynamicText({ scope: { mode: 'all', project_ids: ['a', 'b'] } })).toMatch(/only the 2 projects the user is assigned to/)
    expect(dynamicText({ scope: { mode: 'all', project_ids: null, org_wide: true } })).toMatch(/every project in the organisation/)
    expect(dynamicText({ scope: { mode: 'project', project_ids: [] } })).toMatch(/not assigned to any project/)
  })

  it('leaves the Simulator / Planner wording unchanged when there is no scope', () => {
    expect(dynamicText({})).toMatch(/No project is open/)
  })
})
