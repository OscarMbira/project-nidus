import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RecordCustomFields from '../RecordCustomFields'
import { useCustomFields } from '../../../features/local-data-extensions/hooks/useCustomFields'

vi.mock('@nidus/supabase', () => ({ platformDb: { from: vi.fn() } }))

vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserAccountId: vi.fn(() => Promise.resolve('account-1')),
}))

vi.mock('../../../features/local-data-extensions/hooks/useCustomFields', () => ({
  useCustomFields: vi.fn(),
}))

vi.mock('../../../features/local-data-extensions/components/CustomFieldRenderer', () => ({
  default: (props) => (
    <div data-testid="custom-field-renderer">
      {props.screenCode}|{props.entityType}|{props.entityId}|{props.projectId}|{props.accountId}
    </div>
  ),
}))

describe('RecordCustomFields (v1340 wave 2b)', () => {
  beforeEach(() => {
    useCustomFields.mockReset()
  })

  it('passes the screen, record and project to the custom field renderer', async () => {
    useCustomFields.mockReturnValue({ definitions: [{ id: 'f1' }] })
    render(<RecordCustomFields projectId="project-1" entityType="milestone" entityId="m-1" screenCode="milestone_detail" />)

    await waitFor(() => expect(screen.getByTestId('custom-field-renderer')).toBeInTheDocument())
    expect(screen.getByTestId('custom-field-renderer').textContent).toBe('milestone_detail|milestone|m-1|project-1|account-1')
    expect(useCustomFields).toHaveBeenLastCalledWith(expect.anything(), 'account-1', 'milestone_detail')
  })

  it('renders nothing until the organisation has published fields for the screen', async () => {
    useCustomFields.mockReturnValue({ definitions: [] })
    const { container } = render(
      <RecordCustomFields projectId="project-1" entityType="milestone" entityId="m-1" screenCode="milestone_detail" />
    )
    await waitFor(() => expect(useCustomFields).toHaveBeenLastCalledWith(expect.anything(), 'account-1', 'milestone_detail'))
    expect(container).toBeEmptyDOMElement()
  })
})
