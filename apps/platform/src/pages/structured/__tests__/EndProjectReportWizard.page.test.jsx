import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EndProjectReportWizard from '../EndProjectReportWizard'
import { getEndProjectReportById } from '../../../services/endProjectReportService'

const REPORT_UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'SEED334-PRJ-08' }),
}))

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useThemeContext: () => ({ theme: 'dark' }),
}))

vi.mock('@nidus/shared/utils/entityRouteParam', () => ({
  resolveEntityId: vi.fn(async () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
}))

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn() },
}))

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../../../services/endProjectReportService', () => ({
  createEndProjectReport: vi.fn(),
  updateEndProjectReport: vi.fn(),
  getEndProjectReportById: vi.fn(async (id) => ({
    id,
    report_title: 'End Project Report - Velocity Freight',
    report_date: '2026-10-06',
    date_of_this_revision: '2026-10-06',
    document_ref: 'EPR-7R0B5WAZ5',
    version_no: '1.0',
    closure_type: 'normal',
  })),
}))

vi.mock('../../../services/eprBusinessCaseReviewService', () => ({
  getBenefitsComparison: vi.fn(async () => ({ reviews: [] })),
}))
vi.mock('../../../services/eprObjectivesReviewService', () => ({
  getTolerancePerformance: vi.fn(async () => []),
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
  runQualityChecks: vi.fn(),
}))

vi.mock('../../../components/ui/HoldButton', () => ({
  HoldButton: () => <button type="button">Put on Hold</button>,
}))

describe('End Project Report editor page', () => {
  it('renders the editor in the page with Back, without a dialog overlay', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/platform/projects/SEED334-PRJ-08/closure/end-project-report/create']}>
        <Routes>
          <Route path="/platform/projects/:projectId/closure/end-project-report/create" element={<EndProjectReportWizard />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create End Project Report' })).toBeInTheDocument()
    expect(container.querySelector('.fixed.inset-0')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('loads an edit link that uses the document reference instead of a uuid', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(
      <MemoryRouter initialEntries={['/platform/projects/SEED334-PRJ-08/closure/end-project-report/EPR-7R0B5WAZ5/edit']}>
        <Routes>
          <Route path="/platform/projects/:projectId/closure/end-project-report/:reportId/edit" element={<EndProjectReportWizard />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('End Project Report - Velocity Freight')).toBeInTheDocument()
    expect(getEndProjectReportById).toHaveBeenCalledWith(REPORT_UUID)
    expect(alertSpy).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })
})
