/**
 * Project Health + taxonomy Dashboard summaries (Documentation/Core_PM_and_Industry_Menu_Taxonomy.md
 * §3 Dashboard: Project Health, Schedule Summary, Cost Summary, RAID Summary, Change Summary,
 * Quality Summary, Testing Summary, Resource Summary).
 *
 * One batched fetch for all of it, consumed by one widget (PmHealthSummaryWidget) — same
 * "one cohesive widget, one shared fetch" pattern as PmoAdminOverviewWidget.jsx (rule 66: splitting
 * this into 8 independently-fetching widgets would repeat several of these queries for no reason).
 */
import { platformDb } from './supabase/supabaseClient'
import { computeEvmMetrics } from './evmService'

const OPEN_RISK_STATUSES = ['identified', 'assessed', 'mitigated', 'monitored']
const OPEN_ISSUE_STATUSES = ['new', 'assigned', 'in_progress', 'resolved', 'reopened']
const CLOSED_CHANGE_STATUSES = ['implemented', 'rejected', 'cancelled', 'closed', 'withdrawn']
const CLOSED_QUALITY_STATUSES = ['closed', 'resolved', 'cancelled']
const CLOSED_DEFECT_STATUSES = ['closed', 'resolved', 'cancelled']

function count(res) {
  return res.status === 'fulfilled' && !res.value.error ? res.value.count ?? 0 : 0
}
function rows(res) {
  return res.status === 'fulfilled' && !res.value.error ? res.value.data || [] : []
}

/**
 * RAG rollup for one dimension from an open-item severity/level breakdown.
 * @param {{critical:number, high:number}} counts
 */
function ragFromSeverity({ critical = 0, high = 0 }) {
  if (critical > 0) return 'red'
  if (high > 0) return 'amber'
  return 'green'
}

function ragFromIndex(index) {
  if (index == null) return null
  if (index < 0.85) return 'red'
  if (index < 0.95) return 'amber'
  return 'green'
}

/** Worse of two RAG values (red > amber > green > null). */
function worseRag(a, b) {
  const order = { red: 3, amber: 2, green: 1 }
  if (!a) return b
  if (!b) return a
  return order[a] >= order[b] ? a : b
}

export async function getProjectHealthSummary(projectId) {
  if (!projectId) return null

  const [
    projectRes,
    risksRes,
    issuesRes,
    evmRes,
    changesRes,
    changesPendingRes,
    qualityRes,
    defectsRes,
    teamRes,
  ] = await Promise.allSettled([
    platformDb.from('projects').select('budget_amount').eq('id', projectId).maybeSingle(),
    platformDb
      .from('risks')
      .select('id, risk_level', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .in('status', OPEN_RISK_STATUSES),
    platformDb
      .from('issues')
      .select('id, severity', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .in('status', OPEN_ISSUE_STATUSES),
    platformDb
      .from('project_evm_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('period_date', { ascending: false })
      .limit(1),
    platformDb
      .from('change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .not('status', 'in', `(${CLOSED_CHANGE_STATUSES.join(',')})`),
    platformDb
      .from('change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'pending_approval'),
    platformDb
      .from('quality_register')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .not('quality_status', 'in', `(${CLOSED_QUALITY_STATUSES.join(',')})`),
    platformDb
      .from('defects')
      .select('id, severity', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .not('status', 'in', `(${CLOSED_DEFECT_STATUSES.join(',')})`),
    platformDb
      .from('user_roles')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('is_active', true),
  ])

  // Schedule / Cost — from the latest EVM snapshot, if one exists.
  const evmSnapshots = rows(evmRes)
  const latestSnapshot = evmSnapshots[0] || null
  const bac = projectRes.status === 'fulfilled' ? projectRes.value.data?.budget_amount : null
  const evm = latestSnapshot ? computeEvmMetrics(latestSnapshot, bac) : null

  // RAID — open risks/issues broken down by level/severity.
  const riskRows = rows(risksRes)
  const issueRows = rows(issuesRes)
  const riskCounts = {
    critical: riskRows.filter((r) => r.risk_level === 'critical').length,
    high: riskRows.filter((r) => r.risk_level === 'high').length,
    total: count(risksRes),
  }
  const issueCounts = {
    critical: issueRows.filter((r) => r.severity === 'critical').length,
    high: issueRows.filter((r) => r.severity === 'high').length,
    total: count(issuesRes),
  }

  // Testing — open defects broken down by severity.
  const defectRows = rows(defectsRes)
  const defectCounts = {
    critical: defectRows.filter((d) => d.severity === 'critical').length,
    high: defectRows.filter((d) => d.severity === 'high').length,
    total: count(defectsRes),
  }

  // Resources — distinct project-scoped role holders.
  const teamUserIds = new Set(rows(teamRes).map((r) => r.user_id).filter(Boolean))

  const scheduleRag = ragFromIndex(evm?.spi)
  const costRag = ragFromIndex(evm?.cpi)
  const raidRag = worseRag(
    ragFromSeverity(riskCounts),
    ragFromSeverity(issueCounts),
  )
  const testingRag = ragFromSeverity(defectCounts)

  const projectHealthRag =
    !evm && riskCounts.total === 0 && issueCounts.total === 0 ? null : worseRag(worseRag(scheduleRag, costRag), raidRag)

  return {
    projectHealth: { rag: projectHealthRag },
    schedule: { rag: scheduleRag, spi: evm?.spi ?? null },
    cost: { rag: costRag, cpi: evm?.cpi ?? null, bac },
    raid: { rag: raidRag, risks: riskCounts, issues: issueCounts },
    change: {
      open: count(changesRes),
      pendingApproval: count(changesPendingRes),
    },
    quality: { open: count(qualityRes) },
    testing: { rag: testingRag, defects: defectCounts },
    resources: { teamSize: teamUserIds.size },
  }
}

export default { getProjectHealthSummary }
