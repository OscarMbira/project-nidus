/**
 * Contact Directory — project contacts (internal, client, vendor, other)
 * (taxonomy §3, Project Setup > Project Team > Contact Directory).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, Download, BookUser, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton } from '@nidus/ui'
import SelectField from '@nidus/ui/SelectField'
import MultiLineListInput, { parseMultiLineValue } from '@nidus/ui/MultiLineListInput'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { exportListToCSV, exportListToJSON, exportListToXML, exportListToPrint } from '@nidus/shared/utils/exportUtils'
import { validateEmail, validatePhone } from '@nidus/shared/utils/formValidation'
import {
  getProjectContacts,
  createProjectContact,
  updateProjectContact,
  deleteProjectContact,
} from '../../services/projectContactsService'
import { listProjectFunctionalRoles, ensureProjectFunctionalRole } from '../../services/teamService'

const EMPTY_FORM = {
  contact_name: '',
  role_title: '',
  organisation: '',
  contact_type: '',
  email: '',
  phone: '',
  address: '',
  primary_email: '',
  primary_phone: '',
  primary_address: '',
  notes: '',
}

const TYPE_COLORS = {
  internal: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  client:   'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  vendor:   'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  other:    'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
}

const EXPORT_COLS = [
  { key: 'contact_name', label: 'Name' },
  { key: 'role_title', label: 'Role' },
  { key: 'organisation', label: 'Organisation' },
  { key: 'contact_type', label: 'Type' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
]

export default function ProjectContactsPage() {
  const navigate = useNavigate()
  const { projectId } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()

  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState(null)
  const [search, setSearch] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [roleOptions, setRoleOptions] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setRolesLoading(true)
    try {
      const [data, rolesResult, { data: { user } }] = await Promise.all([
        getProjectContacts(projectId),
        listProjectFunctionalRoles(projectId),
        platformDb.auth.getUser(),
      ])
      setContacts(data)
      const labels = (rolesResult.data || [])
        .map((r) => String(r.role_label || '').trim())
        .filter(Boolean)
      setRoleOptions(labels.map((label) => ({ value: label, label })))
      if (!rolesResult.success && rolesResult.error) {
        toast.error(rolesResult.error)
      }
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
      setRolesLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  /** Catalog roles + any in-use / current form role not yet in the catalog */
  const roleSelectOptions = useMemo(() => {
    const seen = new Set(roleOptions.map((o) => o.value.toLowerCase()))
    const extra = []
    for (const c of contacts) {
      const t = String(c.role_title || '').trim()
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase())
        extra.push({ value: t, label: t })
      }
    }
    const current = String(form.role_title || '').trim()
    if (current && !seen.has(current.toLowerCase())) {
      extra.push({ value: current, label: current })
    }
    return [...roleOptions, ...extra].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    )
  }, [roleOptions, contacts, form.role_title])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return contacts
    return contacts.filter((c) =>
      (c.contact_name || '').toLowerCase().includes(t) ||
      (c.organisation || '').toLowerCase().includes(t) ||
      (c.role_title || '').toLowerCase().includes(t) ||
      (c.email || '').toLowerCase().includes(t) ||
      (c.address || '').toLowerCase().includes(t)
    )
  }, [contacts, search])

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true) }
  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({
      contact_name: c.contact_name || '',
      role_title: c.role_title || '',
      organisation: c.organisation || '',
      contact_type: c.contact_type || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      primary_email: c.primary_email || parseMultiLineValue(c.email)[0] || '',
      primary_phone: c.primary_phone || parseMultiLineValue(c.phone)[0] || '',
      primary_address: c.primary_address || parseMultiLineValue(c.address)[0] || '',
      notes: c.notes || '',
    })
    setFormOpen(true)
  }

  const persistRoleIfNew = useCallback(async (roleLabel) => {
    const label = String(roleLabel || '').trim()
    if (!projectId || !label) return
    const already = roleOptions.some((o) => o.value.toLowerCase() === label.toLowerCase())
    if (already) return
    const result = await ensureProjectFunctionalRole(projectId, label, uid)
    if (!result.success) {
      toast.error(result.error || 'Could not add role to project catalog')
      return
    }
    if (result.created || result.reactivated) {
      setRoleOptions((prev) => {
        const seen = new Set(prev.map((o) => o.value.toLowerCase()))
        if (seen.has(label.toLowerCase())) return prev
        return [...prev, { value: label, label }].sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
        )
      })
    }
  }, [projectId, roleOptions, uid])

  const handleRoleChange = useCallback((role_title) => {
    const next = role_title || ''
    setForm((f) => ({ ...f, role_title: next }))
    void persistRoleIfNew(next)
  }, [persistRoleIfNew])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.contact_name.trim()) { toast.error('Name is required'); return }

    const emails = parseMultiLineValue(form.email)
    for (const email of emails) {
      const err = validateEmail(email)
      if (err) {
        toast.error(err === 'Email is required' ? 'Please enter a valid email address' : err)
        return
      }
    }
    const phones = parseMultiLineValue(form.phone)
    for (const phone of phones) {
      const err = validatePhone(phone)
      if (err) {
        toast.error(err)
        return
      }
    }
    if (form.primary_email && emails.length && !emails.includes(form.primary_email.trim())) {
      toast.error('Primary email must be one of the listed addresses')
      return
    }
    if (form.primary_phone && phones.length && !phones.includes(form.primary_phone.trim())) {
      toast.error('Primary phone must be one of the listed numbers')
      return
    }
    const addresses = parseMultiLineValue(form.address)
    if (form.primary_address && addresses.length && !addresses.includes(form.primary_address.trim())) {
      toast.error('Primary address must be one of the listed addresses')
      return
    }

    setSaving(true)
    try {
      await persistRoleIfNew(form.role_title)
      if (editingId) {
        await updateProjectContact(editingId, form, uid)
        showSuccess({ recordId: form.contact_name, operation: 'updated', message: 'Contact updated.' })
      } else {
        await createProjectContact(projectId, form, uid)
        showSuccess({ recordId: form.contact_name, operation: 'created', message: 'Contact added.' })
      }
      setFormOpen(false)
      await load()
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Remove ${c.contact_name} from the directory?`)) return
    try {
      await deleteProjectContact(c.id)
      setContacts((prev) => prev.filter((x) => x.id !== c.id))
      toast.success('Contact removed')
    } catch (e) {
      toast.error(e?.message || 'Remove failed')
    }
  }

  const handleExport = (fmt) => {
    const name = `contact-directory-${projectId || 'project'}`
    if (fmt === 'csv') exportListToCSV(EXPORT_COLS, filtered, name)
    else if (fmt === 'json') exportListToJSON(EXPORT_COLS, filtered, name)
    else if (fmt === 'xml') exportListToXML(EXPORT_COLS, filtered, name)
    else if (fmt === 'print') exportListToPrint(EXPORT_COLS, filtered, name, null)
    setExportOpen(false)
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BookUser className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Contact Directory
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">{filtered.length} contact{filtered.length === 1 ? '' : 's'}</p>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Download className="h-4 w-4" /> Export
            </button>
            {exportOpen && filtered.length > 0 && (
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-lg">
                {['csv', 'json', 'xml', 'print'].map((fmt) => (
                  <button key={fmt} type="button" onClick={() => handleExport(fmt)}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/platform/project-contacts/bulk-upload"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Upload className="h-4 w-4" /> Bulk upload
          </Link>
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            <Plus className="h-4 w-4" /> Add contact
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm" />
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Name *" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
            <SelectField
              forceSearchable
              options={roleSelectOptions}
              value={form.role_title}
              onChange={handleRoleChange}
              placeholder="Role"
              searchPlaceholder="Search roles…"
              aria-label="Role"
              loading={rolesLoading}
              disabled={saving}
              allowCustom
              className="w-full"
            />
            <input placeholder="Organisation" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
            <select value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm capitalize">
              <option value="">Type (optional)</option>
              <option value="internal">Internal</option>
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
              <option value="other">Other</option>
            </select>
            <div className="md:col-span-2 space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add one email address per row. Tick Primary on the preferred address.</p>
              <MultiLineListInput
                viewModeId="project-contact-emails"
                value={form.email}
                onChange={(email) => setForm((f) => ({ ...f, email }))}
                primaryValue={form.primary_email}
                onPrimaryChange={(primary_email) => setForm((f) => ({ ...f, primary_email }))}
                primaryLabel="Primary"
                placeholder="Add an email…"
                itemColumnLabel="Email"
                ariaLabelPrefix="email"
                disabled={saving}
                validateItem={(v) => {
                  const err = validateEmail(v)
                  return err === 'Email is required' ? 'Please enter a valid email address' : err
                }}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Phone</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add one phone number per row. Tick Primary on the preferred number.</p>
              <MultiLineListInput
                viewModeId="project-contact-phones"
                value={form.phone}
                onChange={(phone) => setForm((f) => ({ ...f, phone }))}
                primaryValue={form.primary_phone}
                onPrimaryChange={(primary_phone) => setForm((f) => ({ ...f, primary_phone }))}
                primaryLabel="Primary"
                placeholder="Add a phone number…"
                itemColumnLabel="Phone"
                ariaLabelPrefix="phone"
                disabled={saving}
                validateItem={validatePhone}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Address</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add one address per row. Tick Primary on the preferred address.</p>
              <MultiLineListInput
                viewModeId="project-contact-addresses"
                value={form.address}
                onChange={(address) => setForm((f) => ({ ...f, address }))}
                primaryValue={form.primary_address}
                onPrimaryChange={(primary_address) => setForm((f) => ({ ...f, primary_address }))}
                primaryLabel="Primary"
                placeholder="Add an address…"
                itemColumnLabel="Address"
                ariaLabelPrefix="address"
                disabled={saving}
              />
            </div>
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm md:col-span-2" rows={2} />
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {editingId ? 'Save changes' : 'Add contact'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <BookUser className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No contacts yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Organisation</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Contact</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((c, index) => {
                  const emails = parseMultiLineValue(c.email)
                  const phones = parseMultiLineValue(c.phone)
                  const addresses = parseMultiLineValue(c.address)
                  const primaryEmail = c.primary_email || emails[0] || ''
                  const primaryPhone = c.primary_phone || phones[0] || ''
                  const primaryAddress = c.primary_address || addresses[0] || ''
                  return (
                  <tr key={c.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{c.contact_name}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{c.role_title || '—'}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{c.organisation || '—'}</td>
                    <td className="px-4 py-2">
                      {c.contact_type ? (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${TYPE_COLORS[c.contact_type] || TYPE_COLORS.other}`}>
                          {c.contact_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                      {emails.length || phones.length || addresses.length ? (
                        <div className="space-y-1 text-xs">
                          {emails.map((em) => (
                            <div key={em} className="flex items-center gap-1.5">
                              <span>{em}</span>
                              {em === primaryEmail && (
                                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                          {phones.map((ph) => (
                            <div key={ph} className="flex items-center gap-1.5">
                              <span>{ph}</span>
                              {ph === primaryPhone && (
                                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                          {addresses.map((addr) => (
                            <div key={addr} className="flex items-center gap-1.5">
                              <span>{addr}</span>
                              {addr === primaryAddress && (
                                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50">
                      <div className="flex items-center justify-end gap-2">
                        <RowActionButton variant="edit" label={`Edit ${c.contact_name}`} onClick={() => openEdit(c)} />
                        <RowActionButton variant="delete" label={`Remove ${c.contact_name}`} onClick={() => handleDelete(c)} />
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal}
    </div>
  )
}
