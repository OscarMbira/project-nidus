/** v1359 (A4, A6, A13, A14) — integrations: revoke asks first; the right organisation; SSO required only once verified. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings', () => ({ useRegionalFormatSettings: () => null }))
vi.mock('@nidus/shared/context/FieldHelpContext', () => ({
  FieldHelpScope: ({ children }) => children,
  useFieldHelpEntry: () => null,
  useFieldHelpScope: () => null,
}))
vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => {
    const React = require('react')
    const [msg, setMsg] = React.useState(null)
    return { showSuccess: (m) => setMsg(m), modal: msg ? <div role="status">{`${msg.operation} ${msg.recordId}: ${msg.message}`}</div> : null }
  },
}))
vi.mock('@nidus/shared/utils/accountResolution', () => ({ getCurrentUserAccountId: vi.fn(async () => 'acc-2') }))

const api = {
  listApiCredentials: vi.fn(async () => [{ id: 'k1', name: 'Finance export', credential_reference: 'APK-001', key_prefix: 'nds_live_ab', scopes: ['projects:read'], created_at: '2026-11-01T10:00:00Z' }]),
  listServiceAccounts: vi.fn(async () => []),
  listRequestUsage: vi.fn(async () => []),
  revokeApiCredential: vi.fn(async () => ({})),
  listSsoConnections: vi.fn(async () => []),
  requestSsoDomainVerification: vi.fn(async () => ({ domains: ['company.example'] })),
  saveSsoConnection: vi.fn(async () => ({})),
}
vi.mock('@nidus/shared/services/organisationApiService', () => ({
  API_SCOPE_OPTIONS: ['projects:read'], WEBHOOK_EVENT_OPTIONS: ['project.updated'],
  createApiCredential: vi.fn(), createServiceAccount: vi.fn(), fetchOpenApi: vi.fn(async () => ({})),
  listAssignableRoles: vi.fn(async () => []), listScimMappings: vi.fn(async () => []), loadScimSettings: vi.fn(async () => null),
  listWebhookDeliveries: vi.fn(async () => []), listWebhookEndpoints: vi.fn(async () => []), mintScimToken: vi.fn(),
  rotateApiCredential: vi.fn(), saveScimMapping: vi.fn(), saveScimSettings: vi.fn(), saveWebhookEndpoint: vi.fn(),
  ...api,
}))

const { ApiKeysPanel, SsoPanel } = await import('../integrations/IntegrationsPanels.jsx')

beforeEach(() => { localStorage.clear(); Object.values(api).forEach((f) => f.mockClear()) })

describe('API keys', () => {
  it('loads the current organisation and asks before revoking', async () => {
    render(<ApiKeysPanel />)
    expect(await screen.findAllByText('Finance export')).not.toHaveLength(0)
    expect(api.listApiCredentials).toHaveBeenCalledWith('acc-2')
    fireEvent.click(screen.getByText('Revoke'))
    expect(await screen.findByText('Revoke the key Finance export?')).toBeTruthy()
    expect(api.revokeApiCredential).not.toHaveBeenCalled()
    await act(async () => { fireEvent.click(screen.getByText('Cancel')) })
    expect(api.revokeApiCredential).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Revoke'))
    await act(async () => { fireEvent.click(await screen.findByText('Revoke key')) })
    expect(api.revokeApiCredential).toHaveBeenCalledWith('k1')
  })
})

describe('SSO', () => {
  it('offers Require SSO only on a verified connection, and queues a DNS check', async () => {
    api.listSsoConnections.mockResolvedValueOnce([
      { id: 's1', name: 'Staff SSO', protocol: 'saml', verified_domains: ['company.example'], domain_txt_token: 'abc', domain_verified_at: null, created_at: '2026-11-01' },
      { id: 's2', name: 'Partner SSO', protocol: 'oidc', verified_domains: ['partner.example'], domain_txt_token: 'def', domain_verified_at: '2026-11-02', created_at: '2026-11-02' },
    ])
    render(<SsoPanel />)
    expect(await screen.findAllByText('Staff SSO')).not.toHaveLength(0)
    expect(screen.getAllByText('Require SSO')).toHaveLength(1)
    expect(screen.getByText('nidus-verify=abc')).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getAllByText('Verify domain')[0]) })
    expect(api.requestSsoDomainVerification).toHaveBeenCalled()
  })
})
