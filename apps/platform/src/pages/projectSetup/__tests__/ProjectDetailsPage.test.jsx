import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'p1', routeKey: 'SEED334-PRJ-08', loading: false, error: null }),
}))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings', () => ({ useRegionalFormatSettings: () => null }))
vi.mock('@nidus/shared/services/deliveryMethodologyOptionsService.js', () => ({
  listDeliveryMethodologyOptions: () => Promise.resolve([{ code: 'agile', label: 'Agile & Lean' }]),
}))
vi.mock('@nidus/shared/services/projectAttributeOptionsService', async (orig) => ({
  ...(await orig()),
  listProjectAttributeOptions: () => Promise.resolve({
    priority: [{ value: 'high', label: 'High' }],
    billing_type: [{ value: 'fixed_price', label: 'Fixed Price' }],
    classification: [{ value: 'strategic', label: 'Strategic' }],
  }),
}))
vi.mock('@nidus/shared/utils/auditDisplayUtils', () => ({
  humanizeAuditToken: (v) => v, resolveAuditUserLabels: () => Promise.resolve({}),
}))
vi.mock('@nidus/ui/ExportRecordMenu', () => ({ default: () => null }))
vi.mock('../../../services/projectDetailsService', () => ({
  getProjectDetails: () => Promise.resolve({
    id: 'p1', project_code: 'SEED334-PRJ-08', project_name: 'Velocity Freight',
    project_description: 'Routing pilot', project_objectives: '["Cut miles","Cut fuel"]', success_criteria: 'On time 95%',
    project_classification: 'strategic', priority: 'high', billing_type: 'fixed_price', delivery_methodology: 'agile',
    health_status: 'amber', planned_start_date: '2026-01-05', planned_end_date: '2026-06-30',
    status: { status_name: 'Active' }, industries: [{ id: 'i1', name: 'IT & Software', is_primary: true }],
    people: { projectManager: 'Oscar M', executive: 'Ama Owusu', fundingAuthority: '', approvingAuthority: '', benefitOwner: '' },
  }),
}))

const { default: ProjectDetailsPage } = await import('../ProjectDetailsPage')

describe('Project Details — read-only summary (v1344 A1)', () => {
  it('shows tabs with read-only values and Edit links into the wizard', async () => {
    render(<MemoryRouter><ProjectDetailsPage /></MemoryRouter>)
    expect(await screen.findByText('Routing pilot')).toBeInTheDocument()
    expect(screen.getByText('IT & Software (Primary)')).toBeInTheDocument()
    expect(screen.getByText('amber')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/platform/projects/SEED334-PRJ-08/edit?tab=details')
    expect(screen.queryByRole('textbox')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Objectives & Success' }))
    expect(screen.getByText('Cut miles')).toBeInTheDocument()
    expect(screen.getByText('Cut fuel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Classification & Delivery' }))
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Fixed Price')).toBeInTheDocument()
    expect(screen.getByText('Agile & Lean')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Dates & People' }))
    expect(screen.getByText('Ama Owusu')).toBeInTheDocument()
    expect(screen.getByText(/only a pmo admin can change/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/platform/projects/SEED334-PRJ-08/edit?tab=governance')
  })
})
