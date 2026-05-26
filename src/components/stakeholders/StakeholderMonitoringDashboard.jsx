/**
 * Stakeholder Monitoring Dashboard – summary cards, by attitude, by quadrant, high-risk table.
 */

import { useState, useEffect } from 'react'
import { getStakeholderManagementStats, getStakeholderAnalysis, getStakeholders } from '../../services/stakeholderService'
import { Users2, Target, MessageSquare, AlertTriangle } from 'lucide-react'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function StakeholderMonitoringDashboard({ projectId }) {
  const [stats, setStats] = useState(null)
  const [analysis, setAnalysis] = useState([])
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadData()
    } else {
      setStats(null)
      setAnalysis([])
      setStakeholders([])
    }
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [s, a, st] = await Promise.all([
        getStakeholderManagementStats({ project_id: projectId }),
        getStakeholderAnalysis({ project_id: projectId }),
        getStakeholders({ project_id: projectId }),
      ])
      setStats(s)
      setAnalysis(a || [])
      setStakeholders(st || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) return null
  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
  if (!stats) return <div className="text-gray-500">No stats available.</div>

  const highRisk = analysis.filter(a => a.current_attitude !== a.desired_attitude || ['critic', 'blocker'].includes(a.current_attitude))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm"><Users2 className="h-5 w-5" /> Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalStakeholders}</div>
          <div className="text-xs text-gray-500">stakeholders</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">Active</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.activeStakeholders}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm"><Target className="h-5 w-5" /> Analysed</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalAnalysis}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm"><MessageSquare className="h-5 w-5" /> Engagement plans</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalEngagement}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By attitude</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Champion</span><span className="font-medium">{stats.byAttitude?.champion ?? 0}</span></li>
            <li className="flex justify-between"><span>Supporter</span><span className="font-medium">{stats.byAttitude?.supporter ?? 0}</span></li>
            <li className="flex justify-between"><span>Neutral</span><span className="font-medium">{stats.byAttitude?.neutral ?? 0}</span></li>
            <li className="flex justify-between"><span>Critic</span><span className="font-medium">{stats.byAttitude?.critic ?? 0}</span></li>
            <li className="flex justify-between"><span>Blocker</span><span className="font-medium">{stats.byAttitude?.blocker ?? 0}</span></li>
          </ul>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">By quadrant</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Manage closely</span><span className="font-medium">{stats.byQuadrant?.['manage-closely'] ?? 0}</span></li>
            <li className="flex justify-between"><span>Keep satisfied</span><span className="font-medium">{stats.byQuadrant?.['keep-satisfied'] ?? 0}</span></li>
            <li className="flex justify-between"><span>Keep informed</span><span className="font-medium">{stats.byQuadrant?.['keep-informed'] ?? 0}</span></li>
            <li className="flex justify-between"><span>Monitor</span><span className="font-medium">{stats.byQuadrant?.monitor ?? 0}</span></li>
          </ul>
        </div>
      </div>

      {highRisk.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <h3 className="font-semibold text-gray-900 dark:text-white p-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> High-risk / attention needed</h3>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stakeholder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quadrant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Desired</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {highRisk.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{a.stakeholder?.stakeholder_name || '—'}</td>
                  <td className="px-6 py-4 text-sm capitalize">{a.matrix_quadrant?.replace('-', ' ') || '—'}</td>
                  <td className="px-6 py-4 text-sm">{a.current_attitude || '—'}</td>
                  <td className="px-6 py-4 text-sm">{a.desired_attitude || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
