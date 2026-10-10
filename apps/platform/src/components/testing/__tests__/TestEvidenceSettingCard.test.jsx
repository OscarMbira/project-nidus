import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestEvidenceSettingCard from '../TestEvidenceSettingCard'
import {
  getOrganisationTestEvidenceDefault,
  setOrganisationTestEvidenceDefault,
  getProjectTestEvidenceRequirement,
  setProjectTestEvidenceRequirement,
} from '../../../services/testEvidenceSettingsService'

vi.mock('../../../services/testEvidenceSettingsService', () => ({
  getOrganisationTestEvidenceDefault: vi.fn(),
  setOrganisationTestEvidenceDefault: vi.fn(),
  getProjectTestEvidenceRequirement: vi.fn(),
  setProjectTestEvidenceRequirement: vi.fn(),
}))

vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({}),
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

describe('TestEvidenceSettingCard (PRD v1204, Slice 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the organisation default when a manager changes it', async () => {
    getOrganisationTestEvidenceDefault.mockResolvedValue('optional')
    setOrganisationTestEvidenceDefault.mockResolvedValue({ id: 'acc-1' })

    render(<TestEvidenceSettingCard scope="organisation" targetId="acc-1" canManage />)

    const select = await screen.findByLabelText('Passed-test evidence requirement')
    await waitFor(() => expect(select).toHaveValue('optional'))
    fireEvent.change(select, { target: { value: 'required' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(setOrganisationTestEvidenceDefault).toHaveBeenCalledWith('acc-1', 'required'))
  })

  it('offers "use organisation default" for a project and saves null for it', async () => {
    getProjectTestEvidenceRequirement.mockResolvedValue('required')
    setProjectTestEvidenceRequirement.mockResolvedValue({ id: 'proj-1' })

    render(<TestEvidenceSettingCard scope="project" targetId="proj-1" canManage />)

    const select = await screen.findByLabelText('Passed-test evidence requirement')
    await waitFor(() => expect(select).toHaveValue('required'))
    fireEvent.change(select, { target: { value: 'inherit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(setProjectTestEvidenceRequirement).toHaveBeenCalledWith('proj-1', null))
  })

  it('is read-only without manage rights', async () => {
    getOrganisationTestEvidenceDefault.mockResolvedValue('optional')

    render(<TestEvidenceSettingCard scope="organisation" targetId="acc-1" canManage={false} />)

    const select = await screen.findByLabelText('Passed-test evidence requirement')
    await waitFor(() => expect(select).toBeDisabled())
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })
})
