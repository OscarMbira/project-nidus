import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { platformDb } from '../../services/supabase/supabaseClient'
import * as itto from '../../services/ittoService'
import * as simItto from '../../services/simIttoService'

/**
 * Organisation-wide draft queue (templates + project ITTOs created by current user).
 */
export default function ITTODraftsQueue({ isSim = false }) {
  const [accountId, setAccountId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ templates: [], projectITTos: [] })
  const [err, setErr] = useState(null)

  useEffect(() => {
    let c = false
    ;(async () => {
      const aid = await getCurrentUserAccountId()
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      let uid = null
      if (user) {
        const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        uid = data?.id || null
      }
      if (!c) {
        setAccountId(aid)
        setUserId(uid)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  useEffect(() => {
    if (!accountId || !userId) {
      if (!accountId && userId === null) return
      if (!accountId) setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const d = isSim ? await simItto.getSimDraftITTOs(userId, accountId) : await itto.getDraftITTOs(userId, accountId)
        setData(d)
      } catch (e) {
        setErr(e?.message || 'Failed to load drafts')
      } finally {
        setLoading(false)
      }
    })()
  }, [accountId, userId, isSim])

  const base = isSim ? '/simulator' : '/platform'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ITTO drafts</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Templates and project ITTOs saved on hold (draft) by you.
      </p>

      {err && (
        <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
          {err}
        </p>
      )}
      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Template drafts</h2>
            {data.templates.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">None</p>
            ) : (
              <ul className="space-y-2">
                {data.templates.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex justify-between gap-2"
                  >
                    <span className="text-gray-900 dark:text-white">{t.name}</span>
                    <Link to={`${base}/itto/templates`} className="text-sky-600 dark:text-sky-400 text-sm">
                      Open templates
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Project ITTO drafts</h2>
            {data.projectITTos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">None</p>
            ) : (
              <ul className="space-y-2">
                {data.projectITTos.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex justify-between gap-2"
                  >
                    <span className="text-gray-900 dark:text-white">{p.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{p.project_id || p.practice_project_id}</span>
                    <Link to={`${base}/itto/project`} className="text-sky-600 dark:text-sky-400 text-sm shrink-0">
                      Open project ITTOs
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
