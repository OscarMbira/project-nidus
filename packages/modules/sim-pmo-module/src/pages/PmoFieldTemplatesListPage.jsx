import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { simDb } from '@nidus/supabase'
import { listFieldTemplateNodes } from '@nidus/shared/services/pmTemplateNodeService.js'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'

/** Simulator parity — /simulator/pmo/field-templates */
export default function PmoFieldTemplatesListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const accountId = await getCurrentUserAccountId()
        if (!accountId) {
          if (!cancelled) {
            setRows([])
            setError('No account context.')
            setLoading(false)
          }
          return
        }
        const data = await listFieldTemplateNodes(simDb, accountId)
        if (!cancelled) {
          setRows(data)
          setError(null)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || String(e))
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.name, r.category, r.tier, r.status].some((v) => String(v || '').toLowerCase().includes(q)),
    )
  }, [rows, search])

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">PMO Field Templates (Practice)</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Simulator hierarchy nodes for record fields (parity with Platform).
        </p>
      </div>

      <input
        className="w-full max-w-md rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        placeholder="Search name, category, tier…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="space-y-2">
        {filtered.map((row, index) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
          >
            <div>
              <span className="mr-2 text-xs text-gray-400">#{index + 1}</span>
              <Link
                to={`/simulator/pmo/field-templates/${row.id}`}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {row.name}
              </Link>
              <p className="text-xs text-gray-500">
                {row.tier} · {row.status} · v{row.version}
                {row.is_system_synced ? ' · system-synced' : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
