import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const saveStakeholder = vi.fn((data, id) => Promise.resolve({ id: id || 'new', ...data }))
const loadFieldHelp = vi.fn((keys) => Promise.resolve(Object.fromEntries(keys.map((k) => [k, {
  help_key: k, title: k.endsWith('stakeholder_name') ? 'Stakeholder name' : k.split('.').pop(), purpose: 'Help text.', examples: '- Example',
}]))))

/** Chainable fake: every query resolves to no rows. */
function fakeDb() {
  const result = Promise.resolve({ data: [], error: null })
  const chain = new Proxy(() => {}, {
    get(_t, prop) {
      if (prop === 'then') return result.then.bind(result)
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: null, error: null })
      return () => chain
    },
    apply() { return chain },
  })
  return { from: () => chain, rpc: () => Promise.resolve({ data: null, error: null }), auth: { getUser: () => Promise.resolve({ data: { user: null } }) } }
}

vi.mock('../../../services/supabaseClient', () => ({ platformDb: fakeDb(), supabase: fakeDb() }))
vi.mock('../../../services/stakeholderService', () => ({ saveStakeholder: (...a) => saveStakeholder(...a) }))
vi.mock('../../../services/stakeholderCatalogueService', () => ({
  loadStakeholderCatalogues: () => Promise.resolve({ organisations: [], departments: [], roles: [] }),
  addStakeholderOrganisation: vi.fn(), addStakeholderDepartment: vi.fn(),
}))
vi.mock('../../../lib/useDraftQueue', () => ({
  useDraftQueue: () => ({ saveDraft: vi.fn(), canCreateDraft: false, existingDraftInfo: null, dismissExistingDraft: vi.fn(), resumeDraft: vi.fn() }),
}))
vi.mock('@nidus/ui/StakeholderPhotoField', () => ({ default: () => null }))
vi.mock('@nidus/shared/services/stakeholderPhotoService', () => ({ saveStakeholderPhoto: vi.fn() }))
vi.mock('@nidus/shared/utils/auditDisplayUtils', () => ({ humanizeAuditToken: (v) => v, resolveAuditUserLabels: () => Promise.resolve({}) }))
vi.mock('@nidus/shared/services/fieldHelpService.js', () => ({
  loadFieldHelp: (...a) => loadFieldHelp(...a), recordFieldHelpOpen: vi.fn(), recordFieldHelpVote: vi.fn(),
}))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings.js', () => ({ useRegionalFormatSettings: () => null }))

const { default: StakeholderForm } = await import('../StakeholderForm')

describe('Platform Stakeholder form — field help (v1345 slice 1)', () => {
  it('loads help for every field, opens it from the label, and still saves', async () => {
    const onSave = vi.fn()
    render(
      <MemoryRouter>
        <StakeholderForm
          stakeholder={{ id: 's1', stakeholder_name: 'Rutendo Chikwanha', stakeholder_type: 'internal', stakeholder_status: 'active', emails: [''], phones: [''], mobiles: [''] }}
          projectId="p1"
          onSave={onSave}
          onCancel={vi.fn()}
        />
      </MemoryRouter>,
    )

    await waitFor(() => expect(loadFieldHelp).toHaveBeenCalled())
    const keys = loadFieldHelp.mock.calls[0][0]
    expect(keys).toHaveLength(33)
    expect(keys).toEqual(expect.arrayContaining(['public.stakeholders.stakeholder_name', 'public.stakeholders.interest_level', 'public.stakeholders.assigned_projects']))

    const nameHelp = await waitFor(() => {
      const el = document.querySelector('[data-help-key="public.stakeholders.stakeholder_name"] button')
      if (!el) throw new Error('help button not rendered yet')
      return el
    })
    expect(nameHelp).toHaveAttribute('aria-label', 'Help: Stakeholder name')
    expect(document.querySelectorAll('[data-help-key]').length).toBeGreaterThanOrEqual(30)
    fireEvent.click(nameHelp)
    expect(screen.getByRole('dialog')).toHaveTextContent('Required.')
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.submit(document.getElementById('stk-stakeholder_name').closest('form'))
    await waitFor(() => expect(saveStakeholder).toHaveBeenCalled())
    expect(saveStakeholder.mock.calls[0][0]).toMatchObject({ stakeholder_name: 'Rutendo Chikwanha' })
  }, 30000)
})
