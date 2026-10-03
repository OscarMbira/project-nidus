/**
 * Practice Teams Page — restructured (v1109) with a tab bar matching Platform's Teams.jsx shape:
 * Teams (existing card grid, unchanged) / Skill Matrix / Capacity Planning / Leave Calendar.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, Plus, BarChart3, Calendar } from 'lucide-react'
import { getPracticeTeams } from '../../services/sim/practiceTeamService'
import { simDb } from '../../services/supabase/supabaseClient'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  listSkillCatalog, listMemberSkills, upsertMemberSkill, deleteMemberSkill, addSkillToCatalog,
} from '../../services/sim/simTeamSkillsService'
import { listPracticeProjectCapacity, upsertCapacitySetting, deleteCapacitySetting } from '../../services/sim/simTeamCapacityService'
import { listPracticeProjectLeave, addLeaveEntry, updateLeaveEntry, deleteLeaveEntry, LEAVE_TYPES } from '../../services/sim/simTeamLeaveService'
import RowActionButton from '@nidus/ui/RowActionButton'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

function RecordPeek({ title, fields, onClose }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <button type="button" onClick={onClose} className="text-sm font-medium text-gray-900 underline dark:text-white">Close</button>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-700 dark:text-gray-200">{field.label}</dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">{field.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function RowCrudActions({ canChange, onView, onEdit, onDelete, name }) {
  return (
    <div className="inline-flex items-center justify-end gap-0.5">
      <RowActionButton variant="view" label={`View ${name}`} onClick={onView} />
      {canChange && onEdit ? <RowActionButton variant="edit" label={`Edit ${name}`} onClick={onEdit} /> : null}
      {canChange && onDelete ? <RowActionButton variant="delete" label={`Delete ${name}`} onClick={onDelete} /> : null}
    </div>
  )
}

const TABS = [
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'skills', label: 'Skill Matrix', icon: BarChart3 },
  { id: 'capacity', label: 'Capacity Planning', icon: Calendar },
  { id: 'leaves', label: 'Leave Calendar', icon: Calendar },
]

export default function PracticeTeams() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const { showSuccess, modal } = useSuccessModal()

  const [activeTab, setActiveTab] = useState('teams')
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  const [accountId, setAccountId] = useState(null)
  const [currentAuthUserId, setCurrentAuthUserId] = useState(null)
  const [isPmoAdmin, setIsPmoAdmin] = useState(false)
  const [skillCatalog, setSkillCatalog] = useState([])
  const [memberSkills, setMemberSkills] = useState([])
  const [capacitySettings, setCapacitySettings] = useState([])
  const [leaveEntries, setLeaveEntries] = useState([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillId, setNewSkillId] = useState('')
  const [newSkillLevel, setNewSkillLevel] = useState(3)
  const [addingCapacity, setAddingCapacity] = useState(false)
  const [newHoursPerDay, setNewHoursPerDay] = useState(8)
  const [newHoursPerWeek, setNewHoursPerWeek] = useState(40)
  const [addingLeave, setAddingLeave] = useState(false)
  const [newLeaveType, setNewLeaveType] = useState('annual_leave')
  const [newLeaveStart, setNewLeaveStart] = useState('')
  const [newLeaveEnd, setNewLeaveEnd] = useState('')
  const [newCatalogSkillName, setNewCatalogSkillName] = useState('')
  const [showManageCatalog, setShowManageCatalog] = useState(false)
  const [skillView, setSkillView] = useState(null)
  const [editingSkill, setEditingSkill] = useState(null)
  const [capacityView, setCapacityView] = useState(null)
  const [editingCapacity, setEditingCapacity] = useState(null)
  const [leaveView, setLeaveView] = useState(null)
  const [editingLeave, setEditingLeave] = useState(null)

  useEffect(() => {
    if (projectId) loadTeams()
  }, [projectId])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) return
      setCurrentAuthUserId(user.id)
      const { data: userRow } = await simDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!userRow) return
      const [ownerRes, roleRes] = await Promise.all([
        simDb.from('accounts').select('id').eq('owner_user_id', userRow.id).limit(1),
        simDb.from('user_roles').select('roles:role_id(role_name)').eq('user_id', userRow.id).eq('is_active', true),
      ])
      setAccountId(ownerRes.data?.[0]?.id || null)
      setIsPmoAdmin((roleRes.data || []).some((r) => ['PMO Admin', 'pmo_admin', 'sim_pmo_admin', 'simulator_admin', 'System Admin'].includes(r.roles?.role_name)))
    })()
  }, [])

  useEffect(() => {
    if (!projectId) return
    if (activeTab === 'skills') loadSkillsTab()
    else if (activeTab === 'capacity') loadCapacityTab()
    else if (activeTab === 'leaves') loadLeaveTab()
  }, [activeTab, projectId])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const result = await getPracticeTeams(projectId)
      if (result.success) setTeams(result.data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSkillsTab = async () => {
    setLoading(true)
    const [catalogRes, membersRes] = await Promise.all([listSkillCatalog(), listMemberSkills(projectId)])
    if (catalogRes.success) setSkillCatalog(catalogRes.data)
    else toast.error(catalogRes.error || 'Failed to load skill catalog')
    if (membersRes.success) setMemberSkills(membersRes.data)
    else toast.error(membersRes.error || 'Failed to load member skills')
    setLoading(false)
  }

  const loadCapacityTab = async () => {
    setLoading(true)
    const res = await listPracticeProjectCapacity(projectId)
    if (res.success) setCapacitySettings(res.data)
    else toast.error(res.error || 'Failed to load capacity settings')
    setLoading(false)
  }

  const loadLeaveTab = async () => {
    setLoading(true)
    const res = await listPracticeProjectLeave(projectId)
    if (res.success) setLeaveEntries(res.data)
    else toast.error(res.error || 'Failed to load leave entries')
    setLoading(false)
  }

  const canEditRow = (rowAuthUserId) => isPmoAdmin || rowAuthUserId === currentAuthUserId

  const handleAddMySkill = async () => {
    const authUserId = editingSkill?.user_id || currentAuthUserId
    if (!newSkillId || !authUserId) return
    const res = await upsertMemberSkill(authUserId, newSkillId, Number(newSkillLevel))
    if (!res.success) { toast.error(res.error || 'Failed to save skill'); return }
    showSuccess({ recordId: res.data.id, operation: editingSkill ? 'updated' : 'created', message: editingSkill ? 'Skill updated.' : 'Skill added.' })
    setAddingSkill(false)
    setEditingSkill(null)
    setNewSkillId('')
    loadSkillsTab()
  }

  const beginEditSkill = (row) => {
    setSkillView(null)
    setEditingSkill(row)
    setNewSkillId(row.skill_id || '')
    setNewSkillLevel(String(row.competency_level || 3))
    setAddingSkill(true)
  }

  const handleDeleteMemberSkill = async (row) => {
    const label = row.skill?.skill_name || 'this skill'
    if (!window.confirm(`Remove ${label}?`)) return
    const res = await deleteMemberSkill(row.id)
    if (!res.success) { toast.error(res.error || 'Failed to remove skill'); return }
    if (skillView?.id === row.id) setSkillView(null)
    if (editingSkill?.id === row.id) { setEditingSkill(null); setAddingSkill(false) }
    showSuccess({ recordId: row.id, operation: 'deleted', message: 'Skill removed.' })
    loadSkillsTab()
  }

  const handleAddCatalogSkill = async () => {
    if (!newCatalogSkillName.trim()) return
    const res = await addSkillToCatalog(null, newCatalogSkillName.trim())
    if (!res.success) { toast.error(res.error || 'Failed to add skill to catalog'); return }
    showSuccess({ recordId: res.data.id, operation: 'created', message: 'Skill added to catalog.' })
    setNewCatalogSkillName('')
    loadSkillsTab()
  }

  const handleAddMyCapacity = async () => {
    const authUserId = editingCapacity?.user_id || currentAuthUserId
    if (!authUserId) return
    const res = await upsertCapacitySetting({
      id: editingCapacity?.id,
      accountId,
      practiceProjectId: editingCapacity?.practice_project_id || projectId,
      authUserId,
      hoursPerDay: Number(newHoursPerDay),
      hoursPerWeek: Number(newHoursPerWeek),
      effectiveFrom: editingCapacity?.effective_from || new Date().toISOString().slice(0, 10),
    })
    if (!res.success) { toast.error(res.error || 'Failed to save capacity'); return }
    showSuccess({ recordId: res.data.id, operation: editingCapacity ? 'updated' : 'created', message: editingCapacity ? 'Capacity setting updated.' : 'Capacity setting saved.' })
    setAddingCapacity(false)
    setEditingCapacity(null)
    loadCapacityTab()
  }

  const beginEditCapacity = (row) => {
    setCapacityView(null)
    setEditingCapacity(row)
    setNewHoursPerDay(row.hours_per_day ?? 8)
    setNewHoursPerWeek(row.hours_per_week ?? 40)
    setAddingCapacity(true)
  }

  const handleDeleteCapacity = async (row) => {
    const label = row.member?.fullName || 'this capacity setting'
    if (!window.confirm(`Remove the capacity setting for ${label}?`)) return
    const res = await deleteCapacitySetting(row.id)
    if (!res.success) { toast.error(res.error || 'Failed to remove capacity setting'); return }
    if (capacityView?.id === row.id) setCapacityView(null)
    if (editingCapacity?.id === row.id) { setEditingCapacity(null); setAddingCapacity(false) }
    showSuccess({ recordId: row.id, operation: 'deleted', message: 'Capacity setting removed.' })
    loadCapacityTab()
  }

  const handleAddMyLeave = async () => {
    if (!newLeaveStart || !newLeaveEnd) return
    if (editingLeave) {
      const res = await updateLeaveEntry(editingLeave.id, { leaveType: newLeaveType, startDate: newLeaveStart, endDate: newLeaveEnd })
      if (!res.success) { toast.error(res.error || 'Failed to update leave entry'); return }
      showSuccess({ recordId: res.data.id, operation: 'updated', message: 'Leave entry updated.' })
      setAddingLeave(false)
      setEditingLeave(null)
      loadLeaveTab()
      return
    }
    if (!currentAuthUserId) return
    const res = await addLeaveEntry({
      accountId,
      authUserId: currentAuthUserId,
      leaveType: newLeaveType,
      startDate: newLeaveStart,
      endDate: newLeaveEnd,
    })
    if (!res.success) { toast.error(res.error || 'Failed to save leave entry'); return }
    showSuccess({ recordId: res.data.id, operation: 'created', message: 'Leave entry added.' })
    setAddingLeave(false)
    setNewLeaveStart('')
    setNewLeaveEnd('')
    loadLeaveTab()
  }

  const beginEditLeave = (row) => {
    setLeaveView(null)
    setEditingLeave(row)
    setNewLeaveType(row.leave_type || 'annual_leave')
    setNewLeaveStart(row.start_date || '')
    setNewLeaveEnd(row.end_date || '')
    setAddingLeave(true)
  }

  const handleDeleteLeave = async (row) => {
    const label = row.leave_type?.replace('_', ' ') || 'this leave entry'
    if (!window.confirm(`Remove ${label}?`)) return
    const res = await deleteLeaveEntry(row.id)
    if (!res.success) { toast.error(res.error || 'Failed to remove leave entry'); return }
    if (leaveView?.id === row.id) setLeaveView(null)
    if (editingLeave?.id === row.id) { setEditingLeave(null); setAddingLeave(false) }
    showSuccess({ recordId: row.id, operation: 'deleted', message: 'Leave entry removed.' })
    loadLeaveTab()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {modal}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Teams</h1>
        {activeTab === 'teams' && (
          <button onClick={() => navigate(`/simulator/practice-teams/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Create Team
          </button>
        )}
      </div>

      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap gap-x-6 gap-y-1 -mb-px" aria-label="Practice Teams sections">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'teams' && (
        loading ? <div className="text-center py-12">Loading...</div> : teams.length === 0 ? <div className="text-center py-12 text-gray-500">No teams found</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div key={team.id} onClick={() => navigate(`/simulator/practice-teams/${team.id}?projectId=${projectId}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{team.team_name}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Type: {team.team_type}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Size: {team.team_size} members</p>
              </div>
            ))}
          </div>
        )
      )}

      {!projectId && activeTab !== 'teams' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a practice project first (append <code>?projectId=</code> to the URL).</p>
      )}

      {activeTab === 'skills' && projectId && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setAddingSkill((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium min-h-[40px]">
              <Plus className="h-4 w-4" /> Add my skill
            </button>
            {isPmoAdmin && (
              <button type="button" onClick={() => setShowManageCatalog((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium min-h-[40px]">
                Manage catalog
              </button>
            )}
          </div>

          {showManageCatalog && isPmoAdmin && (
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex gap-2 items-center">
              <input type="text" value={newCatalogSkillName} onChange={(e) => setNewCatalogSkillName(e.target.value)} placeholder="New skill name" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              <button type="button" onClick={handleAddCatalogSkill} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium min-h-[40px]">Add to catalog</button>
            </div>
          )}

          {addingSkill && (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex flex-wrap gap-2 items-center">
              <select value={newSkillId} onChange={(e) => setNewSkillId(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                <option value="">Select a skill…</option>
                {skillCatalog.map((s) => <option key={s.id} value={s.id}>{s.skill_name}</option>)}
              </select>
              <select value={newSkillLevel} onChange={(e) => setNewSkillLevel(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                {[1, 2, 3, 4, 5].map((lvl) => <option key={lvl} value={lvl}>Level {lvl}</option>)}
              </select>
              <button type="button" onClick={handleAddMySkill} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium min-h-[40px]">{editingSkill ? 'Update' : 'Save'}</button>
              <button type="button" onClick={() => { setAddingSkill(false); setEditingSkill(null) }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm min-h-[40px]">Cancel</button>
            </div>
          )}

          {skillView && (
            <RecordPeek
              title={skillView.skill?.skill_name || 'Skill'}
              onClose={() => setSkillView(null)}
              fields={[
                { label: 'Team member', value: skillView.member?.fullName },
                { label: 'Level', value: `${skillView.competency_level} / 5` },
              ]}
            />
          )}

          {memberSkills.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">No skill assignments yet for this project's team.</div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Team member</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Skill</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Level</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {memberSkills.map((row, index) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3 text-sm text-gray-400">{getDisplayRowNumber(index)}</td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{row.member?.fullName || 'Unknown'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.skill?.skill_name || '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.competency_level} / 5</td>
                      <td className="px-3 py-3 text-right">
                        <RowCrudActions
                          name={row.skill?.skill_name || 'skill'}
                          canChange={canEditRow(row.user_id)}
                          onView={() => { setEditingSkill(null); setAddingSkill(false); setSkillView(row) }}
                          onEdit={() => beginEditSkill(row)}
                          onDelete={() => handleDeleteMemberSkill(row)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'capacity' && projectId && (
        <div className="space-y-4">
          <button type="button" onClick={() => setAddingCapacity((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium min-h-[40px]">
            <Plus className="h-4 w-4" /> Set my capacity
          </button>

          {addingCapacity && (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex flex-wrap gap-2 items-center">
              <label className="text-sm text-gray-700 dark:text-gray-200">Hours/day
                <input type="number" min="0" max="24" value={newHoursPerDay} onChange={(e) => setNewHoursPerDay(e.target.value)} className="ml-2 w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              </label>
              <label className="text-sm text-gray-700 dark:text-gray-200">Hours/week
                <input type="number" min="0" max="168" value={newHoursPerWeek} onChange={(e) => setNewHoursPerWeek(e.target.value)} className="ml-2 w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              </label>
              <button type="button" onClick={handleAddMyCapacity} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium min-h-[40px]">{editingCapacity ? 'Update' : 'Save'}</button>
              <button type="button" onClick={() => { setAddingCapacity(false); setEditingCapacity(null) }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm min-h-[40px]">Cancel</button>
            </div>
          )}

          {capacityView && (
            <RecordPeek
              title={capacityView.member?.fullName || 'Capacity'}
              onClose={() => setCapacityView(null)}
              fields={[
                { label: 'Hours/day', value: capacityView.hours_per_day },
                { label: 'Hours/week', value: capacityView.hours_per_week },
                { label: 'Effective from', value: capacityView.effective_from },
              ]}
            />
          )}

          {capacitySettings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">No capacity settings yet for this project's team.</div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Team member</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hours/day</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hours/week</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {capacitySettings.map((row, index) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3 text-sm text-gray-400">{getDisplayRowNumber(index)}</td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{row.member?.fullName || 'Unknown'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.hours_per_day}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.hours_per_week}</td>
                      <td className="px-3 py-3 text-right">
                        <RowCrudActions
                          name={row.member?.fullName || 'capacity setting'}
                          canChange={canEditRow(row.user_id)}
                          onView={() => { setEditingCapacity(null); setAddingCapacity(false); setCapacityView(row) }}
                          onEdit={() => beginEditCapacity(row)}
                          onDelete={() => handleDeleteCapacity(row)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaves' && projectId && (
        <div className="space-y-4">
          <button type="button" onClick={() => setAddingLeave((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium min-h-[40px]">
            <Plus className="h-4 w-4" /> Add my leave
          </button>

          {addingLeave && (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex flex-wrap gap-2 items-center">
              <select value={newLeaveType} onChange={(e) => setNewLeaveType(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm capitalize">
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
              <input type="date" value={newLeaveStart} onChange={(e) => setNewLeaveStart(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              <input type="date" value={newLeaveEnd} onChange={(e) => setNewLeaveEnd(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
              <button type="button" onClick={handleAddMyLeave} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium min-h-[40px]">{editingLeave ? 'Update' : 'Save'}</button>
              <button type="button" onClick={() => { setAddingLeave(false); setEditingLeave(null) }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm min-h-[40px]">Cancel</button>
            </div>
          )}

          {leaveView && (
            <RecordPeek
              title={leaveView.member?.fullName || 'Leave'}
              onClose={() => setLeaveView(null)}
              fields={[
                { label: 'Type', value: leaveView.leave_type?.replace('_', ' ') },
                { label: 'Start', value: leaveView.start_date },
                { label: 'End', value: leaveView.end_date },
              ]}
            />
          )}

          {leaveEntries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">No leave entries yet for this project's team.</div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">#</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Team member</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Start</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">End</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {leaveEntries.map((row, index) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3 text-sm text-gray-400">{getDisplayRowNumber(index)}</td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{row.member?.fullName || 'Unknown'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{row.leave_type?.replace('_', ' ')}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.start_date}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{row.end_date}</td>
                      <td className="px-3 py-3 text-right">
                        <RowCrudActions
                          name={row.leave_type?.replace('_', ' ') || 'leave entry'}
                          canChange={canEditRow(row.user_id)}
                          onView={() => { setEditingLeave(null); setAddingLeave(false); setLeaveView(row) }}
                          onEdit={() => beginEditLeave(row)}
                          onDelete={() => handleDeleteLeave(row)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
