import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuditField from '../AuditField.jsx'
import AuditCard from '../AuditCard.jsx'
import AuditDetailsPanel from '../AuditDetailsPanel.jsx'
import DetailAuditTabList from '../DetailAuditTabList.jsx'

describe('AuditField', () => {
  it('renders the label and value', () => {
    render(
      <dl>
        <AuditField label="Display ID" value="TPL-0072" />
      </dl>,
    )
    expect(screen.getByText('Display ID')).toBeInTheDocument()
    expect(screen.getByText('TPL-0072')).toBeInTheDocument()
  })

  it('shows an em dash for empty values', () => {
    const { container } = render(
      <dl>
        <AuditField label="Created by" value={null} />
      </dl>,
    )
    expect(container.querySelector('dd')?.textContent).toBe('—')
  })
})

describe('AuditDetailsPanel', () => {
  it('renders title, description, cards, and optional footer', () => {
    render(
      <AuditDetailsPanel description="Who changed this." footer={<p>Timeline here</p>}>
        <AuditCard title="Identity" description="Labels.">
          <AuditField label="Status" value="Published" />
        </AuditCard>
      </AuditDetailsPanel>,
    )
    expect(screen.getByText('Audit details')).toBeInTheDocument()
    expect(screen.getByText('Who changed this.')).toBeInTheDocument()
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Timeline here')).toBeInTheDocument()
  })

  it('does not invent a Technical reference card', () => {
    render(
      <AuditDetailsPanel>
        <AuditCard title="Identity">
          <AuditField label="Display ID" value="TPL-1" />
        </AuditCard>
      </AuditDetailsPanel>,
    )
    expect(screen.queryByText(/Technical reference/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Internal ID/i)).not.toBeInTheDocument()
  })
})

describe('DetailAuditTabList', () => {
  it('defaults selection styling to Details and calls onChange for Audit', () => {
    const onChange = vi.fn()
    render(
      <DetailAuditTabList
        activeTab="details"
        onChange={onChange}
        detailsLabel="Form details"
      />,
    )
    expect(screen.getByRole('tab', { name: 'Form details' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Audit details' }))
    expect(onChange).toHaveBeenCalledWith('audit')
  })

  it('places extraTab (e.g. Signatories) between Details and Audit details', () => {
    render(
      <DetailAuditTabList
        activeTab="details"
        onChange={() => {}}
        detailsLabel="Document details"
        extraTab={{ value: 'signatories', label: 'Signatories' }}
      />,
    )
    const tabs = screen.getAllByRole('tab').map((el) => el.textContent)
    expect(tabs).toEqual(['Document details', 'Signatories', 'Audit details'])
  })
})
