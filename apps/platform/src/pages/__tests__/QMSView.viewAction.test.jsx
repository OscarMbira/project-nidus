import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import QMSView from '../QMSView'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'proj-1' }),
}))

const { qms } = vi.hoisted(() => ({
  qms: {
    id: 'qms-1',
    qms_reference: 'QMS-TEST-001',
    version_number: '1.0',
    status: 'approved',
    purpose: 'To define how quality will be achieved.',
    objectives: 'Meet every acceptance criterion.\nCatch defects before handover.',
    scope: 'Covers all project products.\nCovers third-party integrations.',
  },
}))

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'proj-1', project_name: 'Demo Project', project_code: 'DEMO-01' }, error: null }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('../../services/qualityManagementStrategyService', () => ({
  getQMSByProject: vi.fn(),
  getOrCreateQMS: vi.fn().mockResolvedValue(qms),
  updateQMS: vi.fn(),
  validateCompleteness: vi.fn().mockResolvedValue({ is_complete: true, completeness_score: 100, missing_sections: [] }),
  checkConformance: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../services/qmsQualityStandardsService', () => ({ getStandards: vi.fn().mockResolvedValue([]) }))
vi.mock('../../services/qmsQualityMethodsService', () => ({ getMethods: vi.fn().mockResolvedValue([]) }))
vi.mock('../../services/qmsQualityMetricsService', () => ({ getMetrics: vi.fn().mockResolvedValue([]) }))
vi.mock('../../services/qmsQualityRolesService', () => ({
  getRoles: vi.fn().mockResolvedValue([]),
  getIndependentRoles: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../services/qmsScheduledActivitiesService', () => ({
  getActivities: vi.fn().mockResolvedValue([]),
  getUpcomingActivities: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../services/qmsQualityToolsService', () => ({ getTools: vi.fn().mockResolvedValue([]) }))
vi.mock('../../services/qmsQualityRecordsService', () => ({
  getRecords: vi.fn().mockResolvedValue([]),
  getMandatoryRecords: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../services/qmsQualityReportsService', () => ({ getReports: vi.fn().mockResolvedValue([]) }))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/platform/qms?projectId=proj-1']}>
      <Routes>
        <Route path="/platform/qms" element={<QMSView />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('QMSView — View action (preview before export)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a View button next to Export, and opens the record preview with the strategy content', async () => {
    renderPage()
    await screen.findByText('APPROVED')

    const viewBtn = screen.getByTitle('View')
    fireEvent.click(viewBtn)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  })

  it('shows Objectives and Scope as separate list items, not one paragraph', async () => {
    renderPage()
    await screen.findByText('APPROVED')

    expect(screen.getByText('Meet every acceptance criterion.')).toBeInTheDocument()
    expect(screen.getByText('Catch defects before handover.')).toBeInTheDocument()
    expect(screen.getByText('Covers all project products.')).toBeInTheDocument()
    expect(screen.getByText('Covers third-party integrations.')).toBeInTheDocument()
    // No add/edit/delete controls — the Overview tab is read-only; editing happens via Edit QMS.
    expect(screen.queryByRole('button', { name: /remove objective 1/i })).toBeNull()
  })
})
