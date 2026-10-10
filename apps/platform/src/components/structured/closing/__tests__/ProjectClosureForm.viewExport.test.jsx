import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProjectClosureForm from '../ProjectClosureForm'

function chainable(result) {
  const handler = {
    get(_target, prop) {
      if (prop === 'then') return (resolve) => resolve(result)
      return () => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn(() => chainable({ data: [], error: null })),
  },
}))

vi.mock('../../../../services/closingProjectService', () => ({
  createProjectClosure: vi.fn(),
  updateProjectClosure: vi.fn(),
  archiveProjectClosure: vi.fn(),
}))

vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({ confirmDiscard: (fn) => fn?.() }),
}))

vi.mock('@nidus/shared/context/BrandingContext', () => ({
  useBranding: () => ({ branding: null }),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn() },
}))

vi.mock('@nidus/shared/utils/exportUtils', () => ({
  exportRecordToExcel: vi.fn(),
  exportRecordToWord: vi.fn(),
  exportRecordToPPT: vi.fn(),
  exportRecordToCSV: vi.fn(),
  exportRecordToXML: vi.fn(),
  exportRecordToJSON: vi.fn(),
  exportRecordToPrint: vi.fn(),
  exportRecordToPDF: vi.fn(),
  generateRecordPdfBlob: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })),
}))

const closure = {
  id: 'closure-1',
  closure_type: 'planned',
  closure_status: 'initiated',
  closure_reason: 'Delivery is complete',
  performance_summary: 'Schedule held',
  benefits_realization_summary: 'On-time delivery is being measured',
  financial_closure_summary: 'Costs accounted for',
}

describe('ProjectClosureForm view and export', () => {
  it('shows View and Export in the form header and opens the export formats', () => {
    render(
      <ProjectClosureForm
        projectId="proj-1"
        closure={closure}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(screen.getByRole('button', { name: /Excel \(all fields\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Word \(choose fields\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PowerPoint \(choose fields\)/ })).toBeInTheDocument()
  })

  it('opens a record preview from View', () => {
    render(
      <ProjectClosureForm
        projectId="proj-1"
        closure={closure}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByText('Preview: Project Closure')).toBeInTheDocument()
  })
})
