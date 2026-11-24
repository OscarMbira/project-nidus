/**
 * v1353 — Clients, rate cards, tax codes, project billing, invoices, schedule, revenue and the client portal list.
 * Shared by Platform, Simulator and Planner. Routed pages (rule 65).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createBillingData, accountingCsv, CLIENT_TEMPLATE, ACCOUNTING_DICTIONARY } from '../../services/billingData.js'
import { paymentStatus, buildInvoiceDocument, applyInvoiceFilters, parseRateCardCsv, taxForLine, roundMoney } from '../../engine/billing.js'
import { generateRecordPdfBlob } from '@nidus/shared/utils/exportUtils'
import { useBranding } from '@nidus/shared/hooks/useBranding'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'
import SmartAmountInput from '@nidus/ui/SmartAmountInput'
import AuthorisationRequestModal from '@nidus/ui/AuthorisationRequestModal'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import DashboardStatCard from '@nidus/ui/DashboardStatCard'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import RowActionButton from '@nidus/ui/RowActionButton'
import PlanningTable from '../../components/PlanningTable.jsx'
import { platformDb, simDb } from '@nidus/supabase'
import { useScheduleProjectId } from '../../hooks/useSchedule.js'

const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100'
const shell = 'w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100'

function useApi() {
  const { isSim } = usePlanning()
  return useMemo(() => createBillingData(!!isSim), [isSim])
}
function usePrefix() {
  const { isSim } = usePlanning()
  return (key) => (isSim ? key.replace('public.', 'sim.') : key)
}
function Back() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  )
}
function today() { return new Date().toISOString().slice(0, 10) }
function billingRoot(pathname) {
  const marker = pathname.includes('/client-billing') ? '/client-billing' : pathname.includes('/simulator/') ? '/simulator/billing' : '/platform/billing'
  const at = pathname.indexOf(marker)
  return at >= 0 ? pathname.slice(0, at) + marker : marker
}
function shownStatus(invoice) {
  if (!['issued', 'part_paid', 'paid'].includes(invoice.status)) return invoice.status
  return paymentStatus(Number(invoice.gross_amount), Number(invoice.amount_paid), invoice.due_date, today())
}

export function ClientsScreen() {
  const api = useApi()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  useEffect(() => { api.listClients().then(setRows).catch((e) => setError(e.message)) }, [api])
  function download() {
    const blob = new Blob([CLIENT_TEMPLATE], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'clients-template.csv'
    a.click()
  }
  async function upload(file) {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l && !l.startsWith('#'))
    const header = lines.shift()?.split(',') || []
    for (const line of lines) {
      const cells = line.split(',')
      const row = Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] || '').replace(/^"|"$/g, '')]))
      if (!row.name) continue
      await api.saveClient({ name: row.name, kind: row.kind === 'internal' ? 'internal' : 'external', currency: row.currency || 'USD', payment_terms_days: Number(row.payment_terms_days) || 30, billing_address: row.billing_address || null })
    }
    setRows(await api.listClients())
  }
  return (
    <div className={shell}>
      <h1 className="text-xl font-bold mb-4">Clients</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <PlanningTable
        pageId="billing-clients"
        exportName="clients"
        searchPlaceholder="Search clients"
        rows={rows}
        columns={[
          { key: 'name', label: 'Client', render: (r) => <Link className="text-blue-600 dark:text-blue-400" to={r.client_reference || r.id}>{r.name}</Link> },
          { key: 'kind', label: 'Kind' },
          { key: 'currency', label: 'Currency' },
        ]}
        actions={(r) => (
          <>
            <RowActionButton variant="view" label="View client" onClick={() => navigate(r.client_reference || r.id)} />
            <RowActionButton variant="edit" label="Edit client" onClick={() => navigate(`${r.client_reference || r.id}/edit`)} />
          </>
        )}
        toolbar={(
          <>
            <Link to="new" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">New client</Link>
            <button type="button" onClick={download} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Download template</button>
            <label data-help="exempt" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm cursor-pointer">Upload CSV
              <input data-help="exempt" type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </>
        )}
      />
    </div>
  )
}

export function ClientForm() {
  const { clientKey } = useParams()
  const api = useApi()
  const prefix = usePrefix()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { showSuccess, modal } = useSuccessModal()
  const creating = !clientKey || clientKey === 'new'
  const editing = creating || pathname.endsWith('/edit')
  const [form, setForm] = useState({ name: '', kind: 'external', currency: 'USD', payment_terms_days: 30, billing_address: '', tax_number: '', markup_percent: 0, notes: '' })
  const [saved, setSaved] = useState(null)
  const [contacts, setContacts] = useState([])
  const [contact, setContact] = useState({ name: '', role_title: '', email: '', phone: '', is_billing_contact: true })
  const [tab, setTab] = useState('details')
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  useUnsavedChangesGuard(dirty, 'Leave without saving this client?')
  useEffect(() => {
    if (creating) return
    api.listClients().then((rows) => {
      const row = rows.find((r) => r.client_reference === clientKey || r.id === clientKey)
      if (row) { setForm(row); setSaved(row); api.listContacts(row.id).then(setContacts) }
    }).catch(() => {})
  }, [api, clientKey, creating])
  const keys = ['name', 'kind', 'billing_address', 'tax_number', 'currency', 'payment_terms_days', 'markup_percent', 'notes', 'default_tax_code_id'].map((c) => prefix(`public.clients.${c}`))
    .concat(['name', 'role_title', 'email', 'phone', 'is_billing_contact'].map((c) => prefix(`public.client_contacts.${c}`)))
  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); setDirty(true) }
  async function save() {
    if (!String(form.name || '').trim()) { setError('Enter a client name.'); return }
    setError('')
    const row = await api.saveClient({ ...form, id: saved?.id, payment_terms_days: Number(form.payment_terms_days) || 0, markup_percent: Number(form.markup_percent) || 0 })
    setSaved(row); setDirty(false)
    showSuccess({ recordId: row.client_reference || row.name, operation: saved ? 'updated' : 'created', message: 'The client has been saved.' })
  }
  async function addContact() {
    if (!saved || !contact.name) return
    await api.saveContact({ ...contact, client_id: saved.id })
    setContacts(await api.listContacts(saved.id))
    setContact({ name: '', role_title: '', email: '', phone: '', is_billing_contact: true })
  }
  return (
    <FieldHelpScope helpKeys={keys}>
      <div className={shell}>
        <Back />
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-xl font-bold">{creating ? 'New client' : form.name || 'Client'}</h1>
          {!creating && !editing && <Link to="edit" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Edit</Link>}
        </div>
        {error && <p className="text-red-600 mb-3">{error}</p>}
        <DetailAuditTabList activeTab={tab} onChange={setTab} detailsLabel="Details" />
        {tab === 'details' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 max-w-2xl">
            <fieldset disabled={!editing} className="space-y-3 border-0 p-0 min-w-0">
            <FieldLabelWithHelp helpKey={prefix('public.clients.name')} htmlFor="client-name" required>Name</FieldLabelWithHelp>
            <input id="client-name" className={inputClass} value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
            <FieldLabelWithHelp helpKey={prefix('public.clients.kind')} htmlFor="client-kind">Kind</FieldLabelWithHelp>
            <select id="client-kind" className={inputClass} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="external">External</option><option value="internal">Internal</option>
            </select>
            <FieldLabelWithHelp helpKey={prefix('public.clients.billing_address')} htmlFor="client-address">Billing address</FieldLabelWithHelp>
            <textarea id="client-address" className={inputClass} value={form.billing_address || ''} onChange={(e) => set('billing_address', e.target.value)} />
            <FieldLabelWithHelp helpKey={prefix('public.clients.tax_number')} htmlFor="client-tax">Tax number</FieldLabelWithHelp>
            <input id="client-tax" className={inputClass} value={form.tax_number || ''} onChange={(e) => set('tax_number', e.target.value)} />
            <FieldLabelWithHelp helpKey={prefix('public.clients.currency')} htmlFor="client-currency">Currency</FieldLabelWithHelp>
            <input id="client-currency" className={inputClass} value={form.currency || ''} onChange={(e) => set('currency', e.target.value)} />
            <FieldLabelWithHelp helpKey={prefix('public.clients.payment_terms_days')} htmlFor="client-terms">Payment terms (days)</FieldLabelWithHelp>
            <input id="client-terms" className={inputClass} value={form.payment_terms_days ?? ''} onChange={(e) => set('payment_terms_days', e.target.value)} />
            <FieldLabelWithHelp helpKey={prefix('public.clients.markup_percent')} htmlFor="client-markup" isAmount>Mark-up %</FieldLabelWithHelp>
            <input id="client-markup" className={inputClass} value={form.markup_percent ?? ''} onChange={(e) => set('markup_percent', e.target.value)} />
            <FieldLabelWithHelp helpKey={prefix('public.clients.notes')} htmlFor="client-notes">Notes</FieldLabelWithHelp>
            <textarea id="client-notes" className={inputClass} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
            </fieldset>
            {editing && <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save</button>}
            {saved && (
              <div className="pt-4 space-y-2">
                <h2 className="font-semibold">Billing contacts</h2>
                {contacts.map((c) => <p key={c.id} className="text-sm text-gray-700 dark:text-gray-200">{c.name}{c.role_title ? ` · ${c.role_title}` : ''} · {c.email} {c.is_billing_contact ? '· billing' : ''}</p>)}
                {editing && (
                  <>
                    <FieldLabelWithHelp helpKey={prefix('public.client_contacts.name')} htmlFor="contact-name">Contact</FieldLabelWithHelp>
                    <input id="contact-name" className={inputClass} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                    <FieldLabelWithHelp helpKey={prefix('public.client_contacts.role_title')} htmlFor="contact-role">Role</FieldLabelWithHelp>
                    <input id="contact-role" className={inputClass} value={contact.role_title} onChange={(e) => setContact({ ...contact, role_title: e.target.value })} />
                    <FieldLabelWithHelp helpKey={prefix('public.client_contacts.email')} htmlFor="contact-email">Email</FieldLabelWithHelp>
                    <input id="contact-email" className={inputClass} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                    <FieldLabelWithHelp helpKey={prefix('public.client_contacts.phone')} htmlFor="contact-phone">Phone</FieldLabelWithHelp>
                    <input id="contact-phone" className={inputClass} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                    <div className="flex items-center gap-2 text-sm">
                      <input id="contact-billing" type="checkbox" checked={contact.is_billing_contact} onChange={(e) => setContact({ ...contact, is_billing_contact: e.target.checked })} />
                      <FieldLabelWithHelp helpKey={prefix('public.client_contacts.is_billing_contact')} htmlFor="contact-billing">Billing contact</FieldLabelWithHelp>
                    </div>
                    <button type="button" onClick={addContact} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Add contact</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {tab === 'audit' && (
          <AuditDetailsPanel>
            {saved ? (
              <AuditCard title="Identity"><AuditField label="Reference" value={saved.client_reference || 'Assigned when the record is saved'} /></AuditCard>
            ) : <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this record is saved.</p>}
          </AuditDetailsPanel>
        )}
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function TaxCodesScreen() {
  const api = useApi()
  const prefix = usePrefix()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ code: '', label: '', rate_percent: 0, kind: 'standard', is_default: false })
  useEffect(() => { api.listTax().then(setRows).catch(() => {}) }, [api])
  async function save() {
    const row = await api.saveTax({ ...form, rate_percent: Number(form.rate_percent) || 0 })
    setRows(await api.listTax())
    showSuccess({ recordId: row.code, operation: 'created', message: 'The tax code has been saved.' })
  }
  return (
    <FieldHelpScope helpKeys={['code', 'label', 'rate_percent', 'kind', 'is_default'].map((c) => prefix(`public.tax_codes.${c}`))}>
      <div className={shell}>
        <h1 className="text-xl font-bold mb-4">Tax codes</h1>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 max-w-xl mb-6">
          <FieldLabelWithHelp helpKey={prefix('public.tax_codes.code')} htmlFor="tax-code" required>Code</FieldLabelWithHelp>
          <input id="tax-code" className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.tax_codes.label')} htmlFor="tax-label" required>Label</FieldLabelWithHelp>
          <input id="tax-label" className={inputClass} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.tax_codes.rate_percent')} htmlFor="tax-rate">Rate %</FieldLabelWithHelp>
          <input id="tax-rate" className={inputClass} value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.tax_codes.kind')} htmlFor="tax-kind">Kind</FieldLabelWithHelp>
          <select id="tax-kind" className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="standard">Standard</option><option value="exempt">Exempt</option><option value="reverse_charge">Reverse charge</option>
          </select>
          <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save</button>
        </div>
        <PlanningTable pageId="billing-tax-codes" exportName="tax-codes" searchPlaceholder="Search tax codes" rows={rows} columns={[
          { key: 'code', label: 'Code' },
          { key: 'label', label: 'Label' },
          { key: 'rate_percent', label: 'Rate %' },
          { key: 'kind', label: 'Kind' },
        ]} />
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function RateCardsScreen() {
  const api = useApi()
  const prefix = usePrefix()
  const { showSuccess, modal } = useSuccessModal()
  const [cards, setCards] = useState([])
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [scope, setScope] = useState('organisation')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [lines, setLines] = useState([{ role_name: '', user_id: '', work_category: '', unit: 'hour', rate: '' }])
  useEffect(() => {
    api.listCards().then(setCards).catch(() => {})
    api.listClients().then(setClients).catch(() => {})
    api.listProjects().then(setProjects).catch(() => {})
  }, [api])
  function template() {
    const csv = ['# DATA DICTIONARY', '# role_name | required No | text | 80 | | Role this rate applies to', '# work_category | required No | text | 40 | |', '# unit | required Yes | text | 10 | hour or day |', '# rate | required Yes | number | 18,2 | | Charge-out amount', '#', 'role_name,work_category,unit,rate', 'Consultant,,hour,150'].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'rate-card-lines.csv'; a.click()
  }
  function upload(file) {
    const reader = new FileReader()
    reader.onload = () => setLines(parseRateCardCsv(String(reader.result)).map((r) => ({ ...r, user_id: '', rate: String(r.rate) })))
    reader.readAsText(file)
  }
  async function save() {
    const row = await api.saveCard({
      name: name || (scope === 'client' ? 'Client rates' : scope === 'project' ? 'Project rates' : 'Organisation rates'),
      currency: 'USD', effective_from: today(),
      client_id: scope === 'client' ? clientId || null : null,
      project_id: scope === 'project' ? projectId || null : null,
    }, lines.map((l) => ({
      role_name: l.role_name || null, user_id: l.user_id || null, work_category: l.work_category || null, unit: l.unit, rate: Number(l.rate) || 0,
    })))
    setCards(await api.listCards())
    showSuccess({ recordId: row.name, operation: 'created', message: 'The rate card has been saved. A person line beats a project card, then a client card, then the organisation card.' })
  }
  return (
    <FieldHelpScope helpKeys={['name', 'client_id', 'project_id'].map((c) => prefix(`public.rate_cards.${c}`)).concat(['role_name', 'user_id', 'unit', 'rate', 'work_category'].map((c) => prefix(`public.rate_card_lines.${c}`)))}>
      <div className={shell}>
        <h1 className="text-xl font-bold mb-4">Rate cards</h1>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 mb-6">
          <FieldLabelWithHelp helpKey={prefix('public.rate_cards.name')} htmlFor="card-name" required>Name</FieldLabelWithHelp>
          <input id="card-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          <FieldLabelWithHelp helpKey={prefix('public.rate_cards.client_id')} htmlFor="card-scope">Who this card is for</FieldLabelWithHelp>
          <select id="card-scope" className={inputClass} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="organisation">Organisation</option>
            <option value="client">One client</option>
            <option value="project">One project</option>
          </select>
          {scope === 'client' && (
            <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Client">
              <option value="">Choose a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {scope === 'project' && (
            <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project">
              <option value="">Choose a project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          )}
          {lines.map((line, i) => (
            <div key={i} className="grid md:grid-cols-5 gap-2">
              <input className={inputClass} aria-label="Role" placeholder="Role" value={line.role_name} onChange={(e) => setLines(lines.map((l, n) => n === i ? { ...l, role_name: e.target.value } : l))} />
              <input className={inputClass} aria-label="Person" placeholder="Person id" value={line.user_id} onChange={(e) => setLines(lines.map((l, n) => n === i ? { ...l, user_id: e.target.value } : l))} />
              <input className={inputClass} aria-label="Category" placeholder="Category" value={line.work_category} onChange={(e) => setLines(lines.map((l, n) => n === i ? { ...l, work_category: e.target.value } : l))} />
              <select className={inputClass} aria-label="Unit" value={line.unit} onChange={(e) => setLines(lines.map((l, n) => n === i ? { ...l, unit: e.target.value } : l))}><option value="hour">Hour</option><option value="day">Day</option></select>
              <SmartAmountInput value={line.rate} onChange={(amount) => setLines(lines.map((l, idx) => idx === i ? { ...l, rate: amount ?? '' } : l))} className={inputClass} />
            </div>
          ))}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setLines([...lines, { role_name: '', user_id: '', work_category: '', unit: 'hour', rate: '' }])} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Add line</button>
            <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save card</button>
            <button type="button" onClick={template} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Line template</button>
            <label data-help="exempt" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm cursor-pointer">Upload template
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </div>
        </div>
        <PlanningTable pageId="billing-rate-cards" exportName="rate-cards" searchPlaceholder="Search rate cards" rows={cards.map((c) => ({ ...c, scope: c.client_id ? 'client' : c.project_id ? 'project' : 'organisation', lines: (c.rate_card_lines || []).length }))} columns={[
          { key: 'name', label: 'Rate card' },
          { key: 'scope', label: 'Who it is for' },
          { key: 'lines', label: 'Lines' },
        ]} />
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function ProjectBillingScreen({ projectId }) {
  const api = useApi()
  const prefix = usePrefix()
  const { showSuccess, modal } = useSuccessModal()
  const [clients, setClients] = useState([])
  const [cards, setCards] = useState([])
  const [form, setForm] = useState({ client_id: '', rate_card_id: '', billable_default: true, markup_percent: '', contract_value: '', currency: '' })
  const [dirty, setDirty] = useState(false)
  useUnsavedChangesGuard(dirty)
  useEffect(() => {
    if (!projectId) return
    Promise.all([api.listClients(), api.listCards(), api.loadSettings(projectId)]).then(([c, cards, settings]) => {
      setClients(c); setCards(cards)
      if (settings) setForm({ ...settings, markup_percent: settings.markup_percent ?? '', contract_value: settings.contract_value ?? '' })
    }).catch(() => {})
  }, [api, projectId])
  async function save() {
    const row = await api.saveSettings({
      project_id: projectId, client_id: form.client_id || null, rate_card_id: form.rate_card_id || null,
      billable_default: !!form.billable_default, markup_percent: form.markup_percent === '' ? null : Number(form.markup_percent),
      contract_value: form.contract_value === '' ? null : Number(form.contract_value), currency: form.currency || null,
    })
    setDirty(false)
    showSuccess({ recordId: projectId, operation: 'updated', message: 'Billing settings have been saved.' })
    return row
  }
  if (!projectId) return <div className={shell}><p>Open this page from a project.</p></div>
  return (
    <FieldHelpScope helpKeys={['client_id', 'rate_card_id', 'billable_default', 'markup_percent', 'contract_value', 'currency'].map((c) => prefix(`public.project_billing_settings.${c}`))}>
      <div className={shell}>
        <h1 className="text-xl font-bold mb-4">Project billing</h1>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 max-w-xl">
          <FieldLabelWithHelp helpKey={prefix('public.project_billing_settings.client_id')} htmlFor="bill-client" listOptions={false}>Client</FieldLabelWithHelp>
          <select id="bill-client" className={inputClass} value={form.client_id || ''} onChange={(e) => { setForm({ ...form, client_id: e.target.value }); setDirty(true) }}>
            <option value="">Choose</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <FieldLabelWithHelp helpKey={prefix('public.project_billing_settings.rate_card_id')} htmlFor="bill-card" listOptions={false}>Rate card</FieldLabelWithHelp>
          <select id="bill-card" className={inputClass} value={form.rate_card_id || ''} onChange={(e) => { setForm({ ...form, rate_card_id: e.target.value }); setDirty(true) }}>
            <option value="">Organisation and client cards</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <input id="bill-default" type="checkbox" checked={!!form.billable_default} onChange={(e) => { setForm({ ...form, billable_default: e.target.checked }); setDirty(true) }} />
            <FieldLabelWithHelp helpKey={prefix('public.project_billing_settings.billable_default')} htmlFor="bill-default">Time is billable</FieldLabelWithHelp>
          </div>
          <FieldLabelWithHelp helpKey={prefix('public.project_billing_settings.contract_value')} htmlFor="bill-value" isAmount>Contract value</FieldLabelWithHelp>
          <SmartAmountInput id="bill-value" value={form.contract_value} onChange={(n) => { setForm({ ...form, contract_value: n ?? '' }); setDirty(true) }} className={inputClass} />
          <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save</button>
        </div>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function InvoicesScreen({ projectId }) {
  const api = useApi()
  const navigate = useNavigate()
  const { isSim } = usePlanning()
  const { pathname } = useLocation()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState('')
  const [start, setStart] = useState(today().slice(0, 8) + '01')
  const [end, setEnd] = useState(today())
  const { showSuccess, modal } = useSuccessModal()
  useEffect(() => { api.listInvoices(projectId).then(setRows).catch((e) => setError(e.message)) }, [api, projectId])
  const decorated = rows.map((r) => ({ ...r, shown: shownStatus(r) }))
  const shown = applyInvoiceFilters(decorated, { status: filter, clientId })
  const clients = [...new Map(rows.filter((r) => r.client_id).map((r) => [r.client_id, r.clients?.name || 'Client'])).entries()]
  const overdue = decorated.filter((r) => r.shown === 'overdue').length
  async function draft() {
    const row = await api.draftInvoice(projectId, start, end)
    setRows(await api.listInvoices(projectId))
    showSuccess({ recordId: row.invoice_reference || 'Draft', operation: 'created', message: 'The draft invoice has been created.' })
  }
  async function accountingPack() {
    return api.accountingBundle(projectId)
  }
  async function accountingExcel() {
    const XLSX = await import('xlsx')
    const data = await accountingPack()
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ACCOUNTING_DICTIONARY), 'Legend')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Data')
    XLSX.writeFile(wb, 'client-invoices.xlsx')
  }
  async function remind() {
    const sent = await api.sendDueReminders()
    showSuccess({ recordId: 'Reminders', operation: 'updated', message: sent ? `${sent} overdue reminder${sent === 1 ? '' : 's'} sent.` : 'No new overdue reminders to send.' })
  }
  async function accounting() {
    const data = await accountingPack()
    const csv = accountingCsv(data)
    const json = JSON.stringify({ DATA_DICTIONARY: ACCOUNTING_DICTIONARY, rows: data }, null, 2)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'client-invoices.csv'
    a.click()
    const b = document.createElement('a')
    b.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    b.download = 'client-invoices.json'
    b.click()
  }
  return (
    <div className={shell}>
      <h1 className="text-xl font-bold mb-4">Client invoices</h1>
      {isSim && <p className="mb-3 text-sm text-gray-700 dark:text-gray-200">Practice invoices. They are not sent to a real client.</p>}
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <DashboardStatCard label="Overdue" value={overdue} onClick={() => setFilter('overdue')} />
        <DashboardStatCard label="Drafts" value={rows.filter((r) => r.status === 'draft').length} onClick={() => setFilter('draft')} />
        <DashboardStatCard label="Issued" value={rows.filter((r) => r.status === 'issued').length} onClick={() => setFilter('issued')} />
        <DashboardStatCard label="All" value={rows.length} onClick={() => setFilter('all')} />
      </div>
      {projectId && (
        <div className="flex flex-wrap gap-2 mb-4 items-end">
          <RegionalDateInput id="inv-start" data-help="exempt" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
          <RegionalDateInput id="inv-end" data-help="exempt" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
          <button type="button" onClick={draft} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Draft from approved work</button>
        </div>
      )}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <select aria-label="Client" data-help="exempt" className={inputClass + ' max-w-xs'} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">All clients</option>
          {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <Link to={`${billingRoot(pathname)}/document`} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Payment text</Link>
        <button type="button" onClick={remind} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Send overdue reminders</button>
        <button type="button" onClick={accounting} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Accounting CSV and JSON</button>
        <button type="button" onClick={accountingExcel} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Accounting Excel</button>
      </div>
      <PlanningTable
        pageId="billing-invoices"
        exportName="client-invoices"
        searchPlaceholder="Search invoices"
        rows={shown}
        columns={[
          { key: 'invoice_reference', label: 'Invoice', value: (r) => r.invoice_reference || 'Draft', render: (r) => <Link className="text-blue-600 dark:text-blue-400" to={r.invoice_reference || r.id}>{r.invoice_reference || 'Draft'}</Link> },
          { key: 'shown', label: 'Status' },
          { key: 'gross_amount', label: 'Total' },
        ]}
        actions={(r) => <RowActionButton variant="view" label="View invoice" onClick={() => navigate(r.invoice_reference || r.id)} />}
      />
      {modal}
    </div>
  )
}

export function InvoiceDetailScreen() {
  const { invoiceKey } = useParams()
  const api = useApi()
  const prefix = usePrefix()
  const { isSim } = usePlanning()
  const db = isSim ? simDb : platformDb
  const { showSuccess, modal } = useSuccessModal()
  const { branding } = useBranding()
  const [invoice, setInvoice] = useState(null)
  const [mayIssue, setMayIssue] = useState(true)
  const [edits, setEdits] = useState({})
  const [decide, setDecide] = useState(false)
  const [tab, setTab] = useState('details')
  const [error, setError] = useState('')
  const [pay, setPay] = useState({ amount: '', paid_on: today(), method: 'Bank transfer', reference: '' })
  const [reason, setReason] = useState('')
  const [manual, setManual] = useState({ description: '', quantity: 1, rate: '', tax: 0 })
  const [doc, setDoc] = useState({ payment_instructions: '', footer: '' })
  useEffect(() => { api.loadDocumentSettings().then((row) => row && setDoc(row)).catch(() => {}) }, [api])
  useEffect(() => {
    if (!invoice || isSim) { setMayIssue(true); return }
    let live = true
    api.canIssue(invoice.account_id).then((allowed) => { if (live) setMayIssue(!!allowed) }).catch(() => { if (live) setMayIssue(true) })
    return () => { live = false }
  }, [api, invoice, isSim])
  useEffect(() => {
    api.listInvoices().then((rows) => {
      const row = rows.find((r) => r.invoice_reference === invoiceKey || r.id === invoiceKey)
      if (row) api.loadInvoice(row.id).then(setInvoice)
    }).catch((e) => setError(e.message))
  }, [api, invoiceKey])
  if (!invoice) return <div className={shell}>{error || 'Loading…'}</div>
  const locked = ['issued', 'part_paid', 'paid'].includes(invoice.status)
  const lines = (invoice.client_invoice_lines || []).filter((l) => !l.voided)
  async function submit() {
    await api.submitInvoice(invoice.id)
    setInvoice(await api.loadInvoice(invoice.id))
  }
  async function onDecision(action, notes) {
    if (action !== 'approve') { setDecide(false); return }
    await api.issueInvoice(invoice.id, notes)
    setDecide(false)
    setInvoice(await api.loadInvoice(invoice.id))
    showSuccess({ recordId: invoice.invoice_reference || 'Invoice', operation: 'updated', message: 'The invoice has been issued.' })
  }
  async function payment() {
    await api.recordPayment(invoice.id, Number(pay.amount), pay.paid_on, pay.method, pay.reference)
    setInvoice(await api.loadInvoice(invoice.id))
    showSuccess({ recordId: invoice.invoice_reference || 'Invoice', operation: 'updated', message: 'The payment has been recorded.' })
  }
  async function credit() {
    await api.creditInvoice(invoice.id, lines.map((l) => l.id), reason)
    setInvoice(await api.loadInvoice(invoice.id))
    showSuccess({ recordId: 'Credit', operation: 'created', message: 'The credit note has released these lines.' })
  }
  async function send() {
    const { data: contacts } = await db.from('client_contacts').select('email').eq('client_id', invoice.client_id).eq('is_billing_contact', true)
    const to = (contacts || []).map((c) => c.email).filter(Boolean).join(', ')
    if (!to) { setError('Add a billing contact with an email first.'); return }
    const ref = invoice.invoice_reference || 'invoice'
    const blob = await generateRecordPdfBlob(document.sections, document.record, ref, branding)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
    const { error: sendError } = await db.functions.invoke('send-email', { body: {
      to,
      subject: `Invoice ${ref}`,
      html: `<p>Invoice ${ref} is attached. Total ${invoice.gross_amount} ${invoice.currency}.</p>`,
      attachments: [{ filename: `${ref}.pdf`, content: btoa(binary), content_type: 'application/pdf' }],
    } })
    if (sendError) { setError(sendError.message); return }
    await api.logSend(invoice.id, to)
    showSuccess({ recordId: invoice.invoice_reference || 'Invoice', operation: 'updated', message: 'The invoice email has been sent with the PDF attached.' })
  }
  const document = buildInvoiceDocument({ invoice: { ...invoice, status: shownStatus(invoice) }, lines, instructions: doc.payment_instructions, footer: doc.footer, organisation: branding?.app_display_name || '' })
  function draftLine(line) {
    return edits[line.id] || { description: line.description, quantity: line.quantity, rate: line.rate }
  }
  async function saveLine(line) {
    const edit = draftLine(line)
    const amount = roundMoney(Number(edit.quantity) * Number(edit.rate))
    const ratio = Number(line.amount) ? Number(line.tax_amount) / Number(line.amount) : 0
    await api.updateLine(invoice.id, line.id, { description: edit.description, quantity: Number(edit.quantity) || 0, rate: Number(edit.rate) || 0, amount, tax_amount: roundMoney(amount * ratio) })
    setInvoice(await api.loadInvoice(invoice.id))
  }
  async function removeLine(line) {
    if (!window.confirm('Remove this line from the draft?')) return
    await api.removeLine(invoice.id, line)
    setInvoice(await api.loadInvoice(invoice.id))
  }
  async function addLine() {
    const taxed = taxForLine(Number(manual.quantity || 1) * Number(manual.rate || 0), { kind: 'standard', ratePercent: Number(manual.tax) || 0 }, { internal: invoice.clients?.kind === 'internal' })
    await api.addManualLine(invoice.id, { description: manual.description || 'Manual line', quantity: Number(manual.quantity) || 1, rate: Number(manual.rate) || 0, amount: taxed.net, tax_amount: taxed.tax, unit: 'each' })
    setInvoice(await api.loadInvoice(invoice.id))
  }
  async function saveRate() {
    await api.updateDraft(invoice.id, { exchange_rate: Number(invoice.exchange_rate) || 1 })
    setInvoice(await api.loadInvoice(invoice.id))
  }
  return (
    <FieldHelpScope helpKeys={[prefix('public.client_payments.amount'), prefix('public.client_payments.paid_on'), prefix('public.client_credit_notes.reason'), prefix('public.client_invoices.exchange_rate'), prefix('public.client_invoice_lines.description')]}>
      <div className={shell}>
        <Back />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-xl font-bold">{invoice.invoice_reference || 'Draft invoice'}{isSim ? ' · Practice' : ''}</h1>
          <ExportRecordButtons sections={document.sections} record={document.record} baseFilename={invoice.invoice_reference || 'invoice'} title="Invoice" />
        </div>
        {error && <p className="text-red-600 mb-3">{error}</p>}
        <DetailAuditTabList activeTab={tab} onChange={setTab} detailsLabel="Details" />
        {tab === 'details' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-200">Status: {shownStatus(invoice)} · {invoice.currency} {invoice.gross_amount}</p>
            <table className="min-w-full text-sm"><thead><tr><th className="text-left">Description</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Tax</th>{invoice.status === 'draft' && <th data-help="exempt"> </th>}</tr></thead>
              <tbody>{lines.map((l) => {
                const edit = draftLine(l)
                return (
                  <tr key={l.id}>
                    <td>{invoice.status === 'draft' ? <input aria-label="Description" className={inputClass} value={edit.description} onChange={(e) => setEdits({ ...edits, [l.id]: { ...edit, description: e.target.value } })} /> : l.description}</td>
                    <td>{invoice.status === 'draft' ? <input aria-label="Quantity" className={inputClass} value={edit.quantity} onChange={(e) => setEdits({ ...edits, [l.id]: { ...edit, quantity: e.target.value } })} /> : l.quantity}</td>
                    <td>{invoice.status === 'draft' ? <input aria-label="Rate" className={inputClass} value={edit.rate} onChange={(e) => setEdits({ ...edits, [l.id]: { ...edit, rate: e.target.value } })} /> : l.rate}</td>
                    <td>{l.amount}</td>
                    <td>{l.tax_amount}</td>
                    {invoice.status === 'draft' && <td className="whitespace-nowrap"><button type="button" onClick={() => saveLine(l)} className="px-2 py-1 text-sm">Save</button> <button type="button" onClick={() => removeLine(l)} className="px-2 py-1 text-sm">Remove</button></td>}
                  </tr>
                )
              })}</tbody>
            </table>
            {invoice.status === 'draft' && (
              <div className="space-y-2 pt-2">
                <FieldLabelWithHelp helpKey={prefix('public.client_invoices.exchange_rate')} htmlFor="inv-rate">Exchange rate</FieldLabelWithHelp>
                <input id="inv-rate" className={inputClass} value={invoice.exchange_rate ?? 1} onChange={(e) => setInvoice({ ...invoice, exchange_rate: e.target.value })} />
                <button type="button" onClick={saveRate} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Save rate</button>
                <FieldLabelWithHelp helpKey={prefix('public.client_invoice_lines.description')} htmlFor="manual-desc">Description</FieldLabelWithHelp>
                <input id="manual-desc" className={inputClass} value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} />
                <input aria-label="Quantity" className={inputClass} value={manual.quantity} onChange={(e) => setManual({ ...manual, quantity: e.target.value })} />
                <SmartAmountInput value={manual.rate} onChange={(n) => setManual({ ...manual, rate: n ?? '' })} className={inputClass} />
                <button type="button" onClick={addLine} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Add line</button>
                <button type="button" onClick={submit} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Submit for approval</button>
              </div>
            )}
            {invoice.status === 'pending_approval' && mayIssue && <button type="button" onClick={() => setDecide(true)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Approve and issue</button>}
            {invoice.status === 'pending_approval' && !mayIssue && <p className="text-sm text-gray-700 dark:text-gray-200">A PMO Admin or the account owner issues this invoice. The lines stay read-only until then.</p>}
            {locked && (
              <div className="flex flex-col items-start gap-3 pt-2">
                <button type="button" onClick={send} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Email billing contacts</button>
                <FieldLabelWithHelp helpKey={prefix('public.client_payments.amount')} htmlFor="pay-amount" isAmount>Amount received</FieldLabelWithHelp>
                <SmartAmountInput id="pay-amount" value={pay.amount} onChange={(n) => setPay({ ...pay, amount: n ?? '' })} className={inputClass} />
                <FieldLabelWithHelp helpKey={prefix('public.client_payments.paid_on')} htmlFor="pay-date">Date received</FieldLabelWithHelp>
                <RegionalDateInput id="pay-date" value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} className={inputClass} />
                <button type="button" onClick={payment} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Record payment</button>
                <FieldLabelWithHelp helpKey={prefix('public.client_credit_notes.reason')} htmlFor="credit-reason">Credit note reason</FieldLabelWithHelp>
                <textarea id="credit-reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
                <button type="button" onClick={credit} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Credit these lines</button>
              </div>
            )}
          </div>
        )}
        {tab === 'audit' && (
          <AuditDetailsPanel>
            <AuditCard title="Record history"><AuditField label="Issued" value={invoice.issued_at || 'Not issued'} /><AuditField label="Approval" value={invoice.approval_notes || ''} /></AuditCard>
          </AuditDetailsPanel>
        )}
        {decide && <AuthorisationRequestModal mode="decide" open onClose={() => setDecide(false)} onDecision={onDecision} />}
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function BillingScheduleScreen({ projectId }) {
  const api = useApi()
  const prefix = usePrefix()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ description: '', basis: 'date', amount: '', percent_of_contract: '', due_date: today(), frequency: 'monthly', next_due: today() })
  useEffect(() => { if (projectId) api.listSchedule(projectId).then(setRows).catch(() => {}) }, [api, projectId])
  async function save() {
    await api.saveScheduleLine({
      project_id: projectId, description: form.description, basis: form.basis,
      amount: form.amount === '' ? null : Number(form.amount),
      percent_of_contract: form.percent_of_contract === '' ? null : Number(form.percent_of_contract),
      due_date: form.basis === 'date' ? form.due_date : null,
      frequency: form.basis === 'recurring' ? form.frequency : null,
      next_due: form.basis === 'recurring' ? form.next_due : null,
    })
    setRows(await api.listSchedule(projectId))
    showSuccess({ recordId: form.description, operation: 'created', message: 'The billing line has been saved.' })
  }
  async function runNow() {
    await api.runDueJobs()
    showSuccess({ recordId: 'Billing', operation: 'updated', message: 'Due lines have been drafted.' })
  }
  if (!projectId) return <div className={shell}><p>Open this page from a project.</p></div>
  return (
    <FieldHelpScope helpKeys={['description', 'basis', 'amount', 'percent_of_contract', 'due_date', 'frequency', 'next_due'].map((c) => prefix(`public.billing_schedule_lines.${c}`))}>
      <div className={shell}>
        <h1 className="text-xl font-bold mb-4">Billing schedule</h1>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 max-w-xl mb-4">
          <FieldLabelWithHelp helpKey={prefix('public.billing_schedule_lines.description')} htmlFor="sch-desc" required>Description</FieldLabelWithHelp>
          <input id="sch-desc" className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.billing_schedule_lines.basis')} htmlFor="sch-basis">When it is billed</FieldLabelWithHelp>
          <select id="sch-basis" className={inputClass} value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })}>
            <option value="milestone">Milestone</option><option value="date">Date</option><option value="recurring">Recurring</option>
          </select>
          <FieldLabelWithHelp helpKey={prefix('public.billing_schedule_lines.amount')} htmlFor="sch-amount" isAmount>Amount</FieldLabelWithHelp>
          <SmartAmountInput id="sch-amount" value={form.amount} onChange={(n) => setForm({ ...form, amount: n ?? '' })} className={inputClass} />
          <FieldLabelWithHelp helpKey={prefix('public.billing_schedule_lines.percent_of_contract')} htmlFor="sch-pct">Percent of contract</FieldLabelWithHelp>
          <input id="sch-pct" className={inputClass} value={form.percent_of_contract} onChange={(e) => setForm({ ...form, percent_of_contract: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.billing_schedule_lines.due_date')} htmlFor="sch-due">Due date</FieldLabelWithHelp>
          <RegionalDateInput id="sch-due" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputClass} />
          <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save line</button>
          <button type="button" onClick={runNow} className="ml-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Draft due lines now</button>
        </div>
        <PlanningTable pageId="billing-schedule" exportName="billing-schedule" searchPlaceholder="Search schedule lines" rows={rows} columns={[
          { key: 'description', label: 'Line' },
          { key: 'basis', label: 'When' },
          { key: 'status', label: 'Status' },
        ]} />
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function DocumentSettingsScreen() {
  const api = useApi()
  const prefix = usePrefix()
  const { showSuccess, modal } = useSuccessModal()
  const [form, setForm] = useState({ payment_instructions: '', footer: '', from_currency: 'GBP', to_currency: 'USD', effective_date: today(), rate: '' })
  const [rates, setRates] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    api.loadDocumentSettings().then((row) => row && setForm((f) => ({ ...f, payment_instructions: row.payment_instructions || '', footer: row.footer || '' }))).catch(() => {})
    api.listRates().then(setRates).catch(() => {})
  }, [api])
  async function save() {
    const row = await api.saveDocumentSettings({ payment_instructions: form.payment_instructions, footer: form.footer })
    showSuccess({ recordId: 'Invoice text', operation: 'updated', message: 'Payment instructions and the footer will print on the next invoice export.' })
    return row
  }
  async function saveRate() {
    try {
      const row = await api.saveRate({ from_currency: form.from_currency, to_currency: form.to_currency, effective_date: form.effective_date, rate: Number(form.rate) })
      setRates(await api.listRates())
      setError('')
      showSuccess({ recordId: `${row.from_currency}/${row.to_currency}`, operation: 'created', message: 'Draft invoices on or after this date will use this rate.' })
    } catch (e) { setError(e.message) }
  }
  return (
    <FieldHelpScope helpKeys={['payment_instructions', 'footer'].map((c) => prefix(`public.invoice_document_settings.${c}`)).concat(['from_currency', 'to_currency', 'effective_date', 'rate'].map((c) => prefix(`public.currency_exchange_rates.${c}`)))}>
      <div className={shell}>
        <Back />
        <h1 className="text-xl font-bold mb-4">Invoice text and exchange rates</h1>
        {error && <p className="text-red-600 mb-3">{error}</p>}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 max-w-xl mb-6">
          <FieldLabelWithHelp helpKey={prefix('public.invoice_document_settings.payment_instructions')} htmlFor="pay-text">Payment instructions</FieldLabelWithHelp>
          <textarea id="pay-text" className={inputClass} value={form.payment_instructions} onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.invoice_document_settings.footer')} htmlFor="footer-text">Footer</FieldLabelWithHelp>
          <textarea id="footer-text" className={inputClass} value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
          <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save text</button>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 max-w-xl">
          <FieldLabelWithHelp helpKey={prefix('public.currency_exchange_rates.from_currency')} htmlFor="fx-from">From currency</FieldLabelWithHelp>
          <input id="fx-from" className={inputClass} value={form.from_currency} onChange={(e) => setForm({ ...form, from_currency: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.currency_exchange_rates.to_currency')} htmlFor="fx-to">To currency</FieldLabelWithHelp>
          <input id="fx-to" className={inputClass} value={form.to_currency} onChange={(e) => setForm({ ...form, to_currency: e.target.value })} />
          <FieldLabelWithHelp helpKey={prefix('public.currency_exchange_rates.effective_date')} htmlFor="fx-date">Effective date</FieldLabelWithHelp>
          <RegionalDateInput id="fx-date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className={inputClass} />
          <FieldLabelWithHelp helpKey={prefix('public.currency_exchange_rates.rate')} htmlFor="fx-rate" isAmount>Rate</FieldLabelWithHelp>
          <SmartAmountInput id="fx-rate" value={form.rate} onChange={(n) => setForm({ ...form, rate: n ?? '' })} className={inputClass} />
          <button type="button" onClick={saveRate} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save rate</button>
          <ul className="text-sm text-gray-700 dark:text-gray-200">{rates.map((r) => <li key={r.id}>{r.from_currency} to {r.to_currency} from {r.effective_date}: {r.rate}</li>)}</ul>
        </div>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function RevenueScreen({ projectId: projectIdProp }) {
  const api = useApi()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const resolved = useScheduleProjectId()
  const projectId = projectIdProp || resolved.projectId
  const [rows, setRows] = useState([])
  useEffect(() => {
    if (!projectId) return
    api.figuresFor([projectId]).then(setRows).catch(() => {})
  }, [api, projectId])
  const row = rows[0]
  return (
    <div className={shell}>
      <h1 className="text-xl font-bold mb-4">Revenue and margin</h1>
      {!projectId && resolved.loading && <p>Loading…</p>}
      {!projectId && !resolved.loading && <p>Open this page from a project to see its figures.</p>}
      {row && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <DashboardStatCard label="Billed revenue" value={row.revenue} onClick={() => navigate(`${billingRoot(pathname)}/invoices`)} />
          <DashboardStatCard label="Unbilled value" value={row.wip} />
          <DashboardStatCard label="Unbilled hours" value={row.unbilledHours} />
          <DashboardStatCard label="Cost" value={row.cost} />
          <DashboardStatCard label="Margin" value={row.margin} />
        </div>
      )}
    </div>
  )
}

export function BillingPortalScreen({ projectId: projectIdProp }) {
  const [params] = useSearchParams()
  const projectId = projectIdProp || params.get('projectId')
  const api = useApi()
  const [rows, setRows] = useState([])
  useEffect(() => { api.listInvoices(projectId).then((all) => setRows(all.filter((r) => ['issued', 'part_paid', 'paid'].includes(r.status)))).catch(() => {}) }, [api, projectId])
  return (
    <div className={shell}>
      <h1 className="text-xl font-bold mb-4">Invoices for this client</h1>
      <PlanningTable pageId="billing-portal" exportName="client-portal-invoices" searchPlaceholder="Search invoices" rows={rows.map((r) => ({ ...r, shown: shownStatus(r) }))} emptyText="No issued invoices yet." columns={[
        { key: 'invoice_reference', label: 'Invoice', value: (r) => r.invoice_reference || 'Invoice' },
        { key: 'shown', label: 'Status' },
        { key: 'gross_amount', label: 'Total' },
      ]} />
    </div>
  )
}

export function BillingRoutes() {
  return (
    <Routes>
      <Route path="clients" element={<ClientsScreen />} />
      <Route path="clients/new" element={<ClientForm />} />
      <Route path="clients/:clientKey/edit" element={<ClientForm />} />
      <Route path="clients/:clientKey" element={<ClientForm />} />
      <Route path="rate-cards" element={<RateCardsScreen />} />
      <Route path="tax-codes" element={<TaxCodesScreen />} />
      <Route path="invoices" element={<InvoicesScreen />} />
      <Route path="document" element={<DocumentSettingsScreen />} />
      <Route path="invoices/:invoiceKey" element={<InvoiceDetailScreen />} />
      <Route path="revenue" element={<RevenueScreen />} />
      <Route path="portal" element={<BillingPortalScreen />} />
    </Routes>
  )
}

export { shownStatus }
