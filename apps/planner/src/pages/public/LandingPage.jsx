/**
 * v1239 Slice 5.3 — Planner product landing page. Sign-up buttons follow the kill switch
 * (planner_signup_open(), admin flag planner_public_signup — D18).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, GitBranch, Users, FileUp, Gauge, Clock } from 'lucide-react'
import PublicLayout from './PublicLayout.jsx'
import { isSignupOpen } from '../../lib/plannerApi.js'

const FEATURES = [
  { icon: CalendarRange, title: 'Gantt, board and calendar', text: 'See the same plan as a timeline, a task board or by due date.' },
  { icon: GitBranch, title: 'Automatic scheduling', text: 'Link tasks, set durations and working days — dates and the critical path follow.' },
  { icon: Users, title: 'Team workload', text: 'Spot over-allocated people week by week before it becomes a problem.' },
  { icon: Clock, title: 'Time against tasks', text: 'Your team logs hours against their tasks and compares with the estimate.' },
  { icon: FileUp, title: 'Bring your plan', text: 'Import XML, Excel or CSV from your current planning tool, and export any time.' },
  { icon: Gauge, title: 'Baselines and variance', text: 'Save a baseline and see which tasks are slipping and by how much.' },
]

export default function LandingPage() {
  const [open, setOpen] = useState(null)
  useEffect(() => { isSignupOpen().then(setOpen) }, [])

  return (
    <PublicLayout>
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Plan projects without the heavy software</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Nidus Planner gives you scheduling, Gantt charts, workload and time tracking in your browser. Start free for 14 days — no card needed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {open === false ? (
            <p className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">Sign-up opens soon.</p>
          ) : (
            <Link to="/signup" className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Start free trial</Link>
          )}
          <Link to="/pricing" className="px-5 py-3 rounded-lg border border-gray-300 dark:border-gray-700 font-medium">See pricing</Link>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <f.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{f.text}</p>
          </div>
        ))}
      </section>
    </PublicLayout>
  )
}
