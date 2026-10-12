/**
 * PM Stats Cards widget (v982 Phase 5) — extracted verbatim from pages/pm/PMDashboard.jsx's
 * "Stats Cards" section (content parity, not a rewrite). Self-fetching: owns the same batched
 * Promise.allSettled count query the original used.
 *
 * 2026-09-08: Open Risks / Open Issues cards removed — PmHealthSummaryWidget's RAID Summary card
 * now covers the same counts with a severity breakdown and RAG status, so showing the bare counts
 * here again was pure duplication (user-reported live-use finding). The other four cards aren't
 * covered by that widget and stay.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardStatCard } from '@nidus/ui'
import { supabase } from '../../../services/supabaseClient'
import { useCurrentProject } from '../../../lib/CurrentProjectContext'
import { CheckSquare, BarChart3, Layers, GraduationCap } from 'lucide-react'

const EMPTY_STATS = {
  activeWorkPackages: 0,
  qualityActivities: 0,
  pendingReports: 0,
  lessonsLogged: 0,
}

export default function PmStatsCardsWidget() {
  const navigate = useNavigate()
  const { currentProjectId, currentProject } = useCurrentProject()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProjectId) {
      setStats(EMPTY_STATS)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [workPackagesRes, qualityRes, reportsRes, lessonsRes] = await Promise.allSettled([
        supabase.from('work_packages').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId).eq('is_deleted', false).in('status', ['authorized', 'accepted', 'in_progress']),
        supabase.from('quality_activities_view').select('activity_id', { count: 'exact', head: true }).eq('project_id', currentProjectId),
        supabase.from('checkpoint_reports').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId).in('status', ['draft', 'submitted']),
        supabase.from('lessons_learned').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId).eq('is_deleted', false),
      ])
      if (cancelled) return
      const count = (res) => (res.status === 'fulfilled' && !res.value.error ? (res.value.count ?? 0) : 0)
      setStats({
        activeWorkPackages: count(workPackagesRes),
        qualityActivities: count(qualityRes),
        pendingReports: count(reportsRes),
        lessonsLogged: count(lessonsRes),
      })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [currentProjectId])

  const currentProjectKey = currentProject?.projectCode || currentProjectId
  const withProject = (path, filter) => {
    const params = new URLSearchParams()
    if (currentProjectKey) params.set('projectId', currentProjectKey)
    if (filter) params.set('filter', filter)
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
  }

  const statCards = [
    { label: 'Active Work Packages', value: stats.activeWorkPackages, icon: Layers, color: 'text-blue-600 dark:text-blue-400', link: '/pm/delivery/work-packages', filter: 'active' },
    { label: 'Quality Activities', value: stats.qualityActivities, icon: CheckSquare, color: 'text-green-600 dark:text-green-400', link: '/pm/controls/quality-register', filter: 'all' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: BarChart3, color: 'text-purple-600 dark:text-purple-400', link: '/pm/reporting/checkpoint-reports', filter: 'pending' },
    { label: 'Lessons Logged', value: stats.lessonsLogged, icon: GraduationCap, color: 'text-teal-600 dark:text-teal-400', link: '/pm/controls/lessons-log', filter: 'all' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((card) => (
        <DashboardStatCard
          key={card.label}
          label={card.label}
          value={loading ? '...' : card.value}
          icon={card.icon}
          iconClassName={card.color}
          accentClassName="text-gray-900 dark:text-white"
          onClick={() => navigate(withProject(card.link, card.filter))}
        />
      ))}
    </div>
  )
}
