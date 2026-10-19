// v1272 Phase 2 — ColumnMappingStep: manual matching, required fields, value conversions.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('@nidus/shared/services/askNidusService', () => ({
  getAiStatus: vi.fn(async () => ({ allowed: false, account_id: null })),
  getAiUser: vi.fn(async () => null),
}))
vi.mock('@nidus/shared/services/importMappingService', () => ({
  findSavedMapping: vi.fn(async () => null),
  markMappingUsed: vi.fn(),
  saveMapping: vi.fn(),
  suggestMapping: vi.fn(),
}))

const { AppConfigProvider } = await import('@nidus/shared/context/AppConfigContext')
const { default: ColumnMappingStep } = await import('../ColumnMappingStep.jsx')

const columns = [
  { key: 'contact_name', label: 'Name', required: true, aliases: ['full_name'] },
  { key: 'contact_type', label: 'Type', required: false, allowed: ['internal', 'vendor'] },
]

describe('ColumnMappingStep', () => {
  it('blocks until required fields are matched, then passes re-keyed, converted rows on', async () => {
    const onConfirm = vi.fn()
    render(
      <AppConfigProvider app="platform" db={{}}>
        <ColumnMappingStep target="project_contacts" templateLabel="Contacts" columns={columns}
          headers={['Person', 'Kind']} rows={[{ Person: 'Ann', Kind: 'Supplier' }]} onConfirm={onConfirm} onCancel={() => {}} />
      </AppConfigProvider>,
    )
    await waitFor(() => expect(screen.getByText(/AI suggestions are off/i)).toBeTruthy())
    const continueBtn = screen.getByRole('button', { name: /continue to preview/i })
    expect(continueBtn.disabled).toBe(true)
    expect(screen.getByText(/Required: choose a column for Name/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Template field for Person'), { target: { value: 'contact_name' } })
    fireEvent.change(screen.getByLabelText('Template field for Kind'), { target: { value: 'contact_type' } })
    // "Supplier" is not an allowed Type: convert it
    const convert = await screen.findByDisplayValue('Leave as is')
    fireEvent.change(convert, { target: { value: 'vendor' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(continueBtn)
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0].rows).toEqual([{ contact_name: 'Ann', contact_type: 'vendor' }])
  })
})
