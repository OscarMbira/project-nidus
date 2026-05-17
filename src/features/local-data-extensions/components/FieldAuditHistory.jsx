import { useEffect, useState } from 'react'

export default function FieldAuditHistory({ platformDb, accountId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!platformDb || !accountId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const q = platformDb
        .from('custom_field_audit_log')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(100)
      const { data } = await q
      if (!cancelled) setRows(data || [])
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [platformDb, accountId])

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
      {rows.map((r) => (
        <li key={r.id} className="py-2 flex justify-between gap-4">
          <span className="text-gray-700 dark:text-gray-200">{r.action_type}</span>
          <span className="text-gray-400 text-xs whitespace-nowrap">
            {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
          </span>
        </li>
      ))}
      {!rows.length && <li className="py-4 text-gray-500">No audit entries.</li>}
    </ul>
  )
}
