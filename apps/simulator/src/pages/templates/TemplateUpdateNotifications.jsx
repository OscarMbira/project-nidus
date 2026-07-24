import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { listUnreadTemplateNotifications, markNotificationRead } from '../../services/projectTemplateCopyService'
import { getTemplateById } from '../../services/templateLibraryService'

const BASE = '/platform/templates'

export default function TemplateUpdateNotifications() {
  const [rows, setRows] = useState([])
  const [details, setDetails] = useState({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await listUnreadTemplateNotifications()
    setRows(data || [])
    const map = {}
    for (const n of data || []) {
      if (n.template_id) {
        const { data: t } = await getTemplateById(n.template_id)
        map[n.id] = t?.title || n.template_id
      }
    }
    setDetails(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const dismiss = async (id) => {
    await markNotificationRead(id)
    load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={BASE} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Template update notifications</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">When PMO republishes a master template, you are notified here.</p>
      {loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No unread notifications.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex justify-between gap-4"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{details[n.id] || 'Template'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.message}</p>
                <p className="text-xs text-gray-500 mt-2">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
              </div>
              <button type="button" onClick={() => dismiss(n.id)} className="self-start text-sm text-violet-600">
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
