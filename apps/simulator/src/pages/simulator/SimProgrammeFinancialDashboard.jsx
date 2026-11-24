import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import DashboardStatCard from '@nidus/ui/DashboardStatCard'
import { simDb } from '@nidus/supabase'
import { createBillingData } from '@nidus/planning/services/billingData.js'

export default function SimProgrammeFinancialDashboard() {
  const { programmeId } = useParams()
  const navigate = useNavigate()
  const [figures, setFigures] = useState(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data: links } = await simDb.from('practice_programme_projects').select('practice_project_id').eq('practice_programme_id', programmeId)
      const ids = [...new Set((links || []).map((r) => r.practice_project_id).filter(Boolean))]
      const rows = ids.length ? await createBillingData(true).figuresFor(ids).catch(() => []) : []
      const sum = (key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0)
      if (live) setFigures({ revenue: sum('revenue'), wip: sum('wip'), cost: sum('cost'), margin: sum('margin') })
    })().catch(() => { if (live) setFigures({ revenue: 0, wip: 0, cost: 0, margin: 0 }) })
    return () => { live = false }
  }, [programmeId])

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <button type="button" onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-xl font-bold mb-4">Practice programme financial dashboard</h1>
      {figures && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DashboardStatCard label="Billed revenue" value={figures.revenue} onClick={() => navigate('/simulator/billing/invoices')} />
          <DashboardStatCard label="Unbilled value" value={figures.wip} />
          <DashboardStatCard label="Cost" value={figures.cost} />
          <DashboardStatCard label="Margin" value={figures.margin} />
        </div>
      )}
    </div>
  )
}
