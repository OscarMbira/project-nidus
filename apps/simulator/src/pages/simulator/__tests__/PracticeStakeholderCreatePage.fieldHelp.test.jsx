import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const createPracticeStakeholder = vi.fn(() => Promise.resolve({ success: true, data: { id: 's1' } }))
const loadFieldHelp = vi.fn((keys) => Promise.resolve(Object.fromEntries(keys.map((k) => [k,
  k.endsWith('.stakeholder_name')
    ? { help_key: 'public.stakeholders.stakeholder_name', title: 'Stakeholder name', purpose: 'The person, group or organisation.', examples: '- Rutendo Chikwanha' }
    : null]))))

vi.mock('../../../services/supabase/supabaseClient', () => ({ simDb: {} }))
vi.mock('../../../services/sim/practiceStakeholderService', () => ({ createPracticeStakeholder: (...a) => createPracticeStakeholder(...a) }))
vi.mock('../../../lib/useDraftQueue', () => ({
  useDraftQueue: () => ({ saveDraft: vi.fn(), canCreateDraft: false, existingDraftInfo: null, dismissExistingDraft: vi.fn(), resumeDraft: vi.fn() }),
}))
vi.mock('@nidus/ui/StakeholderPhotoField', () => ({ default: () => null }))
vi.mock('@nidus/shared/services/stakeholderPhotoService', () => ({ saveStakeholderPhoto: vi.fn() }))
vi.mock('@nidus/shared/services/fieldHelpService.js', () => ({
  loadFieldHelp: (...a) => loadFieldHelp(...a), recordFieldHelpOpen: vi.fn(), recordFieldHelpVote: vi.fn(),
}))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings.js', () => ({ useRegionalFormatSettings: () => null }))

const { default: PracticeStakeholderCreatePage } = await import('../PracticeStakeholderCreatePage')

describe('Practice stakeholder create page — field help (v1345, P17)', () => {
  it('shows Simulator help through the alias keys and still saves', async () => {
    render(<MemoryRouter initialEntries={['/simulator/practice-stakeholders/create?projectId=pp1']}><PracticeStakeholderCreatePage /></MemoryRouter>)

    await waitFor(() => expect(loadFieldHelp).toHaveBeenCalled())
    expect(loadFieldHelp.mock.calls[0][0]).toContain('sim.practice_stakeholder_register.stakeholder_name')

    fireEvent.click(await screen.findByRole('button', { name: 'Help: Stakeholder name' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('The person, group or organisation.')
    expect(screen.getByRole('dialog')).toHaveTextContent('Required.')
    // Fields without help keep a plain label (D10)
    expect(screen.queryByRole('button', { name: /Help: Organi/ })).toBeNull()

    const nameInput = document.getElementById('pstk-stakeholder_name')
    fireEvent.change(nameInput, { target: { value: 'Tendai Ncube' } })
    fireEvent.submit(nameInput.closest('form'))
    await waitFor(() => expect(createPracticeStakeholder).toHaveBeenCalledWith('pp1', expect.objectContaining({ stakeholder_name: 'Tendai Ncube' })))
  })
})
