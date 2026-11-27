/**
 * v1356 — Integrations sub-panels (API keys, webhooks, SCIM, SSO, docs).
 * v1359 gap closure:
 *   A4  Rotate / Revoke ask first and report errors.
 *   A6  Keys, endpoints, deliveries, mappings and connections use the shared list (search, sortable headers,
 *       # numbers, Table / Card toggle, export — rules 38, 40, 41, 44).
 *   A5  Each panel has Details | Audit details tabs (rule 63.1): the audit tab lists every record's identity,
 *       classification and history.
 *   A3  SCIM switches carry their field help on proper labels.
 *   A13 The organisation is the signed-in person's current one (not the first project the database returns).
 *   A14 SSO: the DNS token and "verified" come from the server; Verify domain queues a real DNS check; SSO can be
 *       required only after verification (SQL v1611).
 */
import { useCallback, useEffect, useState } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import {
  API_SCOPE_OPTIONS,
  WEBHOOK_EVENT_OPTIONS,
  createApiCredential,
  createServiceAccount,
  fetchOpenApi,
  listApiCredentials,
  listAssignableRoles,
  listRequestUsage,
  listScimMappings,
  listServiceAccounts,
  listSsoConnections,
  listWebhookDeliveries,
  listWebhookEndpoints,
  loadScimSettings,
  mintScimToken,
  requestSsoDomainVerification,
  revokeApiCredential,
  rotateApiCredential,
  saveScimMapping,
  saveScimSettings,
  saveSsoConnection,
  saveWebhookEndpoint,
} from '@nidus/shared/services/organisationApiService'
import FieldLabelWithHelp from '../FieldLabelWithHelp.jsx'
import { useConfirmDialog } from '../ConfirmDialog.jsx'
import RegionalDateInput from '../RegionalDateInput.jsx'
import SimpleRecordList from '../SimpleRecordList.jsx'
import SelectField from '../SelectField.jsx'
import DetailAuditTabList from '../DetailAuditTabList.jsx'

const shell = 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3'
const input = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100'
const heading = 'font-semibold text-gray-900 dark:text-gray-100'
const errorText = 'text-sm text-red-600 dark:text-red-400'
const when = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—')

/** A13: the signed-in person's current organisation. */
function useAccountId() {
  const [accountId, setAccountId] = useState(null)
  useEffect(() => {
    let live = true
    getCurrentUserAccountId().then((id) => { if (live && id) setAccountId(id) }).catch(() => {})
    return () => { live = false }
  }, [])
  return accountId
}

/** Loads with `load(accountId)` whenever the organisation is known; reload() for after a change. */
function useLoaded(accountId, load, initial) {
  const [data, setData] = useState(initial)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    if (!accountId) return
    try { setData(await load(accountId)); setError('') } catch (e) { setError(e.message) }
  }, [accountId, load])
  useEffect(() => {
    let live = true
    if (accountId) {
      load(accountId).then((d) => { if (live) setData(d) }).catch((e) => { if (live) setError(e.message) })
    }
    return () => { live = false }
  }, [accountId, load])
  return [data, reload, error]
}

/** A5: Details | Audit details for a panel; the audit tab lists each record's identity and history. */
function PanelTabs({ pageId, tab, setTab, rows, identity, children }) {
  return (
    <>
      <DetailAuditTabList activeTab={tab} onChange={setTab} detailsLabel="Details" />
      {tab === 'audit' ? (
        <div className={shell}>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after a record is saved.</p>
          ) : (
            <SimpleRecordList
              pageId={`${pageId}-audit`}
              exportBaseName={`${pageId}-audit`}
              rows={rows}
              columns={[
                ...identity,
                { key: 'created_at', label: 'Created', render: (r) => when(r.created_at) },
                { key: 'updated_at', label: 'Last changed', render: (r) => when(r.updated_at || r.created_at) },
              ]}
            />
          )}
        </div>
      ) : children}
    </>
  )
}

// ── API keys ────────────────────────────────────────────────────────────────
const loadKeys = async (accountId) => {
  const [creds, svcs, log] = await Promise.all([listApiCredentials(accountId), listServiceAccounts(), listRequestUsage(accountId)])
  return { creds, svcs, log }
}

export function ApiKeysPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const { confirm, dialog } = useConfirmDialog()
  const [{ creds: rows, svcs: accounts, log: usage }, reload, loadError] = useLoaded(accountId, loadKeys, { creds: [], svcs: [], log: [] })
  const [plainOnce, setPlainOnce] = useState('')
  const [form, setForm] = useState({ name: '', serviceAccountUserId: '', scopes: ['projects:read'], expires_at: '' })
  const [svcName, setSvcName] = useState('API service account')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('details')

  async function onCreateService() {
    try {
      setError('')
      await createServiceAccount(accountId, svcName)
      await reload()
      showSuccess({ recordId: svcName, operation: 'created', message: 'The service account is ready for API keys.' })
    } catch (e) { setError(e.message) }
  }

  async function onCreateKey() {
    if (!form.name.trim()) { setError('Enter a key name.'); return }
    if (!form.serviceAccountUserId) { setError('Choose the service account the key acts as.'); return }
    try {
      setError('')
      const row = await createApiCredential({ accountId, name: form.name, serviceAccountUserId: form.serviceAccountUserId, scopes: form.scopes, expiresAt: form.expires_at || null })
      setPlainOnce(row.plain_key)
      await reload()
      showSuccess({ recordId: row.credential_reference || row.key_prefix, operation: 'created', message: 'Copy the key now — it is shown only once.' })
    } catch (e) { setError(e.message) }
  }

  // A4: rotating or revoking a key breaks integrations that use it, so ask first and report errors.
  async function onRotate(r) {
    if (!(await confirm({
      title: `Rotate the key ${r.name}?`,
      message: 'A new key is created and shown once. The old key keeps working for a short overlap so you can switch your integration over, then stops.',
      confirmLabel: 'Rotate key',
    }))) return
    try {
      setError('')
      const n = await rotateApiCredential(r.id)
      setPlainOnce(n.plain_key)
      await reload()
      showSuccess({ recordId: n.credential_reference || r.credential_reference || r.key_prefix, operation: 'created', message: 'New key created. Copy it now — it is shown only once.' })
    } catch (e) { setError(e.message) }
  }
  async function onRevoke(r) {
    if (!(await confirm({
      title: `Revoke the key ${r.name}?`,
      message: 'Every integration using this key stops working at once. This cannot be undone; create a new key to reconnect.',
      confirmLabel: 'Revoke key',
      danger: true,
    }))) return
    try {
      setError('')
      await revokeApiCredential(r.id)
      await reload()
      showSuccess({ recordId: r.credential_reference || r.key_prefix, operation: 'deleted', message: 'The key has been revoked.' })
    } catch (e) { setError(e.message) }
  }

  const keyRows = rows.map((r) => ({ ...r, status: r.revoked_at ? 'Revoked' : 'Active', scope_list: (r.scopes || []).join(', ') }))
  return (
    <FieldHelpScope helpKeys={['public.api_credentials.name', 'public.api_credentials.scopes', 'public.api_credentials.expires_at', 'public.api_credentials.service_account_user_id', 'public.users.full_name']}>
      <div className="space-y-4">
        {(error || loadError) && <p role="alert" className={errorText}>{error || loadError}</p>}
        {!accountId && <p className="text-sm text-gray-700 dark:text-gray-200">Loading organisation…</p>}
        <PanelTabs pageId="integrations-api-keys" tab={tab} setTab={setTab} rows={keyRows}
          identity={[
            { key: 'credential_reference', label: 'Reference', primary: true },
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            { key: 'revoked_at', label: 'Revoked', render: (r) => when(r.revoked_at) },
          ]}>
          <div className={shell}>
            <h2 className={heading}>Service accounts</h2>
            <FieldLabelWithHelp helpKey="public.users.full_name" htmlFor="svc-name">Name</FieldLabelWithHelp>
            <input id="svc-name" className={input} value={svcName} onChange={(e) => setSvcName(e.target.value)} />
            <button type="button" onClick={onCreateService} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Create service account</button>
            <ul className="text-sm text-gray-800 dark:text-gray-100">{accounts.map((a) => <li key={a.id}>{a.full_name} · {a.email}</li>)}</ul>
          </div>
          <div className={shell}>
            <h2 className={heading}>New API key</h2>
            <FieldLabelWithHelp helpKey="public.api_credentials.name" htmlFor="key-name" required>Key name</FieldLabelWithHelp>
            <input id="key-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldLabelWithHelp helpKey="public.api_credentials.service_account_user_id" htmlFor="key-svc" listOptions={false} required>Service account</FieldLabelWithHelp>
            <SelectField id="key-svc" options={accounts.map((a) => ({ value: a.id, label: a.full_name }))} value={form.serviceAccountUserId}
              onChange={(v) => setForm({ ...form, serviceAccountUserId: v })} placeholder="Choose a service account" className={input} />
            <FieldLabelWithHelp helpKey="public.api_credentials.scopes" htmlFor="key-scopes">Scopes</FieldLabelWithHelp>
            <select id="key-scopes" multiple className={input + ' min-h-[8rem]'} value={form.scopes} onChange={(e) => setForm({ ...form, scopes: [...e.target.selectedOptions].map((o) => o.value) })}>
              {API_SCOPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <FieldLabelWithHelp helpKey="public.api_credentials.expires_at" htmlFor="key-exp">Expires</FieldLabelWithHelp>
            <RegionalDateInput id="key-exp" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={input} />
            <button type="button" onClick={onCreateKey} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Create key</button>
            {plainOnce && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium mb-1">Copy this key now. It will not be shown again.</p>
                <code className="break-all">{plainOnce}</code>
              </div>
            )}
          </div>
          <div className={shell}>
            <h2 className={heading}>Keys</h2>
            <SimpleRecordList
              pageId="integrations-api-keys"
              exportBaseName="api-keys"
              emptyText="No API keys yet."
              rows={keyRows}
              columns={[
                { key: 'name', label: 'Name', primary: true },
                { key: 'credential_reference', label: 'Reference' },
                { key: 'key_prefix', label: 'Prefix', render: (r) => <span className="font-mono">{r.key_prefix}</span> },
                { key: 'scope_list', label: 'Scopes' },
                { key: 'expires_at', label: 'Expires', render: (r) => when(r.expires_at) },
                { key: 'last_used_at', label: 'Last used', render: (r) => when(r.last_used_at) },
                { key: 'status', label: 'Status' },
                {
                  key: 'actions', label: 'Actions', sortValue: () => '',
                  render: (r) => (r.revoked_at ? '—' : (
                    <span className="space-x-3 whitespace-nowrap">
                      <button type="button" className="text-sm text-amber-700 dark:text-amber-300" onClick={() => onRotate(r)}>Rotate</button>
                      <button type="button" className="text-sm text-red-600 dark:text-red-400" onClick={() => onRevoke(r)}>Revoke</button>
                    </span>
                  )),
                },
              ]}
            />
          </div>
          <div className={shell}>
            <h2 className={heading}>Recent usage (last 7 days)</h2>
            <SimpleRecordList
              pageId="integrations-api-usage"
              exportBaseName="api-usage"
              emptyText="No calls in the last 7 days."
              rows={usage}
              columns={[
                { key: 'created_at', label: 'When', primary: true, render: (u) => when(u.created_at) },
                { key: 'method', label: 'Method' },
                { key: 'path', label: 'Path' },
                { key: 'status_code', label: 'Status' },
              ]}
            />
          </div>
        </PanelTabs>
        {modal}
        {dialog}
      </div>
    </FieldHelpScope>
  )
}

// ── Webhooks ────────────────────────────────────────────────────────────────
export function WebhooksPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, reload, loadError] = useLoaded(accountId, listWebhookEndpoints, [])
  const [deliveries, setDeliveries] = useState(null)
  const [form, setForm] = useState({ name: '', target_url: '', events: ['project.updated'], secret: '' })
  const [error, setError] = useState('')
  const [tab, setTab] = useState('details')

  async function onSave() {
    if (!form.name.trim()) { setError('Enter a name.'); return }
    if (!/^https:\/\//i.test(form.target_url.trim())) { setError('The address must start with https://'); return }
    try {
      setError('')
      const secret = globalThis.crypto.getRandomValues(new Uint8Array(24)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
      const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', new globalThis.TextEncoder().encode(secret))
      const hash = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, '0')).join('')
      const row = await saveWebhookEndpoint({ account_id: accountId, name: form.name.trim(), target_url: form.target_url.trim(), events: form.events, secret_hash: hash, secret_encrypted: secret })
      setForm({ ...form, secret })
      await reload()
      showSuccess({ recordId: row.endpoint_reference || row.name, operation: 'created', message: 'The webhook endpoint is active. Copy the signing secret now and store it safely.' })
    } catch (e) { setError(e.message) }
  }

  async function showDeliveries(r) {
    try { setDeliveries({ name: r.name, rows: await listWebhookDeliveries(r.id) }) } catch (e) { setError(e.message) }
  }

  const endpointRows = rows.map((r) => ({ ...r, event_list: (r.events || []).join(', ') }))
  return (
    <FieldHelpScope helpKeys={['public.webhook_endpoints.name', 'public.webhook_endpoints.target_url', 'public.webhook_endpoints.events']}>
      <div className="space-y-4">
        {(error || loadError) && <p role="alert" className={errorText}>{error || loadError}</p>}
        <PanelTabs pageId="integrations-webhooks" tab={tab} setTab={setTab} rows={endpointRows}
          identity={[
            { key: 'endpoint_reference', label: 'Reference', primary: true },
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            { key: 'last_failure_at', label: 'Last failure', render: (r) => when(r.last_failure_at) },
          ]}>
          <div className={shell}>
            <h2 className={heading}>New webhook</h2>
            <FieldLabelWithHelp helpKey="public.webhook_endpoints.name" htmlFor="wh-name" required>Name</FieldLabelWithHelp>
            <input id="wh-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldLabelWithHelp helpKey="public.webhook_endpoints.target_url" htmlFor="wh-url" required>HTTPS URL</FieldLabelWithHelp>
            <input id="wh-url" className={input} placeholder="https://hooks.company.example/nidus" value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} />
            <FieldLabelWithHelp helpKey="public.webhook_endpoints.events" htmlFor="wh-events">Events</FieldLabelWithHelp>
            <select id="wh-events" multiple className={input + ' min-h-[6rem]'} value={form.events} onChange={(e) => setForm({ ...form, events: [...e.target.selectedOptions].map((o) => o.value) })}>
              {WEBHOOK_EVENT_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <button type="button" onClick={onSave} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Save endpoint</button>
            {form.secret && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium mb-1">Signing secret — copy it now:</p>
                <code className="break-all">{form.secret}</code>
              </div>
            )}
          </div>
          <div className={shell}>
            <h2 className={heading}>Endpoints</h2>
            <SimpleRecordList
              pageId="integrations-webhooks"
              exportBaseName="webhook-endpoints"
              emptyText="No webhook endpoints yet."
              rows={endpointRows}
              columns={[
                { key: 'name', label: 'Name', primary: true },
                { key: 'endpoint_reference', label: 'Reference' },
                { key: 'target_url', label: 'Address' },
                { key: 'event_list', label: 'Events' },
                { key: 'status', label: 'Status' },
                { key: 'failure_count', label: 'Failures in a row' },
                { key: 'last_success_at', label: 'Last delivered', render: (r) => when(r.last_success_at) },
                { key: 'actions', label: 'Actions', sortValue: () => '', render: (r) => <button type="button" className="text-sm text-blue-600 dark:text-blue-400" onClick={() => showDeliveries(r)}>Deliveries</button> },
              ]}
            />
          </div>
          {deliveries && (
            <div className={shell}>
              <h2 className={heading}>Deliveries — {deliveries.name}</h2>
              <SimpleRecordList
                pageId="integrations-webhook-deliveries"
                exportBaseName="webhook-deliveries"
                emptyText="No deliveries yet."
                rows={deliveries.rows}
                columns={[
                  { key: 'created_at', label: 'When', primary: true, render: (d) => when(d.created_at) },
                  { key: 'event_type', label: 'Event' },
                  { key: 'status', label: 'Status' },
                  { key: 'response_status', label: 'Response', render: (d) => d.response_status || '—' },
                  { key: 'attempt_number', label: 'Attempts' },
                ]}
              />
            </div>
          )}
        </PanelTabs>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

// ── SCIM ────────────────────────────────────────────────────────────────────
const loadScim = async (accountId) => {
  const [settings, mappings, roles] = await Promise.all([loadScimSettings(accountId), listScimMappings(accountId), listAssignableRoles(accountId)])
  return { settings, mappings, roles }
}

export function ScimPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const [{ settings: loaded, mappings, roles }, reload, loadError] = useLoaded(accountId, loadScim, { settings: null, mappings: [], roles: [] })
  const [edits, setEdits] = useState({})
  const [tokenOnce, setTokenOnce] = useState('')
  const [mapForm, setMapForm] = useState({ idp_group_name: '', role_name: '' })
  const [error, setError] = useState('')
  const [tab, setTab] = useState('details')
  const settings = { enabled: false, welcome_email: false, block_manual_invites: false, ...(loaded || {}), ...edits }
  const toggle = (key) => (e) => setEdits((x) => ({ ...x, [key]: e.target.checked }))

  async function onSaveSettings() {
    try {
      setError('')
      await saveScimSettings(accountId, settings)
      setEdits({})
      await reload()
      showSuccess({ recordId: 'SCIM', operation: 'updated', message: 'SCIM settings have been saved.' })
    } catch (e) { setError(e.message) }
  }

  async function onRotateToken() {
    try {
      setError('')
      const minted = await mintScimToken()
      await saveScimSettings(accountId, { ...settings, enabled: true, token_prefix: minted.prefix, token_hash: minted.hash, token_expires_at: new Date(Date.now() + 365 * 86400000).toISOString() })
      setTokenOnce(minted.plain)
      setEdits({})
      await reload()
      showSuccess({ recordId: 'SCIM token', operation: 'created', message: 'Copy the SCIM token now — it is shown only once.' })
    } catch (e) { setError(e.message) }
  }

  async function onSaveMapping() {
    if (!mapForm.idp_group_name.trim() || !mapForm.role_name) { setError('Enter the IdP group and choose a role.'); return }
    try {
      setError('')
      await saveScimMapping({ account_id: accountId, idp_group_id: mapForm.idp_group_name.trim(), idp_group_name: mapForm.idp_group_name.trim(), role_name: mapForm.role_name })
      await reload()
      showSuccess({ recordId: mapForm.idp_group_name, operation: 'created', message: 'The group mapping has been saved.' })
      setMapForm({ idp_group_name: '', role_name: '' })
    } catch (e) { setError(e.message) }
  }

  const roleLabel = (name) => roles.find((r) => r.value === name)?.label || name || '—'
  const switchRow = (key, id, text) => (
    <div className="flex items-center gap-2">
      <input id={id} type="checkbox" checked={!!settings[key]} onChange={toggle(key)} />
      <FieldLabelWithHelp helpKey={`public.scim_settings.${key}`} htmlFor={id}>{text}</FieldLabelWithHelp>
    </div>
  )
  return (
    <FieldHelpScope helpKeys={['public.scim_settings.enabled', 'public.scim_settings.welcome_email', 'public.scim_settings.block_manual_invites', 'public.scim_group_mappings.idp_group_name', 'public.scim_group_mappings.role_name']}>
      <div className="space-y-4">
        {(error || loadError) && <p role="alert" className={errorText}>{error || loadError}</p>}
        <PanelTabs pageId="integrations-scim" tab={tab} setTab={setTab} rows={mappings}
          identity={[
            { key: 'idp_group_name', label: 'IdP group', primary: true },
            { key: 'role_name', label: 'Role', render: (m) => roleLabel(m.role_name) },
          ]}>
          <div className={shell}>
            <h2 className={heading}>SCIM settings</h2>
            {switchRow('enabled', 'scim-on', 'SCIM enabled')}
            {switchRow('welcome_email', 'scim-welcome', 'Welcome email')}
            {switchRow('block_manual_invites', 'scim-block', 'Block manual invites')}
            <div className="flex gap-2">
              <button type="button" onClick={onSaveSettings} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Save</button>
              <button type="button" onClick={onRotateToken} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">Create / rotate token</button>
            </div>
            {tokenOnce && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium mb-1">SCIM token — copy it now:</p>
                <code className="break-all">{tokenOnce}</code>
              </div>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-200">Base URL: <code>/functions/v1/api-gateway/scim/v2</code></p>
          </div>
          <div className={shell}>
            <h2 className={heading}>Group → role mappings</h2>
            <FieldLabelWithHelp helpKey="public.scim_group_mappings.idp_group_name" htmlFor="g-name" required>IdP group</FieldLabelWithHelp>
            <input id="g-name" className={input} value={mapForm.idp_group_name} onChange={(e) => setMapForm({ ...mapForm, idp_group_name: e.target.value })} />
            <FieldLabelWithHelp helpKey="public.scim_group_mappings.role_name" htmlFor="g-role" required>Role</FieldLabelWithHelp>
            <SelectField id="g-role" options={roles} value={mapForm.role_name} onChange={(v) => setMapForm({ ...mapForm, role_name: v })} placeholder="Choose a role" className={input} />
            <button type="button" onClick={onSaveMapping} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Add mapping</button>
            <SimpleRecordList
              pageId="integrations-scim-mappings"
              exportBaseName="scim-group-mappings"
              emptyText="No group mappings yet."
              rows={mappings}
              columns={[
                { key: 'idp_group_name', label: 'IdP group', primary: true },
                { key: 'role_name', label: 'Role', render: (m) => roleLabel(m.role_name), sortValue: (m) => roleLabel(m.role_name) },
              ]}
            />
          </div>
        </PanelTabs>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

// ── SSO ─────────────────────────────────────────────────────────────────────
export function SsoPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, reload, loadError] = useLoaded(accountId, listSsoConnections, [])
  const [form, setForm] = useState({ name: '', protocol: 'saml', metadata_url: '', verified_domains: '' })
  const [error, setError] = useState('')
  const [tab, setTab] = useState('details')

  async function onSave() {
    if (!form.name.trim()) { setError('Enter a connection name.'); return }
    const domains = form.verified_domains.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    if (!domains.length) { setError('Enter at least one email domain.'); return }
    try {
      setError('')
      // A14: the server sets the DNS token and the verification; "SSO required" is switched on after verification.
      const row = await saveSsoConnection({ account_id: accountId, name: form.name.trim(), protocol: form.protocol, metadata_url: form.metadata_url.trim() || null, verified_domains: domains, sso_required: false, is_active: true })
      await reload()
      setForm({ name: '', protocol: 'saml', metadata_url: '', verified_domains: '' })
      showSuccess({ recordId: row.connection_reference || row.name, operation: 'created', message: `Publish the TXT record nidus-verify=${row.domain_txt_token} on each domain, then select Verify domain.` })
    } catch (e) { setError(e.message) }
  }

  async function onVerify(r) {
    try {
      setError('')
      const res = await requestSsoDomainVerification(r.id)
      showSuccess({ recordId: r.connection_reference || r.name, operation: 'updated', message: `The DNS check has been queued for ${(res?.domains || r.verified_domains || []).join(', ')}. The result shows here within a few minutes.` })
    } catch (e) { setError(e.message) }
  }

  async function onRequired(r, on) {
    try {
      setError('')
      await saveSsoConnection({ id: r.id, sso_required: on })
      await reload()
      showSuccess({ recordId: r.connection_reference || r.name, operation: 'updated', message: on ? 'SSO is now required for these domains. The Account Owner can still use a password.' : 'Password sign-in is allowed again for these domains.' })
    } catch (e) { setError(e.message) }
  }

  const connRows = rows.map((r) => ({
    ...r,
    domain_list: (r.verified_domains || []).join(', '),
    verified: r.domain_verified_at ? 'Verified' : 'Not verified',
    txt: r.domain_txt_token ? `nidus-verify=${r.domain_txt_token}` : '—',
  }))
  return (
    <FieldHelpScope helpKeys={['public.sso_connections.name', 'public.sso_connections.protocol', 'public.sso_connections.verified_domains', 'public.sso_connections.sso_required', 'public.sso_connections.metadata_url', 'public.sso_connections.break_glass_user_id']}>
      <div className="space-y-4">
        {(error || loadError) && <p role="alert" className={errorText}>{error || loadError}</p>}
        <PanelTabs pageId="integrations-sso" tab={tab} setTab={setTab} rows={connRows}
          identity={[
            { key: 'connection_reference', label: 'Reference', primary: true },
            { key: 'name', label: 'Name' },
            { key: 'verified', label: 'Domains' },
            { key: 'verification_checked_at', label: 'Last DNS check', render: (r) => when(r.verification_checked_at) },
          ]}>
          <div className={shell}>
            <h2 className={heading}>New SSO connection</h2>
            <FieldLabelWithHelp helpKey="public.sso_connections.name" htmlFor="sso-name" required>Name</FieldLabelWithHelp>
            <input id="sso-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldLabelWithHelp helpKey="public.sso_connections.protocol" htmlFor="sso-proto">Protocol</FieldLabelWithHelp>
            <select id="sso-proto" className={input} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
              <option value="saml">SAML 2.0</option>
              <option value="oidc">OpenID Connect</option>
            </select>
            <FieldLabelWithHelp helpKey="public.sso_connections.metadata_url" htmlFor="sso-meta">Metadata URL</FieldLabelWithHelp>
            <input id="sso-meta" className={input} placeholder="https://idp.company.example/metadata" value={form.metadata_url} onChange={(e) => setForm({ ...form, metadata_url: e.target.value })} />
            <FieldLabelWithHelp helpKey="public.sso_connections.verified_domains" htmlFor="sso-dom" required>Email domains</FieldLabelWithHelp>
            <input id="sso-dom" className={input} placeholder="company.example, staff.company.example" value={form.verified_domains} onChange={(e) => setForm({ ...form, verified_domains: e.target.value })} />
            <p className="text-xs text-gray-600 dark:text-gray-300">After saving, publish the TXT record shown below on each domain and select Verify domain. SSO can be required only once the domains are verified.</p>
            <button type="button" onClick={onSave} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Save connection</button>
          </div>
          <div className={shell}>
            <h2 className={heading}>Connections</h2>
            <SimpleRecordList
              pageId="integrations-sso"
              exportBaseName="sso-connections"
              emptyText="No SSO connections yet."
              rows={connRows}
              columns={[
                { key: 'name', label: 'Name', primary: true },
                { key: 'protocol', label: 'Protocol' },
                { key: 'domain_list', label: 'Domains' },
                { key: 'txt', label: 'TXT record', render: (r) => <code className="break-all text-xs">{r.txt}</code> },
                { key: 'verified', label: 'Verification', render: (r) => <span title={r.verification_detail || undefined}>{r.verified}{r.verification_detail && !r.domain_verified_at ? ` — ${r.verification_detail}` : ''}</span> },
                { key: 'sso_required', label: 'SSO required', render: (r) => (r.sso_required ? 'Required' : 'Optional') },
                {
                  key: 'actions', label: 'Actions', sortValue: () => '',
                  render: (r) => (
                    <span className="space-x-3 whitespace-nowrap">
                      <button type="button" className="text-sm text-blue-600 dark:text-blue-400" onClick={() => onVerify(r)}>Verify domain</button>
                      {r.domain_verified_at && (
                        <button type="button" className="text-sm text-amber-700 dark:text-amber-300" onClick={() => onRequired(r, !r.sso_required)}>
                          {r.sso_required ? 'Allow passwords' : 'Require SSO'}
                        </button>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </PanelTabs>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function ApiDocsPanel() {
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    fetchOpenApi().then((d) => { if (live) setDoc(d) }).catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [])
  return (
    <div className={shell}>
      <h2 className={heading}>OpenAPI reference</h2>
      {error && <p className={errorText}>{error}</p>}
      <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
        Example host: <code>https://api.example.com/functions/v1/api-gateway</code>. Authenticate with
        <code> Authorization: Bearer nds_live_…</code>.
      </p>
      {doc && (
        <pre className="text-xs overflow-auto max-h-[32rem] bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-gray-800 dark:text-gray-100">
          {JSON.stringify(doc, null, 2)}
        </pre>
      )}
    </div>
  )
}
