/**
 * contextFetcher.js
 * Fetches relevant DB data per detected module.
 * All queries are RLS-scoped — users only see their own data.
 * Also fetches system documentation (markdown files) for how-to queries.
 * Each module fetch is capped by CONTEXT_MODULE_TIMEOUT_MS to avoid long "Gathering context…" waits.
 */

import { platformDb } from '../services/supabase/supabaseClient'

const CONTEXT_MODULE_TIMEOUT_MS = 5_000
const CONTEXT_GLOBAL_TIMEOUT_MS = 10_000

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ─── Documentation context ────────────────────────────────────────────────────

/**
 * Maps topic keywords to documentation filenames in public/Documentation/.
 * Order matters — more specific entries first.
 */
const DOC_KEYWORD_MAP = [
  { keywords: ['mandate', 'project mandate'],            file: 'User_Guide_Project_Mandate.md' },
  { keywords: ['risk register', 'risk management', 'risk'], file: 'Risk_Register_User_Guide.md' },
  { keywords: ['issue register', 'issue management', 'issue'], file: 'Issue_Register_User_Guide.md' },
  { keywords: ['stakeholder', 'engagement plan'],        file: 'Stakeholder_Multiple_Contacts_Guide.md' },
  { keywords: ['quality register', 'quality management', 'quality'], file: 'Quality_Register_User_Guide.md' },
  { keywords: ['highlight report', 'highlight'],         file: 'Highlight_Report_User_Guide.md' },
  { keywords: ['checkpoint report', 'checkpoint'],       file: 'Checkpoint_Report_User_Guide.md' },
  { keywords: ['lessons log', 'lessons learned'],        file: 'Lessons_Log_User_Guide.md' },
  { keywords: ['lessons report'],                        file: 'Lessons_Report_User_Guide.md' },
  { keywords: ['daily log'],                             file: 'Daily_Log_Implementation_Summary.md' },
  { keywords: ['end stage report', 'end stage'],         file: 'End_Stage_Report_Complete_Implementation_Summary.md' },
  { keywords: ['end project report', 'end project'],     file: 'End_Project_Report_User_Guide.md' },
  { keywords: ['exception report', 'exception'],         file: 'Exception_Report_Templates.md' },
  { keywords: ['work package'],                          file: 'Risk_Management_Strategy_User_Guide.md' },
  { keywords: ['benefit', 'benefits review'],            file: 'Benefits_Review_Plan_User_Guide.md' },
  { keywords: ['product description', 'product status'], file: 'Product_Description_Template_Management_Guide.md' },
  { keywords: ['registration', 'sign up', 'register'],  file: 'Registration_Flow_User_Guide.md' },
  { keywords: ['subscription', 'pricing', 'plan'],       file: 'Subscription_Plan_Configuration.md' },
  { keywords: ['export', 'download', 'excel', 'word', 'powerpoint'], file: 'List_Export_Excel_Word_PowerPoint_Guide.md' },
  { keywords: ['organisation', 'organization', 'setup', 'set up'], file: 'Organisation_Setup_Fix_Guide.md' },
  { keywords: ['role', 'permission', 'assign role'],     file: 'Role_Assignment_Implementation.md' },
  { keywords: ['portfolio'],                             file: 'PMO_Dashboard_User_Guide.md' },
  { keywords: ['programme', 'program'],                  file: 'Programme_Module_User_Guide.md' },
  { keywords: ['document governance', 'document'],       file: 'PMO_Document_Governance_User_Guide.md' },
  { keywords: ['project creation', 'create project', 'new project'], file: 'PMO_Project_Creation_Governance_Upgrade_Summary.md' },
]

/**
 * Split markdown into sections by heading.
 * Returns array of { heading, content } objects.
 */
function splitMarkdownSections(markdown) {
  const lines = markdown.split('\n')
  const sections = []
  let current = { heading: 'Introduction', content: [] }

  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      if (current.content.length > 0) {
        sections.push({ heading: current.heading, content: current.content.join('\n').trim() })
      }
      current = { heading: line.replace(/^#+\s*/, ''), content: [] }
    } else {
      current.content.push(line)
    }
  }
  if (current.content.length > 0) {
    sections.push({ heading: current.heading, content: current.content.join('\n').trim() })
  }
  return sections
}

/**
 * Fetch and search documentation files relevant to the user's question.
 * Returns a context string with the most relevant sections (≤ 2000 chars total).
 */
export async function fetchDocumentationContext(question) {
  const q = question.toLowerCase()

  // Find all matching doc files (deduplicated)
  const matchedFiles = []
  for (const entry of DOC_KEYWORD_MAP) {
    if (entry.keywords.some((kw) => q.includes(kw))) {
      if (!matchedFiles.includes(entry.file)) {
        matchedFiles.push(entry.file)
        if (matchedFiles.length >= 1) break // cap at 1 file — keeps context tight
      }
    }
  }

  if (matchedFiles.length === 0) return ''

  const questionWords = q.split(/\s+/).filter((w) => w.length > 3)
  let combined = ''

  for (const file of matchedFiles) {
    try {
      const res = await fetch(`/Documentation/${file}`)
      if (!res.ok) continue
      const markdown = await res.text()
      if (markdown.trim().startsWith('<')) continue // HTML fallback page — skip

      const sections = splitMarkdownSections(markdown)

      // Score each section by how many question words appear in heading + content
      const scored = sections.map((s) => {
        const text = (s.heading + ' ' + s.content).toLowerCase()
        const score = questionWords.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0)
        return { ...s, score }
      })

      // Take top 2 scoring sections, capped at 300 chars each
      const top = scored
        .filter((s) => s.score > 0 && s.content.length > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)

      for (const s of top) {
        const excerpt = s.content.slice(0, 300)
        combined += `\n### ${s.heading}\n${excerpt}${s.content.length > 300 ? '…' : ''}\n`
        if (combined.length > 1000) break
      }
    } catch {
      // File not found — skip silently
    }
  }

  if (!combined.trim()) return ''
  return `System Documentation:\n${combined}\n`
}

/**
 * Format a context block for the AI prompt.
 * charBudget: max characters for this section's row lines.
 * Rows are added one by one; if the budget is hit, remaining rows are omitted
 * and the header reflects exactly how many rows are shown — so the AI never
 * receives a count that is larger than the data it can actually read.
 */
function section(title, rows, formatter, totalCount, charBudget = Infinity) {
  if (!rows || rows.length === 0) return `${title}: None found.\n`

  const formattedRows = []
  let usedChars = 0
  for (const row of rows) {
    const line = formatter(row)
    if (formattedRows.length > 0 && usedChars + line.length > charBudget) break
    formattedRows.push(line)
    usedChars += line.length + 1 // +1 for the \n separator
  }

  const shown = formattedRows.length
  const dbTotal = (totalCount != null && totalCount > rows.length) ? totalCount : rows.length
  const label = shown < dbTotal
    ? `showing ${shown} of ${dbTotal} total — filter by a specific project for complete results`
    : `${shown} record${shown !== 1 ? 's' : ''}`
  return `${title} (${label}):\n${formattedRows.join('\n')}\n`
}

/**
 * Fast total-count query using a HEAD request — no joins, no body transfer.
 * Returns the exact row count matching the given filters.
 */
async function fetchCount(table, filters = {}) {
  try {
    let q = platformDb.from(table).select('*', { count: 'exact', head: true })
    for (const [col, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null) q = q.eq(col, val)
    }
    const { count } = await q
    return count ?? null
  } catch {
    return null
  }
}

export async function fetchRiskContext(userId, projectId) {
  try {
    const result = await fetchRiskData(userId, projectId)
    return section('Open Risks', result.rows, (r) =>
      `- [${r.risk_reference || r.id?.slice(0, 8)}] ${r.risk_title} | ` +
      `Status: ${r.status_enum} | Score: ${r.risk_score || 'N/A'} | ` +
      `Project: ${r.project?.project_name || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchRiskContext error:', err)
    return 'Risks: Unable to fetch data.\n'
  }
}

export async function fetchRiskData(userId, projectId) {
  try {
    let q = platformDb
      .from('risks')
      .select('*, project:project_id(project_name)')
      .eq('is_deleted', false)
      .order('risk_score', { ascending: false })
      .limit(100)
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('risks', { is_deleted: false, ...(projectId ? { project_id: projectId } : {}) }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchRiskData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchIssueContext(userId, projectId) {
  try {
    const result = await fetchIssueData(userId, projectId)
    return section('Open Issues', result.rows, (i) =>
      `- [${i.issue_reference || i.id?.slice(0, 8)}] ${i.issue_title} | ` +
      `Status: ${i.status_enum} | Priority: ${i.priority || 'N/A'} | ` +
      `Project: ${i.project?.project_name || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchIssueContext error:', err)
    return 'Issues: Unable to fetch data.\n'
  }
}

export async function fetchIssueData(userId, projectId) {
  try {
    let q = platformDb
      .from('issues')
      .select('*, project:project_id(project_name)')
      .eq('is_deleted', false)
      .neq('status_enum', 'Closed')
      .order('created_at', { ascending: true })
      .limit(100)
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('issues', { is_deleted: false, ...(projectId ? { project_id: projectId } : {}) }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchIssueData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchMandateContext(userId, orgId) {
  try {
    const result = await fetchMandateData(userId, orgId)
    return section('Project Mandates', result.rows, (m) =>
      `- [${m.mandate_reference || m.id?.slice(0, 8)}] ${m.project_name || m.project?.project_name || 'N/A'} | ` +
      `Approval: ${m.approval_status || 'N/A'} | Submission: ${m.submission_status || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchMandateContext error:', err)
    return 'Mandates: Unable to fetch data.\n'
  }
}

export async function fetchMandateData(userId, orgId) {
  try {
    const { data } = await platformDb
      .from('project_mandates')
      .select('*, project:project_id(project_name)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100)
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('project_mandates', { is_deleted: false }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchMandateData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchProjectContext(userId, orgId) {
  try {
    const result = await fetchProjectData(userId, orgId)
    return section('Projects', result.rows, (p) =>
      `- [${p.project_code || p.id?.slice(0, 8)}] ${p.project_name} | ` +
      `Status: ${p.project_statuses?.status_name || 'N/A'} | ` +
      `Progress: ${p.percentage_complete || 0}%`
    )
  } catch (err) {
    console.error('[AI] fetchProjectContext error:', err)
    return 'Projects: Unable to fetch data.\n'
  }
}

export async function fetchProjectData(userId, orgId) {
  try {
    const { data } = await platformDb
      .from('projects')
      .select('*, project_statuses:status_id(status_name)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100)
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('projects', { is_deleted: false }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchProjectData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchStakeholderContext(userId, projectId) {
  try {
    const result = await fetchStakeholderData(userId, projectId)
    return section('Stakeholders', result.rows, (s) =>
      `- ${s.stakeholder_name} | Type: ${s.stakeholder_type || 'N/A'} | ` +
      `Role: ${s.stakeholder_role || 'N/A'} | ` +
      `Organisation: ${s.stakeholder_organization || 'N/A'} | ` +
      `Project: ${s.project?.project_name || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchStakeholderContext error:', err)
    return 'Stakeholders: Unable to fetch data.\n'
  }
}

export async function fetchStakeholderData(userId, projectId) {
  try {
    let q = platformDb
      .from('stakeholders')
      .select('*, project:project_id(project_name)')
      .eq('is_deleted', false)
      .order('stakeholder_name', { ascending: true })
      .limit(100)
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('stakeholders', { is_deleted: false, ...(projectId ? { project_id: projectId } : {}) }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchStakeholderData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchPortfolioContext(userId, orgId) {
  try {
    const result = await fetchPortfolioData(userId, orgId)
    return section('Portfolios', result.rows, (p) =>
      `- [${p.portfolio_code || p.id?.slice(0, 8)}] ${p.portfolio_name} | Status: ${p.status || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchPortfolioContext error:', err)
    return 'Portfolios: Unable to fetch data.\n'
  }
}

export async function fetchPortfolioData(userId, orgId) {
  try {
    const { data } = await platformDb
      .from('portfolios')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100)
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('portfolios', { is_deleted: false }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchPortfolioData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchQualityContext(userId, projectId) {
  try {
    const result = await fetchQualityData(userId, projectId)
    return section('Quality Register', result.rows, (q) =>
      `- [${q.quality_item_id || q.id?.slice(0, 8)}] ${q.quality_title || 'N/A'} | ` +
      `Status: ${q.status || 'N/A'} | Method: ${q.quality_method || 'N/A'} | ` +
      `Target: ${q.target_date || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchQualityContext error:', err)
    return 'Quality: Unable to fetch data.\n'
  }
}

export async function fetchQualityData(userId, projectId) {
  try {
    let q = platformDb
      .from('quality_registers')
      .select('*, project:project_id(project_name)')
      .eq('is_deleted', false)
      .order('target_date', { ascending: true })
      .limit(100)
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('quality_registers', { is_deleted: false, ...(projectId ? { project_id: projectId } : {}) }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchQualityData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchBenefitContext(userId, projectId) {
  try {
    const result = await fetchBenefitData(userId, projectId)
    return section('Benefits', result.rows, (b) =>
      `- [${b.benefit_reference || b.id?.slice(0, 8)}] ${b.benefit_title} | ` +
      `Type: ${b.benefit_type || 'N/A'} | Status: ${b.status || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchBenefitContext error:', err)
    return 'Benefits: Unable to fetch data.\n'
  }
}

export async function fetchBenefitData(userId, projectId) {
  try {
    let q = platformDb
      .from('project_benefits')
      .select('*, project:project_id(project_name)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100)
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('project_benefits', { is_deleted: false, ...(projectId ? { project_id: projectId } : {}) }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchBenefitData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

export async function fetchTaskContext(userId, projectId) {
  try {
    const result = await fetchTaskData(userId, projectId)
    return section('Tasks', result.rows, (t) =>
      `- ${t.task_name} | Status: ${t.task_statuses?.status_name || 'N/A'} | ` +
      `Due: ${t.due_date || 'N/A'} | Priority: ${t.priority || 'N/A'} | ` +
      `Project: ${t.projects?.project_name || 'N/A'}`
    )
  } catch (err) {
    console.error('[AI] fetchTaskContext error:', err)
    return 'Tasks: Unable to fetch data.\n'
  }
}

export async function fetchTaskData(userId, projectId) {
  try {
    let q = platformDb
      .from('tasks')
      .select('*, task_statuses(status_name), projects(project_name)')
      .eq('is_deleted', false)
      .order('due_date', { ascending: true })
      .limit(100)
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    const rows = data || []
    const totalCount = rows.length < 100
      ? rows.length
      : await fetchCount('tasks', { is_deleted: false, ...(projectId ? { project_id: projectId } : {}) }) ?? rows.length
    return { rows, totalCount }
  } catch (err) {
    console.error('[AI] fetchTaskData error:', err)
    return { rows: [], totalCount: 0 }
  }
}

/**
 * Master fetcher — calls the right fetchers based on detected modules.
 * Each fetcher is capped at CONTEXT_MODULE_TIMEOUT_MS; the whole run is capped at CONTEXT_GLOBAL_TIMEOUT_MS.
 * Returns a combined context string for the AI prompt.
 * @param {string[]} modules  - Module names from intentDetector
 * @param {string}   userId
 * @param {string}   projectId
 * @param {string}   orgId
 * @param {string}   question  - Original question, needed for documentation search
 */
export async function fetchContext(modules, userId, projectId, orgId, question = '') {
  if (!modules || modules.length === 0) return ''

  const fetchers = {
    risks:         () => fetchRiskContext(userId, projectId),
    issues:        () => fetchIssueContext(userId, projectId),
    mandates:      () => fetchMandateContext(userId, orgId),
    projects:      () => fetchProjectContext(userId, orgId),
    stakeholders:  () => fetchStakeholderContext(userId, projectId),
    portfolio:     () => fetchPortfolioContext(userId, orgId),
    quality:       () => fetchQualityContext(userId, projectId),
    benefits:      () => fetchBenefitContext(userId, projectId),
    tasks:         () => fetchTaskContext(userId, projectId),
    documentation: () => fetchDocumentationContext(question),
  }

  const toRun = modules.filter((m) => fetchers[m])
  if (toRun.length === 0) return ''

  const runOne = async (m) => {
    const fallback = `${m}: (data temporarily unavailable)\n`
    return withTimeout(
      fetchers[m]().catch(() => fallback),
      CONTEXT_MODULE_TIMEOUT_MS,
      fallback
    )
  }

  const globalTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('CONTEXT_TIMEOUT')), CONTEXT_GLOBAL_TIMEOUT_MS)
  )

  const results = await Promise.race([
    Promise.all(toRun.map(runOne)),
    globalTimeout,
  ]).catch((err) => {
    if (err?.message === 'CONTEXT_TIMEOUT') return toRun.map((m) => `${m}: (timeout)\n`)
    throw err
  })

  return Array.isArray(results) ? results.join('\n') : ''
}

// ─── Structured context (for NotebookLM-style Sources) ───────────────────────

const DATA_MODULES = ['risks', 'issues', 'mandates', 'projects', 'stakeholders', 'portfolio', 'quality', 'benefits', 'tasks']

const structuredFetchers = {
  risks:         (userId, projectId, _orgId) => fetchRiskData(userId, projectId),
  issues:        (userId, projectId, _orgId) => fetchIssueData(userId, projectId),
  mandates:      (userId, _projectId, orgId) => fetchMandateData(userId, orgId),
  projects:      (userId, _projectId, orgId) => fetchProjectData(userId, orgId),
  stakeholders:  (userId, projectId, _orgId) => fetchStakeholderData(userId, projectId),
  portfolio:      (userId, _projectId, orgId) => fetchPortfolioData(userId, orgId),
  quality:        (userId, projectId, _orgId) => fetchQualityData(userId, projectId),
  benefits:       (userId, projectId, _orgId) => fetchBenefitData(userId, projectId),
  tasks:         (userId, projectId, _orgId) => fetchTaskData(userId, projectId),
}

// ─── Universal row formatter ──────────────────────────────────────────────────

/**
 * System/audit/tenant fields always excluded from AI context.
 * Raw FK UUID fields (ending in _id) are also skipped automatically in the formatter
 * and shown via their join labels instead.
 */
const SYSTEM_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted',
  'created_by', 'updated_by', 'deleted_by',
  'organisation_id', 'account_id', 'user_id',
  'embedding', // vector field — never show raw
])

/**
 * Per-module config for universalRowFormatter.
 *   refField:   shown as [REF] prefix  (null = no reference code)
 *   titleField: main display name
 *   joins:      nested Supabase join objects — { key: string, label: string }
 */
const MODULE_FORMATTER_CONFIG = {
  risks:        { refField: 'risk_reference',    titleField: 'risk_title',       joins: [{ key: 'project',          label: 'Project' }] },
  issues:       { refField: 'issue_reference',   titleField: 'issue_title',      joins: [{ key: 'project',          label: 'Project' }] },
  mandates:     { refField: 'mandate_reference', titleField: 'mandate_title',    joins: [{ key: 'project',          label: 'Project' }] },
  projects:     { refField: 'project_code',      titleField: 'project_name',     joins: [{ key: 'project_statuses', label: 'Status'  }] },
  stakeholders: { refField: null,                titleField: 'stakeholder_name', joins: [{ key: 'project',          label: 'Project' }] },
  portfolio:    { refField: 'portfolio_code',    titleField: 'portfolio_name',   joins: [] },
  quality:      { refField: 'quality_item_id',   titleField: 'quality_title',    joins: [{ key: 'project',          label: 'Project' }] },
  benefits:     { refField: 'benefit_reference', titleField: 'benefit_title',    joins: [{ key: 'project',          label: 'Project' }] },
  tasks:        { refField: null,                titleField: 'task_name',        joins: [{ key: 'task_statuses',    label: 'Status'  }, { key: 'projects', label: 'Project' }] },
}

/**
 * Universal row formatter — dynamically emits every non-system business field.
 * Adding a new column to any DB table is immediately visible to the AI
 * with zero code changes here.
 */
function universalRowFormatter(row, config = {}) {
  const { refField = null, titleField = null, joins = [] } = config
  const parts = []

  // Build prefix line: - [REF] Title  OR  - Title  OR  - id-fallback
  const ref        = refField   ? row[refField]   : null
  const title      = titleField ? row[titleField] : null
  const idFallback = row.id?.slice(0, 8) ?? 'record'
  if (ref && title) parts.push(`- [${ref}] ${title}`)
  else if (title)   parts.push(`- ${title}`)
  else              parts.push(`- ${idFallback}`)

  const joinKeys = new Set(joins.map((j) => j.key))

  // Emit every business field that is non-null and non-empty
  for (const [key, val] of Object.entries(row)) {
    if (SYSTEM_FIELDS.has(key)) continue
    if (key === refField || key === titleField) continue   // already in prefix
    if (joinKeys.has(key)) continue                        // handled in joins block below
    if (key.endsWith('_id')) continue                      // raw FK UUID — shown via join label
    if (val === null || val === undefined || val === '') continue
    if (typeof val === 'object') continue                  // un-configured nested objects
    const label   = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)
    parts.push(`${label}: ${display}`)
  }

  // Append values from configured join objects
  for (const { key, label } of joins) {
    const nested = row[key]
    if (!nested) continue
    const items = Array.isArray(nested) ? nested : [nested]
    const names = items.flatMap((item) => Object.values(item).filter(Boolean)).join(', ')
    if (names) parts.push(`${label}: ${names}`)
  }

  return parts.join(' | ')
}

/** One formatter per module — all driven by MODULE_FORMATTER_CONFIG. */
const rowFormatters = Object.fromEntries(
  Object.entries(MODULE_FORMATTER_CONFIG).map(([module, config]) => [
    module,
    (row) => universalRowFormatter(row, config),
  ])
)

const sectionTitles = {
  risks: 'Open Risks',
  issues: 'Open Issues',
  mandates: 'Project Mandates',
  projects: 'Projects',
  stakeholders: 'Stakeholders',
  portfolio: 'Portfolios',
  quality: 'Quality Register',
  benefits: 'Benefits',
  tasks: 'Tasks',
}

/**
 * Fetch context with both formatted text and structured rows per module.
 * Used for data queries: answer text + Sources block in UI.
 * @param {string[]} modules - Module names from intentDetector (including 'documentation' for doc text only)
 * @param {string} userId
 * @param {string} projectId
 * @param {string} orgId
 * @param {string} question - For documentation context if included in modules
 * @returns {Promise<{ formattedText: string, structured: Record<string, unknown[]> }>}
 */
export async function fetchContextStructured(modules, userId, projectId, orgId, question = '') {
  const toRun = (modules || []).filter((m) => DATA_MODULES.includes(m) || m === 'documentation')
  if (toRun.length === 0) return { formattedText: '', structured: {} }

  const dataModules = toRun.filter((m) => m !== 'documentation')

  // Run all data modules in parallel (with per-module timeout) + global cap
  const fetchOne = async (m) => {
    const fn = structuredFetchers[m]
    if (!fn) return { m, rows: [], totalCount: 0 }
    const result = await withTimeout(
      fn(userId, projectId, orgId).catch(() => ({ rows: [], totalCount: 0 })),
      CONTEXT_MODULE_TIMEOUT_MS,
      { rows: [], totalCount: 0 }
    )
    return { m, rows: result?.rows || [], totalCount: result?.totalCount ?? 0 }
  }

  const globalTimeout = new Promise((resolve) =>
    setTimeout(() => resolve(dataModules.map((m) => ({ m, rows: [], totalCount: 0 }))), CONTEXT_GLOBAL_TIMEOUT_MS)
  )

  const moduleResults = await Promise.race([
    Promise.all(dataModules.map(fetchOne)),
    globalTimeout,
  ])

  const formattedParts = []
  const structured = {}

  // Divide the total prompt budget evenly across active data modules so each
  // section's header count exactly matches what Gemini will read.
  const PROMPT_BUDGET = 38000
  const budgetPerModule = Math.floor(PROMPT_BUDGET / Math.max(moduleResults.length, 1))

  for (const { m, rows, totalCount } of moduleResults) {
    structured[m] = rows
    if (totalCount > rows.length) structured[`${m}_total`] = totalCount
    const title = sectionTitles[m] || m
    const formatter = rowFormatters[m]
    if (formatter) formattedParts.push(section(title, rows, formatter, totalCount, budgetPerModule))
    else formattedParts.push(section(title, rows, (r) => String(r.id || JSON.stringify(r)), totalCount, budgetPerModule))
  }

  if (toRun.includes('documentation')) {
    const docText = await withTimeout(fetchDocumentationContext(question), CONTEXT_MODULE_TIMEOUT_MS, '')
    if (docText) formattedParts.push(docText)
  }

  const formattedText = formattedParts.join('\n')
  return { formattedText, structured }
}
