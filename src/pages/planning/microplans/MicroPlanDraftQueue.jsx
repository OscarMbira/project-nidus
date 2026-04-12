import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { platformDb } from '../../../services/supabase/supabaseClient'
import * as api from '../../../services/microPlanService'
import * as simApi from '../../../services/sim/simMicroPlanService'

export default function MicroPlanDraftQueue() {
  const isSim = useLocation().pathname.includes('/simulator/')
  const [rows, setRows] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const {
          data: { user },
        } = await platformDb.auth.getUser()
        if (!user) return
        if (isSim) {
          const data = await simApi.getDraftPlans(user.id)
          setRows(data || [])
        } else {
          const { data: prof } = await platformDb.from('profiles').select('id').eq('id', user.id).maybeSingle()
          const pid = prof?.id
          if (!pid) {
            setRows([])
            return
          }
          const data = await api.getDraftPlans(pid)
          setRows(data || [])
        }
      } catch (e) {
        toast.error(e?.message || 'Failed to load drafts')
      }
    })()
  }, [isSim])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-4">My draft micro-plans</h1>
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
              <div className="font-medium">{p.plan_name}</div>
              <div className="text-xs text-gray-500">
                {p.plan_reference} · expires {p.draft_expires_at || '—'}
              </div>
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="text-gray-500 text-sm">No drafts on hold.</p>}
      </div>
    </div>
  )
}
