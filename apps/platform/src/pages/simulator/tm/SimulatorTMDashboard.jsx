import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { simDb } from '../../../services/supabase/supabaseClient'
import { CheckSquare, GitBranch, Clock, MessageCircle, ShieldAlert, Gavel } from 'lucide-react'

const QUICK_LINKS = [
  { label: 'My Tasks', path: '/simulator/tm/tasks', icon: CheckSquare, color: 'text-blue-400' },
  { label: 'My Plans', path: '/simulator/tm/plans/my-plans', icon: GitBranch, color: 'text-indigo-400' },
  { label: 'Timesheets', path: '/simulator/tm/timesheets', icon: Clock, color: 'text-emerald-400' },
  { label: 'Team Chat', path: '/simulator/tm/communications/chat', icon: MessageCircle, color: 'text-purple-400' },
  { label: 'Risk Register', path: '/simulator/pm/risks', icon: ShieldAlert, color: 'text-amber-400' },
  { label: 'Decision Log', path: '/simulator/tm/decisions', icon: Gavel, color: 'text-rose-400' },
]

export default function SimulatorTMDashboard() {
  const [userName, setUserName] = useState('')

  useEffect(() => {
    simDb.auth.getUser().then(({ data }) => {
      setUserName(data?.user?.email?.split('@')[0] || 'Team Member')
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {userName}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Team Member Practice Dashboard — use the sidebar to navigate your project activities.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900 p-5 hover:border-gray-500 transition-colors"
              >
                <Icon className={`h-7 w-7 ${link.color}`} />
                <span className="text-sm font-medium text-gray-200">{link.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="mt-8 rounded-xl border border-gray-700 bg-gray-900/60 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Practice Tips</h2>
          <ul className="space-y-1.5 text-xs text-gray-400 list-disc list-inside">
            <li>Log your time daily using Timesheets — your team lead reviews submissions.</li>
            <li>Use the Risk Register and Issue Log to flag concerns early.</li>
            <li>Create your individual plans under My Plans to track personal deliverables.</li>
            <li>Check the Decision Log before raising change requests.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
