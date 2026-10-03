import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchableSelect from '../SearchableSelect.jsx'

describe('SearchableSelect', () => {
  const projects = [
    { value: 'p1', label: 'Cedar Trust (CT-001)' },
    { value: 'p2', label: 'Harbour Bridge (HB-014)' },
    { value: 'p3', label: 'Stakeholder Portal (SP-002)' },
  ]

  it('filters options as the user types in combobox mode', () => {
    const onChange = vi.fn()
    render(
      <SearchableSelect
        options={projects}
        value=""
        onChange={onChange}
        placeholder="Choose a project..."
        searchPlaceholder="Search projects..."
        combobox
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /choose a project/i }))
    const search = screen.getByLabelText('Search projects...')
    fireEvent.change(search, { target: { value: 'stake' } })

    expect(screen.getByRole('option', { name: 'Stakeholder Portal (SP-002)' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Cedar Trust (CT-001)' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('option', { name: 'Stakeholder Portal (SP-002)' }))
    expect(onChange).toHaveBeenCalledWith('p3')
  })

  it('shows a Role description column when options include description', () => {
    render(
      <SearchableSelect
        options={[
          { value: 'u1', label: 'Agnes', description: 'Change Manager' },
          { value: 'u2', label: 'Clive Kupa', description: '—' },
        ]}
        value=""
        onChange={vi.fn()}
        placeholder="Task owner"
        descriptionColumnLabel="Role"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /task owner/i }))
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Change Manager')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Agnes/i })).toBeInTheDocument()
  })
})
