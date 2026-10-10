import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HandoverChecklist from '../HandoverChecklist'

vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })),
  },
}))

vi.mock('../../../../services/closingProjectService', () => ({
  fetchProjectHandover: vi.fn().mockResolvedValue({
    id: 'h1',
    handover_title: 'Velocity Freight handover',
    handover_type: 'operational',
    handover_status: 'in-progress',
    handover_date: '2026-10-04',
  }),
  createProjectHandover: vi.fn(),
  updateProjectHandover: vi.fn(),
}))

vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({ confirmDiscard: (fn) => fn?.() }),
}))

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn() },
}))

describe('HandoverChecklist', () => {
  it('renders as a page, not a popup', async () => {
    const { container } = render(<HandoverChecklist projectId="project-1" onClose={() => {}} />)

    expect(await screen.findByRole('heading', { name: 'Project Handover Checklist' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
    expect(container.querySelector('.fixed.inset-0')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Completion status' }))
    expect(screen.getByText('Documentation Complete')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(screen.getByPlaceholderText('Completion item...')).toBeInTheDocument()
    expect(screen.queryByText('Handover Checklist')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Handover checklist' }))
    expect(screen.getByDisplayValue('Project documentation handed over')).toBeInTheDocument()
    expect(screen.queryByText('Documentation Complete')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Support arrangements' }))
    expect(screen.getByText('Arrangement')).toBeInTheDocument()
    expect(screen.queryByText('Operational Acceptance *')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Operational acceptance' }))
    expect(screen.getByText('Acceptance')).toBeInTheDocument()
    expect(screen.queryByText('Support Arrangements *')).not.toBeInTheDocument()
  })
})
