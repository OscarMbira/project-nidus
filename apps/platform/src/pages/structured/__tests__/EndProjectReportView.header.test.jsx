import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EndProjectReportView from '../EndProjectReportView'

vi.mock('@nidus/shared/utils/entityRouteParam', () => ({
  resolveEntityId: vi.fn(async () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
}))

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'SEED334-PRJ-08' }),
}))

vi.mock('@nidus/shared/context/BrandingContext', () => ({
  useBranding: () => ({ branding: null }),
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

vi.mock('../../../services/endProjectReportService', () => ({
  getEndProjectReportById: vi.fn(async () => ({
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    document_ref: 'EPR-7R0B5WAZ5',
    report_title: 'Velocity Freight end project report',
    approval_status: 'draft',
    version_no: '1.0',
    report_date: '2026-10-06',
  })),
}))

vi.mock('../../../services/eprBusinessCaseReviewService', () => ({
  getBenefitsComparison: vi.fn(async () => []),
}))
vi.mock('../../../services/eprObjectivesReviewService', () => ({
  getTolerancePerformance: vi.fn(async () => [
    {
      id: 'obj-1',
      objective_area: 'time',
      original_target: 'Target agreed at project start',
      actual_value: 'Result recorded at closure',
      within_tolerance: true,
      performance_rating: 'met',
      created_at: '2026-01-01',
    },
  ]),
}))
vi.mock('../../../services/eprTeamPerformanceService', () => ({
  getTeamPerformance: vi.fn(async () => []),
}))
vi.mock('../../../services/eprProductsReviewService', () => ({
  getQualityRecords: vi.fn(async () => []),
  getApprovalRecords: vi.fn(async () => []),
  getOffSpecifications: vi.fn(async () => []),
}))
vi.mock('../../../services/eprLessonsService', () => ({
  getLessons: vi.fn(async () => []),
}))
vi.mock('../../../services/eprFollowOnService', () => ({
  getFollowOnActions: vi.fn(async () => []),
}))
vi.mock('../../../services/eprQualityCheckService', () => ({
  getQualityCheckStatus: vi.fn(async () => null),
  getQualityChecks: vi.fn(async () => [
    { id: 'qc-1', criterion_name: 'Benefits evidence', validation_status: 'passed', created_at: '2026-01-01' },
  ]),
}))
vi.mock('../../../services/eprRevisionService', () => ({
  getVersionHistory: vi.fn(async () => []),
}))
vi.mock('../../../services/eprApprovalService', () => ({
  getApprovalStatus: vi.fn(async () => null),
}))

describe('End project report view header', () => {
  it('shows View and Export beside the report title', async () => {
    render(
      <MemoryRouter initialEntries={['/platform/projects/SEED334-PRJ-08/closure/end-project-report/EPR-7R0B5WAZ5']}>
        <Routes>
          <Route path="/platform/projects/:projectId/closure/end-project-report/:reportId" element={<EndProjectReportView />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Velocity Freight end project report' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    expect(await screen.findByText(/Document Reference:/)).toBeInTheDocument()
  })

  it('shows the card and table switch on a list tab', async () => {
    localStorage.clear()
    render(
      <MemoryRouter initialEntries={['/platform/projects/SEED334-PRJ-08/closure/end-project-report/EPR-7R0B5WAZ5']}>
        <Routes>
          <Route path="/platform/projects/:projectId/closure/end-project-report/:reportId" element={<EndProjectReportView />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('tab', { name: 'Objectives' }))
    expect(screen.getByRole('group', { name: 'Objectives Performance Review layout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Table list view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('columnheader', { name: /Objective/ })).toBeInTheDocument()
    expect(screen.getByText('time')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Card grid view' }))
    expect(screen.getByText('Within tolerance')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /Objective/ })).not.toBeInTheDocument()

    fireEvent.click(await screen.findByRole('tab', { name: 'Quality Checks' }))
    expect(screen.getByText('Benefits evidence')).toBeInTheDocument()
  })

  it('edits the open section instead of the document-header wizard', async () => {
    render(
      <MemoryRouter initialEntries={['/platform/projects/SEED334-PRJ-08/closure/end-project-report/EPR-7R0B5WAZ5']}>
        <Routes>
          <Route path="/platform/projects/:projectId/closure/end-project-report/:reportId" element={<EndProjectReportView />} />
          <Route path="/platform/projects/:projectId/closure/end-project-report/:reportId/edit" element={<EndProjectReportView />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('tab', { name: 'Objectives' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit end project report' }))

    expect(await screen.findByRole('heading', { name: 'Objectives Review' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Objective Review' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Edit End Project Report' })).not.toBeInTheDocument()
    expect(screen.queryByText('Document Header')).not.toBeInTheDocument()
  })
})
