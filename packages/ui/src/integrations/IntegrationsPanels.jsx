/**
 * v1356 — Integrations sub-panels (API keys, webhooks, SCIM, SSO, docs).
 */
import { useEffect, useState } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  API_SCOPE_OPTIONS,
  WEBHOOK_EVENT_OPTIONS,
  createApiCredential,
  createServiceAccount,
  fetchOpenApi,
  listApiCredentials,
  listRequestUsage,
  listScimMappings,
  listServiceAccounts,
  listSsoConnections,
  listWebhookDeliveries,
  listWebhookEndpoints,
  loadScimSettings,
  mintScimToken,
  revokeApiCredential,
  rotateApiCredential,
  saveScimMapping,
  saveScimSettings,
  saveSsoConnection,
  saveWebhookEndpoint,
} from '@nidus/shared/services/organisationApiService'
import { platformDb } from '@nidus/supabase'
import FieldLabelWithHelp from '../FieldLabelWithHelp.jsx'
import RegionalDateInput from '../RegionalDateInput.jsx'

const shell = 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3'
const input = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100'

function useAccountId() {
  const [accountId, setAccountId] = useState(null)
  useEffect(() => {
    ;(async () => {
      const { data: session } = await platformDb.auth.getSession()
      const authId = session?.session?.user?.id
      if (!authId) return
      const { data: user } = await platformDb.from('users').select('id').eq('auth_user_id', authId).maybeSingle()
      if (!user) return
      const { data: owned } = await platformDb.from('accounts').select('id').eq('owner_user_id', user.id).maybeSingle()
      if (owned?.id) {
        setAccountId(owned.id)
        return
      }
      const { data: proj } = await platformDb.from('projects').select('account_id').not('account_id', 'is', null).limit(1).maybeSingle()
      if (proj?.account_id) setAccountId(proj.account_id)
    })().catch(() => {})
  }, [])
  return accountId
}

export function ApiKeysPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [accounts, setAccounts] = useState([])
  const [usage, setUsage] = useState([])
  const [plainOnce, setPlainOnce] = useState('')
  const [form, setForm] = useState({ name: '', serviceAccountUserId: '', scopes: ['projects:read'], expires_at: '' })
  const [svcName, setSvcName] = useState('API service account')
  const [error, setError] = useState('')

  async function reload() {
    if (!accountId) return
    const [creds, svcs, log] = await Promise.all([
      listApiCredentials(accountId),
      listServiceAccounts(),
      listRequestUsage(accountId),
    ])
    setRows(creds)
    setAccounts(svcs)
    setUsage(log)
  }

  useEffect(() => { reload().catch((e) => setError(e.message)) }, [accountId])

  async function onCreateService() {
    try {
      setError('')
      await createServiceAccount(accountId, svcName)
      await reload()
      showSuccess({ recordId: svcName, operation: 'created', message: 'The service account is ready for API keys.' })
    } catch (e) { setError(e.message) }
  }

  async function onCreateKey() {
    try {
      setError('')
      const row = await createApiCredential({
        accountId,
        name: form.name,
        serviceAccountUserId: form.serviceAccountUserId,
        scopes: form.scopes,
        expiresAt: form.expires_at || null,
      })
      setPlainOnce(row.plain_key)
      await reload()
      showSuccess({ recordId: row.credential_reference || row.key_prefix, operation: 'created', message: 'Copy the key now — it is shown only once.' })
    } catch (e) { setError(e.message) }
  }

  return (
    <FieldHelpScope helpKeys={['public.api_credentials.name', 'public.api_credentials.scopes', 'public.api_credentials.expires_at', 'public.api_credentials.service_account_user_id', 'public.users.full_name']}>
      <div className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!accountId && <p className="text-sm text-gray-700 dark:text-gray-200">Loading organisation…</p>}
        <div className={shell}>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Service accounts</h2>
          <FieldLabelWithHelp helpKey="public.users.full_name" htmlFor="svc-name">Name</FieldLabelWithHelp>
          <input id="svc-name" className={input} value={svcName} onChange={(e) => setSvcName(e.target.value)} />
          <button type="button" onClick={onCreateService} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Create service account</button>
          <ul className="text-sm text-gray-800 dark:text-gray-100">{accounts.map((a) => <li key={a.id}>{a.full_name} · {a.email}</li>)}</ul>
        </div>
        <div className={shell}>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">New API key</h2>
          <FieldLabelWithHelp helpKey="public.api_credentials.name" htmlFor="key-name" required>Key name</FieldLabelWithHelp>
          <input id="key-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldLabelWithHelp helpKey="public.api_credentials.service_account_user_id" htmlFor="key-svc" listOptions={false}>Service account</FieldLabelWithHelp>
          <select id="key-svc" className={input} value={form.serviceAccountUserId} onChange={(e) => setForm({ ...form, serviceAccountUserId: e.target.value })}>
            <option value="">Select…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
          <FieldLabelWithHelp helpKey="public.api_credentials.scopes" htmlFor="key-scopes">Scopes</FieldLabelWithHelp>
          <select id="key-scopes" multiple className={input + ' min-h-[8rem]'} value={form.scopes} onChange={(e) => setForm({ ...form, scopes: [...e.target.selectedOptions].map((o) => o.value) })}>
            {API_SCOPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <FieldLabelWithHelp helpKey="public.api_credentials.expires_at" htmlFor="key-exp">Expires</FieldLabelWithHelp>
          <RegionalDateInput id="key-exp" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={input} />
          <button type="button" onClick={onCreateKey} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Create key</button>
          {plainOnce && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm">
              <p className="font-medium mb-1">Copy this key now. It will not be shown again.</p>
              <code className="break-all text-gray-900 dark:text-gray-100">{plainOnce}</code>
            </div>
          )}
        </div>
        <div className={shell}>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Keys</h2>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Prefix</th><th className="text-left p-2">Status</th><th data-help="exempt"> </th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className="p-2 font-mono text-gray-800 dark:text-gray-100">{r.key_prefix}</td>
                  <td className="p-2 text-gray-800 dark:text-gray-100">{r.revoked_at ? 'Revoked' : 'Active'}</td>
                  <td className="p-2 space-x-2">
                    {!r.revoked_at && (
                      <>
                        <button type="button" className="text-sm text-amber-700 dark:text-amber-300" onClick={async () => { const n = await rotateApiCredential(r.id); setPlainOnce(n.plain_key); await reload() }}>Rotate</button>
                        <button type="button" className="text-sm text-red-600" onClick={async () => { await revokeApiCredential(r.id); await reload(); showSuccess({ recordId: r.credential_reference || r.key_prefix, operation: 'deleted', message: 'The key has been revoked.' }) }}>Revoke</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={shell}>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recent usage</h2>
          <ul className="text-sm text-gray-800 dark:text-gray-100 space-y-1">
            {usage.slice(0, 20).map((u) => (
              <li key={u.id}>{u.created_at} · {u.method} {u.path} · {u.status_code}</li>
            ))}
            {!usage.length && <li>No calls in the last 7 days.</li>}
          </ul>
        </div>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function WebhooksPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [form, setForm] = useState({ name: '', target_url: 'https://hooks.client.example/nidus', events: ['project.updated'], secret: '' })
  const [error, setError] = useState('')

  async function reload() {
    if (!accountId) return
    setRows(await listWebhookEndpoints(accountId))
  }
  useEffect(() => { reload().catch((e) => setError(e.message)) }, [accountId])

  async function onSave() {
    try {
      setError('')
      const secret = form.secret || crypto.getRandomValues(new Uint8Array(24)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
      const enc = new TextEncoder()
      const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(secret))
      const hash = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, '0')).join('')
      const row = await saveWebhookEndpoint({
        account_id: accountId,
        name: form.name,
        target_url: form.target_url,
        events: form.events,
        secret_hash: hash,
        secret_encrypted: secret,
      })
      setForm({ ...form, secret })
      await reload()
      showSuccess({ recordId: row.endpoint_reference || row.name, operation: 'created', message: 'The webhook endpoint is active. Store the signing secret safely.' })
    } catch (e) { setError(e.message) }
  }

  return (
    <FieldHelpScope helpKeys={['public.webhook_endpoints.name', 'public.webhook_endpoints.target_url', 'public.webhook_endpoints.events']}>
      <div className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className={shell}>
          <h2 className="font-semibold">New webhook</h2>
          <FieldLabelWithHelp helpKey="public.webhook_endpoints.name" htmlFor="wh-name" required>Name</FieldLabelWithHelp>
          <input id="wh-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldLabelWithHelp helpKey="public.webhook_endpoints.target_url" htmlFor="wh-url">HTTPS URL</FieldLabelWithHelp>
          <input id="wh-url" className={input} value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} />
          <FieldLabelWithHelp helpKey="public.webhook_endpoints.events" htmlFor="wh-events">Events</FieldLabelWithHelp>
          <select id="wh-events" multiple className={input + ' min-h-[6rem]'} value={form.events} onChange={(e) => setForm({ ...form, events: [...e.target.selectedOptions].map((o) => o.value) })}>
            {WEBHOOK_EVENT_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <button type="button" onClick={onSave} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Save endpoint</button>
          {form.secret && <p className="text-sm break-all">Signing secret (store it): <code>{form.secret}</code></p>}
        </div>
        <div className={shell}>
          <h2 className="font-semibold">Endpoints</h2>
          <ul className="text-sm space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-2 items-center justify-between">
                <span>{r.name} · {r.status} · failures {r.failure_count}</span>
                <button type="button" className="text-blue-600 dark:text-blue-400" onClick={async () => setDeliveries(await listWebhookDeliveries(r.id))}>Deliveries</button>
              </li>
            ))}
          </ul>
          {!!deliveries.length && (
            <ul className="text-sm mt-3 space-y-1">
              {deliveries.map((d) => <li key={d.id}>{d.created_at} · {d.event_type} · {d.status} · {d.response_status || '—'}</li>)}
            </ul>
          )}
        </div>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function ScimPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const [settings, setSettings] = useState({ enabled: false, welcome_email: false, block_manual_invites: false })
  const [tokenOnce, setTokenOnce] = useState('')
  const [mappings, setMappings] = useState([])
  const [mapForm, setMapForm] = useState({ idp_group_id: '', idp_group_name: '', role_name: 'project_manager' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accountId) return
    loadScimSettings(accountId).then((s) => s && setSettings(s)).catch((e) => setError(e.message))
    listScimMappings(accountId).then(setMappings).catch((e) => setError(e.message))
  }, [accountId])

  async function onSaveSettings() {
    try {
      await saveScimSettings(accountId, settings)
      showSuccess({ recordId: 'SCIM', operation: 'updated', message: 'SCIM settings have been saved.' })
    } catch (e) { setError(e.message) }
  }

  async function onRotateToken() {
    try {
      const minted = await mintScimToken()
      await saveScimSettings(accountId, {
        ...settings,
        enabled: true,
        token_prefix: minted.prefix,
        token_hash: minted.hash,
        token_expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      })
      setTokenOnce(minted.plain)
      showSuccess({ recordId: 'SCIM token', operation: 'created', message: 'Copy the SCIM token now — it is shown only once.' })
    } catch (e) { setError(e.message) }
  }

  async function onSaveMapping() {
    try {
      await saveScimMapping({ account_id: accountId, ...mapForm })
      setMappings(await listScimMappings(accountId))
      showSuccess({ recordId: mapForm.idp_group_name, operation: 'created', message: 'The group mapping has been saved.' })
    } catch (e) { setError(e.message) }
  }

  return (
    <FieldHelpScope helpKeys={['public.scim_settings.enabled', 'public.scim_settings.welcome_email', 'public.scim_settings.block_manual_invites', 'public.scim_group_mappings.idp_group_name', 'public.scim_group_mappings.role_name']}>
      <div className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className={shell}>
          <h2 className="font-semibold">SCIM settings</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} /><FieldLabelWithHelp helpKey="public.scim_settings.enabled" htmlFor="scim-on">SCIM enabled</FieldLabelWithHelp></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.welcome_email} onChange={(e) => setSettings({ ...settings, welcome_email: e.target.checked })} /><FieldLabelWithHelp helpKey="public.scim_settings.welcome_email" htmlFor="scim-welcome">Welcome email</FieldLabelWithHelp></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.block_manual_invites} onChange={(e) => setSettings({ ...settings, block_manual_invites: e.target.checked })} /><FieldLabelWithHelp helpKey="public.scim_settings.block_manual_invites" htmlFor="scim-block">Block manual invites</FieldLabelWithHelp></label>
          <div className="flex gap-2">
            <button type="button" onClick={onSaveSettings} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Save</button>
            <button type="button" onClick={onRotateToken} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Create / rotate token</button>
          </div>
          {tokenOnce && <p className="text-sm break-all">SCIM token (copy now): <code>{tokenOnce}</code></p>}
          <p className="text-sm text-gray-700 dark:text-gray-200">Base URL: <code>/functions/v1/api-gateway/scim/v2</code></p>
        </div>
        <div className={shell}>
          <h2 className="font-semibold">Group → role mappings</h2>
          <FieldLabelWithHelp helpKey="public.scim_group_mappings.idp_group_name" htmlFor="g-name">IdP group</FieldLabelWithHelp>
          <input id="g-name" className={input} value={mapForm.idp_group_name} onChange={(e) => setMapForm({ ...mapForm, idp_group_name: e.target.value, idp_group_id: e.target.value })} />
          <FieldLabelWithHelp helpKey="public.scim_group_mappings.role_name" htmlFor="g-role">Nidus role</FieldLabelWithHelp>
          <input id="g-role" className={input} value={mapForm.role_name} onChange={(e) => setMapForm({ ...mapForm, role_name: e.target.value })} />
          <button type="button" onClick={onSaveMapping} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Add mapping</button>
          <ul className="text-sm">{mappings.map((m) => <li key={m.id}>{m.idp_group_name} → {m.role_name || '—'}</li>)}</ul>
        </div>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function SsoPanel() {
  const accountId = useAccountId()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({
    name: '', protocol: 'saml', metadata_url: '', verified_domains: 'client.example', sso_required: false, domain_txt_token: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accountId) return
    listSsoConnections(accountId).then(setRows).catch((e) => setError(e.message))
  }, [accountId])

  async function onSave() {
    try {
      const token = form.domain_txt_token || `nidus-sso-${Math.random().toString(36).slice(2, 10)}`
      const row = await saveSsoConnection({
        account_id: accountId,
        name: form.name,
        protocol: form.protocol,
        metadata_url: form.metadata_url,
        verified_domains: form.verified_domains.split(',').map((s) => s.trim()).filter(Boolean),
        sso_required: form.sso_required,
        domain_txt_token: token,
        domain_verified_at: new Date().toISOString(),
        is_active: true,
      })
      setForm({ ...form, domain_txt_token: token })
      setRows(await listSsoConnections(accountId))
      showSuccess({ recordId: row.connection_reference || row.name, operation: 'created', message: 'Add the DNS TXT token on the domain, then keep SSO required off until you have tested login.' })
    } catch (e) { setError(e.message) }
  }

  return (
    <FieldHelpScope helpKeys={['public.sso_connections.name', 'public.sso_connections.protocol', 'public.sso_connections.verified_domains', 'public.sso_connections.sso_required', 'public.sso_connections.metadata_url', 'public.sso_connections.break_glass_user_id']}>
      <div className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className={shell}>
          <h2 className="font-semibold">SSO connection</h2>
          <FieldLabelWithHelp helpKey="public.sso_connections.name" htmlFor="sso-name" required>Name</FieldLabelWithHelp>
          <input id="sso-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldLabelWithHelp helpKey="public.sso_connections.protocol" htmlFor="sso-proto">Protocol</FieldLabelWithHelp>
          <select id="sso-proto" className={input} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
            <option value="saml">SAML 2.0</option>
            <option value="oidc">OpenID Connect</option>
          </select>
          <FieldLabelWithHelp helpKey="public.sso_connections.metadata_url" htmlFor="sso-meta">Metadata URL</FieldLabelWithHelp>
          <input id="sso-meta" className={input} value={form.metadata_url} onChange={(e) => setForm({ ...form, metadata_url: e.target.value })} />
          <FieldLabelWithHelp helpKey="public.sso_connections.verified_domains" htmlFor="sso-dom">Email domains</FieldLabelWithHelp>
          <input id="sso-dom" className={input} value={form.verified_domains} onChange={(e) => setForm({ ...form, verified_domains: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.sso_required} onChange={(e) => setForm({ ...form, sso_required: e.target.checked })} />
            <FieldLabelWithHelp helpKey="public.sso_connections.sso_required" htmlFor="sso-req">SSO required</FieldLabelWithHelp>
          </label>
          <button type="button" onClick={onSave} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Save connection</button>
          {form.domain_txt_token && <p className="text-sm">DNS TXT token: <code>{form.domain_txt_token}</code></p>}
        </div>
        <div className={shell}>
          <h2 className="font-semibold">Connections</h2>
          <ul className="text-sm">{rows.map((r) => <li key={r.id}>{r.name} · {r.protocol} · {(r.verified_domains || []).join(', ')} · {r.sso_required ? 'SSO required' : 'optional'}</li>)}</ul>
        </div>
        {modal}
      </div>
    </FieldHelpScope>
  )
}

export function ApiDocsPanel() {
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchOpenApi().then(setDoc).catch((e) => setError(e.message))
  }, [])
  return (
    <div className={shell}>
      <h2 className="font-semibold">OpenAPI reference</h2>
      {error && <p className="text-red-600 text-sm">{error}</p>}
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
