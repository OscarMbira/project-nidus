import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

export default function TestingDashboardPage({ pathPrefix = '/platform/testing-centre', viewKey = 'tcd', mode = 'platform' }) {
  const svc = mode === 'sim' ? sim : platform
  const [m, setM] = useState(null)
  const [runM, setRunM] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let o = true
    ;(async () => {
      const a = await svc.getTestingDashboardMetrics()
      const b = await (svc.getTestRunDashboardMetrics || platform.getTestRunDashboardMetrics)(null, 30)
      if (o) {
        if (a.success) setM(a.data)
        if (b.success) setRunM(b.data)
        if (!a.success) setErr(a.message || 'Failed to load')
      }
    })()
    return () => { o = false }
  }, [svc])

  const kpi = [
    { label: 'Total cases', value: m?.total_cases ?? '—' },
    { label: 'Ready', value: m?.ready_cases ?? '—' },
    { label: 'Automated', value: m?.automated_cases ?? '—' },
    { label: 'Manual', value: m?.manual_cases ?? '—' },
    { label: 'Active suites', value: m?.active_suites ?? '—' },
    { label: 'Environments', value: m?.active_environments ?? '—' },
  ]

  const trend = [
    { name: 'D-6', p: 0, f: 0 }, { name: 'D-5', p: 0, f: 0 },
    { name: 'D-4', p: 0, f: 0 }, { name: 'D-3', p: 0, f: 0 },
    { name: 'D-2', p: 0, f: 0 }, { name: 'D-1', p: 0, f: 0 },
    { name: 'Today', p: runM?.passed || 0, f: runM?.failed || 0 },
  ]

  const pieData = [
    { name: 'Pass', value: runM?.passed || 0 },
    { name: 'Fail', value: runM?.failed || 0 },
  ]
  const PIE = ['#22c55e', '#ef4444', '#3b82f6']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Testing & Diagnostics</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Dashboard</p>
      {err && <p className="text-red-500 text-sm mb-2">{err}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {kpi.map((c, index) => (
          <div key={c.label} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 p-4">            <div className="text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
            <div className="text-2xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900/80 h-64">
          <h2 className="text-sm font-medium mb-2">Pass / fail (last 30d aggregate)</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={trend}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1f2937' }} />
              <Line type="monotone" dataKey="p" name="Pass" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="f" name="Fail" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900/80 h-64">
          <h2 className="text-sm font-medium mb-2">Outcome</h2>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie dataKey="value" data={pieData} outerRadius={70} label>
                {pieData.map((e, i) => (
                  <Cell key={e.name} fill={PIE[i % PIE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`${pathPrefix}/cases/new`} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">New test case</Link>
        <Link to={`${pathPrefix}/suites/new`} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">New suite</Link>
        <Link to={`${pathPrefix}/runs`} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">View runs</Link>
      </div>
    </div>
  )
}
