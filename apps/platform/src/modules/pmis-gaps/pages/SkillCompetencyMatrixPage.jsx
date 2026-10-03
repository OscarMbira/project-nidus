/**
 * Member Competency Matrix — member x skill x level grid (GAP-11, v963 Phase 18). A single
 * settings-style page (not create/edit/view) — each cell edit is its own upsert, same pattern
 * as a RACI-style grid. No Audit tab: this page edits many records at once, not one persisted
 * record, matching the bulk-action-grid exclusion in rule 63.1.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookMarked, Loader } from 'lucide-react'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listSkills, listAccountMembers, listMemberSkills, upsertMemberSkill, COMPETENCY_LEVELS } from '../services/skillCatalogService'
import SkillsMatrixTabsNav from '../components/SkillsMatrixTabsNav'

export default function SkillCompetencyMatrixPage({ basePath = '/pm/resources/skills' }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [skills, setSkills] = useState([])
  const [members, setMembers] = useState([])
  const [levels, setLevels] = useState({}) // `${userId}:${skillId}` -> level
  const [savingKey, setSavingKey] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const acctId = await getCurrentUserAccountId()
    setAccountId(acctId)
    if (!acctId) {
      setLoading(false)
      return
    }
    const [skillRows, memberRows, memberSkillRows] = await Promise.all([
      listSkills(acctId),
      listAccountMembers(acctId),
      listMemberSkills(acctId),
    ])
    setSkills(skillRows)
    setMembers(memberRows)
    const map = {}
    for (const row of memberSkillRows) map[`${row.user_id}:${row.skill_id}`] = row.competency_level
    setLevels(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCellChange = async (userId, skillId, level) => {
    const key = `${userId}:${skillId}`
    setSavingKey(key)
    await upsertMemberSkill({ accountId, userId, skillId, competencyLevel: Number(level) })
    setLevels((prev) => ({ ...prev, [key]: Number(level) }))
    setSavingKey(null)
  }

  const grid = useMemo(() => ({ skills, members }), [skills, members])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading competency matrix…</div>
  }
  if (!accountId) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Could not resolve your organisation.</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <BookMarked className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Matrix</h1>
      </div>

      <SkillsMatrixTabsNav active="matrix" basePath={basePath} />

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Set each member's competency level (1 Novice — 5 Expert) per skill. Changes save immediately.
      </p>

      {grid.skills.length === 0 || grid.members.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {grid.skills.length === 0 ? 'Add skills to the catalog first.' : 'No organisation members found yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900/40">Member</th>
                {grid.skills.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{s.skill_name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {grid.members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800">
                    {m.full_name || m.email}
                  </td>
                  {grid.skills.map((s) => {
                    const key = `${m.id}:${s.id}`
                    return (
                      <td key={s.id} className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={levels[key] ?? ''}
                            onChange={(e) => handleCellChange(m.id, s.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">—</option>
                            {COMPETENCY_LEVELS.map((l) => (
                              <option key={l.value} value={l.value}>{l.value}</option>
                            ))}
                          </select>
                          {savingKey === key && <Loader className="h-3 w-3 animate-spin text-gray-400" />}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
