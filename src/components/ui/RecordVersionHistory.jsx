import { useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import RecordStatusBadge from './RecordStatusBadge'

export default function RecordVersionHistory({
  rootRecordId,
  fetchChain,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState([])

  const load = async () => {
    if (!fetchChain || !rootRecordId) return
    setLoading(true)
    try {
      const chain = await fetchChain(rootRecordId)
      setVersions(Array.isArray(chain) ? chain : [])
    } finally {
      setLoading(false)
    }
  }

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !versions.length) await load()
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          <History className="h-4 w-4" />
          Version History
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {loading && <p className="text-sm text-gray-500">Loading lineage…</p>}
          {!loading && !versions.length && <p className="text-sm text-gray-500">No version history.</p>}
          {versions.map((v) => (
            <div key={v.id || v.record_version} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">v{v.record_version ?? '?'}</span>
                <span className="ml-2 text-gray-500">{v.id?.slice(0, 8)}…</span>
              </div>
              <RecordStatusBadge status={v.record_status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
