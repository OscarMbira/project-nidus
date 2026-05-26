import { Link } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { PROCESS_GROUP_IDS, PROCESS_GROUPS, getHubBasePath } from './processTemplatesRegistry'

const COLOR_MAP = {
  slate: 'border-slate-600 bg-slate-900/40 hover:border-slate-500',
  purple: 'border-purple-600 bg-purple-900/30 hover:border-purple-500',
  blue: 'border-blue-600 bg-blue-900/30 hover:border-blue-500',
  green: 'border-emerald-600 bg-emerald-900/30 hover:border-emerald-500',
  amber: 'border-amber-600 bg-amber-900/30 hover:border-amber-500',
  gray: 'border-gray-600 bg-gray-800/50 hover:border-gray-500',
}

/**
 * Process Templates hub — Pre-Project + 5 PMBOK process groups.
 * @param {{ roleKey: string, basePath?: string }} props
 */
export default function ProcessTemplatesHub({ roleKey, basePath }) {
  const hubBase = basePath || getHubBasePath(roleKey)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Layers className="h-7 w-7 text-blue-400" />
            Process Templates
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            PMBOK-aligned templates, registers, and logs grouped by process phase.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROCESS_GROUP_IDS.map((groupId) => {
          const g = PROCESS_GROUPS[groupId]
          const color = COLOR_MAP[g.color] || COLOR_MAP.slate
          return (
            <Link
              key={groupId}
              to={`${hubBase}/${groupId}`}
              className={`rounded-xl border-2 p-5 transition-colors ${color}`}
            >
              <span className="text-2xl" aria-hidden>{g.emoji}</span>
              <h2 className="text-lg font-semibold text-gray-100 mt-2">{g.label}</h2>
              <p className="text-sm text-gray-400 mt-1">{g.description}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
