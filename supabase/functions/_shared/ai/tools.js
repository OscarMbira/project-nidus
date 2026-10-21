/**
 * v1272 — Ask Nidus tool registry (D3). Pure: database access comes in through `ctx`.
 *
 * Every tool here is READ-only. Draft-writing agents (status report, meeting-to-register,
 * import mapper) are separate server pipelines that only insert draft rows.
 * Tools run with the signed-in user's Supabase client, so RLS decides what they can see.
 *
 * Registry location note (plan S1.1): kept under supabase/functions/_shared because edge
 * functions only reliably bundle code inside supabase/functions.
 */

const FILTER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'starts_with', 'is_null', 'not_null',
  'between', 'within_last_days', 'within_next_days', 'before_today', 'after_today']

export const TOOL_DEFINITIONS = {
  query_records: {
    kind: 'read',
    editions: ['platform', 'planner'],
    definition: {
      name: 'query_records',
      description:
        'Query one register from the data catalogue (shown in the system prompt) and get exact rows, counts or totals. ' +
        'Counting, summing, averaging and grouping are done by the database, so always use aggregates for "how many", "total", ' +
        '"average" or "by X" questions instead of counting rows yourself. Use only entity and field names from the catalogue. ' +
        'A field written as "project_id.budget_amount" follows the project link. Results respect the user\'s permissions.',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: ['entity'],
        properties: {
          entity: { type: 'string', description: 'Catalogue entity key, e.g. risks' },
          fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return (row mode). Omit for the default columns.' },
          filters: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['field', 'op'],
              properties: {
                field: { type: 'string' },
                op: { type: 'string', enum: FILTER_OPS },
                value: { description: 'Value, list (in/not_in/between) or number of days (within_*_days)' },
              },
            },
          },
          project_id: { type: 'string', description: 'Limit to one project (uuid). Use the current project id when the user says "this project".' },
          group_by: { type: 'array', items: { type: 'string' } },
          aggregates: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['fn'],
              properties: {
                fn: { type: 'string', enum: ['count', 'count_distinct', 'sum', 'avg', 'min', 'max'] },
                field: { type: 'string', description: 'Omit for count of rows' },
                alias: { type: 'string', description: 'lower_snake_case column name' },
              },
            },
          },
          having: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['aggregate', 'op', 'value'],
              properties: {
                aggregate: { type: 'string', description: 'An aggregate alias' },
                op: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'] },
                value: { type: 'number' },
              },
            },
          },
          sort: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['field'],
              properties: { field: { type: 'string' }, dir: { type: 'string', enum: ['asc', 'desc'] } },
            },
          },
          limit: { type: 'integer', minimum: 1, maximum: 500 },
        },
      },
    },
  },
  search_records: {
    kind: 'read',
    editions: ['platform'],
    definition: {
      name: 'search_records',
      description:
        'Search record titles and text across registers by words or by meaning (e.g. "anything about the vendor contract", ' +
        '"risks similar to supplier delays"). Returns matching records with their register and a link. Use query_records instead ' +
        'for exact filters, counts and totals.',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: ['text'],
        properties: {
          text: { type: 'string', description: 'Words or a short description to search for' },
          entity_types: { type: 'array', items: { type: 'string' }, description: 'Optional catalogue entity keys to limit the search' },
          project_id: { type: 'string', description: 'Optional project uuid' },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
      },
    },
  },
  search_help_docs: {
    kind: 'read',
    editions: ['platform', 'planner'],
    definition: {
      name: 'search_help_docs',
      description:
        'Search the Project Nidus user guides for "how do I…" questions about using the system. Answer only from what it returns.',
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: ['question'],
        properties: { question: { type: 'string' } },
      },
    },
  },
}

/** Tool definitions for an edition (Planner gets a smaller set — D16). */
export function toolsFor(edition = 'platform') {
  return Object.values(TOOL_DEFINITIONS)
    .filter((t) => t.editions.includes(edition))
    .map((t) => t.definition)
}

/** Strip internal columns and cap rows for the model's copy of a query result. */
export function compactResultForModel(result, maxRows = 60) {
  const rows = (result?.rows || []).slice(0, maxRows).map((row) => {
    const out = {}
    for (const [k, v] of Object.entries(row)) {
      if (k === '__id' || k === '__project_id') continue
      out[k === '__display_id' ? 'ref' : k] = v
    }
    return out
  })
  return {
    register: result?.entity_label,
    explanation: result?.explanation,
    total_matching: result?.total_count,
    returned: rows.length,
    truncated: Boolean(result?.truncated) || (result?.rows || []).length > rows.length,
    rows,
  }
}

function keywordsOf(text) {
  return [...new Set(String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w)))].slice(0, 30)
}

/** v1294: the model asked about a project outside this conversation's scope. */
function outOfScope() {
  return {
    content: 'OUT_OF_SCOPE: that project is not part of this conversation. Tell the user, briefly, which projects this conversation covers (see Scope).',
    isError: true,
    summary: { error: 'out_of_scope' },
  }
}

/**
 * Execute a tool.
 * @param {string} name
 * @param {object} input
 * @param {object} ctx  { db, publicDb, edition, projectId, embed?, allowedProjectIds? }
 *   db       — user-session Supabase client bound to the app schema (public or sim)
 *   publicDb — user-session client on public (help docs live there)
 *   embed    — optional (text) => pgvector literal | null, for meaning search (Phase 2b)
 *   allowedProjectIds — v1294: projects this conversation may use (array; [] = none).
 *              null/undefined = no extra limit beyond RLS (PMO "All my projects", Simulator, Planner).
 * @returns {Promise<{content: any, isError?: boolean, data?: any, summary?: any}>}
 */
export async function executeTool(name, input, ctx) {
  const def = TOOL_DEFINITIONS[name]
  if (!def || !def.editions.includes(ctx.edition || 'platform')) {
    return { content: `Tool ${name} is not available.`, isError: true }
  }

  const allowed = Array.isArray(ctx.allowedProjectIds) ? ctx.allowedProjectIds : null

  if (name === 'query_records') {
    const spec = { ...input }
    if (!spec.entity || typeof spec.entity !== 'string') return { content: 'entity is required', isError: true }
    delete spec.project_ids // only the scope below may set this
    if (allowed) {
      if (spec.project_id && !allowed.includes(spec.project_id)) return outOfScope()
      spec.project_ids = allowed
    }
    const { data, error } = await ctx.db.rpc('ai_run_query', { p_spec: spec })
    if (error) {
      const msg = String(error.message || error)
      if (msg.startsWith('AIQ_EDITION')) {
        return { content: 'NOT_IN_EDITION: that register is not available in this edition. Tell the user, briefly.', isError: true, summary: { error: 'not_in_edition' } }
      }
      return { content: msg.startsWith('AIQ') ? msg : `Query failed: ${msg}`, isError: true, summary: { error: msg.slice(0, 300) } }
    }
    return {
      content: compactResultForModel(data),
      data: { kind: 'table', ...data },
      summary: { entity: data?.entity, total_count: data?.total_count, row_count: data?.row_count, mode: data?.mode },
    }
  }

  if (name === 'search_records') {
    const text = String(input.text || '').trim()
    if (!text) return { content: 'text is required', isError: true }
    if (allowed && input.project_id && !allowed.includes(input.project_id)) return outOfScope()
    const limit = Math.min(Math.max(Number(input.limit) || 15, 1), 50)
    const params = {
      p_text: text,
      p_entity_types: Array.isArray(input.entity_types) && input.entity_types.length ? input.entity_types : null,
      p_project_id: input.project_id || (allowed?.length === 1 ? allowed[0] : null),
      // v1294: a project list is applied after the search, so ask for more to fill the answer.
      p_limit: allowed ? 50 : limit,
    }
    // Phase 2b: keyword + meaning (hybrid) when an embedding is available; keyword search otherwise.
    const embedding = ctx.embed ? await ctx.embed(text) : null
    let { data, error } = embedding
      ? await ctx.db.rpc('ai_hybrid_search', { ...params, p_embedding: embedding })
      : await ctx.db.rpc('ai_search_records', params)
    if (error && embedding) ({ data, error } = await ctx.db.rpc('ai_search_records', params))
    if (error) return { content: `Search failed: ${error.message}`, isError: true }
    const hits = (data || []).filter((h) => !allowed || allowed.includes(h.project_id)).slice(0, limit)
    return {
      content: { matches: hits.map((h) => ({ register: h.entity_type, ref: h.display_id, title: h.title, project: h.project_name, score: h.score, match: h.matched || 'keyword' })) },
      data: { kind: 'search', text, hits },
      summary: { hits: hits.length },
    }
  }

  if (name === 'search_help_docs') {
    const kws = keywordsOf(input.question)
    if (!kws.length) return { content: { excerpts: [] } }
    const { data, error } = await ctx.publicDb
      .from('ai_docs_index')
      .select('doc_title, chunk_text, doc_route')
      .overlaps('keywords', kws)
      .limit(4)
    if (error) return { content: `Help search failed: ${error.message}`, isError: true }
    const excerpts = (data || []).map((d) => ({ title: d.doc_title, route: d.doc_route, text: String(d.chunk_text || '').slice(0, 2000) }))
    return { content: { excerpts }, data: { kind: 'docs', excerpts }, summary: { excerpts: excerpts.length } }
  }

  return { content: `Unknown tool ${name}`, isError: true }
}
