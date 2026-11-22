import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@nidus/supabase', () => ({ platformDb: {} }))
vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(async () => 'acct-1'),
}))
vi.mock('../../../features/local-data-extensions/hooks/useCustomFields', () => ({
  useCustomFields: vi.fn(),
}))
vi.mock('../../../features/local-data-extensions/components/CustomFieldRenderer', () => ({
  default: () => <div data-testid="cf-renderer">renderer</div>,
}))

import RecordCustomFields from '../RecordCustomFields'
import { useCustomFields } from '../../../features/local-data-extensions/hooks/useCustomFields'

describe('RecordCustomFields alwaysShow (v1348)', () => {
  beforeEach(() => {
    useCustomFields.mockReturnValue({ definitions: [], loading: false })
  })

  it('shows after-save empty state when alwaysShow and no entityId', async () => {
    render(
      <RecordCustomFields
        projectId="p1"
        entityType="project_brief"
        entityId={null}
        screenCode="brief_detail"
        alwaysShow
      />,
    )
    await waitFor(() => {
      expect(screen.getByText(/appear after this record is saved/i)).toBeInTheDocument()
    })
  })

  it('shows no-fields empty state when alwaysShow and no definitions', async () => {
    render(
      <RecordCustomFields
        projectId="p1"
        entityType="project_brief"
        entityId="e1"
        screenCode="brief_detail"
        alwaysShow
      />,
    )
    await waitFor(() => {
      expect(screen.getByText(/No custom fields are published/i)).toBeInTheDocument()
    })
  })

  it('renders CustomFieldRenderer when alwaysShow and definitions exist', async () => {
    useCustomFields.mockReturnValue({
      definitions: [{ id: 'f1', label: 'Region' }],
      loading: false,
    })
    render(
      <RecordCustomFields
        projectId="p1"
        entityType="project_brief"
        entityId="e1"
        screenCode="brief_detail"
        alwaysShow
      />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('cf-renderer')).toBeInTheDocument()
    })
  })

  it('renders nothing without alwaysShow when there are no definitions', async () => {
    const { container } = render(
      <RecordCustomFields
        projectId="p1"
        entityType="risk"
        entityId="e1"
        screenCode="risk_detail"
      />,
    )
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })
})
