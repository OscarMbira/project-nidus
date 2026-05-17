/**
 * Load project + hierarchy context for invitation emails and template placeholders (v576).
 */

import { platformDb } from './supabase/supabaseClient'
import { getProjectPortfolio } from './portfolioService'
import { getProjectProgramme } from './programmeService'

const NOT_LINKED_PORTFOLIO =
  'This project is not currently assigned to a portfolio.'
const NOT_LINKED_PROGRAMME =
  'This project is not currently assigned to a programme.'

function formatDisplayDate(value) {
  if (!value) return null
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return null
  }
}

function formatTimeline(start, end) {
  const s = formatDisplayDate(start)
  const e = formatDisplayDate(end)
  if (s && e) return `${s} – ${e}`
  if (s) return `From ${s}`
  if (e) return `Until ${e}`
  return 'Dates not set'
}

function hierarchyLabel(code, name) {
  const c = String(code ?? '').trim()
  const n = String(name ?? '').trim()
  if (c && n) return `${c} — ${n}`
  if (n) return n
  if (c) return c
  return ''
}

function buildHierarchyLine(kind, link) {
  const prefix = kind === 'portfolio' ? 'Portfolio' : 'Programme'
  if (link?.linked) {
    const label = hierarchyLabel(link.code, link.name)
    return label ? `${prefix}: ${label}` : `${prefix}: (assigned)`
  }
  return `${prefix}: ${kind === 'portfolio' ? NOT_LINKED_PORTFOLIO : NOT_LINKED_PROGRAMME}`
}

/**
 * @param {string} projectId
 * @returns {Promise<object|null>}
 */
export async function loadInvitationProjectContext(projectId) {
  if (!projectId) return null

  try {
    const { data: project, error: projErr } = await platformDb
      .from('projects')
      .select(
        `
        id,
        project_name,
        project_code,
        project_description,
        delivery_methodology,
        planned_start_date,
        planned_end_date,
        project_types:project_type_id (type_name)
      `,
      )
      .eq('id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (projErr || !project) {
      console.warn('[loadInvitationProjectContext] project fetch failed', projErr?.message)
      return null
    }

    let portfolioLink = { linked: false, code: '', name: '', line: buildHierarchyLine('portfolio', { linked: false }) }
    let programmeLink = { linked: false, code: '', name: '', line: buildHierarchyLine('programme', { linked: false }) }

    const [portfolioResult, programmeResult] = await Promise.all([
      getProjectPortfolio(projectId).catch((e) => {
        console.warn('[loadInvitationProjectContext] portfolio', e?.message)
        return null
      }),
      getProjectProgramme(projectId).catch((e) => {
        console.warn('[loadInvitationProjectContext] programme', e?.message)
        return null
      }),
    ])

    const port = portfolioResult?.portfolios
    if (port) {
      portfolioLink = {
        linked: true,
        code: port.portfolio_code || '',
        name: port.portfolio_name || '',
        line: '',
      }
      portfolioLink.line = buildHierarchyLine('portfolio', portfolioLink)
    }

    const prog = programmeResult?.programmes
    if (prog) {
      programmeLink = {
        linked: true,
        code: prog.programme_code || '',
        name: prog.programme_name || '',
        line: '',
      }
      programmeLink.line = buildHierarchyLine('programme', programmeLink)
    }

    const projectName = project.project_name?.trim() || ''
    const projectCode = project.project_code?.trim() || ''
    const projectDescription = project.project_description?.trim() || ''
    const projectType =
      project.project_types?.type_name?.trim() || 'Not specified'
    const projectMethodology =
      project.delivery_methodology?.trim() || 'Not specified'
    const projectStartDate = formatDisplayDate(project.planned_start_date)
    const projectEndDate = formatDisplayDate(project.planned_end_date)
    const timeline = formatTimeline(project.planned_start_date, project.planned_end_date)

    const projectLine = hierarchyLabel(projectCode, projectName)
      ? `Project: ${hierarchyLabel(projectCode, projectName)}`
      : projectName
        ? `Project: ${projectName}`
        : ''

    const hierarchyLines = [portfolioLink.line, programmeLink.line, projectLine].filter(Boolean)
    const hierarchyBlockPlain = hierarchyLines.join('\n')

    const projectDetailLines = []
    if (projectDescription) {
      projectDetailLines.push(`Description: ${projectDescription}`)
    }
    projectDetailLines.push(`Type: ${projectType}`)
    projectDetailLines.push(`Methodology: ${projectMethodology}`)
    projectDetailLines.push(`Timeline: ${timeline}`)

    const projectContextBlockPlain = [
      'Project context',
      ...projectDetailLines,
      '',
      'Hierarchy',
      ...hierarchyLines,
    ].join('\n')

    const placeholderMap = {
      project_name: projectName || 'this project',
      project_code: projectCode,
      project_description: projectDescription,
      project_type: projectType,
      project_methodology: projectMethodology,
      project_start_date: projectStartDate || '',
      project_end_date: projectEndDate || '',
      project_timeline: timeline,
      portfolio_code: portfolioLink.linked ? portfolioLink.code : '',
      portfolio_name: portfolioLink.linked ? portfolioLink.name : '',
      programme_code: programmeLink.linked ? programmeLink.code : '',
      programme_name: programmeLink.linked ? programmeLink.name : '',
      portfolio_context_line: portfolioLink.line,
      programme_context_line: programmeLink.line,
      hierarchy_block: hierarchyBlockPlain,
      project_context_block: projectContextBlockPlain,
    }

    return {
      projectId,
      projectName,
      projectCode,
      projectDescription,
      projectType,
      projectMethodology,
      projectStartDate,
      projectEndDate,
      timeline,
      portfolio: portfolioLink,
      programme: programmeLink,
      projectLine,
      hierarchyBlockPlain,
      projectContextBlockPlain,
      placeholderMap,
    }
  } catch (err) {
    console.warn('[loadInvitationProjectContext]', err?.message)
    return null
  }
}

/** Sample context for invitation template admin preview (no DB). */
export function buildMockInvitationProjectContext() {
  const portfolioLink = {
    linked: true,
    code: 'PF-SAMPLE',
    name: 'Sample Portfolio',
    line: 'Portfolio: PF-SAMPLE — Sample Portfolio',
  }
  const programmeLink = {
    linked: false,
    code: '',
    name: '',
    line: `Programme: ${NOT_LINKED_PROGRAMME}`,
  }
  const projectLine = 'Project: SP-ALPHA — Sample Project Alpha'
  const hierarchyLines = [portfolioLink.line, programmeLink.line, projectLine]
  const projectContextBlockPlain = [
    'Project context',
    'Description: Sample initiative for preview purposes.',
    'Type: Strategic Initiative',
    'Methodology: Hybrid PM',
    'Timeline: 1 May 2025 – 24 Mar 2028',
    '',
    'Hierarchy',
    ...hierarchyLines,
  ].join('\n')

  return {
    projectName: 'Sample Project Alpha',
    projectCode: 'SP-ALPHA',
    projectDescription: 'Sample initiative for preview purposes.',
    projectType: 'Strategic Initiative',
    projectMethodology: 'Hybrid PM',
    projectStartDate: '1 May 2025',
    projectEndDate: '24 Mar 2028',
    timeline: '1 May 2025 – 24 Mar 2028',
    portfolio: portfolioLink,
    programme: programmeLink,
    projectLine,
    hierarchyBlockPlain: hierarchyLines.join('\n'),
    projectContextBlockPlain,
    placeholderMap: {
      project_name: 'Sample Project Alpha',
      project_code: 'SP-ALPHA',
      project_description: 'Sample initiative for preview purposes.',
      project_type: 'Strategic Initiative',
      project_methodology: 'Hybrid PM',
      project_start_date: '1 May 2025',
      project_end_date: '24 Mar 2028',
      project_timeline: '1 May 2025 – 24 Mar 2028',
      portfolio_code: 'PF-SAMPLE',
      portfolio_name: 'Sample Portfolio',
      programme_code: '',
      programme_name: '',
      portfolio_context_line: portfolioLink.line,
      programme_context_line: programmeLink.line,
      hierarchy_block: hierarchyLines.join('\n'),
      project_context_block: projectContextBlockPlain,
    },
  }
}

export { NOT_LINKED_PORTFOLIO, NOT_LINKED_PROGRAMME }
