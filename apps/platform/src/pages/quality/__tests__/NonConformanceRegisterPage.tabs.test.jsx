import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NonConformanceRegisterPage from '../NonConformanceRegisterPage'
import { getQualityDefects } from '../../../services/qualityManagementService'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'proj-1' }),
}))

vi.mock('../../../services/qualityManagementService', () => ({
  getQualityDefects: vi.fn(),
  saveQualityDefect: vi.fn(),
  deleteQualityDefect: vi.fn(),
}))

vi.mock('@nidus/shared/utils/auditDisplayUtils', async (importOriginal) => ({
  ...(await importOriginal()),
  resolveAuditUserLabels: vi.fn(async () => ({})),
}))

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))

const existing = {
  id: 'nc-1',
  is_non_conformance: true,
  defect_title: 'Route export gap',
  defect_description: 'Export misses one column.',
  affected_standard: 'ISO 9001 §8.5\nISO 9001 §9.1',
  root_cause_analysis: 'Template not updated.',
  corrective_action: 'First corrective step.\nSecond corrective step.',
  preventive_action: 'Add export test.',
  status: 'open',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-02T10:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NonConformanceRegisterPage />
    </MemoryRouter>,
  )
}

async function openCreateForm() {
  fireEvent.click(await screen.findByRole('button', { name: /log non-conformance/i }))
}

describe('NonConformanceRegisterPage — tabs, multi-value fields and audit tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getQualityDefects.mockResolvedValue([])
  })

  it('shows the circled fields as separate tabs, plus the audit tab', async () => {
    renderPage()
    await openCreateForm()

    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Affected standard' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Root cause analysis' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Corrective action' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Preventive action' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Audit details' })).toBeInTheDocument()
  })

  it('labels the Details fields visibly', async () => {
    renderPage()
    await openCreateForm()

    expect(screen.getByLabelText('Title *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description *')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('shows only the selected field on its tab', async () => {
    renderPage()
    await openCreateForm()

    fireEvent.click(screen.getByRole('tab', { name: 'Corrective action' }))
    expect(screen.getByPlaceholderText('Add corrective action…')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Title *')).toBeNull()
    expect(screen.queryByPlaceholderText('Add preventive action…')).toBeNull()
  })

  it('shows multi-value fields as separate list items when editing', async () => {
    getQualityDefects.mockResolvedValue([existing])
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /edit route export gap/i }))
    fireEvent.click(screen.getByRole('tab', { name: 'Corrective action' }))

    expect(await screen.findByText('First corrective step.')).toBeInTheDocument()
    expect(screen.getByText('Second corrective step.')).toBeInTheDocument()
  })

  it('shows the audit placeholder until the record is saved, and history once saved', async () => {
    renderPage()
    await openCreateForm()
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))
    expect(screen.getByText(/audit details appear after this record is saved/i)).toBeInTheDocument()
  })

  it('shows record history on the audit tab for a saved record', async () => {
    getQualityDefects.mockResolvedValue([existing])
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /edit route export gap/i }))
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))

    expect(await screen.findByText('Record history')).toBeInTheDocument()
    expect(screen.queryByText(/audit details appear after this record is saved/i)).toBeNull()
  })
})
