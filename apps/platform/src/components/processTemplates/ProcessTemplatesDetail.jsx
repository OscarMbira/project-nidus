import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  PROCESS_GROUPS,
  PROCESS_GROUP_IDS,
  getHubBasePath,
} from './processTemplatesRegistry'
import ProcessTemplatesPanel from './ProcessTemplatesPanel'
import ProcessTemplatesRegisterPanel from './ProcessTemplatesRegisterPanel'
import ProcessTemplatesLogPanel from './ProcessTemplatesLogPanel'

/**
 * Group detail — templates, registers, logs panels.
 */
export default function ProcessTemplatesDetail({ roleKey, basePath }) {
  const { group: groupParam } = useParams()
  const hubBase = basePath || getHubBasePath(roleKey)
  const groupId = PROCESS_GROUP_IDS.includes(groupParam) ? groupParam : null
  const group = groupId ? PROCESS_GROUPS[groupId] : null

  if (!group) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Unknown process group.</p>
        <Link to={hubBase} className="text-blue-400 hover:underline mt-2 inline-block">
          Back to Process Templates
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <header>
        <Link
          to={hubBase}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          All Process Templates
        </Link>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <span aria-hidden>{group.emoji}</span>
          {group.label}
        </h1>
        <p className="text-sm text-gray-400 mt-1">{group.description}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProcessTemplatesPanel groupId={groupId} roleKey={roleKey} hubBase={hubBase} />
        <ProcessTemplatesRegisterPanel groupId={groupId} roleKey={roleKey} />
        <ProcessTemplatesLogPanel groupId={groupId} roleKey={roleKey} />
      </div>
    </div>
  )
}
