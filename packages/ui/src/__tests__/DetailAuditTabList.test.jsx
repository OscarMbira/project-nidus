import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DetailAuditTabList from '../DetailAuditTabList.jsx'

describe('DetailAuditTabList', () => {
  it('renders the legacy Details/Audit details two-tab shape when `tabs` is omitted', () => {
    render(<DetailAuditTabList activeTab="details" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Audit details' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })

  it('respects custom detailsLabel/auditLabel overrides in the legacy shape', () => {
    render(
      <DetailAuditTabList
        activeTab="details"
        onChange={() => {}}
        detailsLabel="Template details"
        auditLabel="History"
      />,
    )
    expect(screen.getByRole('tab', { name: 'Template details' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'History' })).toBeInTheDocument()
  })

  it('inserts extraTab between Details and Audit details when provided', () => {
    render(
      <DetailAuditTabList
        activeTab="details"
        onChange={() => {}}
        extraTab={{ value: 'signatories', label: 'Signatories' }}
      />,
    )
    const tabs = screen.getAllByRole('tab').map((el) => el.textContent)
    expect(tabs).toEqual(['Details', 'Signatories', 'Audit details'])
  })

  it('renders an arbitrary N-tab shape when `tabs` is passed, ignoring legacy label/extraTab props', () => {
    const tabs = [
      { value: 'details', label: 'Details' },
      { value: 'ownership', label: 'Ownership' },
      { value: 'impact', label: 'Impact' },
      { value: 'links', label: 'Links' },
      { value: 'audit', label: 'Audit details' },
    ]
    render(
      <DetailAuditTabList
        activeTab="details"
        onChange={() => {}}
        tabs={tabs}
        extraTab={{ value: 'ignored', label: 'Ignored' }}
      />,
    )
    const rendered = screen.getAllByRole('tab').map((el) => el.textContent)
    expect(rendered).toEqual(['Details', 'Ownership', 'Impact', 'Links', 'Audit details'])
  })

  it('marks the active tab with aria-selected="true" and others "false"', () => {
    render(<DetailAuditTabList activeTab="audit" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Audit details' })).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onChange with the clicked tab value', () => {
    const onChange = vi.fn()
    render(<DetailAuditTabList activeTab="details" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))
    expect(onChange).toHaveBeenCalledWith('audit')
  })
})
