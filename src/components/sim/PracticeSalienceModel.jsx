/**
 * PracticeSalienceModel – Simulator salience view (Mitchell et al.).
 * Uses sim.practice_stakeholder_analysis; same UI as platform SalienceModel.
 */

import { useState, useEffect } from 'react'
import { Triangle, Users } from 'lucide-react'
import { getPracticeStakeholderAnalysis } from '../../services/sim/practiceStakeholderService'
import ExportListMenu from '../ui/ExportListMenu'

const SALIENCE_CLASSES = [
  'definitive', 'dominant', 'dangerous', 'dependent',
  'demanding', 'discretionary', 'dormant', 'latent',
]

const SALIENCE_LABELS = {
  definitive: 'Definitive (P+L+U)', dominant: 'Dominant (P+L)', dangerous: 'Dangerous (P+U)',
  dependent: 'Dependent (L+U)', demanding: 'Demanding (U)', discretionary: 'Discretionary (L)',
  dormant: 'Dormant (P)', latent: 'Latent (none)',
}

const SALIENCE_COLORS = {
  definitive: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  dominant: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  dangerous: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
  dependent: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  demanding: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  discretionary: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  dormant: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
  latent: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600',
}

const EXPORT_COLUMNS = [
  { key: 'stakeholder_name', label: 'Stakeholder' },
  { key: 'salience_class', label: 'Salience class' },
  { key: 'power_level', label: 'Power' },
  { key: 'legitimacy_level', label: 'Legitimacy' },
  { key: 'urgency_level', label: 'Urgency' },
]

export default function PracticeSalienceModel({ practiceProjectId }) {
  const [analysis, setAnalysis] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!practiceProjectId) {
      setAnalysis([])
      setLoading(false)
      return
    }
    setLoading(true)
    getPracticeStakeholderAnalysis({ practice_project_id: practiceProjectId })
      .then((res) => setAnalysis(res?.data || []))
      .catch(() => setAnalysis([]))
      .finally(() => setLoading(false))
  }, [practiceProjectId])

  const getSalienceClass = (rec) => {
    if (rec.salience_class) return rec.salience_class
    const p = rec.power_level ?? 0
    const l = rec.legitimacy_level ?? 0
    const u = rec.urgency_level ?? 0
    const high = (v) => v >= 4
    const pH = high(p)
    const lH = high(l)
    const uH = high(u)
    const count = [pH, lH, uH].filter(Boolean).length
    if (count === 0) return 'latent'
    if (count === 1) return pH ? 'dormant' : lH ? 'discretionary' : 'demanding'
    if (count === 2) return pH && lH ? 'dominant' : pH && uH ? 'dangerous' : 'dependent'
    return 'definitive'
  }

  const latestByStakeholder = new Map()
  ;(analysis || []).forEach((rec) => {
    const sid = rec.practice_stakeholder_id
    const existing = latestByStakeholder.get(sid)
    const recDate = rec.analysis_date ? new Date(rec.analysis_date).getTime() : 0
    const existingDate = existing?.analysis_date ? new Date(existing.analysis_date).getTime() : 0
    if (!existing || recDate >= existingDate) {
      latestByStakeholder.set(sid, { ...rec, salience_class: getSalienceClass(rec) })
    }
  })

  const byClass = {}
  SALIENCE_CLASSES.forEach((c) => { byClass[c] = [] })
  latestByStakeholder.forEach((rec) => {
    const sc = rec.salience_class || 'latent'
    if (byClass[sc]) byClass[sc].push(rec)
    else byClass.latent.push(rec)
  })

  const exportData = SALIENCE_CLASSES.flatMap((c) =>
    (byClass[c] || []).map((r) => ({
      stakeholder_name: r.practice_stakeholder?.stakeholder_name || '—',
      salience_class: c,
      power_level: r.power_level ?? '—',
      legitimacy_level: r.legitimacy_level ?? '—',
      urgency_level: r.urgency_level ?? '—',
    }))
  )

  if (!practiceProjectId) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center text-gray-500 dark:text-gray-400">
        Select a practice project to view the salience model.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Triangle className="h-5 w-5 text-amber-500" />
          Salience model (Power × Legitimacy × Urgency)
        </h3>
        <ExportListMenu columns={EXPORT_COLUMNS} data={exportData} baseFilename="Practice-Stakeholder-Salience" disabled={!exportData.length} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SALIENCE_CLASSES.map((cls) => (
          <div key={cls} className={`rounded-lg border p-4 ${SALIENCE_COLORS[cls] || SALIENCE_COLORS.latent}`}>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <Users className="h-4 w-4" />
              {SALIENCE_LABELS[cls] || cls}
              <span className="text-xs font-normal text-gray-500">({(byClass[cls] || []).length})</span>
            </h4>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {(byClass[cls] || []).length === 0 ? (
                <li className="italic text-gray-500">None</li>
              ) : (
                (byClass[cls] || []).map((rec) => (
                  <li key={rec.id}>{rec.practice_stakeholder?.stakeholder_name || rec.practice_stakeholder_id || '—'}</li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
