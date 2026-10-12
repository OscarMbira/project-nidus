/**
 * Shared roster CRUD panel for Governance bodies (Steering Committee / Project Board).
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Star, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton } from '@nidus/ui'
import MultiLineListInput, { parseMultiLineValue } from '@nidus/ui/MultiLineListInput'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { validateEmail, validatePhone } from '@nidus/shared/utils/formValidation'
import {
  getGovernanceMembers,
  createGovernanceMember,
  updateGovernanceMember,
  deleteGovernanceMember,
} from '../../services/projectGovernanceMembersService'

const EMPTY_FORM = {
  member_name: '',
  role_title: '',
  organisation: '',
  email: '',
  phone: '',
  is_chair: false,
  appointed_date: '',
  end_date: '',
  notes: '',
}

const BULK_PATH = {
  steering_committee: '/platform/governance/steering-committee/bulk-upload',
  project_board: '/platform/governance/project-board/bulk-upload',
}

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100'

export default function GovernanceMembersPanel({ bodyType, title, description, backTo }) {
  const { projectId } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [data, { data: { user } }] = await Promise.all([
        getGovernanceMembers(projectId, bodyType),
        platformDb.auth.getUser(),
      ])
      setMembers(data)
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || `Failed to load ${title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [projectId, bodyType, title])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true) }
  const openEdit = (m) => {
    setEditingId(m.id)
    setForm({
      member_name: m.member_name || '',
      role_title: m.role_title || '',
      organisation: m.organisation || '',
      email: m.email || '',
      phone: m.phone || '',
      is_chair: !!m.is_chair,
      appointed_date: m.appointed_date || '',
      end_date: m.end_date || '',
      notes: m.notes || '',
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.member_name.trim()) { toast.error('Name is required'); return }

    for (const em of parseMultiLineValue(form.email)) {
      const err = validateEmail(em)
      if (err) { toast.error(`Email "${em}": ${err === 'Email is required' ? 'invalid' : err}`); return }
    }
    for (const ph of parseMultiLineValue(form.phone)) {
      const err = validatePhone(ph)
      if (err) { toast.error(`Phone "${ph}": ${err}`); return }
    }
    if (form.appointed_date && form.end_date && form.end_date < form.appointed_date) {
      toast.error('End date cannot be before appointed date')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateGovernanceMember(editingId, form, uid)
        showSuccess({ recordId: form.member_name, operation: 'updated', message: `${title} member updated.` })
      } else {
        await createGovernanceMember(projectId, bodyType, form, uid)
        showSuccess({ recordId: form.member_name, operation: 'created', message: `${title} member added.` })
      }
      setFormOpen(false)
      await load()
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (m) => {
    if (!window.confirm(`Remove ${m.member_name} from ${title}?`)) return
    try {
      await deleteGovernanceMember(m.id)
      setMembers((prev) => prev.filter((x) => x.id !== m.id))
      toast.success('Member removed')
    } catch (e) {
      toast.error(e?.message || 'Remove failed')
    }
  }

  const bulkPath = BULK_PATH[bodyType] || BULK_PATH.steering_committee

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link to={backTo} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-[12rem]">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={bulkPath}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Upload className="h-4 w-4" /> Bulk upload
            </Link>
            <button type="button" onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              <Plus className="h-4 w-4" /> Add member
            </button>
          </div>
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Name *</label>
              <input
                placeholder="Name"
                value={form.member_name}
                onChange={(e) => setForm({ ...form, member_name: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
              <input
                placeholder="Role"
                value={form.role_title}
                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Organisation</label>
              <input
                placeholder="Organisation"
                value={form.organisation}
                onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Email</label>
              <MultiLineListInput
                viewModeId={`gov-member-email-${bodyType}`}
                value={form.email}
                onChange={(email) => setForm((f) => ({ ...f, email }))}
                placeholder="Add an email…"
                itemColumnLabel="Email"
                ariaLabelPrefix="email"
                disabled={saving}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Phone</label>
              <MultiLineListInput
                viewModeId={`gov-member-phone-${bodyType}`}
                value={form.phone}
                onChange={(phone) => setForm((f) => ({ ...f, phone }))}
                placeholder="Add a phone…"
                itemColumnLabel="Phone"
                ariaLabelPrefix="phone"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Appointed date</label>
              <input
                type="date"
                value={form.appointed_date}
                onChange={(e) => setForm({ ...form, appointed_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">End date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={form.is_chair} onChange={(e) => setForm({ ...form, is_chair: e.target.checked })} />
              Chair
            </label>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass}
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {editingId ? 'Save changes' : 'Add member'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading…</p>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <p>No {title.toLowerCase()} members yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Organisation</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Contact</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {members.map((m, index) => (
                  <tr key={m.id}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center gap-1.5">
                        {m.is_chair && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                        {m.member_name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{m.role_title || '—'}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{m.organisation || '—'}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200 whitespace-pre-line">
                      {[m.email, m.phone].filter(Boolean).join('\n') || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <RowActionButton variant="edit" label={`Edit ${m.member_name}`} onClick={() => openEdit(m)} />
                        <RowActionButton variant="delete" label={`Remove ${m.member_name}`} onClick={() => handleDelete(m)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal}
    </div>
  )
}
